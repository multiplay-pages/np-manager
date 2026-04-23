import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPortingRequestFindUnique, mockAuditLogFindMany } = vi.hoisted(() => ({
  mockPortingRequestFindUnique: vi.fn(),
  mockAuditLogFindMany: vi.fn(),
}))

vi.mock('../../../config/database', () => ({
  prisma: {
    portingRequest: {
      findUnique: (...args: unknown[]) => mockPortingRequestFindUnique(...args),
    },
    auditLog: {
      findMany: (...args: unknown[]) => mockAuditLogFindMany(...args),
    },
  },
}))

import { getPortingRequestDetailsHistory } from '../porting-request-details-history.service'

function makeAuditRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'audit-1',
    fieldName: 'correspondenceAddress',
    oldValue: 'Stara 1, 00-001 Warszawa',
    newValue: 'Nowa 2, 00-002 Krakow',
    timestamp: new Date('2026-04-23T10:00:00.000Z'),
    user: {
      firstName: 'Anna',
      lastName: 'Nowak',
      role: 'BOK_CONSULTANT',
    },
    ...overrides,
  }
}

describe('getPortingRequestDetailsHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns mapped history items in descending order', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce({ id: 'req-1' })
    mockAuditLogFindMany.mockResolvedValueOnce([
      makeAuditRow({
        id: 'audit-2',
        fieldName: 'contactChannel',
        oldValue: 'EMAIL',
        newValue: 'SMS',
        timestamp: new Date('2026-04-23T11:00:00.000Z'),
        user: { firstName: 'Jan', lastName: 'Kowalski', role: 'ADMIN' },
      }),
      makeAuditRow({
        id: 'audit-1',
        fieldName: 'correspondenceAddress',
        oldValue: 'Stara 1',
        newValue: 'Nowa 2',
        timestamp: new Date('2026-04-23T10:00:00.000Z'),
      }),
    ])

    const result = await getPortingRequestDetailsHistory('req-1')

    expect(result.items).toHaveLength(2)
    expect(result.items[0]).toMatchObject({
      id: 'audit-2',
      fieldName: 'contactChannel',
      oldValue: 'EMAIL',
      newValue: 'SMS',
      actorDisplayName: 'Jan Kowalski',
      actorRole: 'ADMIN',
      timestamp: '2026-04-23T11:00:00.000Z',
    })
    expect(result.items[1]).toMatchObject({
      id: 'audit-1',
      fieldName: 'correspondenceAddress',
      oldValue: 'Stara 1',
      newValue: 'Nowa 2',
      actorDisplayName: 'Anna Nowak',
      actorRole: 'BOK_CONSULTANT',
    })
  })

  it('queries only the 4 details fields with correct filters', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce({ id: 'req-1' })
    mockAuditLogFindMany.mockResolvedValueOnce([])

    await getPortingRequestDetailsHistory('req-1')

    expect(mockAuditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          requestId: 'req-1',
          action: 'UPDATE',
          entityType: 'porting_request',
          fieldName: {
            in: expect.arrayContaining([
              'correspondenceAddress',
              'contactChannel',
              'internalNotes',
              'requestDocumentNumber',
            ]),
          },
        }),
        orderBy: { timestamp: 'desc' },
      }),
    )
  })

  it('returns empty items when no history exists', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce({ id: 'req-1' })
    mockAuditLogFindMany.mockResolvedValueOnce([])

    const result = await getPortingRequestDetailsHistory('req-1')

    expect(result.items).toHaveLength(0)
  })

  it('throws 404 when request does not exist', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce(null)

    await expect(getPortingRequestDetailsHistory('missing')).rejects.toMatchObject({
      statusCode: 404,
    })

    expect(mockAuditLogFindMany).not.toHaveBeenCalled()
  })

  it('preserves BRAK values from audit log as-is', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce({ id: 'req-1' })
    mockAuditLogFindMany.mockResolvedValueOnce([
      makeAuditRow({
        fieldName: 'internalNotes',
        oldValue: 'BRAK',
        newValue: 'Notatka operatora',
      }),
    ])

    const result = await getPortingRequestDetailsHistory('req-1')

    expect(result.items[0]).toMatchObject({
      fieldName: 'internalNotes',
      oldValue: 'BRAK',
      newValue: 'Notatka operatora',
    })
  })

  it('handles null oldValue/newValue from DB', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce({ id: 'req-1' })
    mockAuditLogFindMany.mockResolvedValueOnce([
      makeAuditRow({
        oldValue: null,
        newValue: null,
      }),
    ])

    const result = await getPortingRequestDetailsHistory('req-1')

    expect(result.items[0]?.oldValue).toBeNull()
    expect(result.items[0]?.newValue).toBeNull()
  })
})
