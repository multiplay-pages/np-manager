import axios from 'axios'
import type { AuthUser } from '@np-manager/shared'
import { ROUTES } from '@/constants/routes'

interface ApiErrorResponseShape {
  error?: {
    code?: string
    message?: string
    details?: Record<string, string[]>
  }
}

export interface ForcePasswordChangeFormState {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

export type ForcePasswordChangeFormErrors = Partial<
  Record<keyof ForcePasswordChangeFormState | '_root', string>
>

export function getDefaultAuthenticatedRoute(user: Pick<AuthUser, 'forcePasswordChange'>): string {
  return user.forcePasswordChange ? ROUTES.FORCE_PASSWORD_CHANGE : ROUTES.DASHBOARD
}

export function getProtectedRouteRedirect(params: {
  isAuthenticated: boolean
  user: AuthUser | null
  pathname: string
}): string | null {
  if (!params.isAuthenticated) {
    return ROUTES.LOGIN
  }

  if (!params.user) {
    return ROUTES.LOGIN
  }

  if (params.user.forcePasswordChange && params.pathname !== ROUTES.FORCE_PASSWORD_CHANGE) {
    return ROUTES.FORCE_PASSWORD_CHANGE
  }

  return null
}

export function getForcePasswordChangeRouteRedirect(params: {
  isAuthenticated: boolean
  user: AuthUser | null
}): string | null {
  if (!params.isAuthenticated) {
    return ROUTES.LOGIN
  }

  if (!params.user) {
    return ROUTES.LOGIN
  }

  if (!params.user.forcePasswordChange) {
    return ROUTES.DASHBOARD
  }

  return null
}

export function validateForcePasswordChangeForm(
  form: ForcePasswordChangeFormState,
): ForcePasswordChangeFormErrors {
  const errors: ForcePasswordChangeFormErrors = {}

  if (!form.currentPassword) {
    errors.currentPassword = 'Obecne hasło jest wymagane.'
  }

  if (!form.newPassword) {
    errors.newPassword = 'Nowe hasło jest wymagane.'
  }

  if (!form.confirmNewPassword) {
    errors.confirmNewPassword = 'Potwierdzenie nowego hasła jest wymagane.'
  }

  if (form.newPassword && form.newPassword.length < 8) {
    errors.newPassword = 'Nowe hasło musi mieć co najmniej 8 znaków.'
  }

  if (form.newPassword && form.confirmNewPassword && form.newPassword !== form.confirmNewPassword) {
    errors.confirmNewPassword = 'Nowe hasło i potwierdzenie muszą być identyczne.'
  }

  if (form.currentPassword && form.newPassword && form.currentPassword === form.newPassword) {
    errors.newPassword = 'Nowe hasło nie może być takie samo jak obecne.'
  }

  return errors
}

export function getForcePasswordChangeErrorMessage(
  error: unknown,
  fallback = 'Nie udało się zmienić hasła. Spróbuj ponownie.',
): string {
  if (!axios.isAxiosError(error)) {
    return fallback
  }

  const response = error.response
  const apiError = response?.data as ApiErrorResponseShape | undefined
  const code = apiError?.error?.code
  const message = apiError?.error?.message

  if (code === 'INVALID_CURRENT_PASSWORD') {
    return 'Obecne hasło jest nieprawidłowe.'
  }

  if (code === 'PASSWORD_REUSE_NOT_ALLOWED') {
    return 'Nowe hasło nie może być takie samo jak obecne.'
  }

  if (code === 'ACCOUNT_UNAVAILABLE') {
    return 'Sesja jest nieaktywna. Zaloguj się ponownie.'
  }

  if (code === 'VALIDATION_ERROR') {
    return 'Nowe hasło nie spełnia minimalnych wymagań.'
  }

  if (response?.status && response.status >= 500) {
    return 'Wystąpił błąd serwera. Spróbuj ponownie za chwilę.'
  }

  if (message) {
    return message
  }

  return fallback
}
