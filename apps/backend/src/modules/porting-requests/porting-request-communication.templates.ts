import type {
  PortingCommunicationPreviewDto,
  PortingCommunicationTemplateContextDto,
  PortingCommunicationTemplateKey,
  PortingCommunicationTriggerType,
  PortingRequestCommunicationActionType,
} from '@np-manager/shared'
import {
  PORTING_COMMUNICATION_TEMPLATE_KEYS,
  PORTING_COMMUNICATION_TRIGGER_TYPES,
  type PortingCaseStatus,
} from '@np-manager/shared'
import {
  resolveCommunicationTemplateKeyForAction,
  resolveSuggestedCommunicationActionType,
} from '../communications/porting-request-communication-policy'

interface CommunicationTemplateDefinition {
  subject: string
  body: string
}

interface SuggestedTemplateSnapshot {
  statusInternal: PortingCaseStatus
  donorAssignedPortDate: Date | null
  confirmedPortDate: Date | null
  rejectionReason: string | null
  sentToExternalSystemAt: Date | null
}

const PLACEHOLDER_PATTERN = /\{\{\s*(\w+)\s*\}\}/g

export const PORTING_COMMUNICATION_TEMPLATES: Record<
  PortingCommunicationTemplateKey,
  CommunicationTemplateDefinition
> = {
  case_received: {
    subject: 'Potwierdzenie przyjecia sprawy {{caseNumber}}',
    body: [
      'Dzien dobry {{clientName}},',
      '',
      'potwierdzamy przyjecie sprawy portowania numeru {{phoneNumber}}.',
      'Numer sprawy: {{caseNumber}}.',
      '',
      'Bedziemy informowac o kolejnych etapach obslugi.',
      '',
      'Zespol NP-Manager',
    ].join('\n'),
  },
  sent_to_external_system: {
    subject: 'Sprawa {{caseNumber}} zostala przekazana do realizacji',
    body: [
      'Dzien dobry {{clientName}},',
      '',
      'Twoja sprawa portowania numeru {{phoneNumber}} zostala przekazana do obslugi zewnetrznej.',
      'Numer sprawy: {{caseNumber}}.',
      '',
      'Gdy tylko pojawi sie odpowiedz lub termin przeniesienia, przygotujemy kolejna aktualizacje.',
      '',
      'Zespol NP-Manager',
    ].join('\n'),
  },
  port_date_scheduled: {
    subject: 'Ustalono termin przeniesienia dla sprawy {{caseNumber}}',
    body: [
      'Dzien dobry {{clientName}},',
      '',
      'dla numeru {{phoneNumber}} ustalono termin przeniesienia: {{scheduledPortDate}}.',
      'Numer sprawy: {{caseNumber}}.',
      '',
      'Jesli pojawia sie dodatkowe pytania, skontaktujemy sie oddzielnie.',
      '',
      'Zespol NP-Manager',
    ].join('\n'),
  },
  case_rejected: {
    subject: 'Aktualizacja sprawy {{caseNumber}} - odrzucenie',
    body: [
      'Dzien dobry {{clientName}},',
      '',
      'sprawa portowania numeru {{phoneNumber}} zostala odrzucona.',
      'Powod: {{rejectionReason}}.',
      'Numer sprawy: {{caseNumber}}.',
      '',
      'Po uzupelnieniu danych lub korekcie bedziemy mogli przygotowac dalsze kroki.',
      '',
      'Zespol NP-Manager',
    ].join('\n'),
  },
  port_completed: {
    subject: 'Przeniesienie numeru {{phoneNumber}} zostalo zakonczone',
    body: [
      'Dzien dobry {{clientName}},',
      '',
      'potwierdzamy zakonczenie przeniesienia numeru {{phoneNumber}}.',
      'Numer sprawy: {{caseNumber}}.',
      '',
      'Dziekujemy za cierpliwosc podczas realizacji procesu.',
      '',
      'Zespol NP-Manager',
    ].join('\n'),
  },
  missing_documents: {
    subject: 'Brakujace dokumenty dla sprawy {{caseNumber}}',
    body: [
      'Dzien dobry {{clientName}},',
      '',
      'do dalszej obslugi sprawy {{caseNumber}} potrzebujemy uzupelnienia brakujacych dokumentow lub korekty danych.',
      'Sprawa dotyczy numeru {{phoneNumber}}.',
      '',
      'Po uzupelnieniu dokumentow wznowimy obsluge bez dodatkowej zwloki.',
      '',
      'Zespol NP-Manager',
    ].join('\n'),
  },
  client_confirmation: {
    subject: 'Aktualizacja sprawy {{caseNumber}}',
    body: [
      'Dzien dobry {{clientName}},',
      '',
      'potwierdzamy, ze sprawa portowania numeru {{phoneNumber}} jest aktualnie obslugiwana.',
      'Numer sprawy: {{caseNumber}}.',
      '',
      'O kolejnych etapach bedziemy informowac na biezaco.',
      '',
      'Zespol NP-Manager',
    ].join('\n'),
  },
  rejection_notice: {
    subject: 'Sprawa {{caseNumber}} - informacja o odrzuceniu',
    body: [
      'Dzien dobry {{clientName}},',
      '',
      'sprawa portowania numeru {{phoneNumber}} zostala odrzucona.',
      'Powod: {{rejectionReason}}.',
      'Numer sprawy: {{caseNumber}}.',
      '',
      'Jesli chcesz wznowic proces po korekcie danych, skontaktujemy sie w osobnym kroku.',
      '',
      'Zespol NP-Manager',
    ].join('\n'),
  },
  completion_notice: {
    subject: 'Sprawa {{caseNumber}} zostala zakonczona',
    body: [
      'Dzien dobry {{clientName}},',
      '',
      'potwierdzamy zakonczenie przeniesienia numeru {{phoneNumber}}.',
      'Numer sprawy: {{caseNumber}}.',
      '',
      'Dziekujemy za wspolprace podczas realizacji procesu.',
      '',
      'Zespol NP-Manager',
    ].join('\n'),
  },
  internal_note_email: {
    subject: 'Wiadomosc operacyjna dla sprawy {{caseNumber}}',
    body: [
      'Dzien dobry,',
      '',
      'przekazujemy operacyjna aktualizacje dotyczaca sprawy {{caseNumber}} i numeru {{phoneNumber}}.',
      '',
      'W razie potrzeby prosimy o kontakt zwrotny w tym samym watku.',
      '',
      'Zespol NP-Manager',
    ].join('\n'),
  },
}

function getFallbackValue(
  key: keyof PortingCommunicationTemplateContextDto,
  context: PortingCommunicationTemplateContextDto,
): string {
  if (key === 'scheduledPortDate') {
    return context.scheduledPortDate ?? 'do potwierdzenia'
  }

  if (key === 'rejectionReason') {
    return context.rejectionReason ?? 'brak szczegolow'
  }

  return context[key] ?? ''
}

export function renderTemplateText(
  template: string,
  context: PortingCommunicationTemplateContextDto,
): string {
  return template.replace(
    PLACEHOLDER_PATTERN,
    (_match, rawKey: string) =>
      getFallbackValue(rawKey as keyof PortingCommunicationTemplateContextDto, context),
  )
}

export function resolveTemplateKeyForTrigger(
  triggerType: PortingCommunicationTriggerType,
): PortingCommunicationTemplateKey {
  if (triggerType === PORTING_COMMUNICATION_TRIGGER_TYPES.CASE_RECEIVED) {
    return PORTING_COMMUNICATION_TEMPLATE_KEYS.CASE_RECEIVED
  }

  if (triggerType === PORTING_COMMUNICATION_TRIGGER_TYPES.SENT_TO_EXTERNAL_SYSTEM) {
    return PORTING_COMMUNICATION_TEMPLATE_KEYS.SENT_TO_EXTERNAL_SYSTEM
  }

  if (triggerType === PORTING_COMMUNICATION_TRIGGER_TYPES.PORT_DATE_SCHEDULED) {
    return PORTING_COMMUNICATION_TEMPLATE_KEYS.PORT_DATE_SCHEDULED
  }

  if (triggerType === PORTING_COMMUNICATION_TRIGGER_TYPES.CASE_REJECTED) {
    return PORTING_COMMUNICATION_TEMPLATE_KEYS.CASE_REJECTED
  }

  return PORTING_COMMUNICATION_TEMPLATE_KEYS.PORT_COMPLETED
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

export function buildCommunicationPreview(params: {
  actionType: PortingRequestCommunicationActionType
  type: 'EMAIL'
  triggerType: PortingCommunicationTriggerType
  templateKey: PortingCommunicationTemplateKey
  recipient: string
  context: PortingCommunicationTemplateContextDto
}): PortingCommunicationPreviewDto {
  const template = PORTING_COMMUNICATION_TEMPLATES[params.templateKey]

  return {
    actionType: params.actionType,
    type: params.type,
    triggerType: params.triggerType,
    templateKey: params.templateKey,
    recipient: params.recipient,
    subject: renderTemplateText(template.subject, params.context),
    body: renderTemplateText(template.body, params.context),
    context: params.context,
  }
}

export function resolveTemplateKeyForAction(
  actionType: PortingRequestCommunicationActionType,
): PortingCommunicationTemplateKey {
  return resolveCommunicationTemplateKeyForAction(actionType)
}
