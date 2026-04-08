import bcrypt from 'bcrypt'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/app-error'
import { logAuditEvent } from '../../shared/audit/audit.service'
import type {
  LoginBody,
  LoginResponseDto,
  AuthUserDto,
  JwtTokenPayload,
  ChangePasswordBody,
  ChangePasswordResponseDto,
} from './auth.schema'

const BCRYPT_ROUNDS = 12

// ============================================================
// LOGIN
// ============================================================

/**
 * Logika logowania użytkownika.
 *
 * Zasady bezpieczeństwa:
 * 1. Zawsze wykonujemy bcrypt.compare — niezależnie czy user istnieje.
 *    Zapobiega timing attack (atakujący nie może zmierzyć czasu odpowiedzi
 *    i wywnioskować czy email istnieje w systemie).
 * 2. Zawsze zwracamy ten sam komunikat 401 niezależnie od przyczyny.
 *    Nie ujawniamy: czy email istnieje / czy hasło jest błędne / czy konto nieaktywne.
 * 3. Audit log dla znanych userów (możliwy tylko gdy mamy userId FK w bazie).
 *    Dla nieistniejących emaili — brak DB audytu (brak userId do klucza obcego).
 *
 * @param body        - zwalidowane dane logowania (email + password)
 * @param signToken   - funkcja do podpisywania JWT (wstrzyknięta z routera)
 * @param ipAddress   - IP klienta (do audytu)
 * @param userAgent   - User-Agent klienta (do audytu)
 */
export async function login(
  body: LoginBody,
  signToken: (payload: JwtTokenPayload) => string,
  ipAddress?: string,
  userAgent?: string,
): Promise<LoginResponseDto> {
  const { email, password } = body

  // 1. Pobierz użytkownika — select tylko potrzebnych pól
  //    passwordHash potrzebny do porównania, ale NIE trafia do odpowiedzi
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      forcePasswordChange: true,
      passwordHash: true,
    },
  })

  // 2. Zawsze wykonaj bcrypt.compare — nawet jeśli user nie istnieje
  //    Dummy hash ma prawidłowy format bcrypt (cost 12) — compare zawsze zajmie ~100ms
  const DUMMY_HASH = '$2b$12$invalidhashfortimingprotectionXXXXXXXXXXXXXXXXXXXXXX'
  const hashToCompare = user?.passwordHash ?? DUMMY_HASH
  const passwordMatch = await bcrypt.compare(password, hashToCompare)

  // 3. Warunek łączny — celowo nie rozróżniamy przyczyny odmowy
  const canLogin = user !== null && user.isActive && passwordMatch

  if (!canLogin) {
    // Loguj do audytu tylko gdy user istnieje (wymagany FK userId w audit_log)
    if (user !== null) {
      const reason = !user.isActive ? 'LOGIN_FAIL_ACCOUNT_INACTIVE' : 'LOGIN_FAIL_WRONG_PASSWORD'
      await logAuditEvent({
        action: 'LOGIN',
        userId: user.id,
        entityType: 'user',
        entityId: user.id,
        newValue: reason,
        ipAddress,
        userAgent,
      }).catch(() => {
        // Błąd audytu NIE blokuje odpowiedzi auth — logujemy do pino przez error handler
      })
    }

    // Zawsze ten sam komunikat — niezależnie od przyczyny (email, hasło, aktywność)
    throw AppError.unauthorized('Nieprawidłowy adres e-mail lub hasło.', 'INVALID_CREDENTIALS')
  }

  // 4. Generuj token JWT — payload zawiera wyłącznie id i role
  const payload: JwtTokenPayload = { id: user.id, role: user.role }
  const token = signToken(payload)

  // 5. Aktualizuj lastLoginAt + zaloguj sukces (równolegle, nie blokujemy odpowiedzi)
  await Promise.all([
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
    logAuditEvent({
      action: 'LOGIN',
      userId: user.id,
      entityType: 'user',
      entityId: user.id,
      newValue: 'LOGIN_SUCCESS',
      ipAddress,
      userAgent,
    }).catch(() => {}),
  ])

  // 6. Zwróć token i dane użytkownika — BEZ passwordHash
  const userDto: AuthUserDto = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    forcePasswordChange: user.forcePasswordChange,
  }

  return { token, user: userDto }
}

// ============================================================
// GET ME
// ============================================================

/**
 * Zwraca dane aktualnie zalogowanego użytkownika na podstawie userId z JWT.
 *
 * Wykonuje fresh fetch z bazy przy każdym wywołaniu — gwarantuje,
 * że dezaktywacja konta jest respektowana natychmiast (bez czekania na
 * wygaśnięcie tokenu).
 */
export async function getMe(userId: string): Promise<AuthUserDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      forcePasswordChange: true,
    },
  })

  // Brak użytkownika lub dezaktywowane konto → 401
  // Nie zwracamy 403 — nie potwierdzamy że konto istnieje ale jest nieaktywne
  if (!user || !user.isActive) {
    throw AppError.unauthorized(
      'Konto użytkownika nie istnieje lub zostało dezaktywowane.',
      'ACCOUNT_UNAVAILABLE',
    )
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    forcePasswordChange: user.forcePasswordChange,
  }
}

// ============================================================
// CHANGE OWN PASSWORD
// ============================================================

/**
 * Zmienia hasło aktualnie zalogowanego użytkownika.
 *
 * Po sukcesie:
 * - aktualizuje passwordHash
 * - ustawia forcePasswordChange = false
 * - odświeża passwordChangedAt
 */
export async function changePassword(
  userId: string,
  body: ChangePasswordBody,
  ipAddress?: string,
  userAgent?: string,
): Promise<ChangePasswordResponseDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      isActive: true,
      passwordHash: true,
    },
  })

  if (!user || !user.isActive) {
    throw AppError.unauthorized(
      'Konto użytkownika nie istnieje lub zostało dezaktywowane.',
      'ACCOUNT_UNAVAILABLE',
    )
  }

  const currentPasswordMatches = await bcrypt.compare(body.currentPassword, user.passwordHash)

  if (!currentPasswordMatches) {
    throw AppError.badRequest('Obecne hasło jest nieprawidłowe.', 'INVALID_CURRENT_PASSWORD')
  }

  if (body.currentPassword === body.newPassword) {
    throw AppError.badRequest(
      'Nowe hasło nie może być takie samo jak obecne.',
      'PASSWORD_REUSE_NOT_ALLOWED',
    )
  }

  const nextPasswordHash = await bcrypt.hash(body.newPassword, BCRYPT_ROUNDS)
  const now = new Date()

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: nextPasswordHash,
      forcePasswordChange: false,
      passwordChangedAt: now,
    },
  })

  await logAuditEvent({
    action: 'UPDATE',
    userId,
    entityType: 'user',
    entityId: userId,
    fieldName: 'passwordChangedAt',
    newValue: 'SELF_SERVICE_PASSWORD_CHANGE',
    ipAddress,
    userAgent,
  }).catch(() => {})

  return {
    message: 'Hasło zostało zmienione.',
  }
}
