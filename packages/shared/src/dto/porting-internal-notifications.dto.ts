export const PORTING_INTERNAL_NOTIFICATION_ENTRY_TYPES = {
  USER_NOTIFICATION: 'USER_NOTIFICATION',
  TEAM_ROUTING: 'TEAM_ROUTING',
  TRANSPORT_AUDIT: 'TRANSPORT_AUDIT',
} as const

export type PortingInternalNotificationEntryType =
  (typeof PORTING_INTERNAL_NOTIFICATION_ENTRY_TYPES)[keyof typeof PORTING_INTERNAL_NOTIFICATION_ENTRY_TYPES]

export const PORTING_INTERNAL_NOTIFICATION_CHANNELS = {
  IN_APP: 'IN_APP',
  EMAIL: 'EMAIL',
  TEAMS: 'TEAMS',
  UNKNOWN: 'UNKNOWN',
} as const

export type PortingInternalNotificationChannel =
  (typeof PORTING_INTERNAL_NOTIFICATION_CHANNELS)[keyof typeof PORTING_INTERNAL_NOTIFICATION_CHANNELS]

export interface PortingInternalNotificationHistoryItemDto {
  id: string
  entryType: PortingInternalNotificationEntryType
  eventCode: string | null
  eventLabel: string
  channel: PortingInternalNotificationChannel
  recipient: string | null
  outcome: string | null
  mode: string | null
  message: string
  errorMessage: string | null
  createdAt: string
}

export interface PortingInternalNotificationHistoryResultDto {
  items: PortingInternalNotificationHistoryItemDto[]
}

export type InternalNotificationAttemptOriginDto = 'PRIMARY' | 'ERROR_FALLBACK' | 'RETRY'

export type InternalNotificationAttemptChannelDto = 'EMAIL' | 'TEAMS'

export type InternalNotificationAttemptModeDto = 'REAL' | 'STUB' | 'DISABLED' | 'POLICY'

export type InternalNotificationAttemptOutcomeDto =
  | 'SENT'
  | 'STUBBED'
  | 'DISABLED'
  | 'MISCONFIGURED'
  | 'FAILED'
  | 'SKIPPED'

export type InternalNotificationFailureKindDto = 'DELIVERY' | 'CONFIGURATION' | 'POLICY' | null

export type InternalNotificationRetryBlockedReasonCodeDto =
  | 'NOT_LATEST_IN_CHAIN'
  | 'ORIGIN_NOT_RETRYABLE'
  | 'OUTCOME_NOT_RETRYABLE'
  | 'RETRY_LIMIT_REACHED'

export interface InternalNotificationDeliveryAttemptDto {
  id: string
  requestId: string
  eventCode: string
  eventLabel: string
  attemptOrigin: InternalNotificationAttemptOriginDto
  channel: InternalNotificationAttemptChannelDto
  recipient: string
  mode: InternalNotificationAttemptModeDto
  outcome: InternalNotificationAttemptOutcomeDto
  errorCode: string | null
  errorMessage: string | null
  failureKind: InternalNotificationFailureKindDto
  retryOfAttemptId: string | null
  retryCount: number
  isLatestForChain: boolean
  triggeredByUserId: string | null
  triggeredByDisplayName: string | null
  canRetry: boolean
  retryBlockedReasonCode: InternalNotificationRetryBlockedReasonCodeDto | null
  createdAt: string
}

export interface InternalNotificationDeliveryAttemptsResultDto {
  requestId: string
  items: InternalNotificationDeliveryAttemptDto[]
}

export interface RetryInternalNotificationAttemptDto {
  reason?: string
}

export interface InternalNotificationRetryChainSummaryDto {
  rootAttemptId: string
  latestAttemptId: string
  retryCount: number
  latestOutcome: InternalNotificationAttemptOutcomeDto
  isLatestSuccessful: boolean
}

export interface RetryInternalNotificationAttemptResultDto {
  sourceAttempt: InternalNotificationDeliveryAttemptDto
  retryAttempt: InternalNotificationDeliveryAttemptDto
  chain: InternalNotificationRetryChainSummaryDto
}
