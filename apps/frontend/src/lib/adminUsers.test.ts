import { describe, expect, it } from 'vitest'
import { USER_ADMIN_ACTION_TYPES } from '@np-manager/shared'
import {
  buildAdminAuditEntryView,
  formatAdminUsersSummaryValue,
  getAdminUserErrorMessage,
  getAdminUserRoleDraftAfterSaveError,
  isAdminUserSelfDeactivationDisabled,
} from './adminUsers'

const SELECTED_USER = {
  id: 'user-1',
  email: 'jan.kowalski@firma.pl',
  firstName: 'Jan',
  lastName: 'Kowalski',
  role: 'BOK_CONSULTANT' as const,
  isActive: true,
  forcePasswordChange: true,
  passwordChangedAt: null,
  lastLoginAt: null,
  deactivatedAt: null,
  deactivatedByUserId: null,
  reactivatedAt: null,
  reactivatedByUserId: null,
  createdAt: '2026-04-01T10:00:00.000Z',
  updatedAt: '2026-04-02T10:00:00.000Z',
}

describe('adminUsers helpers', () => {
  it('maps protected admin errors to friendly business copy', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          error: {
            code: 'LAST_ACTIVE_ADMIN_PROTECTED',
          },
        },
      },
    }

    expect(
      getAdminUserErrorMessage(error, 'Wystapil blad serwera. Sprobuj ponownie za chwile.'),
    ).toBe(
      'Ta operacja jest zablokowana, bo w systemie musi pozostać co najmniej jeden aktywny administrator.',
    )
  })

  it('prefers generic 403 message over raw backend payloads', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 403,
        data: {
          error: {
            code: 'FORBIDDEN',
            message: 'forbidden',
          },
        },
      },
    }

    expect(getAdminUserErrorMessage(error, 'fallback')).toBe(
      'Nie masz uprawnien do wykonania tej operacji.',
    )
  })

  it('renders readable audit entry descriptions instead of raw JSON dumps', () => {
    const entry = buildAdminAuditEntryView(
      {
        id: 'audit-1',
        targetUserId: 'user-1',
        actorUserId: 'admin-1',
        actionType: USER_ADMIN_ACTION_TYPES.USER_ROLE_CHANGED,
        previousStateJson: { role: 'BOK_CONSULTANT' },
        nextStateJson: { role: 'ADMIN' },
        reason: null,
        createdAt: '2026-04-08T10:00:00.000Z',
      },
      {
        'admin-1': {
          id: 'admin-1',
          firstName: 'Anna',
          lastName: 'Admin',
          role: 'ADMIN',
        },
      },
      SELECTED_USER,
    )

    expect(entry.actionLabel).toBe('Zmiana roli')
    expect(entry.description).toBe('Rola zmieniona z Konsultant BOK na Administrator.')
    expect(entry.actorLabel).toContain('Anna Admin')
  })

  it('describes password reset entries without exposing password values', () => {
    const entry = buildAdminAuditEntryView(
      {
        id: 'audit-2',
        targetUserId: 'user-1',
        actorUserId: 'admin-1',
        actionType: USER_ADMIN_ACTION_TYPES.USER_PASSWORD_RESET,
        previousStateJson: null,
        nextStateJson: { forcePasswordChange: true, passwordResetAt: '2026-04-08T11:00:00.000Z' },
        reason: null,
        createdAt: '2026-04-08T11:00:00.000Z',
      },
      {
        'admin-1': {
          id: 'admin-1',
          firstName: 'Anna',
          lastName: 'Admin',
          role: 'ADMIN',
        },
      },
      SELECTED_USER,
    )

    expect(entry.actionLabel).toBe('Reset hasla')
    expect(entry.description).toContain('Haslo zostalo zresetowane')
    expect(entry.description).not.toContain('NewTemp')
  })

  it('uses placeholder values for summary cards while users list is loading', () => {
    expect(formatAdminUsersSummaryValue(0, true)).toBe('--')
    expect(formatAdminUsersSummaryValue(3, false)).toBe('3')
  })

  it('resets role draft to the persisted backend value after a save error', () => {
    expect(getAdminUserRoleDraftAfterSaveError({ role: 'ADMIN' }, 'BOK_CONSULTANT')).toBe('ADMIN')
  })

  it('maps self-deactivation errors to Polish UI copy with diacritics', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          error: {
            code: 'CANNOT_DEACTIVATE_SELF',
          },
        },
      },
    }

    expect(getAdminUserErrorMessage(error, 'fallback')).toBe(
      'Nie możesz dezaktywować własnego konta.',
    )
  })

  it('marks self-deactivation as disabled only for the currently logged-in active account', () => {
    expect(
      isAdminUserSelfDeactivationDisabled({
        currentUserId: 'admin-1',
        targetUserId: 'admin-1',
        isActive: true,
      }),
    ).toBe(true)

    expect(
      isAdminUserSelfDeactivationDisabled({
        currentUserId: 'admin-1',
        targetUserId: 'user-1',
        isActive: true,
      }),
    ).toBe(false)
  })
})
