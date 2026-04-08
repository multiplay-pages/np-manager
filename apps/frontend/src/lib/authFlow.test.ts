import { describe, expect, it } from 'vitest'
import {
  getDefaultAuthenticatedRoute,
  getForcePasswordChangeErrorMessage,
  getForcePasswordChangeRouteRedirect,
  getProtectedRouteRedirect,
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
