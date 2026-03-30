import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/app-error'
import type { OperatorDto, CreateOperatorDto } from '@np-manager/shared'

// ============================================================
// SELECT — tylko pola eksponowane przez API
// ============================================================

const OPERATOR_SELECT = {
  id: true,
  name: true,
  shortName: true,
  routingNumber: true,
  isRecipientDefault: true,
  isActive: true,
} as const

// ============================================================
// LIST OPERATORS
// ============================================================

export async function listOperators(includeInactive = false): Promise<OperatorDto[]> {
  return prisma.operator.findMany({
    where: includeInactive ? undefined : { isActive: true },
    select: OPERATOR_SELECT,
    orderBy: { name: 'asc' },
  })
}

// ============================================================
// CREATE OPERATOR
// ============================================================

export async function createOperator(body: CreateOperatorDto): Promise<OperatorDto> {
  // Sprawdź duplikat routingNumber
  const existing = await prisma.operator.findUnique({
    where: { routingNumber: body.routingNumber },
    select: { id: true },
  })

  if (existing) {
    throw AppError.conflict(
      `Operator z numerem rozliczeniowym "${body.routingNumber}" już istnieje.`,
      'ROUTING_NUMBER_ALREADY_EXISTS',
    )
  }

  return prisma.operator.create({
    data: {
      name: body.name,
      shortName: body.shortName,
      routingNumber: body.routingNumber,
      isRecipientDefault: body.isRecipientDefault ?? false,
      isActive: body.isActive ?? true,
    },
    select: OPERATOR_SELECT,
  })
}
