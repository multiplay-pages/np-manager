/**
 * Internal notification events for the porting process.
 *
 * Foundation scope (PR13A):
 * - model a wider, extensible event catalog,
 * - wire low-risk events only (currently STATUS_CHANGED and COMMERCIAL_OWNER_CHANGED),
 * - keep the catalog ready for future PLI CBD event hooks.
 */
export const PORTING_NOTIFICATION_EVENT = {
  REQUEST_CREATED: 'REQUEST_CREATED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  E03_SENT: 'E03_SENT',
  E06_RECEIVED: 'E06_RECEIVED',
  PORT_DATE_CONFIRMED: 'PORT_DATE_CONFIRMED',
  E12_SENT: 'E12_SENT',
  E13_RECEIVED: 'E13_RECEIVED',
  NUMBER_PORTED: 'NUMBER_PORTED',
  CASE_REJECTED: 'CASE_REJECTED',
  COMMERCIAL_OWNER_CHANGED: 'COMMERCIAL_OWNER_CHANGED',
} as const

export type PortingNotificationEvent =
  (typeof PORTING_NOTIFICATION_EVENT)[keyof typeof PORTING_NOTIFICATION_EVENT]

export const PORTING_NOTIFICATION_EVENT_LABELS: Record<PortingNotificationEvent, string> = {
  REQUEST_CREATED: 'Nowa sprawa portowania',
  STATUS_CHANGED: 'Zmiana statusu sprawy',
  E03_SENT: 'Wyslano E03',
  E06_RECEIVED: 'Odebrano E06',
  PORT_DATE_CONFIRMED: 'Potwierdzono date przeniesienia',
  E12_SENT: 'Wyslano E12',
  E13_RECEIVED: 'Odebrano E13',
  NUMBER_PORTED: 'Numer zostal przeniesiony',
  CASE_REJECTED: 'Sprawa zostala odrzucona',
  COMMERCIAL_OWNER_CHANGED: 'Zmiana opiekuna handlowego',
}
