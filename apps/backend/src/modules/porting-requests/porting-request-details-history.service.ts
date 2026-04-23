import type {
  DetailsHistoryFieldName,
  PortingRequestDetailsHistoryItemDto,
  PortingRequestDetailsHistoryResultDto,
} from '@np-manager/shared'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/app-error'

const DETAILS_HISTORY_FIELD_NAMES: DetailsHistoryFieldName[] = [
  'correspondenceAddress',
  'contactChannel',
  'internalNotes',
  'requestDocumentNumber',
  'confirmedPortDate',
]

const DEFAULT_LIMIT = 50

export async function getPortingRequestDetailsHistory(
  requestId: string,
): Promise<PortingRequestDetailsHistoryResultDto> {
  const exists = await prisma.portingRequest.findUnique({
    where: { id: requestId },
    select: { id: true },
  })

  if (!exists) {
    throw AppError.notFound('Sprawa portowania nie zostala znaleziona.')
  }

  const rows = await prisma.auditLog.findMany({
    where: {
      requestId,
      action: 'UPDATE',
      entityType: 'porting_request',
      fieldName: { in: DETAILS_HISTORY_FIELD_NAMES },
    },
    orderBy: { timestamp: 'desc' },
    take: DEFAULT_LIMIT,
    select: {
      id: true,
      fieldName: true,
      oldValue: true,
      newValue: true,
      timestamp: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  })

  const items: PortingRequestDetailsHistoryItemDto[] = rows.map((row) => ({
    id: row.id,
    fieldName: row.fieldName as DetailsHistoryFieldName,
    oldValue: row.oldValue,
    newValue: row.newValue,
    actorDisplayName: `${row.user.firstName} ${row.user.lastName}`.trim(),
    actorRole: row.user.role,
    timestamp: row.timestamp.toISOString(),
  }))

  return { items }
}
