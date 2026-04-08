import type { UserRole, CaseStatusCode, Priority, ClientType, DocumentStatus } from '../constants'

// ============================================================
// WSPÓLNE TYPY API
// ============================================================

/** Standardowa odpowiedź sukcesu z API */
export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

/** Standardowa odpowiedź błędu z API */
export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

/** Parametry paginacji */
export interface PaginationParams {
  page: number
  limit: number
}

/** Odpowiedź paginowana */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ============================================================
// TYPY UŻYTKOWNIKA
// ============================================================

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  forcePasswordChange: boolean
}

export interface UserDto {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

// ============================================================
// TYPY KLIENTA
// ============================================================

export interface ClientDto {
  id: string
  clientType: ClientType
  firstName: string | null
  lastName: string | null
  pesel: string | null
  companyName: string | null
  nip: string | null
  krs: string | null
  proxyName: string | null
  email: string
  phoneContact: string
  addressStreet: string
  addressCity: string
  addressZip: string
  createdAt: string
  updatedAt: string
}

/** Wyświetlana nazwa klienta (obliczana) */
export function getClientDisplayName(client: Pick<ClientDto, 'clientType' | 'firstName' | 'lastName' | 'companyName'>): string {
  if (client.clientType === 'BUSINESS') {
    return client.companyName ?? 'Firma (brak nazwy)'
  }
  return `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() || 'Brak danych'
}

// ============================================================
// TYPY SPRAWY
// ============================================================

export interface PortabilityRequestSummaryDto {
  id: string
  caseNumber: string
  clientId: string
  clientName: string
  mainPhoneNumber: string
  statusCode: CaseStatusCode
  statusName: string
  statusColor: string
  priority: Priority
  donorOperatorName: string
  assignedToName: string | null
  slaDeadline: string
  requestedPortingDate: string
  createdAt: string
}

export interface PortabilityRequestDetailDto extends PortabilityRequestSummaryDto {
  client: ClientDto
  plannedPortingDate: string | null
  actualPortingDate: string | null
  donorRejectionReason: string | null
  cancellationReason: string | null
  donorRequestSentAt: string | null
  donorResponseAt: string | null
  closedAt: string | null
  updatedAt: string
}

// ============================================================
// TYPY DOKUMENTU
// ============================================================

export interface DocumentDto {
  id: string
  requestId: string
  documentTypeId: string
  documentTypeName: string
  fileName: string
  fileSize: number
  mimeType: string
  status: DocumentStatus
  rejectionReason: string | null
  uploadedAt: string
  uploadedByName: string
  verifiedAt: string | null
  verifiedByName: string | null
}

// ============================================================
// TYPY KOMENTARZA
// ============================================================

export interface CommentDto {
  id: string
  requestId: string
  authorId: string
  authorName: string
  body: string
  visibility: 'INTERNAL' | 'CLIENT_FACING'
  createdAt: string
}

// ============================================================
// TYPY HISTORII STATUSÓW
// ============================================================

export interface StatusHistoryDto {
  id: string
  statusCode: CaseStatusCode
  statusName: string
  statusColor: string
  changedByName: string
  comment: string | null
  changedAt: string
}

// ============================================================
// TYPY POWIADOMIEŃ
// ============================================================

export interface NotificationDto {
  id: string
  type: string
  title: string
  body: string
  relatedEntityType: string | null
  relatedEntityId: string | null
  isRead: boolean
  sentAt: string
  readAt: string | null
}

// ============================================================
// TYPY KARTOTEKI KLIENTÓW
// ============================================================

/**
 * DTO pozycji na liście klientów.
 * PESEL/NIP zwracane w formie maskowanej (identifierMasked).
 */
export interface ClientListItemDto {
  id: string
  clientType: ClientType
  /** Osoba: "Imię Nazwisko" | Firma: companyName */
  displayName: string
  /** PESEL: "900101*****" | NIP: "123*******" | null jeśli brak */
  identifierMasked: string | null
  email: string
  phoneContact: string
  addressCity: string
  createdAt: string
}

/**
 * Pełne DTO szczegółów klienta.
 * PESEL/NIP dostępne w pełnej formie (endpoint wymaga auth + RBAC).
 */
export interface ClientDetailDto {
  id: string
  clientType: ClientType
  // Osoba fizyczna
  firstName: string | null
  lastName: string | null
  pesel: string | null
  // Firma
  companyName: string | null
  nip: string | null
  krs: string | null
  // Pełnomocnik
  proxyName: string | null
  proxyPesel: string | null
  // Kontakt
  email: string
  phoneContact: string
  // Adres
  addressStreet: string
  addressCity: string
  addressZip: string
  // Obliczone
  displayName: string
  requestsCount: number
  // Meta
  createdAt: string
  updatedAt: string
}

/** DTO dla autocomplete wyszukiwania klienta (przyszły wizard sprawy) */
export interface ClientSearchItemDto {
  id: string
  clientType: ClientType
  displayName: string
  identifierMasked: string | null
}
