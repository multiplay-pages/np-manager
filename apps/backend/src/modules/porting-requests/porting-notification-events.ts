/**
 * Katalog wewnętrznych zdarzeń domenowych procesu portowania numeru.
 *
 * Zdarzenia te są bazą routingu powiadomień wewnętrznych — do opiekuna
 * handlowego lub do wspólnych odbiorców zespołowych.
 *
 * Architektura jest rozszerzalna pod przyszłe zdarzenia PLI CBD:
 *   E03_SENT, E06_RECEIVED, PORT_DATE_CONFIRMED, E12_SENT,
 *   E13_RECEIVED, NUMBER_PORTED, CASE_REJECTED itp.
 *
 * Na tym etapie wdrożone eventy:
 *   - REQUEST_CREATED      — sprawa zarejestrowana
 *   - STATUS_CHANGED       — zmiana statusu sprawy
 *   - COMMERCIAL_OWNER_CHANGED — zmiana opiekuna handlowego
 */

export const PORTING_NOTIFICATION_EVENT = {
  REQUEST_CREATED: 'REQUEST_CREATED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  COMMERCIAL_OWNER_CHANGED: 'COMMERCIAL_OWNER_CHANGED',

  // TODO(PR13B+): podłączyć po wdrożeniu pełnego flow PLI CBD
  // E03_SENT: 'E03_SENT',
  // E06_RECEIVED: 'E06_RECEIVED',
  // PORT_DATE_CONFIRMED: 'PORT_DATE_CONFIRMED',
  // E12_SENT: 'E12_SENT',
  // E13_RECEIVED: 'E13_RECEIVED',
  // NUMBER_PORTED: 'NUMBER_PORTED',
  // CASE_REJECTED: 'CASE_REJECTED',
} as const

export type PortingNotificationEvent =
  (typeof PORTING_NOTIFICATION_EVENT)[keyof typeof PORTING_NOTIFICATION_EVENT]

export const PORTING_NOTIFICATION_EVENT_LABELS: Record<PortingNotificationEvent, string> = {
  REQUEST_CREATED: 'Nowa sprawa portowania',
  STATUS_CHANGED: 'Zmiana statusu sprawy',
  COMMERCIAL_OWNER_CHANGED: 'Zmiana opiekuna handlowego',
}
