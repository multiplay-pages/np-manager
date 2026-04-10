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
  getAdminNotificationFallbackSettings,
  updateAdminNotificationFallbackSettings,
} from './adminNotificationFallbackSettings.api'

describe('adminNotificationFallbackSettings.api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads settings from admin endpoint', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        data: {
          fallbackEnabled: true,
          fallbackRecipientEmail: 'fallback@multiplay.pl',
          fallbackRecipientName: 'Fallback BOK',
          applyToFailed: true,
          applyToMisconfigured: false,
          readiness: 'READY',
        },
      },
    })

    const result = await getAdminNotificationFallbackSettings()

    expect(getMock).toHaveBeenCalledWith('/admin/notification-fallback-settings')
    expect(result.fallbackEnabled).toBe(true)
    expect(result.fallbackRecipientEmail).toBe('fallback@multiplay.pl')
    expect(result.readiness).toBe('READY')
  })

  it('saves settings to admin endpoint', async () => {
    putMock.mockResolvedValueOnce({
      data: {
        data: {
          fallbackEnabled: true,
          fallbackRecipientEmail: 'fallback@multiplay.pl',
          fallbackRecipientName: 'Fallback BOK',
          applyToFailed: true,
          applyToMisconfigured: true,
          readiness: 'READY',
        },
      },
    })

    const payload = {
      fallbackEnabled: true,
      fallbackRecipientEmail: 'fallback@multiplay.pl',
      fallbackRecipientName: 'Fallback BOK',
      applyToFailed: true,
      applyToMisconfigured: true,
    }

    const result = await updateAdminNotificationFallbackSettings(payload)

    expect(putMock).toHaveBeenCalledWith('/admin/notification-fallback-settings', payload)
    expect(result.fallbackEnabled).toBe(true)
    expect(result.applyToMisconfigured).toBe(true)
  })
})
