import bcrypt from 'bcrypt'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/app-error'
import { logAuditEvent } from '../../shared/audit/audit.service'
import type { CreateUserBody, UserDto } from './users.schema'
import { USER_SAFE_SELECT } from './users.schema'

const BCRYPT_ROUNDS = 12

// ============================================================
// LIST USERS
// ============================================================

/**
 * Zwraca listę wszystkich użytkowników posortowaną po nazwisku.
 * Nie zwraca passwordHash — select jawnie ogranicza pola.
 */
export async function listUsers(): Promise<UserDto[]> {
  return prisma.user.findMany({
    select: USER_SAFE_SELECT,
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })
}

// ============================================================
// CREATE USER
// ============================================================

/**
 * Tworzy nowego użytkownika w systemie.
 *
 * - Sprawdza unikalność e-maila → 409 CONFLICT
 * - Hashuje hasło tymczasowe (bcrypt, cost=12)
 * - Loguje utworzenie do audit log
 *
 * @param body         - zwalidowane dane nowego użytkownika
 * @param performedBy  - ID administratora wykonującego operację (do audytu)
 * @param ipAddress    - IP żądania (do audytu)
 * @param userAgent    - User-Agent (do audytu)
 */
export async function createUser(
  body: CreateUserBody,
  performedBy: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<UserDto> {
  // Sprawdź unikalność e-maila
  const existingUser = await prisma.user.findUnique({
    where: { email: body.email },
    select: { id: true },
  })

  if (existingUser) {
    throw AppError.conflict(
      'Użytkownik o podanym adresie e-mail już istnieje.',
      'EMAIL_ALREADY_EXISTS',
    )
  }

  // Hashuj hasło tymczasowe
  const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS)

  // Utwórz użytkownika
  const user = await prisma.user.create({
    data: {
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      role: body.role,
      passwordHash,
    },
    select: USER_SAFE_SELECT,
  })

  // Audit log — obowiązkowy (await), ale nie blokujemy jeśli się nie uda
  await logAuditEvent({
    action: 'CREATE',
    userId: performedBy,
    entityType: 'user',
    entityId: user.id,
    newValue: `Created user: ${user.email}, role: ${user.role}`,
    ipAddress,
    userAgent,
  })

  return user
}

// ============================================================
// DEACTIVATE USER
// ============================================================

/**
 * Dezaktywuje konto użytkownika (soft delete — isActive = false).
 *
 * - Nie pozwala administratorowi dezaktywować samego siebie
 * - Sprawdza czy użytkownik istnieje → 404
 * - Sprawdza czy użytkownik nie jest już dezaktywowany → 409
 * - Loguje dezaktywację do audit log
 *
 * @param userId       - ID dezaktywowanego użytkownika
 * @param performedBy  - ID administratora wykonującego operację
 * @param ipAddress    - IP żądania
 * @param userAgent    - User-Agent
 */
export async function deactivateUser(
  userId: string,
  performedBy: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<UserDto> {
  // Nie pozwól na dezaktywację własnego konta
  if (userId === performedBy) {
    throw AppError.badRequest(
      'Nie można dezaktywować własnego konta administratora.',
      'CANNOT_DEACTIVATE_SELF',
    )
  }

  // Pobierz użytkownika
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isActive: true },
  })

  if (!user) {
    throw AppError.notFound('Użytkownik nie został znaleziony.')
  }

  if (!user.isActive) {
    throw AppError.conflict(
      'Konto użytkownika jest już dezaktywowane.',
      'ALREADY_DEACTIVATED',
    )
  }

  // Dezaktywuj
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
    select: USER_SAFE_SELECT,
  })

  // Audit log
  await logAuditEvent({
    action: 'UPDATE',
    userId: performedBy,
    entityType: 'user',
    entityId: userId,
    fieldName: 'isActive',
    oldValue: 'true',
    newValue: 'false',
    ipAddress,
    userAgent,
  })

  return updatedUser
}
