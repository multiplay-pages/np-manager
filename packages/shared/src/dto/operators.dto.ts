// ============================================================
// OPERATOR DTOs
// ============================================================

/** Pełna reprezentacja operatora — zwracana przez GET /operators */
export interface OperatorDto {
  id: string
  name: string
  shortName: string
  routingNumber: string
  isRecipientDefault: boolean
  isActive: boolean
}

/**
 * Payload do tworzenia operatora — POST /operators.
 * isRecipientDefault i isActive mają wartości domyślne po stronie backendu,
 * dlatego są opcjonalne w żądaniu.
 */
export interface CreateOperatorDto {
  name: string
  shortName: string
  routingNumber: string
  isRecipientDefault?: boolean
  isActive?: boolean
}
