import { Prisma } from '@prisma/client'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/app-error'
import { logAuditEvent } from '../../shared/audit/audit.service'
import type {
  ClientListItemDto,
  ClientDetailDto,
  ClientSearchItemDto,
} from '@np-manager/shared'
import type { CreateClientBody, UpdateClientBody, ClientListQuery } from './clients.schema'

// ============================================================
// FUNKCJE POMOCNICZE
// ============================================================

function maskPesel(pesel: string): string {
  // "90010112345" → "900101*****"
  return `${pesel.slice(0, 6)}*****`
}

function maskNip(nip: string): string {
  // "1234567890" → "123*******"
  return `${nip.slice(0, 3)}*******`
}

function getDisplayName(client: {
  clientType: string
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
}): string {
  if (client.clientType === 'BUSINESS') {
    return client.companyName ?? 'Firma (brak nazwy)'
  }
  const parts = [client.firstName, client.lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Brak danych'
}

function getIdentifierMasked(client: {
  clientType: string
  pesel?: string | null
  nip?: string | null
}): string | null {
  if (client.clientType === 'INDIVIDUAL') {
    return client.pesel ? maskPesel(client.pesel) : null
  }
  return client.nip ? maskNip(client.nip) : null
}

// ============================================================
// PRISMA SELECT — wielokrotnie używane
// ============================================================

const LIST_SELECT = {
  id: true,
  clientType: true,
  firstName: true,
  lastName: true,
  companyName: true,
  pesel: true,
  nip: true,
  email: true,
  phoneContact: true,
  addressCity: true,
  createdAt: true,
} as const

const DETAIL_SELECT = {
  id: true,
  clientType: true,
  firstName: true,
  lastName: true,
  pesel: true,
  companyName: true,
  nip: true,
  krs: true,
  proxyName: true,
  proxyPesel: true,
  email: true,
  phoneContact: true,
  addressStreet: true,
  addressCity: true,
  addressZip: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { requests: true } },
} as const

const SEARCH_SELECT = {
  id: true,
  clientType: true,
  firstName: true,
  lastName: true,
  companyName: true,
  pesel: true,
  nip: true,
} as const

type ClientListRow = Prisma.ClientGetPayload<{ select: typeof LIST_SELECT }>
type ClientDetailRow = Prisma.ClientGetPayload<{ select: typeof DETAIL_SELECT }>
type ClientSearchRow = Prisma.ClientGetPayload<{ select: typeof SEARCH_SELECT }>

// ============================================================
// MAPPERY
// ============================================================

function toListItem(c: ClientListRow): ClientListItemDto {
  return {
    id: c.id,
    clientType: c.clientType,
    displayName: getDisplayName(c),
    identifierMasked: getIdentifierMasked(c),
    email: c.email,
    phoneContact: c.phoneContact,
    addressCity: c.addressCity,
    createdAt: c.createdAt.toISOString(),
  }
}

function toDetailDto(c: ClientDetailRow): ClientDetailDto {
  return {
    id: c.id,
    clientType: c.clientType,
    firstName: c.firstName,
    lastName: c.lastName,
    pesel: c.pesel,
    companyName: c.companyName,
    nip: c.nip,
    krs: c.krs,
    proxyName: c.proxyName,
    proxyPesel: c.proxyPesel,
    email: c.email,
    phoneContact: c.phoneContact,
    addressStreet: c.addressStreet,
    addressCity: c.addressCity,
    addressZip: c.addressZip,
    displayName: getDisplayName(c),
    requestsCount: c._count.requests,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

function toSearchItem(c: ClientSearchRow): ClientSearchItemDto {
  return {
    id: c.id,
    clientType: c.clientType,
    displayName: getDisplayName(c),
    identifierMasked: getIdentifierMasked(c),
  }
}

// ============================================================
// LIST CLIENTS
// ============================================================

export async function listClients(query: ClientListQuery): Promise<{
  items: ClientListItemDto[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}> {
  const { search, page, pageSize, clientType } = query

  const where: Prisma.ClientWhereInput = {}

  if (clientType) {
    where.clientType = clientType
  }

  if (search?.trim()) {
    const s = search.trim()
    where.OR = [
      { lastName: { contains: s, mode: 'insensitive' } },
      { firstName: { contains: s, mode: 'insensitive' } },
      { companyName: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } },
      { pesel: { contains: s } },
      { nip: { contains: s } },
    ]
  }

  // Sortowanie zależne od filtra — bez filtra: najnowsze pierwsze (lista mieszana)
  const orderBy: Prisma.ClientOrderByWithRelationInput[] =
    clientType === 'BUSINESS'
      ? [{ companyName: 'asc' }]
      : clientType === 'INDIVIDUAL'
        ? [{ lastName: 'asc' }, { firstName: 'asc' }]
        : [{ createdAt: 'desc' }]

  const [total, clients] = await prisma.$transaction([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      select: LIST_SELECT,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    items: clients.map(toListItem),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

// ============================================================
// GET CLIENT BY ID
// ============================================================

/**
 * Zwraca pełne dane klienta.
 * PESEL/NIP dostępne w pełnej formie — endpoint wymaga auth + RBAC.
 * requestsCount z prostego COUNT — nie wymaga implementacji modułu spraw.
 */
export async function getClient(id: string): Promise<ClientDetailDto> {
  const client = await prisma.client.findUnique({
    where: { id },
    select: DETAIL_SELECT,
  })

  if (!client) {
    throw AppError.notFound('Klient nie został znaleziony.')
  }

  return toDetailDto(client)
}

// ============================================================
// SEARCH CLIENTS (autocomplete)
// ============================================================

export async function searchClients(q: string): Promise<ClientSearchItemDto[]> {
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { lastName: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { companyName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { pesel: { contains: q } },
        { nip: { contains: q } },
      ],
    },
    select: SEARCH_SELECT,
    take: 10,
    orderBy: { createdAt: 'desc' },
  })

  return clients.map(toSearchItem)
}

// ============================================================
// CREATE CLIENT
// ============================================================

export async function createClient(
  body: CreateClientBody,
  createdById: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<ClientDetailDto> {
  // Sprawdź duplikaty identyfikatorów
  if (body.clientType === 'INDIVIDUAL') {
    const exists = await prisma.client.findUnique({
      where: { pesel: body.pesel },
      select: { id: true },
    })
    if (exists) {
      throw AppError.conflict(
        'Klient z podanym numerem PESEL już istnieje w systemie.',
        'PESEL_ALREADY_EXISTS',
      )
    }
  } else {
    const exists = await prisma.client.findUnique({
      where: { nip: body.nip },
      select: { id: true },
    })
    if (exists) {
      throw AppError.conflict(
        'Klient z podanym numerem NIP już istnieje w systemie.',
        'NIP_ALREADY_EXISTS',
      )
    }
  }

  // Wspólne pola bazowe
  const baseData = {
    clientType: body.clientType,
    email: body.email,
    phoneContact: body.phoneContact,
    addressStreet: body.addressStreet,
    addressCity: body.addressCity,
    addressZip: body.addressZip,
    proxyName: body.proxyName ?? null,
    proxyPesel: body.proxyPesel ?? null,
    createdById,
  }

  // Twórz z polami specyficznymi dla typu
  const client =
    body.clientType === 'INDIVIDUAL'
      ? await prisma.client.create({
          data: {
            ...baseData,
            firstName: body.firstName,
            lastName: body.lastName,
            pesel: body.pesel,
          },
          select: DETAIL_SELECT,
        })
      : await prisma.client.create({
          data: {
            ...baseData,
            companyName: body.companyName,
            nip: body.nip, // nipSchema normalizuje myślniki → przechowujemy bez myślników
            krs: body.krs ?? null,
          },
          select: DETAIL_SELECT,
        })

  await logAuditEvent({
    action: 'CREATE',
    userId: createdById,
    entityType: 'client',
    entityId: client.id,
    newValue: `${body.clientType}: ${getDisplayName(client)}`,
    ipAddress,
    userAgent,
  })

  return toDetailDto(client)
}

// ============================================================
// UPDATE CLIENT
// ============================================================

/**
 * Aktualizuje edytowalne pola klienta.
 *
 * PESEL/NIP są immutable — nie można ich zmienić przez ten endpoint.
 * clientType jest immutable — serwis stosuje pola type-specific na podstawie
 * aktualnego clientType z bazy, ignorując ewentualne INDIVIDUAL-pola
 * jeśli klient jest BUSINESS i odwrotnie.
 */
export async function updateClient(
  id: string,
  body: UpdateClientBody,
  performedBy: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<ClientDetailDto> {
  const existing = await prisma.client.findUnique({
    where: { id },
    select: { id: true, clientType: true },
  })

  if (!existing) {
    throw AppError.notFound('Klient nie został znaleziony.')
  }

  // Buduj data — tylko pola, które zostały dostarczone (undefined = pominięte)
  const data: Prisma.ClientUpdateInput = {}

  if (body.email !== undefined) data.email = body.email
  if (body.phoneContact !== undefined) data.phoneContact = body.phoneContact
  if (body.addressStreet !== undefined) data.addressStreet = body.addressStreet
  if (body.addressCity !== undefined) data.addressCity = body.addressCity
  if (body.addressZip !== undefined) data.addressZip = body.addressZip
  if (body.proxyName !== undefined) data.proxyName = body.proxyName   // null = wyczyść
  if (body.proxyPesel !== undefined) data.proxyPesel = body.proxyPesel // null = wyczyść

  // Pola specyficzne dla typu — stosuj tylko jeśli typ się zgadza
  if (existing.clientType === 'INDIVIDUAL') {
    if (body.firstName !== undefined) data.firstName = body.firstName
    if (body.lastName !== undefined) data.lastName = body.lastName
  }

  if (existing.clientType === 'BUSINESS') {
    if (body.companyName !== undefined) data.companyName = body.companyName
    if (body.krs !== undefined) data.krs = body.krs // null = wyczyść
  }

  const updatedClient = await prisma.client.update({
    where: { id },
    data,
    select: DETAIL_SELECT,
  })

  const changedFields = Object.keys(data).join(', ')
  await logAuditEvent({
    action: 'UPDATE',
    userId: performedBy,
    entityType: 'client',
    entityId: id,
    newValue: changedFields || 'no fields changed',
    ipAddress,
    userAgent,
  })

  return toDetailDto(updatedClient)
}
