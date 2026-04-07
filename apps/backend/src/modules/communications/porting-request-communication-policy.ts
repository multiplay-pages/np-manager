import type { UserRole } from '@prisma/client'
import type {
  PortingCaseStatus,
  PortingCommunicationDto,
  PortingCommunicationStatus,
  PortingCommunicationSummaryDto,
  PortingCommunicationTemplateKey,
  PortingCommunicationTriggerType,
  PortingRequestCommunicationActionDto,
  PortingRequestCommunicationActionType,
} from '@np-manager/shared'
import {
  PORTING_COMMUNICATION_TEMPLATE_KEYS,
  PORTING_COMMUNICATION_TRIGGER_TYPES,
  PORTING_REQUEST_COMMUNICATION_ACTION_TYPES,
  PORTING_REQUEST_COMMUNICATION_ACTION_TYPE_LABELS,
} from '@np-manager/shared'

export interface CommunicationPolicyRequestSnapshot {
  statusInternal: PortingCaseStatus
  sentToExternalSystemAt: Date | null
  confirmedPortDate: Date | null
  donorAssignedPortDate: Date | null
}

interface CommunicationActionPolicy {
  type: PortingRequestCommunicationActionType
  label: string
  description: string
  allowedRoles: UserRole[]
  allowedStatuses: PortingCaseStatus[]
  canPreview: boolean
  canCreateDraft: boolean
  canMarkSent: boolean
  allowsMultipleDrafts: boolean
  defaultTriggerType: PortingCommunicationTriggerType
  templateKey: PortingCommunicationTemplateKey
}

const OPERATIONAL_ROLES: UserRole[] = ['ADMIN', 'BOK_CONSULTANT', 'BACK_OFFICE', 'MANAGER']
const REVIEW_ROLES: UserRole[] = ['ADMIN', 'BACK_OFFICE', 'MANAGER']
const ACTIVE_DRAFT_STATUSES: PortingCommunicationStatus[] = ['DRAFT', 'READY_TO_SEND']

const COMMUNICATION_ACTION_POLICIES: CommunicationActionPolicy[] = [
  {
    type: PORTING_REQUEST_COMMUNICATION_ACTION_TYPES.MISSING_DOCUMENTS,
    label: PORTING_REQUEST_COMMUNICATION_ACTION_TYPE_LABELS.MISSING_DOCUMENTS,
    description: 'Prosba do klienta o doslanie brakujacych dokumentow lub korekte danych.',
    allowedRoles: OPERATIONAL_ROLES,
    allowedStatuses: ['DRAFT', 'SUBMITTED', 'PENDING_DONOR'],
    canPreview: true,
    canCreateDraft: true,
    canMarkSent: true,
    allowsMultipleDrafts: false,
    defaultTriggerType: PORTING_COMMUNICATION_TRIGGER_TYPES.MANUAL,
    templateKey: PORTING_COMMUNICATION_TEMPLATE_KEYS.MISSING_DOCUMENTS,
  },
  {
    type: PORTING_REQUEST_COMMUNICATION_ACTION_TYPES.CLIENT_CONFIRMATION,
    label: PORTING_REQUEST_COMMUNICATION_ACTION_TYPE_LABELS.CLIENT_CONFIRMATION,
    description: 'Operacyjne potwierdzenie przyjecia sprawy, przekazania dalej lub ustalen sprawy.',
    allowedRoles: OPERATIONAL_ROLES,
    allowedStatuses: ['DRAFT', 'SUBMITTED', 'PENDING_DONOR', 'CONFIRMED'],
    canPreview: true,
    canCreateDraft: true,
    canMarkSent: true,
    allowsMultipleDrafts: false,
    defaultTriggerType: PORTING_COMMUNICATION_TRIGGER_TYPES.CASE_RECEIVED,
    templateKey: PORTING_COMMUNICATION_TEMPLATE_KEYS.CLIENT_CONFIRMATION,
  },
  {
    type: PORTING_REQUEST_COMMUNICATION_ACTION_TYPES.REJECTION_NOTICE,
    label: PORTING_REQUEST_COMMUNICATION_ACTION_TYPE_LABELS.REJECTION_NOTICE,
    description: 'Czytelna informacja dla klienta o odrzuceniu sprawy i dalszych mozliwych krokach.',
    allowedRoles: REVIEW_ROLES,
    allowedStatuses: ['REJECTED'],
    canPreview: true,
    canCreateDraft: true,
    canMarkSent: true,
    allowsMultipleDrafts: false,
    defaultTriggerType: PORTING_COMMUNICATION_TRIGGER_TYPES.CASE_REJECTED,
    templateKey: PORTING_COMMUNICATION_TEMPLATE_KEYS.REJECTION_NOTICE,
  },
  {
    type: PORTING_REQUEST_COMMUNICATION_ACTION_TYPES.COMPLETION_NOTICE,
    label: PORTING_REQUEST_COMMUNICATION_ACTION_TYPE_LABELS.COMPLETION_NOTICE,
    description: 'Finalna komunikacja po zakonczeniu przeniesienia numeru.',
    allowedRoles: REVIEW_ROLES,
    allowedStatuses: ['PORTED'],
    canPreview: true,
    canCreateDraft: true,
    canMarkSent: true,
    allowsMultipleDrafts: false,
    defaultTriggerType: PORTING_COMMUNICATION_TRIGGER_TYPES.PORT_COMPLETED,
    templateKey: PORTING_COMMUNICATION_TEMPLATE_KEYS.COMPLETION_NOTICE,
  },
  {
    type: PORTING_REQUEST_COMMUNICATION_ACTION_TYPES.INTERNAL_NOTE_EMAIL,
    label: PORTING_REQUEST_COMMUNICATION_ACTION_TYPE_LABELS.INTERNAL_NOTE_EMAIL,
    description: 'Wiadomosc wewnetrzna do operatora lub partnera, bez automatycznej logiki workflow.',
    allowedRoles: REVIEW_ROLES,
    allowedStatuses: ['DRAFT', 'SUBMITTED', 'PENDING_DONOR', 'CONFIRMED', 'ERROR'],
    canPreview: true,
    canCreateDraft: true,
    canMarkSent: true,
    allowsMultipleDrafts: true,
    defaultTriggerType: PORTING_COMMUNICATION_TRIGGER_TYPES.MANUAL,
    templateKey: PORTING_COMMUNICATION_TEMPLATE_KEYS.INTERNAL_NOTE_EMAIL,
  },
]

function getPolicyOrThrow(type: PortingRequestCommunicationActionType): CommunicationActionPolicy {
  const policy = COMMUNICATION_ACTION_POLICIES.find((item) => item.type === type)

  if (!policy) {
    throw new Error(`Unsupported communication action type: ${type}`)
  }

  return policy
}

function isKnownActionType(value: unknown): value is PortingRequestCommunicationActionType {
  return Object.values(PORTING_REQUEST_COMMUNICATION_ACTION_TYPES).includes(
    value as PortingRequestCommunicationActionType,
  )
}

export function resolveCommunicationActionTypeFromTemplateKey(
  templateKey: PortingCommunicationTemplateKey,
): PortingRequestCommunicationActionType | null {
  if (templateKey === PORTING_COMMUNICATION_TEMPLATE_KEYS.MISSING_DOCUMENTS) {
    return PORTING_REQUEST_COMMUNICATION_ACTION_TYPES.MISSING_DOCUMENTS
  }

  if (
    templateKey === PORTING_COMMUNICATION_TEMPLATE_KEYS.CLIENT_CONFIRMATION ||
    templateKey === PORTING_COMMUNICATION_TEMPLATE_KEYS.CASE_RECEIVED ||
    templateKey === PORTING_COMMUNICATION_TEMPLATE_KEYS.SENT_TO_EXTERNAL_SYSTEM ||
    templateKey === PORTING_COMMUNICATION_TEMPLATE_KEYS.PORT_DATE_SCHEDULED
  ) {
    return PORTING_REQUEST_COMMUNICATION_ACTION_TYPES.CLIENT_CONFIRMATION
  }

  if (
    templateKey === PORTING_COMMUNICATION_TEMPLATE_KEYS.REJECTION_NOTICE ||
    templateKey === PORTING_COMMUNICATION_TEMPLATE_KEYS.CASE_REJECTED
  ) {
    return PORTING_REQUEST_COMMUNICATION_ACTION_TYPES.REJECTION_NOTICE
  }

  if (
    templateKey === PORTING_COMMUNICATION_TEMPLATE_KEYS.COMPLETION_NOTICE ||
    templateKey === PORTING_COMMUNICATION_TEMPLATE_KEYS.PORT_COMPLETED
  ) {
    return PORTING_REQUEST_COMMUNICATION_ACTION_TYPES.COMPLETION_NOTICE
  }

  if (templateKey === PORTING_COMMUNICATION_TEMPLATE_KEYS.INTERNAL_NOTE_EMAIL) {
    return PORTING_REQUEST_COMMUNICATION_ACTION_TYPES.INTERNAL_NOTE_EMAIL
  }

  return null
}

export function resolveCommunicationActionTypeFromTriggerType(
  triggerType: PortingCommunicationTriggerType,
): PortingRequestCommunicationActionType {
  if (triggerType === PORTING_COMMUNICATION_TRIGGER_TYPES.CASE_REJECTED) {
    return PORTING_REQUEST_COMMUNICATION_ACTION_TYPES.REJECTION_NOTICE
  }

  if (triggerType === PORTING_COMMUNICATION_TRIGGER_TYPES.PORT_COMPLETED) {
    return PORTING_REQUEST_COMMUNICATION_ACTION_TYPES.COMPLETION_NOTICE
  }

  if (triggerType === PORTING_COMMUNICATION_TRIGGER_TYPES.MANUAL) {
    return PORTING_REQUEST_COMMUNICATION_ACTION_TYPES.INTERNAL_NOTE_EMAIL
  }

  return PORTING_REQUEST_COMMUNICATION_ACTION_TYPES.CLIENT_CONFIRMATION
}

function findActiveDraftForAction(
  history: PortingCommunicationDto[],
  actionType: PortingRequestCommunicationActionType,
): PortingCommunicationDto | null {
  return (
    history.find(
      (item) =>
        item.actionType === actionType && ACTIVE_DRAFT_STATUSES.includes(item.status),
    ) ?? null
  )
}

export function listCommunicationActionPolicies(): readonly CommunicationActionPolicy[] {
  return COMMUNICATION_ACTION_POLICIES
}

export function getCommunicationActionPolicy(
  type: PortingRequestCommunicationActionType,
): CommunicationActionPolicy {
  return getPolicyOrThrow(type)
}

export function resolveCommunicationActionTypeForRecord(
  communication: Pick<PortingCommunicationDto, 'metadata' | 'templateKey' | 'triggerType'>,
): PortingRequestCommunicationActionType {
  const metadataActionType = communication.metadata?.actionType

  if (isKnownActionType(metadataActionType)) {
    return metadataActionType
  }

  return (
    resolveCommunicationActionTypeFromTemplateKey(communication.templateKey) ??
    resolveCommunicationActionTypeFromTriggerType(communication.triggerType)
  )
}

export function resolveSuggestedCommunicationActionType(
  request: CommunicationPolicyRequestSnapshot,
): PortingRequestCommunicationActionType {
  if (request.statusInternal === 'REJECTED') {
    return PORTING_REQUEST_COMMUNICATION_ACTION_TYPES.REJECTION_NOTICE
  }

  if (request.statusInternal === 'PORTED') {
    return PORTING_REQUEST_COMMUNICATION_ACTION_TYPES.COMPLETION_NOTICE
  }

  return PORTING_REQUEST_COMMUNICATION_ACTION_TYPES.CLIENT_CONFIRMATION
}

export function buildCommunicationSummary(
  history: PortingCommunicationDto[],
): PortingCommunicationSummaryDto {
  const latest = history[0] ?? null

  return {
    totalCount: history.length,
    draftCount: history.filter((item) => ACTIVE_DRAFT_STATUSES.includes(item.status)).length,
    sentCount: history.filter((item) => item.status === 'SENT').length,
    errorCount: history.filter((item) => item.status === 'FAILED').length,
    lastCommunicationAt: latest?.createdAt ?? null,
    lastCommunicationType: latest?.actionType ?? null,
  }
}

export function getAvailableCommunicationActionsForRequest(
  request: CommunicationPolicyRequestSnapshot,
  userRole: UserRole,
  communicationHistory: PortingCommunicationDto[],
): PortingRequestCommunicationActionDto[] {
  return COMMUNICATION_ACTION_POLICIES.filter((policy) => policy.allowedRoles.includes(userRole)).map(
    (policy) => {
      const statusAllowed = policy.allowedStatuses.includes(request.statusInternal)
      const existingDraft = findActiveDraftForAction(communicationHistory, policy.type)
      const duplicateBlocked = Boolean(existingDraft) && !policy.allowsMultipleDrafts
      const existingDraftMarkable =
        existingDraft !== null && ACTIVE_DRAFT_STATUSES.includes(existingDraft.status)

      let disabledReason: string | null = null

      if (!statusAllowed) {
        disabledReason = `Akcja jest dostepna dopiero dla spraw w statusie zgodnym z polityka komunikacji. Aktualny status: ${request.statusInternal}.`
      } else if (duplicateBlocked) {
        disabledReason = 'Istnieje juz aktywny draft tego typu. Zakoncz go albo oznacz jako wyslany.'
      }

      const canPreview = policy.canPreview && statusAllowed
      const canCreateDraft = policy.canCreateDraft && statusAllowed && !duplicateBlocked
      const canMarkSent = policy.canMarkSent && statusAllowed && existingDraftMarkable

      return {
        type: policy.type,
        label: policy.label,
        description: policy.description,
        canPreview,
        canCreateDraft,
        canMarkSent,
        disabled: !canPreview && !canCreateDraft && !canMarkSent,
        disabledReason,
        existingDraftId: existingDraft?.id ?? null,
        existingDraftInfo: existingDraft
          ? {
              id: existingDraft.id,
              status: existingDraft.status,
              recipient: existingDraft.recipient,
              subject: existingDraft.subject,
              createdAt: existingDraft.createdAt,
              createdByDisplayName: existingDraft.createdByDisplayName,
            }
          : null,
        allowsMultipleDrafts: policy.allowsMultipleDrafts,
      }
    },
  )
}

export function resolveCommunicationTriggerTypeForAction(
  actionType: PortingRequestCommunicationActionType,
): PortingCommunicationTriggerType {
  return getPolicyOrThrow(actionType).defaultTriggerType
}

export function resolveCommunicationTemplateKeyForAction(
  actionType: PortingRequestCommunicationActionType,
): PortingCommunicationTemplateKey {
  return getPolicyOrThrow(actionType).templateKey
}
