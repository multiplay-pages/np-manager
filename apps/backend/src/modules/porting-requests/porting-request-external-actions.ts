import type { UserRole } from '@prisma/client'
import type {
  ExecutePortingRequestExternalActionDto,
  PortingCaseStatus,
  PortingCommunicationTriggerType,
  PortingRequestExternalActionDto,
  PortingRequestExternalActionId,
} from '@np-manager/shared'
import {
  PORTING_REQUEST_EXTERNAL_ACTION_IDS,
  PORTING_COMMUNICATION_TRIGGER_TYPES,
} from '@np-manager/shared'
import { AppError } from '../../shared/errors/app-error'

interface ExternalActionSnapshot {
  statusInternal: PortingCaseStatus
  sentToExternalSystemAt: Date | null
}

interface ExternalActionConfig {
  actionId: PortingRequestExternalActionId
  label: string
  description: string
  allowedRoles: UserRole[]
  allowedStatuses: PortingCaseStatus[]
  requiresScheduledPortDate: boolean
  requiresRejectionReason: boolean
  suggestedCommunicationTriggerType: PortingCommunicationTriggerType
}

export interface ResolvedExternalActionPlan {
  config: ExternalActionConfig
  targetStatus: PortingCaseStatus | null
  scheduledPortDate: string | null
  rejectionReason: string | null
  comment: string | null
}

const EXTERNAL_ACTION_ROLES: UserRole[] = ['ADMIN', 'BACK_OFFICE', 'MANAGER']

const EXTERNAL_ACTION_CONFIGS: ExternalActionConfig[] = [
  {
    actionId: PORTING_REQUEST_EXTERNAL_ACTION_IDS.MARK_SENT_TO_EXTERNAL_SYSTEM,
    label: 'Przekazano do Adescom',
    description:
      'Rejestruje przekazanie sprawy do obslugi zewnetrznej. Bez integracji API, ale z mozliwoscia dalszej pracy i draftu do klienta.',
    allowedRoles: EXTERNAL_ACTION_ROLES,
    allowedStatuses: ['SUBMITTED', 'PENDING_DONOR'],
    requiresScheduledPortDate: false,
    requiresRejectionReason: false,
    suggestedCommunicationTriggerType: PORTING_COMMUNICATION_TRIGGER_TYPES.SENT_TO_EXTERNAL_SYSTEM,
  },
  {
    actionId: PORTING_REQUEST_EXTERNAL_ACTION_IDS.SET_PORT_DATE,
    label: 'Ustaw date przeniesienia',
    description:
      'Zapisuje uzgodniona date przeniesienia i moze przygotowac e-mail z potwierdzeniem terminu.',
    allowedRoles: EXTERNAL_ACTION_ROLES,
    allowedStatuses: ['SUBMITTED', 'PENDING_DONOR', 'CONFIRMED'],
    requiresScheduledPortDate: true,
    requiresRejectionReason: false,
    suggestedCommunicationTriggerType: PORTING_COMMUNICATION_TRIGGER_TYPES.PORT_DATE_SCHEDULED,
  },
  {
    actionId: PORTING_REQUEST_EXTERNAL_ACTION_IDS.MARK_DONOR_REJECTION,
    label: 'Oznacz odrzucenie od dawcy',
    description:
      'Zapisuje negatywna odpowiedz dawcy, powod odrzucenia i opcjonalnie przygotowuje komunikacje do klienta.',
    allowedRoles: EXTERNAL_ACTION_ROLES,
    allowedStatuses: ['SUBMITTED', 'PENDING_DONOR', 'REJECTED'],
    requiresScheduledPortDate: false,
    requiresRejectionReason: true,
    suggestedCommunicationTriggerType: PORTING_COMMUNICATION_TRIGGER_TYPES.CASE_REJECTED,
  },
  {
    actionId: PORTING_REQUEST_EXTERNAL_ACTION_IDS.MARK_PORT_COMPLETED,
    label: 'Oznacz przeniesienie zakonczone',
    description:
      'Domyka etap zewnetrzny po potwierdzeniu realizacji i moze utworzyc finalny draft e-mail do klienta.',
    allowedRoles: EXTERNAL_ACTION_ROLES,
    allowedStatuses: ['CONFIRMED', 'PORTED'],
    requiresScheduledPortDate: false,
    requiresRejectionReason: false,
    suggestedCommunicationTriggerType: PORTING_COMMUNICATION_TRIGGER_TYPES.PORT_COMPLETED,
  },
]

function normalizeOptionalText(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function getConfigOrThrow(actionId: PortingRequestExternalActionId): ExternalActionConfig {
  const config = EXTERNAL_ACTION_CONFIGS.find((item) => item.actionId === actionId)

  if (!config) {
    throw AppError.badRequest(
      'Nieobslugiwana akcja zewnetrzna.',
      'PORTING_REQUEST_EXTERNAL_ACTION_UNSUPPORTED',
    )
  }

  return config
}

function isActionAvailable(
  config: ExternalActionConfig,
  snapshot: ExternalActionSnapshot,
): boolean {
  if (!config.allowedStatuses.includes(snapshot.statusInternal)) {
    return false
  }

  if (
    config.actionId === PORTING_REQUEST_EXTERNAL_ACTION_IDS.MARK_SENT_TO_EXTERNAL_SYSTEM &&
    snapshot.sentToExternalSystemAt
  ) {
    return false
  }

  return true
}

export function getAvailableExternalActions(
  snapshot: ExternalActionSnapshot,
  role: UserRole,
): PortingRequestExternalActionDto[] {
  return EXTERNAL_ACTION_CONFIGS
    .filter((config) => config.allowedRoles.includes(role) && isActionAvailable(config, snapshot))
    .map((config) => ({
      actionId: config.actionId,
      label: config.label,
      description: config.description,
      requiresScheduledPortDate: config.requiresScheduledPortDate,
      requiresRejectionReason: config.requiresRejectionReason,
      suggestedCommunicationTriggerType: config.suggestedCommunicationTriggerType,
    }))
}

export function resolveExternalActionPlan(
  snapshot: ExternalActionSnapshot,
  body: ExecutePortingRequestExternalActionDto,
  role: UserRole,
): ResolvedExternalActionPlan {
  const config = getConfigOrThrow(body.actionId)

  if (!config.allowedRoles.includes(role)) {
    throw AppError.forbidden(
      'Twoja rola nie moze wykonac tej akcji zewnetrznej.',
      'PORTING_REQUEST_EXTERNAL_ACTION_ROLE_NOT_ALLOWED',
    )
  }

  if (!isActionAvailable(config, snapshot)) {
    throw AppError.badRequest(
      'Ta akcja zewnetrzna nie jest dostepna dla aktualnego stanu sprawy.',
      'PORTING_REQUEST_EXTERNAL_ACTION_NOT_AVAILABLE',
    )
  }

  const scheduledPortDate = body.scheduledPortDate?.trim() ?? null
  const rejectionReason = normalizeOptionalText(body.rejectionReason)
  const comment = normalizeOptionalText(body.comment)

  if (config.requiresScheduledPortDate && !scheduledPortDate) {
    throw AppError.badRequest(
      'Data przeniesienia jest wymagana dla tej akcji.',
      'PORTING_REQUEST_EXTERNAL_ACTION_SCHEDULED_PORT_DATE_REQUIRED',
    )
  }

  if (config.requiresRejectionReason && !rejectionReason) {
    throw AppError.badRequest(
      'Powod odrzucenia jest wymagany dla tej akcji.',
      'PORTING_REQUEST_EXTERNAL_ACTION_REJECTION_REASON_REQUIRED',
    )
  }

  let targetStatus: PortingCaseStatus | null = null

  if (config.actionId === PORTING_REQUEST_EXTERNAL_ACTION_IDS.MARK_SENT_TO_EXTERNAL_SYSTEM) {
    targetStatus = snapshot.statusInternal === 'SUBMITTED' ? 'PENDING_DONOR' : null
  }

  if (config.actionId === PORTING_REQUEST_EXTERNAL_ACTION_IDS.SET_PORT_DATE) {
    targetStatus = snapshot.statusInternal === 'CONFIRMED' ? null : 'CONFIRMED'
  }

  if (config.actionId === PORTING_REQUEST_EXTERNAL_ACTION_IDS.MARK_DONOR_REJECTION) {
    targetStatus = snapshot.statusInternal === 'REJECTED' ? null : 'REJECTED'
  }

  if (config.actionId === PORTING_REQUEST_EXTERNAL_ACTION_IDS.MARK_PORT_COMPLETED) {
    targetStatus = snapshot.statusInternal === 'PORTED' ? null : 'PORTED'
  }

  return {
    config,
    targetStatus,
    scheduledPortDate,
    rejectionReason,
    comment,
  }
}
