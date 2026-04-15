import { describe, expect, it } from 'vitest'
import {
  getDefaultAuthenticatedRoute,
  getForcePasswordChangeErrorMessage,
  getForcePasswordChangeRouteRedirect,
  getProtectedRouteRedirect,
  resolvePostLoginDestination,
  validateForcePasswordChangeForm,
} from './authFlow'

describe('authFlow helpers', () => {
  it('redirects login flow to force-password-change when the flag is active', () => {
    expect(
      getDefaultAuthenticatedRoute({
        forcePasswordChange: true,
      }),
    ).toBe('/force-password-change')
  })

  it('returns the dashboard after the password has been changed successfully', () => {
    expect(
      getDefaultAuthenticatedRoute({
        forcePasswordChange: false,
      }),
    ).toBe('/')
  })

  it('does not redirect a normal authenticated user away from the application', () => {
    expect(
      getProtectedRouteRedirect({
        isAuthenticated: true,
        user: {
          id: 'user-1',
          email: 'jan.kowalski@np-manager.local',
          firstName: 'Jan',
          lastName: 'Kowalski',
          role: 'BOK_CONSULTANT',
          forcePasswordChange: false,
        },
        pathname: '/requests',
      }),
    ).toBeNull()
  })

  it('blocks standard routes for a user with forcePasswordChange=true', () => {
    expect(
      getProtectedRouteRedirect({
        isAuthenticated: true,
        user: {
          id: 'user-1',
          email: 'jan.kowalski@np-manager.local',
          firstName: 'Jan',
          lastName: 'Kowalski',
          role: 'BOK_CONSULTANT',
          forcePasswordChange: true,
        },
        pathname: '/requests',
      }),
    ).toBe('/force-password-change')
  })

  it('allows the dedicated force-password-change route for a blocked user', () => {
    expect(
      getProtectedRouteRedirect({
        isAuthenticated: true,
        user: {
          id: 'user-1',
          email: 'jan.kowalski@np-manager.local',
          firstName: 'Jan',
          lastName: 'Kowalski',
          role: 'BOK_CONSULTANT',
          forcePasswordChange: true,
        },
        pathname: '/force-password-change',
      }),
    ).toBeNull()
  })

  it('redirects an unlocked user away from the force-password-change screen', () => {
    expect(
      getForcePasswordChangeRouteRedirect({
        isAuthenticated: true,
        user: {
          id: 'user-1',
          email: 'jan.kowalski@np-manager.local',
          firstName: 'Jan',
          lastName: 'Kowalski',
          role: 'BOK_CONSULTANT',
          forcePasswordChange: false,
        },
      }),
    ).toBe('/')
  })

  it('sends an unauthenticated visitor on the force-password-change route to login', () => {
    expect(
      getForcePasswordChangeRouteRedirect({
        isAuthenticated: false,
        user: null,
      }),
    ).toBe('/login')
  })

  it('validates required fields for the forced password change form', () => {
    expect(
      validateForcePasswordChangeForm({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      }),
    ).toMatchObject({
      currentPassword: 'Obecne hasło jest wymagane.',
      newPassword: 'Nowe hasło jest wymagane.',
      confirmNewPassword: 'Potwierdzenie nowego hasła jest wymagane.',
    })
  })

  it('validates mismatched password confirmation', () => {
    expect(
      validateForcePasswordChangeForm({
        currentPassword: 'Temp@1234',
        newPassword: 'NoweHaslo@1234',
        confirmNewPassword: 'InneHaslo@1234',
      }),
    ).toMatchObject({
      confirmNewPassword: 'Nowe hasło i potwierdzenie muszą być identyczne.',
    })
  })

  it('blocks reusing the current password', () => {
    expect(
      validateForcePasswordChangeForm({
        currentPassword: 'ToSamoHaslo@1234',
        newPassword: 'ToSamoHaslo@1234',
        confirmNewPassword: 'ToSamoHaslo@1234',
      }),
    ).toMatchObject({
      newPassword: 'Nowe hasło nie może być takie samo jak obecne.',
    })
  })

  it('maps backend password errors to friendly Polish copy', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          error: {
            code: 'INVALID_CURRENT_PASSWORD',
          },
        },
      },
    }

    expect(getForcePasswordChangeErrorMessage(error)).toBe('Obecne hasło jest nieprawidłowe.')
  })
})

describe('resolvePostLoginDestination', () => {
  const normalUser = { forcePasswordChange: false }
  const lockedUser = { forcePasswordChange: true }

  it('returns dashboard when no `from` is provided', () => {
    expect(resolvePostLoginDestination(normalUser, undefined)).toBe('/')
  })

  it('returns dashboard when `from` is null', () => {
    expect(resolvePostLoginDestination(normalUser, null)).toBe('/')
  })

  it('returns `from` when it is a valid internal path', () => {
    expect(resolvePostLoginDestination(normalUser, '/requests/FNP-2026-001')).toBe(
      '/requests/FNP-2026-001',
    )
  })

  it('returns `from` preserving query params', () => {
    expect(resolvePostLoginDestination(normalUser, '/requests?status=SUBMITTED')).toBe(
      '/requests?status=SUBMITTED',
    )
  })

  it('rejects `from` equal to /login (avoids redirect loop)', () => {
    expect(resolvePostLoginDestination(normalUser, '/login')).toBe('/')
  })

  it('rejects `from` that does not start with / (external URL)', () => {
    expect(resolvePostLoginDestination(normalUser, 'https://evil.com')).toBe('/')
  })

  it('forcePasswordChange always takes priority over valid `from`', () => {
    expect(resolvePostLoginDestination(lockedUser, '/requests/FNP-2026-001')).toBe(
      '/force-password-change',
    )
  })

  it('forcePasswordChange takes priority even when `from` is absent', () => {
    expect(resolvePostLoginDestination(lockedUser, undefined)).toBe('/force-password-change')
  })
})
