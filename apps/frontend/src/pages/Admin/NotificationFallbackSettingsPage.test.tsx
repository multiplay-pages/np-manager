import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  NotificationFallbackSettingsPage,
  computeReadiness,
  shouldRequireEnableConfirmation,
  validateFallbackForm,
} from './NotificationFallbackSettingsPage'

const { authState, getSettingsMock, mockedUseAuthStore, updateSettingsMock } = vi.hoisted(() => {
  const state: {
    user: {
      id: string
      email: string
      firstName: string
      lastName: string
      role: 'ADMIN' | 'BOK_CONSULTANT'
      forcePasswordChange: boolean
    } | null
  } = {
    user: {
      id: 'admin-1',
      email: 'admin@np-manager.local',
      firstName: 'Anna',
      lastName: 'Admin',
      role: 'ADMIN',
      forcePasswordChange: false,
    },
  }

  const store = Object.assign((selector?: (value: typeof state) => unknown) => {
    return selector ? selector(state) : state
  }, {
    getState: () => state,
  })

  return {
    authState: state,
    getSettingsMock: vi.fn(),
    mockedUseAuthStore: store,
    updateSettingsMock: vi.fn(),
  }
})

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: mockedUseAuthStore,
}))

vi.mock('@/services/adminNotificationFallbackSettings.api', () => ({
  getAdminNotificationFallbackSettings: getSettingsMock,
  updateAdminNotificationFallbackSettings: updateSettingsMock,
}))

beforeEach(() => {
  authState.user = {
    id: 'admin-1',
    email: 'admin@np-manager.local',
    firstName: 'Anna',
    lastName: 'Admin',
    role: 'ADMIN',
    forcePasswordChange: false,
  }
  getSettingsMock.mockReset()
  updateSettingsMock.mockReset()
  getSettingsMock.mockResolvedValue({
    fallbackEnabled: false,
    fallbackRecipientEmail: '',
    fallbackRecipientName: '',
    applyToFailed: true,
    applyToMisconfigured: true,
    readiness: 'DISABLED',
  })
})

describe('NotificationFallbackSettingsPage', () => {
  it('shows PageHeader and loading state for ADMIN user', () => {
    authState.user = {
      id: 'admin-1',
      email: 'admin@np-manager.local',
      firstName: 'Anna',
      lastName: 'Admin',
      role: 'ADMIN',
      forcePasswordChange: false,
    }

    const html = renderToStaticMarkup(<NotificationFallbackSettingsPage />)

    expect(html).toContain('Administracja')
    expect(html).toContain('Fallback notyfikacji')
    expect(html).toContain(
      'Konfiguracja zapasowego odbiorcy dla błędów wysyłki wewnętrznych notyfikacji portingowych.',
    )
    expect(html).toContain('Ładowanie ustawień...')
  })

  it('blocks non-admin users with the DS empty state copy', () => {
    authState.user = {
      id: 'bok-1',
      email: 'bok@np-manager.local',
      firstName: 'Jan',
      lastName: 'Konsultant',
      role: 'BOK_CONSULTANT',
      forcePasswordChange: false,
    }

    const html = renderToStaticMarkup(<NotificationFallbackSettingsPage />)

    expect(html).toContain('Brak dostępu do administracji')
    expect(html).toContain('Ta sekcja jest dostępna tylko dla administratora systemu.')
  })

})

describe('computeReadiness', () => {
  it('returns INCOMPLETE when fallback is enabled without email', () => {
    const readiness = computeReadiness({
      fallbackEnabled: true,
      fallbackRecipientEmail: '',
      fallbackRecipientName: '',
      applyToFailed: true,
      applyToMisconfigured: true,
    })

    expect(readiness).toBe('INCOMPLETE')
  })

  it('returns READY when fallback is enabled with email', () => {
    const readiness = computeReadiness({
      fallbackEnabled: true,
      fallbackRecipientEmail: 'fallback@multiplay.pl',
      fallbackRecipientName: 'Fallback BOK',
      applyToFailed: true,
      applyToMisconfigured: false,
    })

    expect(readiness).toBe('READY')
  })

  it('returns DISABLED when fallback is off, regardless of email', () => {
    const readiness = computeReadiness({
      fallbackEnabled: false,
      fallbackRecipientEmail: 'not-an-email',
      fallbackRecipientName: '',
      applyToFailed: true,
      applyToMisconfigured: true,
    })

    expect(readiness).toBe('DISABLED')
  })
})

describe('validateFallbackForm', () => {
  it('does not block save for invalid email when fallback is off', () => {
    const error = validateFallbackForm({
      fallbackEnabled: false,
      fallbackRecipientEmail: 'niepoprawny-email',
      fallbackRecipientName: '',
      applyToFailed: true,
      applyToMisconfigured: true,
    })

    expect(error).toBeNull()
  })

  it('requires email when fallback is on', () => {
    const error = validateFallbackForm({
      fallbackEnabled: true,
      fallbackRecipientEmail: '',
      fallbackRecipientName: '',
      applyToFailed: true,
      applyToMisconfigured: true,
    })

    expect(error).toBe('Podaj adres e-mail odbiorcy fallbacku, gdy fallback jest włączony.')
  })

  it('requires valid email when fallback is on', () => {
    const error = validateFallbackForm({
      fallbackEnabled: true,
      fallbackRecipientEmail: 'niepoprawny-email',
      fallbackRecipientName: '',
      applyToFailed: true,
      applyToMisconfigured: true,
    })

    expect(error).toBe('Podaj poprawny adres e-mail.')
  })
})

describe('shouldRequireEnableConfirmation', () => {
  it('requires confirmation for OFF to ON transition', () => {
    const saved = {
      fallbackEnabled: false,
      fallbackRecipientEmail: '',
      fallbackRecipientName: '',
      applyToFailed: true,
      applyToMisconfigured: true,
    }
    const form = {
      ...saved,
      fallbackEnabled: true,
      fallbackRecipientEmail: 'fallback@multiplay.pl',
    }

    expect(shouldRequireEnableConfirmation(saved, form)).toBe(true)
  })

  it('does not require confirmation when fallback was already enabled', () => {
    const saved = {
      fallbackEnabled: true,
      fallbackRecipientEmail: 'fallback@multiplay.pl',
      fallbackRecipientName: '',
      applyToFailed: true,
      applyToMisconfigured: true,
    }
    const form = {
      ...saved,
      fallbackRecipientEmail: 'nowy-fallback@multiplay.pl',
    }

    expect(shouldRequireEnableConfirmation(saved, form)).toBe(false)
  })
})
