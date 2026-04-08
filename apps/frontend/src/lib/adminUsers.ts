import axios from 'axios'
import {
  USER_ADMIN_ACTION_TYPES,
  USER_ROLE_LABELS,
  type AdminUserDetailDto,
  type AdminUserListItemDto,
  type UserAdminAuditLogItemDto,
  type UserRole,
} from '@np-manager/shared'

const ADMIN_USER_ERROR_MESSAGES: Record<string, string> = {
  LAST_ACTIVE_ADMIN_PROTECTED:
    'Ta operacja jest zablokowana, bo w systemie musi pozostać co najmniej jeden aktywny administrator.',
  CANNOT_DEACTIVATE_SELF: 'Nie możesz dezaktywować własnego konta.',
  EMAIL_ALREADY_EXISTS: 'Uzytkownik z tym adresem e-mail juz istnieje.',
  USER_NOT_FOUND: 'Wybrany uzytkownik nie istnieje lub zostal usuniety z widoku.',
  ALREADY_DEACTIVATED: 'To konto jest juz dezaktywowane.',
  ALREADY_ACTIVE: 'To konto jest juz aktywne.',
  VALIDATION_ERROR: 'Nieprawidlowe dane formularza. Sprawdz oznaczone pola.',
  FORBIDDEN: 'Nie masz uprawnien do wykonania tej operacji.',
}

type AdminUserSummary = Pick<
  AdminUserListItemDto | AdminUserDetailDto,
  'id' | 'firstName' | 'lastName' | 'role'
>

interface AxiosApiErrorShape {
  error?: {
    code?: string
    message?: string
    details?: Record<string, string[]>
  }
}

export interface AdminUserAuditEntryView {
  id: string
  actionLabel: string
  description: string
  actorLabel: string
  createdAt: string
  detailLines: string[]
}

export function formatAdminUsersSummaryValue(value: number, isLoading: boolean): string {
  return isLoading ? '--' : String(value)
}

export function getAdminUserRoleDraftAfterSaveError(
  selectedUser: Pick<AdminUserDetailDto, 'role'> | null,
  currentDraft: UserRole,
): UserRole {
  return selectedUser?.role ?? currentDraft
}

export function isAdminUserSelfDeactivationDisabled(params: {
  currentUserId: string | null | undefined
  targetUserId: string | null | undefined
  isActive: boolean
}): boolean {
  return (
    params.isActive &&
    Boolean(params.currentUserId) &&
    Boolean(params.targetUserId) &&
    params.currentUserId === params.targetUserId
  )
}

export function getAdminUserDisplayName(
  user: Pick<AdminUserSummary, 'firstName' | 'lastName'>,
): string {
  return `${user.firstName} ${user.lastName}`.trim()
}

export function formatAdminUserDateTime(value: string | null): string {
  if (!value) {
    return 'Brak danych'
  }

  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function getAdminUserStatusLabel(isActive: boolean): string {
  return isActive ? 'Aktywny' : 'Nieaktywny'
}

export function getAdminUserErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback
  }

  const response = error.response
  const apiError = response?.data as AxiosApiErrorShape | undefined
  const code = apiError?.error?.code
  const message = apiError?.error?.message

  if (response?.status === 403) {
    return 'Nie masz uprawnien do wykonania tej operacji.'
  }

  if (response?.status && response.status >= 500) {
    return 'Wystapil blad serwera. Sprobuj ponownie za chwile.'
  }

  if (code && ADMIN_USER_ERROR_MESSAGES[code]) {
    return ADMIN_USER_ERROR_MESSAGES[code]
  }

  if (message) {
    return message
  }

  return fallback
}

export function getAdminUserValidationErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) {
    return {}
  }

  const apiError = error.response?.data as AxiosApiErrorShape | undefined
  const details = apiError?.error?.details

  if (!details) {
    return {}
  }

  return Object.entries(details).reduce<Record<string, string>>((acc, [field, messages]) => {
    if (messages[0]) {
      acc[field] = messages[0]
    }
    return acc
  }, {})
}

function getActorLabel(
  actorUserId: string,
  usersMap: Record<string, AdminUserSummary>,
  selectedUser: AdminUserDetailDto,
): string {
  if (actorUserId === selectedUser.id) {
    return `${getAdminUserDisplayName(selectedUser)} (to konto)`
  }

  const actor = usersMap[actorUserId]

  if (!actor) {
    return `Uzytkownik ${actorUserId}`
  }

  return `${getAdminUserDisplayName(actor)} (${USER_ROLE_LABELS[actor.role]})`
}

function getRoleLabel(role: unknown): string {
  if (typeof role === 'string' && role in USER_ROLE_LABELS) {
    return USER_ROLE_LABELS[role as UserRole]
  }

  return 'Nieznana rola'
}

export function buildAdminAuditEntryView(
  log: UserAdminAuditLogItemDto,
  usersMap: Record<string, AdminUserSummary>,
  selectedUser: AdminUserDetailDto,
): AdminUserAuditEntryView {
  const previousState = log.previousStateJson ?? {}
  const nextState = log.nextStateJson ?? {}
  const detailLines: string[] = []
  let actionLabel = 'Zmiana administracyjna'
  let description = 'Wykonano operacje administracyjna na koncie.'

  switch (log.actionType) {
    case USER_ADMIN_ACTION_TYPES.USER_CREATED: {
      actionLabel = 'Utworzenie konta'
      description = `Konto utworzone z rola ${getRoleLabel(nextState.role)}.`

      if (nextState.forcePasswordChange === true) {
        detailLines.push('Wymaganie zmiany hasla zostalo ustawione.')
      }

      break
    }
    case USER_ADMIN_ACTION_TYPES.USER_ROLE_CHANGED: {
      actionLabel = 'Zmiana roli'
      description = `Rola zmieniona z ${getRoleLabel(previousState.role)} na ${getRoleLabel(nextState.role)}.`
      break
    }
    case USER_ADMIN_ACTION_TYPES.USER_DEACTIVATED: {
      actionLabel = 'Dezaktywacja konta'
      description = 'Konto zostalo dezaktywowane.'

      if (typeof nextState.deactivatedAt === 'string') {
        detailLines.push(`Data dezaktywacji: ${formatAdminUserDateTime(nextState.deactivatedAt)}`)
      }

      break
    }
    case USER_ADMIN_ACTION_TYPES.USER_REACTIVATED: {
      actionLabel = 'Reaktywacja konta'
      description = 'Konto zostalo ponownie aktywowane.'

      if (typeof nextState.reactivatedAt === 'string') {
        detailLines.push(`Data reaktywacji: ${formatAdminUserDateTime(nextState.reactivatedAt)}`)
      }

      break
    }
    case USER_ADMIN_ACTION_TYPES.USER_PASSWORD_RESET: {
      actionLabel = 'Reset hasla'
      description = 'Haslo zostalo zresetowane, a wymaganie zmiany hasla pozostalo aktywne.'
      break
    }
    default:
      break
  }

  if (log.reason) {
    detailLines.push(`Powod: ${log.reason}`)
  }

  return {
    id: log.id,
    actionLabel,
    description,
    actorLabel: getActorLabel(log.actorUserId, usersMap, selectedUser),
    createdAt: log.createdAt,
    detailLines,
  }
}
