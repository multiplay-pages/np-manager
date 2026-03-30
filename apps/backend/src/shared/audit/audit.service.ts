import { prisma } from '../../config/database'
import type { AuditAction } from '@prisma/client'

export interface AuditEventParams {
  action: AuditAction
  /** ID użytkownika wykonującego akcję — wymagany przez schemat DB */
  userId: string
  /** Typ encji, której dotyczy zdarzenie (np. 'user', 'portability_request') */
  entityType?: string
  /** ID encji, której dotyczy zdarzenie */
  entityId?: string
  /** Nazwa zmienionego pola (dla action = UPDATE) */
  fieldName?: string
  /** Wartość przed zmianą */
  oldValue?: string
  /** Wartość po zmianie lub opis zdarzenia */
  newValue?: string
  /** IP adres żądania */
  ipAddress?: string
  /** User-Agent przeglądarki/klienta */
  userAgent?: string
  /** ID powiązanej sprawy portabilności (jeśli dotyczy) */
  requestId?: string
}

/**
 * Centralny serwis logowania zdarzeń audytowych.
 *
 * Wszystkie operacje modyfikujące dane powinny wywołać tę funkcję.
 * Rekordy audit_log są append-only — brak soft-delete, brak UPDATE.
 *
 * WAŻNE: funkcja jest asynchroniczna. W krytycznych ścieżkach (np. auth)
 * wywołuj z .catch(() => {}) aby błąd audytu nie blokował odpowiedzi.
 * W normalnych ścieżkach biznesowych — await (audyt jest obowiązkowy).
 */
export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      entityType: params.entityType ?? 'system',
      entityId: params.entityId ?? params.userId,
      action: params.action,
      fieldName: params.fieldName ?? null,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
      userId: params.userId,
      requestId: params.requestId ?? null,
      ipAddress: params.ipAddress ?? null,
      // Obcinamy user-agent do 500 znaków (limit kolumny w schemacie)
      userAgent: params.userAgent ? params.userAgent.slice(0, 500) : null,
    },
  })
}
