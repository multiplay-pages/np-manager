import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { PortingNotificationSettingsPage } from './PortingNotificationSettingsPage'

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

vi.mock('@/services/adminPortingNotificationSettings.api', () => ({
  getAdminPortingNotificationSettings: vi.fn(),
  updateAdminPortingNotificationSettings: vi.fn(),
}))

describe('PortingNotificationSettingsPage', () => {
  it('shows admin panel shell for ADMIN user', () => {
    authState.user = {
      id: 'admin-1',
      email: 'admin@np-manager.local',
      firstName: 'Anna',
      lastName: 'Admin',
      role: 'ADMIN',
      forcePasswordChange: false,
    }

    const html = renderToStaticMarkup(<PortingNotificationSettingsPage />)

    expect(html).toContain('Powiadomienia portingowe')
    expect(html).toContain('Ładowanie ustawień...')
  })

  it('blocks non-admin users from admin settings view', () => {
    authState.user = {
      id: 'bok-1',
      email: 'bok@np-manager.local',
      firstName: 'Jan',
      lastName: 'Konsultant',
      role: 'BOK_CONSULTANT',
      forcePasswordChange: false,
    }

    const html = renderToStaticMarkup(<PortingNotificationSettingsPage />)

    expect(html).toContain('Brak dostępu do administracji')
    expect(html).toContain('Ta sekcja jest dostępna tylko dla administratora systemu.')
  })
})
