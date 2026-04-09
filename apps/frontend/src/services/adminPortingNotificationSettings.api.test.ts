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
  getAdminPortingNotificationSettings,
  updateAdminPortingNotificationSettings,
} from './adminPortingNotificationSettings.api'

describe('adminPortingNotificationSettings.api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads settings from admin endpoint', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        data: {
          sharedEmails: 'bok@multiplay.pl',
          teamsEnabled: false,
          teamsWebhookUrl: '',
          diagnostics: {
            emailAdapterMode: 'STUB',
            smtpConfigured: false,
          },
        },
      },
    })

    const result = await getAdminPortingNotificationSettings()

    expect(getMock).toHaveBeenCalledWith('/admin/porting-notification-settings')
    expect(result.sharedEmails).toBe('bok@multiplay.pl')
    expect(result.diagnostics.emailAdapterMode).toBe('STUB')
  })

  it('saves settings to admin endpoint', async () => {
    putMock.mockResolvedValueOnce({
      data: {
        data: {
          sharedEmails: 'bok@multiplay.pl,sud@multiplay.pl',
          teamsEnabled: true,
          teamsWebhookUrl: 'https://teams.example/hook',
          diagnostics: {
            emailAdapterMode: 'REAL',
            smtpConfigured: true,
          },
        },
      },
    })

    const result = await updateAdminPortingNotificationSettings({
      sharedEmails: 'bok@multiplay.pl,sud@multiplay.pl',
      teamsEnabled: true,
      teamsWebhookUrl: 'https://teams.example/hook',
    })

    expect(putMock).toHaveBeenCalledWith('/admin/porting-notification-settings', {
      sharedEmails: 'bok@multiplay.pl,sud@multiplay.pl',
      teamsEnabled: true,
      teamsWebhookUrl: 'https://teams.example/hook',
    })
    expect(result.teamsEnabled).toBe(true)
    expect(result.teamsWebhookUrl).toBe('https://teams.example/hook')
  })
})
