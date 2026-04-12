export type NotificationFailureQueueOperationalStatus =
  | 'RETRY_AVAILABLE'
  | 'RETRY_BLOCKED_EXHAUSTED'
  | 'RETRY_BLOCKED_OTHER'
  | 'MANUAL_INTERVENTION_REQUIRED'

export type NotificationFailureQueueOperationalStatusFilter =
  | NotificationFailureQueueOperationalStatus
  | ''

export interface NotificationFailureQueueOperationalStatusOption {
  value: NotificationFailureQueueOperationalStatusFilter
  label: string
}

export const NOTIFICATION_FAILURE_QUEUE_OPERATIONAL_STATUS_OPTIONS: NotificationFailureQueueOperationalStatusOption[] =
  [
    { value: '', label: 'Wszystkie' },
    { value: 'RETRY_AVAILABLE', label: 'Gotowy do ponowienia' },
    { value: 'RETRY_BLOCKED_EXHAUSTED', label: 'Limit wyczerpany' },
    { value: 'RETRY_BLOCKED_OTHER', label: 'Zablokowany' },
    { value: 'MANUAL_INTERVENTION_REQUIRED', label: 'Wymaga interwencji' },
  ]

export function isNotificationFailureQueueOperationalStatus(
  value: string,
): value is NotificationFailureQueueOperationalStatus {
  return (
    value === 'RETRY_AVAILABLE' ||
    value === 'RETRY_BLOCKED_EXHAUSTED' ||
    value === 'RETRY_BLOCKED_OTHER' ||
    value === 'MANUAL_INTERVENTION_REQUIRED'
  )
}
