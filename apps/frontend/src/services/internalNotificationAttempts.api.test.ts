import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}))

vi.mock('./api.client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
  },
}))

import { getGlobalInternalNotificationAttempts } from './internalNotificationAttempts.api'

describe('internalNotificationAttempts.api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMock.mockResolvedValue({ data: { data: { items: [], total: 0 } } })
  })

  it('loads global internal notification attempts without query params by default', async () => {
    const result = await getGlobalInternalNotificationAttempts()

    expect(getMock).toHaveBeenCalledWith('/internal-notification-attempts')
    expect(result).toEqual({ items: [], total: 0 })
  })

  it('adds existing paging params when provided', async () => {
    await getGlobalInternalNotificationAttempts({ limit: 50, offset: 100 })

    expect(getMock).toHaveBeenCalledWith('/internal-notification-attempts?limit=50&offset=100')
  })

  it('keeps offset=0 in the query string when provided explicitly', async () => {
    await getGlobalInternalNotificationAttempts({ limit: 50, offset: 0 })

    expect(getMock).toHaveBeenCalledWith('/internal-notification-attempts?limit=50&offset=0')
  })

  it('adds outcome, channel and retryableOnly query params when provided', async () => {
    await getGlobalInternalNotificationAttempts({
      limit: 50,
      offset: 0,
      outcome: 'FAILED',
      channel: 'EMAIL',
      retryableOnly: true,
    })

    expect(getMock).toHaveBeenCalledWith(
      '/internal-notification-attempts?limit=50&offset=0&outcome=FAILED&channel=EMAIL&retryableOnly=true',
    )
  })

  it('omits retryableOnly param when false', async () => {
    await getGlobalInternalNotificationAttempts({
      limit: 50,
      offset: 0,
      retryableOnly: false,
    })

    expect(getMock).toHaveBeenCalledWith('/internal-notification-attempts?limit=50&offset=0')
  })

  it('omits filter params when outcome or channel are undefined', async () => {
    await getGlobalInternalNotificationAttempts({
      limit: 50,
      offset: 0,
      outcome: undefined,
      channel: undefined,
    })

    expect(getMock).toHaveBeenCalledWith('/internal-notification-attempts?limit=50&offset=0')
  })
})
