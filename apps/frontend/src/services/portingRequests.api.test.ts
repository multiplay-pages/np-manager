import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getMock, postMock, patchMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  patchMock: vi.fn(),
}))

vi.mock('./api.client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
  },
}))

import {
  assignPortingRequestToMe,
  getPortingRequestInternalNotificationAttempts,
  getGlobalNotificationFailureQueue,
  getPortingRequestNotificationFailures,
  getPortingRequestAssignmentHistory,
  getPortingRequestAssignmentUsers,
  getPortingRequestInternalNotifications,
  getPortingRequests,
  getPortingRequestsSummary,
  retryInternalNotificationAttempt,
  updatePortingRequestAssignment,
} from './portingRequests.api'

describe('portingRequests.api assignment flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMock.mockResolvedValue({ data: { data: { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } } } })
    postMock.mockResolvedValue({ data: { data: { request: { id: 'request-1' } } } })
    patchMock.mockResolvedValue({ data: { data: { request: { id: 'request-1' } } } })
  })

  it('builds list query params for porting requests endpoint', async () => {
    await getPortingRequests({
      search: 'abc',
      status: 'SUBMITTED',
      portingMode: 'DAY',
      donorOperatorId: 'operator-1',
      quickWorkFilter: 'URGENT',
      commercialOwnerFilter: 'WITH_OWNER',
      notificationHealthFilter: 'HAS_FAILURES',
      page: 2,
      pageSize: 10,
    })

    expect(getMock).toHaveBeenCalledWith(
      '/porting-requests?search=abc&status=SUBMITTED&portingMode=DAY&donorOperatorId=operator-1&quickWorkFilter=URGENT&commercialOwnerFilter=WITH_OWNER&notificationHealthFilter=HAS_FAILURES&page=2&pageSize=10',
    )
  })

  it('omits quick work filter from summary query string', async () => {
    await getPortingRequestsSummary({
      search: 'abc',
      status: 'SUBMITTED',
    })

    const calledUrl = getMock.mock.calls[0]?.[0] as string
    expect(calledUrl).not.toContain('quickWorkFilter=')
  })

  it('includes ownership=MINE in query string when filter is MINE', async () => {
    await getPortingRequests({ ownership: 'MINE', page: 1, pageSize: 20 })

    expect(getMock).toHaveBeenCalledWith(
      expect.stringContaining('ownership=MINE'),
    )
  })

  it('includes ownership=UNASSIGNED in query string when filter is UNASSIGNED', async () => {
    await getPortingRequests({ ownership: 'UNASSIGNED', page: 1, pageSize: 20 })

    expect(getMock).toHaveBeenCalledWith(
      expect.stringContaining('ownership=UNASSIGNED'),
    )
  })

  it('omits ownership param when filter is ALL', async () => {
    await getPortingRequests({ ownership: 'ALL', page: 1, pageSize: 20 })

    const calledUrl = getMock.mock.calls[0]?.[0] as string
    expect(calledUrl).not.toContain('ownership=')
  })

  it('omits ownership param when ownership is not provided', async () => {
    await getPortingRequests({ page: 1, pageSize: 20 })

    const calledUrl = getMock.mock.calls[0]?.[0] as string
    expect(calledUrl).not.toContain('ownership=')
  })

  it('omits ALL operational filters from list query string', async () => {
    await getPortingRequests({
      commercialOwnerFilter: 'ALL',
      notificationHealthFilter: 'ALL',
      page: 1,
      pageSize: 20,
    })

    const calledUrl = getMock.mock.calls[0]?.[0] as string
    expect(calledUrl).not.toContain('commercialOwnerFilter=')
    expect(calledUrl).not.toContain('notificationHealthFilter=')
  })

  it('builds summary endpoint query params for operational cards', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        data: {
          totalRequests: 10,
          withCommercialOwner: 7,
          withoutCommercialOwner: 3,
          myCommercialRequests: 2,
          requestsWithNotificationFailures: 1,
        },
      },
    })

    await getPortingRequestsSummary({
      search: 'abc',
      status: 'SUBMITTED',
      ownership: 'MINE',
    })

    expect(getMock).toHaveBeenCalledWith(
      '/porting-requests/summary?search=abc&status=SUBMITTED&ownership=MINE',
    )
  })

  it('calls PATCH assignment endpoint with selected user id or null', async () => {
    await updatePortingRequestAssignment('request-1', { assignedUserId: 'user-1' })
    await updatePortingRequestAssignment('request-1', { assignedUserId: null })

    expect(patchMock).toHaveBeenNthCalledWith(1, '/porting-requests/request-1/assignment', {
      assignedUserId: 'user-1',
    })
    expect(patchMock).toHaveBeenNthCalledWith(2, '/porting-requests/request-1/assignment', {
      assignedUserId: null,
    })
  })

  it('calls assign-to-me endpoint', async () => {
    await assignPortingRequestToMe('request-1')

    expect(postMock).toHaveBeenCalledWith('/porting-requests/request-1/assignment/assign-to-me')
  })

  it('calls assignment-history endpoint', async () => {
    getMock.mockResolvedValueOnce({ data: { data: { items: [] } } })
    await getPortingRequestAssignmentHistory('request-1')

    expect(getMock).toHaveBeenCalledWith('/porting-requests/request-1/assignment-history')
  })

  it('calls internal notifications history endpoint', async () => {
    getMock.mockResolvedValueOnce({ data: { data: { items: [] } } })

    await getPortingRequestInternalNotifications('request-1')

    expect(getMock).toHaveBeenCalledWith('/porting-requests/request-1/internal-notifications')
  })

  it('calls internal notification attempts endpoint with optional limit', async () => {
    getMock.mockResolvedValueOnce({ data: { data: { requestId: 'request-1', items: [] } } })

    await getPortingRequestInternalNotificationAttempts('request-1', 10)

    expect(getMock).toHaveBeenCalledWith(
      '/porting-requests/request-1/internal-notification-attempts?limit=10',
    )
  })

  it('calls internal notification attempt retry endpoint', async () => {
    postMock.mockResolvedValueOnce({ data: { data: { retryAttempt: { id: 'attempt-retry-1' } } } })

    await retryInternalNotificationAttempt('request-1', 'attempt-1')

    expect(postMock).toHaveBeenCalledWith(
      '/porting-requests/request-1/internal-notification-attempts/attempt-1/retry',
      {},
    )
  })

  it('calls global internal notification failures endpoint', async () => {
    getMock.mockResolvedValueOnce({ data: { data: { items: [], total: 0 } } })

    await getGlobalNotificationFailureQueue({
      operationalStatus: 'RETRY_AVAILABLE',
      limit: 50,
      offset: 0,
    })

    expect(getMock).toHaveBeenCalledWith(
      '/internal-notification-failures?operationalStatus=RETRY_AVAILABLE&limit=50',
    )
  })

  it('calls notification failures endpoint', async () => {
    getMock.mockResolvedValueOnce({ data: { data: { items: [] } } })

    await getPortingRequestNotificationFailures('request-1')

    expect(getMock).toHaveBeenCalledWith('/porting-requests/request-1/notification-failures')
  })

  it('calls assignment-users endpoint and returns user list', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        data: {
          users: [
            { id: 'user-1', email: 'user@np-manager.local', firstName: 'Jan', lastName: 'Kowalski', role: 'BOK_CONSULTANT' },
          ],
        },
      },
    })

    const result = await getPortingRequestAssignmentUsers()

    expect(getMock).toHaveBeenCalledWith('/porting-requests/assignment-users')
    expect(result.users).toHaveLength(1)
    expect(result.users[0]?.id).toBe('user-1')
  })
})
