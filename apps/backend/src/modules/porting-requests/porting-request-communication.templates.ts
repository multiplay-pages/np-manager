import {
  PORTING_COMMUNICATION_TRIGGER_TYPES,
  type PortingCaseStatus,
  type PortingCommunicationTriggerType,
} from '@np-manager/shared'
import { resolveSuggestedCommunicationActionType } from '../communications/porting-request-communication-policy'

interface SuggestedTemplateSnapshot {
  statusInternal: PortingCaseStatus
  donorAssignedPortDate: Date | null
  confirmedPortDate: Date | null
  sentToExternalSystemAt: Date | null
}

export function resolveSuggestedCommunicationTriggerType(
  snapshot: SuggestedTemplateSnapshot,
): PortingCommunicationTriggerType {
  const actionType = resolveSuggestedCommunicationActionType({
    statusInternal: snapshot.statusInternal,
    sentToExternalSystemAt: snapshot.sentToExternalSystemAt,
    confirmedPortDate: snapshot.confirmedPortDate,
    donorAssignedPortDate: snapshot.donorAssignedPortDate,
  })

  if (actionType === 'REJECTION_NOTICE') {
    return PORTING_COMMUNICATION_TRIGGER_TYPES.CASE_REJECTED
  }

  if (actionType === 'COMPLETION_NOTICE') {
    return PORTING_COMMUNICATION_TRIGGER_TYPES.PORT_COMPLETED
  }

  if (snapshot.confirmedPortDate || snapshot.donorAssignedPortDate) {
    return PORTING_COMMUNICATION_TRIGGER_TYPES.PORT_DATE_SCHEDULED
  }

  if (snapshot.sentToExternalSystemAt || snapshot.statusInternal === 'PENDING_DONOR') {
    return PORTING_COMMUNICATION_TRIGGER_TYPES.SENT_TO_EXTERNAL_SYSTEM
  }

  return PORTING_COMMUNICATION_TRIGGER_TYPES.CASE_RECEIVED
}
