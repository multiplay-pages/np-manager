import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  putMock: vi.fn(),
}))

vi.mock('./api.client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    put: (...args: unknown[]) => putMock(...args),
  },
}))

import {
  getAdminSystemModeSettings,
  updateAdminSystemModeSettings,
} from './adminSystemModeSettings.api'

describe('adminSystemModeSettings.api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads settings from admin endpoint', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        data: {
          settings: {
            mode: 'STANDALONE',
            pliCbd: {
              enabled: false,
              endpointUrl: '',
              credentialsRef: '',
              operatorCode: '',
            },
          },
          diagnostics: {
            configured: false,
            active: false,
            missingFields: ['endpointUrl', 'credentialsRef', 'operatorCode'],
          },
          capabilities: {
            mode: 'STANDALONE',
            pliCbd: {
              enabled: false,
              configured: false,
              active: false,
              capabilities: {
                export: false,
                sync: false,
                diagnostics: false,
                externalActions: false,
              },
            },
            resolvedAt: '2026-04-16T10:00:00.000Z',
          },
        },
      },
    })

    const result = await getAdminSystemModeSettings()

    expect(getMock).toHaveBeenCalledWith('/admin/system-mode-settings')
    expect(result.settings.mode).toBe('STANDALONE')
    expect(result.diagnostics.active).toBe(false)
  })

  it('saves settings to admin endpoint', async () => {
    const payload = {
      mode: 'PLI_CBD_INTEGRATED' as const,
      pliCbd: {
        enabled: true,
        endpointUrl: 'https://pli.example.test',
        credentialsRef: 'secret/pli',
        operatorCode: 'OP01',
      },
    }

    putMock.mockResolvedValueOnce({
      data: {
        data: {
          settings: payload,
          diagnostics: {
            configured: true,
            active: true,
            missingFields: [],
          },
          capabilities: {
            mode: 'PLI_CBD_INTEGRATED',
            pliCbd: {
              enabled: true,
              configured: true,
              active: true,
              capabilities: {
                export: true,
                sync: true,
                diagnostics: true,
                externalActions: true,
              },
            },
            resolvedAt: '2026-04-16T10:00:00.000Z',
          },
        },
      },
    })

    const result = await updateAdminSystemModeSettings(payload)

    expect(putMock).toHaveBeenCalledWith('/admin/system-mode-settings', payload)
    expect(result.capabilities.pliCbd.active).toBe(true)
  })
})
