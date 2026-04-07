import { beforeEach, describe, expect, it, vi } from 'vitest'

// ============================================================
// Mocks — muszą być zdefiniowane przed importami modułów
// ============================================================

const mockCommunicationFindFirst = vi.fn()
const mockCommunicationUpdate = vi.fn()
const mockCommunicationDeliveryAttemptCreate = vi.fn()
const mockCommunicationDeliveryAttemptFindMany = vi.fn()
const mockLogAuditEvent = vi.fn()
const mockMapCommunicationToDto = vi.fn()
const mockPrismaTransaction = vi.fn()

vi.mock('../../../config/database', () => ({
  prisma: {
    portingCommunication: {
      findFirst: (...args: unknown[]) => mockCommunicationFindFirst(...args),
      update: (...args: unknown[]) => mockCommunicationUpdate(...args),
    },
    communicationDeliveryAttempt: {
      create: (...args: unknown[]) => mockCommunicationDeliveryAttemptCreate(...args),
      findMany: (...args: unknown[]) => mockCommunicationDeliveryAttemptFindMany(...args),
    },
    $transaction: (...args: unknown[]) => mockPrismaTransaction(...args),
  },
}))

vi.mock('../../../shared/audit/audit.service', () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}))

vi.mock('../porting-request-communication.service', () => ({
  mapCommunicationToDto: (...args: unknown[]) => mockMapCommunicationToDto(...args),
}))

import {
  cancelPortingCommunication,
  getPortingCommunicationDeliveryAttempts,
  retryPortingCommunication,
  sendPortingCommunication,
} from '../communication-delivery.service'
import type {
  CommunicationDeliveryAdapter,
  CommunicationDeliveryEnvelope,
  CommunicationDeliveryResult,
} from '../communication-delivery.adapter'

// ============================================================
// Helpers
// ============================================================

const REQUEST_ID = 'req-delivery-001'
const COMM_ID = 'comm-delivery-001'
const USER_ID = 'user-delivery-001'

function makeDbCommunication(status: string = 'DRAFT') {
  return {
    id: COMM_ID,
    portingRequestId: REQUEST_ID,
    type: 'EMAIL',
    status,
    triggerType: 'CASE_RECEIVED',
    recipient: 'test@example.com',
    subject: 'Testowy komunikat',
    body: 'Tresc testowa',
    templateKey: 'case_received',
    createdByUserId: USER_ID,
    sentAt: null,
    errorMessage: null,
    metadata: null,
    createdAt: new Date('2026-04-07T10:00:00.000Z'),
    updatedAt: new Date('2026-04-07T10:00:00.000Z'),
    createdBy: { firstName: 'Jan', lastName: 'Kowalski', role: 'ADMIN' },
  }
}

function makeDeliveryAttemptRow(outcome: 'SUCCESS' | 'FAILED' | 'STUBBED' = 'STUBBED') {
  const isFailed = outcome === 'FAILED'

  return {
    id: 'attempt-001',
    communicationId: COMM_ID,
    attemptedAt: new Date('2026-04-07T10:01:00.000Z'),
    attemptedByUserId: USER_ID,
    channel: 'EMAIL',
    recipient: 'test@example.com',
    subjectSnapshot: 'Testowy komunikat',
    bodySnapshot: 'Tresc testowa',
    outcome,
    transportMessageId: isFailed ? null : `stub-msg-${COMM_ID}`,
    transportReference: isFailed ? null : `stub-ref-${COMM_ID}`,
    errorCode: isFailed ? 'SMTP_CONNECTION_ERROR' : null,
    errorMessage: isFailed ? 'Nie mozna polaczyc z serwerem SMTP.' : null,
    responsePayloadJson: null,
    adapterName: isFailed ? 'TEST_FAILING' : 'COMMUNICATION_DELIVERY_STUB',
    createdAt: new Date('2026-04-07T10:01:00.000Z'),
    attemptedBy: { firstName: 'Jan', lastName: 'Kowalski' },
  }
}

function makeMockDto(status: string = 'SENT') {
  return {
    id: COMM_ID,
    portingRequestId: REQUEST_ID,
    actionType: 'CLIENT_CONFIRMATION',
    type: 'EMAIL',
    status,
    triggerType: 'CASE_RECEIVED',
    recipient: 'test@example.com',
    subject: 'Testowy komunikat',
    body: 'Tresc testowa',
    templateKey: 'case_received',
    createdByUserId: USER_ID,
    createdByDisplayName: 'Jan Kowalski',
    createdByRole: 'ADMIN',
    sentAt: status === 'SENT' ? '2026-04-07T10:01:00.000Z' : null,
    errorMessage: null,
    metadata: null,
    createdAt: '2026-04-07T10:00:00.000Z',
    updatedAt: '2026-04-07T10:01:00.000Z',
  }
}

function makeStubAdapter(): CommunicationDeliveryAdapter {
  return {
    name: 'TEST_STUB',
    send: async (_envelope: CommunicationDeliveryEnvelope): Promise<CommunicationDeliveryResult> => ({
      outcome: 'STUBBED',
      adapterName: 'TEST_STUB',
      transportMessageId: 'stub-msg-123',
      transportReference: 'stub-ref-123',
      errorCode: null,
      errorMessage: null,
      responsePayloadJson: { mode: 'STUB' },
      respondedAt: new Date('2026-04-07T10:01:00.000Z'),
    }),
  }
}

function makeFailingAdapter(): CommunicationDeliveryAdapter {
  return {
    name: 'TEST_FAILING',
    send: async (_envelope: CommunicationDeliveryEnvelope): Promise<CommunicationDeliveryResult> => ({
      outcome: 'FAILED',
      adapterName: 'TEST_FAILING',
      transportMessageId: null,
      transportReference: null,
      errorCode: 'SMTP_CONNECTION_ERROR',
      errorMessage: 'Nie mozna polaczyc z serwerem SMTP.',
      responsePayloadJson: null,
      respondedAt: new Date('2026-04-07T10:01:00.000Z'),
    }),
  }
}

// ============================================================
// SEND
// ============================================================

describe('sendPortingCommunication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMapCommunicationToDto.mockImplementation((row) => makeMockDto(row.status))
  })

  it('wysyla komunikat DRAFT przez STUB adapter i zapisuje proba doreczenia', async () => {
    const dbComm = makeDbCommunication('DRAFT')
    const updatedDbComm = { ...dbComm, status: 'SENT', sentAt: new Date('2026-04-07T10:01:00.000Z') }
    const attemptRow = makeDeliveryAttemptRow('STUBBED')

    mockCommunicationFindFirst.mockResolvedValue(dbComm)
    mockCommunicationUpdate.mockResolvedValue({ ...dbComm, status: 'SENDING' })
    mockPrismaTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      return callback({
        portingCommunication: {
          update: async () => updatedDbComm,
        },
        communicationDeliveryAttempt: {
          create: async () => attemptRow,
        },
      })
    })
    mockLogAuditEvent.mockResolvedValue(undefined)

    const result = await sendPortingCommunication(
      REQUEST_ID,
      COMM_ID,
      USER_ID,
      undefined,
      undefined,
      makeStubAdapter(),
    )

    expect(result.communication.status).toBe('SENT')
    expect(result.attempt.outcome).toBe('STUBBED')
    expect(result.attempt.adapterName).toBe('COMMUNICATION_DELIVERY_STUB')
    expect(mockCommunicationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SENDING' }) }),
    )
    expect(mockPrismaTransaction).toHaveBeenCalledTimes(1)
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ oldValue: 'DRAFT', newValue: 'SENT' }),
    )
  })

  it('wysyla komunikat READY_TO_SEND', async () => {
    const dbComm = makeDbCommunication('READY_TO_SEND')
    const updatedDbComm = { ...dbComm, status: 'SENT', sentAt: new Date() }
    const attemptRow = makeDeliveryAttemptRow('STUBBED')

    mockCommunicationFindFirst.mockResolvedValue(dbComm)
    mockCommunicationUpdate.mockResolvedValue({ ...dbComm, status: 'SENDING' })
    mockPrismaTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        portingCommunication: { update: async () => updatedDbComm },
        communicationDeliveryAttempt: { create: async () => attemptRow },
      }),
    )
    mockLogAuditEvent.mockResolvedValue(undefined)

    const result = await sendPortingCommunication(
      REQUEST_ID,
      COMM_ID,
      USER_ID,
      undefined,
      undefined,
      makeStubAdapter(),
    )

    expect(result.communication.status).toBe('SENT')
  })

  it('zapisuje status FAILED gdy adapter zwroci outcome FAILED', async () => {
    const dbComm = makeDbCommunication('DRAFT')
    const failedDbComm = {
      ...dbComm,
      status: 'FAILED',
      errorMessage: 'Nie mozna polaczyc z serwerem SMTP.',
    }
    const attemptRow = makeDeliveryAttemptRow('FAILED')

    mockCommunicationFindFirst.mockResolvedValue(dbComm)
    mockCommunicationUpdate.mockResolvedValue({ ...dbComm, status: 'SENDING' })
    mockPrismaTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        portingCommunication: { update: async () => failedDbComm },
        communicationDeliveryAttempt: { create: async () => attemptRow },
      }),
    )
    mockLogAuditEvent.mockResolvedValue(undefined)

    const result = await sendPortingCommunication(
      REQUEST_ID,
      COMM_ID,
      USER_ID,
      undefined,
      undefined,
      makeFailingAdapter(),
    )

    expect(result.communication.status).toBe('FAILED')
    expect(result.attempt.outcome).toBe('FAILED')
    expect(result.attempt.errorCode).toBe('SMTP_CONNECTION_ERROR')
  })

  it('rzuca blad gdy komunikat nie istnieje', async () => {
    mockCommunicationFindFirst.mockResolvedValue(null)

    await expect(
      sendPortingCommunication(REQUEST_ID, COMM_ID, USER_ID, undefined, undefined, makeStubAdapter()),
    ).rejects.toMatchObject({
      message: expect.stringContaining('nie zostal znaleziony'),
    })
  })

  it('rzuca blad gdy komunikat jest juz SENT', async () => {
    mockCommunicationFindFirst.mockResolvedValue(makeDbCommunication('SENT'))

    await expect(
      sendPortingCommunication(REQUEST_ID, COMM_ID, USER_ID, undefined, undefined, makeStubAdapter()),
    ).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  it('rzuca blad gdy komunikat jest CANCELLED', async () => {
    mockCommunicationFindFirst.mockResolvedValue(makeDbCommunication('CANCELLED'))

    await expect(
      sendPortingCommunication(REQUEST_ID, COMM_ID, USER_ID, undefined, undefined, makeStubAdapter()),
    ).rejects.toMatchObject({
      code: 'PORTING_COMMUNICATION_CANCELLED',
    })
  })

  it('rzuca blad gdy komunikat jest SENDING', async () => {
    mockCommunicationFindFirst.mockResolvedValue(makeDbCommunication('SENDING'))

    await expect(
      sendPortingCommunication(REQUEST_ID, COMM_ID, USER_ID, undefined, undefined, makeStubAdapter()),
    ).rejects.toMatchObject({
      statusCode: 409,
    })
  })
})

// ============================================================
// RETRY
// ============================================================

describe('retryPortingCommunication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMapCommunicationToDto.mockImplementation((row) => makeMockDto(row.status))
  })

  it('ponawia wysylke komunikatu FAILED', async () => {
    const dbCommFailed = makeDbCommunication('FAILED')
    const dbCommReady = makeDbCommunication('READY_TO_SEND')
    const updatedDbComm = { ...dbCommReady, status: 'SENT', sentAt: new Date() }
    const attemptRow = makeDeliveryAttemptRow('STUBBED')

    // Pierwsze findFirst: dla retry (FAILED), drugie: dla send wewnatrz retry (READY_TO_SEND)
    mockCommunicationFindFirst
      .mockResolvedValueOnce(dbCommFailed)
      .mockResolvedValueOnce(dbCommReady)

    // Pierwsze update: FAILED -> READY_TO_SEND (z retry)
    // Drugie update (w sendPortingCommunication): READY_TO_SEND -> SENDING
    mockCommunicationUpdate
      .mockResolvedValueOnce({ ...dbCommReady })
      .mockResolvedValueOnce({ ...dbCommReady, status: 'SENDING' })
    mockPrismaTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        portingCommunication: { update: async () => updatedDbComm },
        communicationDeliveryAttempt: { create: async () => attemptRow },
      }),
    )
    mockLogAuditEvent.mockResolvedValue(undefined)

    const result = await retryPortingCommunication(
      REQUEST_ID,
      COMM_ID,
      USER_ID,
      undefined,
      undefined,
      makeStubAdapter(),
    )

    expect(result.communication.status).toBe('SENT')
    expect(mockCommunicationUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ data: expect.objectContaining({ status: 'READY_TO_SEND' }) }),
    )
  })

  it('rzuca blad gdy status nie jest FAILED', async () => {
    mockCommunicationFindFirst.mockResolvedValue(makeDbCommunication('DRAFT'))

    await expect(
      retryPortingCommunication(REQUEST_ID, COMM_ID, USER_ID, undefined, undefined, makeStubAdapter()),
    ).rejects.toMatchObject({
      code: 'PORTING_COMMUNICATION_RETRY_INVALID_STATUS',
    })
  })
})

// ============================================================
// CANCEL
// ============================================================

describe('cancelPortingCommunication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMapCommunicationToDto.mockImplementation((row) => makeMockDto(row.status))
  })

  it('anuluje komunikat DRAFT', async () => {
    const dbComm = makeDbCommunication('DRAFT')
    const cancelledDbComm = { ...dbComm, status: 'CANCELLED' }

    mockCommunicationFindFirst.mockResolvedValue(dbComm)
    mockCommunicationUpdate.mockResolvedValue(cancelledDbComm)
    mockLogAuditEvent.mockResolvedValue(undefined)

    const result = await cancelPortingCommunication(REQUEST_ID, COMM_ID, USER_ID)

    expect(mockCommunicationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CANCELLED' } }),
    )
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ oldValue: 'DRAFT', newValue: 'CANCELLED' }),
    )
    expect(result).toBeDefined()
  })

  it('anuluje komunikat READY_TO_SEND', async () => {
    const dbComm = makeDbCommunication('READY_TO_SEND')
    const cancelledDbComm = { ...dbComm, status: 'CANCELLED' }

    mockCommunicationFindFirst.mockResolvedValue(dbComm)
    mockCommunicationUpdate.mockResolvedValue(cancelledDbComm)
    mockLogAuditEvent.mockResolvedValue(undefined)

    await cancelPortingCommunication(REQUEST_ID, COMM_ID, USER_ID)

    expect(mockCommunicationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CANCELLED' } }),
    )
  })

  it('rzuca blad dla juz wyslanego komunikatu', async () => {
    mockCommunicationFindFirst.mockResolvedValue(makeDbCommunication('SENT'))

    await expect(cancelPortingCommunication(REQUEST_ID, COMM_ID, USER_ID)).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  it('rzuca blad dla juz anulowanego komunikatu', async () => {
    mockCommunicationFindFirst.mockResolvedValue(makeDbCommunication('CANCELLED'))

    await expect(cancelPortingCommunication(REQUEST_ID, COMM_ID, USER_ID)).rejects.toMatchObject({
      code: 'PORTING_COMMUNICATION_ALREADY_CANCELLED',
    })
  })

  it('rzuca blad dla komunikatu w trakcie wysylki', async () => {
    mockCommunicationFindFirst.mockResolvedValue(makeDbCommunication('SENDING'))

    await expect(cancelPortingCommunication(REQUEST_ID, COMM_ID, USER_ID)).rejects.toMatchObject({
      statusCode: 409,
    })
  })
})

// ============================================================
// GET DELIVERY ATTEMPTS
// ============================================================

describe('getPortingCommunicationDeliveryAttempts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('zwraca liste prob doreczenia', async () => {
    mockCommunicationFindFirst.mockResolvedValue({ id: COMM_ID })
    mockCommunicationDeliveryAttemptFindMany.mockResolvedValue([
      makeDeliveryAttemptRow('STUBBED'),
    ])

    const result = await getPortingCommunicationDeliveryAttempts(REQUEST_ID, COMM_ID)

    expect(result.communicationId).toBe(COMM_ID)
    expect(result.attempts).toHaveLength(1)
    expect(result.attempts[0]?.outcome).toBe('STUBBED')
    expect(result.attempts[0]?.adapterName).toBe('COMMUNICATION_DELIVERY_STUB')
  })

  it('zwraca pusta liste gdy brak prob', async () => {
    mockCommunicationFindFirst.mockResolvedValue({ id: COMM_ID })
    mockCommunicationDeliveryAttemptFindMany.mockResolvedValue([])

    const result = await getPortingCommunicationDeliveryAttempts(REQUEST_ID, COMM_ID)

    expect(result.attempts).toHaveLength(0)
  })

  it('rzuca blad gdy komunikat nie nalezy do sprawy', async () => {
    mockCommunicationFindFirst.mockResolvedValue(null)

    await expect(
      getPortingCommunicationDeliveryAttempts(REQUEST_ID, COMM_ID),
    ).rejects.toMatchObject({
      message: expect.stringContaining('nie zostal znaleziony'),
    })
  })
})
