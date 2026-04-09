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
  getPortingRequestAssignmentHistory,
  getPortingRequests,
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
      page: 2,
      pageSize: 10,
    })

    expect(getMock).toHaveBeenCalledWith(
      '/porting-requests?search=abc&status=SUBMITTED&portingMode=DAY&donorOperatorId=operator-1&page=2&pageSize=10',
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
})
