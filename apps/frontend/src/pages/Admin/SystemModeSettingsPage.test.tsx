import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import {
  buildSystemModeSettingsPayload,
  isValidOptionalUrl,
  SystemModeSettingsPage,
} from './SystemModeSettingsPage'

const { authState, mockedUseAuthStore, setSnapshotMock } = vi.hoisted(() => {
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

  return { authState: state, mockedUseAuthStore: store, setSnapshotMock: vi.fn() }
})

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: mockedUseAuthStore,
}))

vi.mock('@/stores/systemCapabilities.store', () => ({
  useSystemCapabilitiesStore: (selector: (state: { setSnapshot: typeof setSnapshotMock }) => unknown) =>
    selector({ setSnapshot: setSnapshotMock }),
}))

vi.mock('@/services/adminSystemModeSettings.api', () => ({
  getAdminSystemModeSettings: vi.fn(),
  updateAdminSystemModeSettings: vi.fn(),
}))

describe('SystemModeSettingsPage', () => {
  it('shows admin panel shell for ADMIN user', () => {
    authState.user = {
      id: 'admin-1',
      email: 'admin@np-manager.local',
      firstName: 'Anna',
      lastName: 'Admin',
      role: 'ADMIN',
      forcePasswordChange: false,
    }

    const html = renderToStaticMarkup(<SystemModeSettingsPage />)

    expect(html).toContain('Tryb systemu i PLI CBD')
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

    const html = renderToStaticMarkup(<SystemModeSettingsPage />)

    expect(html).toContain('Brak dostępu do administracji')
    expect(html).toContain('Ta sekcja jest dostępna tylko dla administratora systemu.')
  })

  it('validates optional endpoint URL syntactically', () => {
    expect(isValidOptionalUrl('')).toBe(true)
    expect(isValidOptionalUrl(' https://pli.example.test/api ')).toBe(true)
    expect(isValidOptionalUrl('not-a-url')).toBe(false)
    expect(isValidOptionalUrl('ftp://pli.example.test')).toBe(false)
  })

  it('builds normalized save payload', () => {
    const payload = buildSystemModeSettingsPayload({
      mode: 'PLI_CBD_INTEGRATED',
      pliCbdEnabled: true,
      pliCbdEndpointUrl: ' https://pli.example.test/api ',
      pliCbdCredentialsRef: ' secret/pli ',
      pliCbdOperatorCode: ' op01 ',
    })

    expect(payload).toEqual({
      mode: 'PLI_CBD_INTEGRATED',
      pliCbd: {
        enabled: true,
        endpointUrl: 'https://pli.example.test/api',
        credentialsRef: 'secret/pli',
        operatorCode: 'OP01',
      },
    })
  })
})
