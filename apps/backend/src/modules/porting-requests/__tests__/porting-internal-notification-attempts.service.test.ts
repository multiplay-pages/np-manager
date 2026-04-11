import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockPortingRequestFindUnique,
  mockAttemptFindMany,
  mockAttemptFindFirst,
  mockAttemptFindUnique,
  mockAttemptUpdateMany,
  mockAttemptCreate,
  mockPortingRequestEventCreate,
  mockPrismaTransaction,
  mockSendInternalEmail,
  mockSendInternalTeamsWebhook,
  mockLogAuditEvent,
} = vi.hoisted(() => ({
  mockPortingRequestFindUnique: vi.fn(),
  mockAttemptFindMany: vi.fn(),
  mockAttemptFindFirst: vi.fn(),
  mockAttemptFindUnique: vi.fn(),
  mockAttemptUpdateMany: vi.fn(),
  mockAttemptCreate: vi.fn(),
  mockPortingRequestEventCreate: vi.fn(),
  mockPrismaTransaction: vi.fn(),
  mockSendInternalEmail: vi.fn(),
  mockSendInternalTeamsWebhook: vi.fn(),
  mockLogAuditEvent: vi.fn(),
}))

vi.mock('../../../config/database', () => ({
  prisma: {
    portingRequest: {
      findUnique: (...args: unknown[]) => mockPortingRequestFindUnique(...args),
    },
    internalNotificationDeliveryAttempt: {
      findMany: (...args: unknown[]) => mockAttemptFindMany(...args),
      findFirst: (...args: unknown[]) => mockAttemptFindFirst(...args),
      findUnique: (...args: unknown[]) => mockAttemptFindUnique(...args),
      updateMany: (...args: unknown[]) => mockAttemptUpdateMany(...args),
      create: (...args: unknown[]) => mockAttemptCreate(...args),
    },
    portingRequestEvent: {
      create: (...args: unknown[]) => mockPortingRequestEventCreate(...args),
    },
    $transaction: (...args: unknown[]) => mockPrismaTransaction(...args),
  },
}))

vi.mock('../../../shared/audit/audit.service', () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}))

vi.mock('../internal-notification.adapter', () => ({
  sendInternalEmail: (...args: unknown[]) => mockSendInternalEmail(...args),
  sendInternalTeamsWebhook: (...args: unknown[]) => mockSendInternalTeamsWebhook(...args),
}))

import {
  getPortingRequestInternalNotificationAttempts,
  retryInternalNotificationAttempt,
} from '../porting-internal-notification-attempts.service'
import { resolveInternalNotificationRetryEligibility } from '../porting-internal-notification-retry-eligibility.helper'

function buildAttempt(overrides: Record<string, unknown> = {}) {
  return {
    id: 'attempt-1',
    requestId: 'request-1',
    eventCode: 'STATUS_CHANGED',
    eventLabel: 'Zmiana statusu sprawy',
    attemptOrigin: 'PRIMARY',
    channel: 'EMAIL',
    recipient: 'bok@multiplay.pl',
    mode: 'REAL',
    outcome: 'FAILED',
    errorCode: 'DELIVERY_FAILED',
    errorMessage: 'Timeout SMTP',
    failureKind: 'DELIVERY',
    retryOfAttemptId: null,
    retryCount: 0,
    isLatestForChain: true,
    triggeredByUserId: null,
    triggeredByUser: null,
    request: { caseNumber: 'NP/2026/001' },
    createdAt: new Date('2026-04-11T10:00:00.000Z'),
    ...overrides,
  }
}

describe('resolveInternalNotificationRetryEligibility', () => {
  it.each([
    [
      'PRIMARY + FAILED + latest + retryCount 0',
      buildAttempt(),
      { canRetry: true, retryBlockedReasonCode: null },
    ],
    [
      'PRIMARY + MISCONFIGURED + latest',
      buildAttempt({ outcome: 'MISCONFIGURED', failureKind: 'CONFIGURATION' }),
      { canRetry: true, retryBlockedReasonCode: null },
    ],
    [
      'RETRY + FAILED + latest + retryCount 1',
      buildAttempt({ attemptOrigin: 'RETRY', retryCount: 1, retryOfAttemptId: 'attempt-root' }),
      { canRetry: true, retryBlockedReasonCode: null },
    ],
    [
      'RETRY + FAILED + retryCount 3',
      buildAttempt({ attemptOrigin: 'RETRY', retryCount: 3 }),
      { canRetry: false, retryBlockedReasonCode: 'RETRY_LIMIT_REACHED' },
    ],
    [
      'ERROR_FALLBACK + FAILED',
      buildAttempt({ attemptOrigin: 'ERROR_FALLBACK' }),
      { canRetry: false, retryBlockedReasonCode: 'ORIGIN_NOT_RETRYABLE' },
    ],
    [
      'PRIMARY + SENT',
      buildAttempt({ outcome: 'SENT', failureKind: null }),
      { canRetry: false, retryBlockedReasonCode: 'OUTCOME_NOT_RETRYABLE' },
    ],
    [
      'PRIMARY + FAILED + isLatest=false',
      buildAttempt({ isLatestForChain: false }),
      { canRetry: false, retryBlockedReasonCode: 'NOT_LATEST_IN_CHAIN' },
    ],
    [
      'PRIMARY + DISABLED',
      buildAttempt({ outcome: 'DISABLED', failureKind: null }),
      { canRetry: false, retryBlockedReasonCode: 'OUTCOME_NOT_RETRYABLE' },
    ],
    [
      'PRIMARY + STUBBED',
      buildAttempt({ outcome: 'STUBBED', failureKind: null }),
      { canRetry: false, retryBlockedReasonCode: 'OUTCOME_NOT_RETRYABLE' },
    ],
    [
      'PRIMARY + SKIPPED',
      buildAttempt({ outcome: 'SKIPPED', failureKind: 'POLICY' }),
      { canRetry: false, retryBlockedReasonCode: 'OUTCOME_NOT_RETRYABLE' },
    ],
  ])('%s', (_label, attempt, expected) => {
    expect(resolveInternalNotificationRetryEligibility(attempt)).toEqual(expected)
  })
})

describe('getPortingRequestInternalNotificationAttempts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrismaTransaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg)
      if (typeof arg === 'function') {
        return arg({
          internalNotificationDeliveryAttempt: {
            findUnique: mockAttemptFindUnique,
            updateMany: mockAttemptUpdateMany,
            create: mockAttemptCreate,
          },
          portingRequestEvent: {
            create: mockPortingRequestEventCreate,
          },
        })
      }
      return undefined
    })
  })

  it('returns empty attempt list for an existing request with no attempts', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce({ id: 'request-1' })
    mockAttemptFindMany.mockResolvedValueOnce([])

    const result = await getPortingRequestInternalNotificationAttempts('request-1')

    expect(result).toEqual({
      requestId: 'request-1',
      items: [],
    })
    expect(mockAttemptFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { requestId: 'request-1' },
        take: 50,
      }),
    )
  })

  it('maps PRIMARY and ERROR_FALLBACK attempts to DTOs with retry eligibility', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce({ id: 'request-2' })
    mockAttemptFindMany.mockResolvedValueOnce([
      buildAttempt({
        id: 'attempt-primary',
        requestId: 'request-2',
        request: undefined,
      }),
      buildAttempt({
        id: 'attempt-fallback',
        requestId: 'request-2',
        attemptOrigin: 'ERROR_FALLBACK',
        recipient: 'fallback@np-manager.local',
        mode: 'STUB',
        outcome: 'STUBBED',
        errorCode: null,
        errorMessage: null,
        failureKind: null,
        triggeredByUserId: 'admin-1',
        triggeredByUser: {
          firstName: 'Adam',
          lastName: 'Admin',
          email: 'admin@np-manager.local',
        },
        request: undefined,
        createdAt: new Date('2026-04-11T10:01:00.000Z'),
      }),
    ])

    const result = await getPortingRequestInternalNotificationAttempts('request-2', 10)

    expect(result.items).toHaveLength(2)
    expect(result.items[0]).toMatchObject({
      id: 'attempt-primary',
      attemptOrigin: 'PRIMARY',
      outcome: 'FAILED',
      canRetry: true,
      retryBlockedReasonCode: null,
      createdAt: '2026-04-11T10:00:00.000Z',
    })
    expect(result.items[1]).toMatchObject({
      id: 'attempt-fallback',
      attemptOrigin: 'ERROR_FALLBACK',
      outcome: 'STUBBED',
      canRetry: false,
      retryBlockedReasonCode: 'ORIGIN_NOT_RETRYABLE',
      triggeredByDisplayName: 'Adam Admin (admin@np-manager.local)',
    })
  })

  it('normalizes invalid limits and caps high limits', async () => {
    mockPortingRequestFindUnique.mockResolvedValue({ id: 'request-3' })
    mockAttemptFindMany.mockResolvedValue([])

    await getPortingRequestInternalNotificationAttempts('request-3', -1)
    await getPortingRequestInternalNotificationAttempts('request-3', 500)

    expect(mockAttemptFindMany.mock.calls[0]?.[0]).toMatchObject({ take: 50 })
    expect(mockAttemptFindMany.mock.calls[1]?.[0]).toMatchObject({ take: 100 })
  })

  it('throws NOT_FOUND when request does not exist', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce(null)

    await expect(
      getPortingRequestInternalNotificationAttempts('missing-request'),
    ).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(mockAttemptFindMany).not.toHaveBeenCalled()
  })
})

describe('retryInternalNotificationAttempt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrismaTransaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg)
      if (typeof arg === 'function') {
        return arg({
          internalNotificationDeliveryAttempt: {
            findUnique: mockAttemptFindUnique,
            updateMany: mockAttemptUpdateMany,
            create: mockAttemptCreate,
          },
          portingRequestEvent: {
            create: mockPortingRequestEventCreate,
          },
        })
      }
      return undefined
    })
    mockLogAuditEvent.mockResolvedValue(undefined)
    mockAttemptFindUnique.mockResolvedValue(null)
  })

  it('creates a RETRY attempt, increments chain state, writes trigger user and NotificationRetry NOTE', async () => {
    const sourceAttempt = buildAttempt()
    const retryAttempt = buildAttempt({
      id: 'attempt-retry-1',
      attemptOrigin: 'RETRY',
      outcome: 'SENT',
      errorCode: null,
      errorMessage: null,
      failureKind: null,
      retryOfAttemptId: sourceAttempt.id,
      retryCount: 1,
      isLatestForChain: true,
      triggeredByUserId: 'user-1',
      triggeredByUser: {
        firstName: 'Barbara',
        lastName: 'Bok',
        email: 'bok@np-manager.local',
      },
      request: undefined,
      createdAt: new Date('2026-04-11T10:05:00.000Z'),
    })
    mockAttemptFindFirst.mockResolvedValueOnce(sourceAttempt)
    mockSendInternalEmail.mockResolvedValueOnce({
      channel: 'EMAIL',
      recipient: 'bok@multiplay.pl',
      outcome: 'SENT',
      mode: 'REAL',
      messageId: 'msg-1',
      errorMessage: null,
    })
    mockAttemptFindUnique.mockResolvedValueOnce(sourceAttempt)
    mockAttemptUpdateMany.mockResolvedValueOnce({ count: 1 })
    mockAttemptCreate.mockResolvedValueOnce(retryAttempt)
    mockPortingRequestEventCreate.mockResolvedValueOnce({ id: 'event-1' })

    const result = await retryInternalNotificationAttempt(
      'request-1',
      sourceAttempt.id,
      { reason: 'Ponowienie po awarii SMTP' },
      'user-1',
      '127.0.0.1',
      'vitest',
    )

    expect(mockSendInternalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['bok@multiplay.pl'],
      }),
    )
    expect(mockSendInternalTeamsWebhook).not.toHaveBeenCalled()
    expect(mockAttemptUpdateMany).toHaveBeenCalledWith({
      where: {
        id: sourceAttempt.id,
        requestId: 'request-1',
        isLatestForChain: true,
      },
      data: { isLatestForChain: false },
    })
    expect(mockAttemptCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attemptOrigin: 'RETRY',
          retryOfAttempt: { connect: { id: sourceAttempt.id } },
          retryCount: 1,
          isLatestForChain: true,
          triggeredByUser: { connect: { id: 'user-1' } },
        }),
      }),
    )
    expect(mockPortingRequestEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: '[NotificationRetry] Zmiana statusu sprawy',
          description: expect.any(String),
        }),
      }),
    )
    const noteDescription = mockPortingRequestEventCreate.mock.calls[0]?.[0].data.description
    expect(noteDescription).toContain('sourceAttemptId=attempt-1')
    expect(noteDescription).toContain('retryAttemptId=attempt-retry-1')
    expect(noteDescription).toContain('retryCount=1')
    expect(noteDescription).toContain('reason=Ponowienie po awarii SMTP')
    expect(result.retryAttempt).toMatchObject({
      id: 'attempt-retry-1',
      attemptOrigin: 'RETRY',
      retryCount: 1,
      isLatestForChain: true,
      triggeredByUserId: 'user-1',
    })
    expect(result.sourceAttempt).toMatchObject({
      id: sourceAttempt.id,
      isLatestForChain: false,
      canRetry: false,
      retryBlockedReasonCode: 'NOT_LATEST_IN_CHAIN',
    })
    expect(result.chain).toEqual({
      rootAttemptId: sourceAttempt.id,
      latestAttemptId: 'attempt-retry-1',
      retryCount: 1,
      latestOutcome: 'SENT',
      isLatestSuccessful: true,
    })
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        userId: 'user-1',
        entityType: 'porting_request',
        entityId: 'request-1',
      }),
    )
  })

  it('does not trigger ERROR_FALLBACK when retry transport fails and persists FAILED', async () => {
    const sourceAttempt = buildAttempt()
    const retryAttempt = buildAttempt({
      id: 'attempt-retry-failed',
      attemptOrigin: 'RETRY',
      outcome: 'FAILED',
      errorCode: 'DELIVERY_FAILED',
      errorMessage: 'SMTP still down',
      failureKind: 'DELIVERY',
      retryOfAttemptId: sourceAttempt.id,
      retryCount: 1,
      triggeredByUserId: 'user-1',
      request: undefined,
    })
    mockAttemptFindFirst.mockResolvedValueOnce(sourceAttempt)
    mockSendInternalEmail.mockResolvedValueOnce({
      channel: 'EMAIL',
      recipient: 'bok@multiplay.pl',
      outcome: 'FAILED',
      mode: 'REAL',
      messageId: null,
      errorMessage: 'SMTP still down',
    })
    mockAttemptFindUnique.mockResolvedValueOnce(sourceAttempt)
    mockAttemptUpdateMany.mockResolvedValueOnce({ count: 1 })
    mockAttemptCreate.mockResolvedValueOnce(retryAttempt)
    mockPortingRequestEventCreate.mockResolvedValueOnce({ id: 'event-1' })

    const result = await retryInternalNotificationAttempt(
      'request-1',
      sourceAttempt.id,
      {},
      'user-1',
    )

    expect(mockAttemptCreate.mock.calls[0]?.[0].data).toMatchObject({
      outcome: 'FAILED',
      errorCode: 'DELIVERY_FAILED',
      errorMessage: 'SMTP still down',
      failureKind: 'DELIVERY',
    })
    expect(mockPortingRequestEventCreate).toHaveBeenCalledTimes(1)
    expect(mockPortingRequestEventCreate.mock.calls[0]?.[0].data.title).toContain(
      '[NotificationRetry]',
    )
    expect(result.chain.isLatestSuccessful).toBe(false)
  })

  it('persists MISCONFIGURED from adapter as retry attempt configuration failure', async () => {
    const sourceAttempt = buildAttempt({ outcome: 'MISCONFIGURED', failureKind: 'CONFIGURATION' })
    const retryAttempt = buildAttempt({
      id: 'attempt-retry-misconfigured',
      attemptOrigin: 'RETRY',
      outcome: 'MISCONFIGURED',
      errorCode: 'TRANSPORT_MISCONFIGURED',
      errorMessage: 'Brak SMTP',
      failureKind: 'CONFIGURATION',
      retryOfAttemptId: sourceAttempt.id,
      retryCount: 1,
      triggeredByUserId: 'user-1',
      request: undefined,
    })
    mockAttemptFindFirst.mockResolvedValueOnce(sourceAttempt)
    mockSendInternalEmail.mockResolvedValueOnce({
      channel: 'EMAIL',
      recipient: 'bok@multiplay.pl',
      outcome: 'MISCONFIGURED',
      mode: 'REAL',
      messageId: null,
      errorMessage: 'Brak SMTP',
    })
    mockAttemptFindUnique.mockResolvedValueOnce(sourceAttempt)
    mockAttemptUpdateMany.mockResolvedValueOnce({ count: 1 })
    mockAttemptCreate.mockResolvedValueOnce(retryAttempt)
    mockPortingRequestEventCreate.mockResolvedValueOnce({ id: 'event-1' })

    await retryInternalNotificationAttempt('request-1', sourceAttempt.id, {}, 'user-1')

    expect(mockAttemptCreate.mock.calls[0]?.[0].data).toMatchObject({
      outcome: 'MISCONFIGURED',
      errorCode: 'TRANSPORT_MISCONFIGURED',
      failureKind: 'CONFIGURATION',
    })
  })
})
