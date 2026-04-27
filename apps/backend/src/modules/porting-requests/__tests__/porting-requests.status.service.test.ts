import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFindUnique = vi.fn()
const mockTransaction = vi.fn()
const mockUpdate = vi.fn()
const mockCaseHistoryCreate = vi.fn()
const mockEventCreate = vi.fn()
const mockLogAuditEvent = vi.fn()

vi.mock('../../../config/database', () => ({
  prisma: {
    portingRequest: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}))

vi.mock('../../../shared/audit/audit.service', () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}))

vi.mock('../../pli-cbd/pli-cbd.adapter', () => ({
  PLI_CBD_TRIGGER_SELECT: {},
  portingRequestPliCbdAdapter: {},
}))

vi.mock('../../pli-cbd/pli-cbd.integration-tracker', () => ({
  createFailedIntegrationAttempt: vi.fn(),
  getPliCbdIntegrationEvents: vi.fn(),
  withPliCbdIntegrationTracking: vi.fn(),
}))

import { changePortingRequestStatus } from '../porting-requests.service'

describe('changePortingRequestStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindUnique.mockResolvedValue({
      id: 'req-1',
      caseNumber: 'FNP-TEST-001',
      statusInternal: 'SUBMITTED',
    })
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        portingRequest: {
          update: (...args: unknown[]) => mockUpdate(...args),
        },
        portingRequestCaseHistory: {
          create: (...args: unknown[]) => mockCaseHistoryCreate(...args),
        },
        portingRequestEvent: {
          create: (...args: unknown[]) => mockEventCreate(...args),
        },
      }),
    )
    mockUpdate.mockResolvedValue({})
    mockCaseHistoryCreate.mockResolvedValue({})
    mockEventCreate.mockResolvedValue({})
    mockLogAuditEvent.mockResolvedValue(undefined)
  })

  it('handles the QA reject scenario from SUBMITTED with reason and comment', async () => {
    await changePortingRequestStatus(
      'req-1',
      {
        targetStatus: 'REJECTED',
        reason: 'Brak wymaganego pelnomocnictwa dla trybu DAY',
        comment: 'Test QA - odrzucenie z powodem',
      },
      'user-1',
      'ADMIN',
    )

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'req-1' },
        data: { statusInternal: 'REJECTED' },
      }),
    )

    expect(mockCaseHistoryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'STATUS_CHANGED',
          statusBefore: 'SUBMITTED',
          statusAfter: 'REJECTED',
          reason: 'Brak wymaganego pelnomocnictwa dla trybu DAY',
          comment: 'Test QA - odrzucenie z powodem',
          metadata: {
            actionId: 'REJECT',
            actionLabel: 'Odrzuc',
          },
        }),
      }),
    )

    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          statusBefore: 'SUBMITTED',
          statusAfter: 'REJECTED',
        }),
      }),
    )

    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STATUS_CHANGE',
        oldValue: 'SUBMITTED',
        newValue: 'REJECTED',
      }),
    )
  })

  it('does not touch database when required reason is missing', async () => {
    await expect(
      changePortingRequestStatus(
        'req-1',
        {
          targetStatus: 'REJECTED',
        },
        'user-1',
        'ADMIN',
      ),
    ).rejects.toThrow(/Powod odrzucenia jest wymagany/)

    expect(mockTransaction).not.toHaveBeenCalled()
    expect(mockLogAuditEvent).not.toHaveBeenCalled()
  })

  it('MARK_PORTED sets statusInternal=PORTED and creates case history entry', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'req-1',
      caseNumber: 'FNP-TEST-002',
      statusInternal: 'CONFIRMED',
    })

    await changePortingRequestStatus(
      'req-1',
      { targetStatus: 'PORTED' },
      'user-admin',
      'ADMIN',
    )

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'req-1' },
        data: { statusInternal: 'PORTED' },
      }),
    )

    expect(mockCaseHistoryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'STATUS_CHANGED',
          statusBefore: 'CONFIRMED',
          statusAfter: 'PORTED',
          metadata: {
            actionId: 'MARK_PORTED',
            actionLabel: 'Oznacz jako przeniesiona',
          },
        }),
      }),
    )

    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STATUS_CHANGE',
        oldValue: 'CONFIRMED',
        newValue: 'PORTED',
      }),
    )
  })

  it('blocks MARK_PORTED when role is BOK_CONSULTANT', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'req-1',
      caseNumber: 'FNP-TEST-003',
      statusInternal: 'CONFIRMED',
    })

    await expect(
      changePortingRequestStatus(
        'req-1',
        { targetStatus: 'PORTED' },
        'user-bok',
        'BOK_CONSULTANT',
      ),
    ).rejects.toThrow(/Twoja rola nie moze wykonac tej zmiany statusu/)

    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('blocks MARK_PORTED when request is already PORTED', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'req-1',
      caseNumber: 'FNP-TEST-004',
      statusInternal: 'PORTED',
    })

    await expect(
      changePortingRequestStatus(
        'req-1',
        { targetStatus: 'PORTED' },
        'user-admin',
        'ADMIN',
      ),
    ).rejects.toThrow(/Sprawa ma juz wskazany status/)

    expect(mockTransaction).not.toHaveBeenCalled()
  })
})
