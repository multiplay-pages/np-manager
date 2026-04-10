import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import {
  Badge,
  NotificationFallbackSettingsPage,
  computeReadiness,
} from './NotificationFallbackSettingsPage'

// ============================================================
// Mocks
// ============================================================

const { authState, mockedUseAuthStore } = vi.hoisted(() => {
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

  return { authState: state, mockedUseAuthStore: store }
})

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: mockedUseAuthStore,
}))

vi.mock('@/services/adminNotificationFallbackSettings.api', () => ({
  getAdminNotificationFallbackSettings: vi.fn(),
  updateAdminNotificationFallbackSettings: vi.fn(),
}))

// ============================================================
// Testy strony (renderToStaticMarkup — synchroniczne, bez efektów)
// ============================================================

describe('NotificationFallbackSettingsPage', () => {
  it('render — heading strony widoczny gdy user.role === ADMIN', () => {
    authState.user = {
      id: 'admin-1',
      email: 'admin@np-manager.local',
      firstName: 'Anna',
      lastName: 'Admin',
      role: 'ADMIN',
      forcePasswordChange: false,
    }

    const html = renderToStaticMarkup(<NotificationFallbackSettingsPage />)

    expect(html).toContain('Ustawienia fallback notyfikacji')
    expect(html).toContain('Konfiguracja zapasowego odbiorcy dla nieudanych notyfikacji.')
  })

  it('loading — komunikat ladowania widoczny na wejsciu', () => {
    authState.user = {
      id: 'admin-1',
      email: 'admin@np-manager.local',
      firstName: 'Anna',
      lastName: 'Admin',
      role: 'ADMIN',
      forcePasswordChange: false,
    }

    const html = renderToStaticMarkup(<NotificationFallbackSettingsPage />)

    expect(html).toContain('Ladowanie ustawien...')
  })
})

describe('NotificationFallbackSettingsPage — dostep', () => {
  it('blokuje uzytkownika z rola BOK_CONSULTANT', () => {
    authState.user = {
      id: 'bok-1',
      email: 'bok@np-manager.local',
      firstName: 'Jan',
      lastName: 'Konsultant',
      role: 'BOK_CONSULTANT',
      forcePasswordChange: false,
    }

    const html = renderToStaticMarkup(<NotificationFallbackSettingsPage />)

    expect(html).toContain('Brak dostepu do administracji')
    expect(html).toContain('Ta sekcja jest dostepna tylko dla administratora systemu.')
  })
})

// ============================================================
// Testy komponentu Badge (testy jednostkowe — renderToStaticMarkup)
// ============================================================

describe('Badge', () => {
  it('badge DISABLED: renderuje etykiete "Fallback wylaczony" z tonem neutral', () => {
    const html = renderToStaticMarkup(
      <Badge tone="neutral">Fallback wyłączony</Badge>,
    )

    expect(html).toContain('Fallback wyłączony')
    expect(html).toContain('bg-gray-100')
    expect(html).toContain('text-gray-700')
  })

  it('badge READY: renderuje etykiete "Fallback aktywny" z tonem success', () => {
    const html = renderToStaticMarkup(
      <Badge tone="success">Fallback aktywny</Badge>,
    )

    expect(html).toContain('Fallback aktywny')
    expect(html).toContain('bg-green-50')
    expect(html).toContain('text-green-700')
  })

  it('badge INCOMPLETE: renderuje etykiete "Konfiguracja niekompletna" z tonem warning', () => {
    const html = renderToStaticMarkup(
      <Badge tone="warning">Konfiguracja niekompletna</Badge>,
    )

    expect(html).toContain('Konfiguracja niekompletna')
    expect(html).toContain('bg-amber-50')
    expect(html).toContain('text-amber-700')
  })
})

// ============================================================
// Testy computeReadiness (logika walidacji / stanu fallbacku)
// ============================================================

describe('computeReadiness', () => {
  it('walidacja: fallbackEnabled=true i pusty email zwraca INCOMPLETE', () => {
    const readiness = computeReadiness({
      fallbackEnabled: true,
      fallbackRecipientEmail: '',
      fallbackRecipientName: '',
      applyToFailed: true,
      applyToMisconfigured: true,
    })

    expect(readiness).toBe('INCOMPLETE')
  })

  it('sukces: fallbackEnabled=true z wypelnionym emailem zwraca READY', () => {
    const readiness = computeReadiness({
      fallbackEnabled: true,
      fallbackRecipientEmail: 'fallback@multiplay.pl',
      fallbackRecipientName: 'Fallback BOK',
      applyToFailed: true,
      applyToMisconfigured: false,
    })

    expect(readiness).toBe('READY')
  })

  it('blad: fallbackEnabled=false zwraca DISABLED niezaleznie od emaila', () => {
    const readiness = computeReadiness({
      fallbackEnabled: false,
      fallbackRecipientEmail: 'fallback@multiplay.pl',
      fallbackRecipientName: '',
      applyToFailed: true,
      applyToMisconfigured: true,
    })

    expect(readiness).toBe('DISABLED')
  })
})
