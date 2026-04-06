import {
  PLI_CBD_TECHNICAL_PAYLOAD_VERSION,
  type PliCbdAnyTechnicalPayloadDto,
  type PliCbdE03DraftDto,
  type PliCbdE03TechnicalPayloadDto,
  type PliCbdE12DraftDto,
  type PliCbdE12TechnicalPayloadDto,
  type PliCbdE18DraftDto,
  type PliCbdE18TechnicalPayloadDto,
  type PliCbdE23DraftDto,
  type PliCbdE23TechnicalPayloadDto,
  type PliCbdTechnicalPayloadDto,
  type PliCbdTechnicalPayloadMetadataDto,
  type PliCbdTechnicalPayloadNumberingDto,
  type PliCbdTechnicalPayloadPortingDto,
  type PliCbdTechnicalPayloadSubscriberDto,
  type PliCbdTechnicalPayloadWarningDto,
} from '@np-manager/shared'

interface PliCbdTechnicalMappingResult<TPayload extends PliCbdAnyTechnicalPayloadDto> {
  payload: TPayload
  technicalWarnings: PliCbdTechnicalPayloadWarningDto[]
}

export function mapE03DraftToTechnicalPayload(
  draft: PliCbdE03DraftDto,
): PliCbdTechnicalMappingResult<PliCbdE03TechnicalPayloadDto> {
  const payload: PliCbdE03TechnicalPayloadDto = {
    messageType: 'E03',
    serviceType: draft.serviceType,
    messageVersion: PLI_CBD_TECHNICAL_PAYLOAD_VERSION,
    caseNumber: draft.caseNumber,
    recipientOperatorRoutingNumber: draft.recipientOperator.routingNumber,
    donorOperatorRoutingNumber: draft.donorOperator.routingNumber,
    infrastructureOperatorRoutingNumber: draft.infrastructureOperator?.routingNumber ?? null,
    subscriber: buildSubscriberFromDraft({
      subscriberKind: draft.subscriberKind,
      subscriberDisplayName: draft.subscriberDisplayName,
      subscriberFirstName: draft.subscriberFirstName,
      subscriberLastName: draft.subscriberLastName,
      subscriberCompanyName: draft.subscriberCompanyName,
      identity: draft.identity,
      correspondenceAddress: draft.correspondenceAddress,
      contactChannel: draft.contactChannel,
    }),
    numbering: buildNumbering({
      numberType: draft.numberType,
      portedNumberKind: draft.portedNumberKind,
      numberDisplay: draft.numberDisplay,
      primaryNumber: draft.primaryNumber,
      rangeStart: draft.rangeStart,
      rangeEnd: draft.rangeEnd,
      selectionSource: draft.technicalHints.numberSelectionSource,
    }),
    porting: buildPorting({
      portingMode: draft.portingMode,
      requestedPortDate: draft.requestedPortDate,
      earliestAcceptablePortDate: draft.earliestAcceptablePortDate,
      donorAssignedPortDate: null,
      donorAssignedPortTime: null,
      confirmedPortDate: null,
      requestDocumentNumber: draft.requestDocumentNumber,
      hasPowerOfAttorney: draft.hasPowerOfAttorney,
      linkedWholesaleServiceOnRecipientSide: draft.linkedWholesaleServiceOnRecipientSide,
    }),
    context: {
      currentStage: null,
      currentStageLabel: null,
      statusInternal: null,
      statusInternalLabel: null,
      exportStatus: null,
      lastReceivedMessageType: null,
      allowedMessagesAtStage: ['E03'],
      dataSource: 'CURRENT_CASE_AND_PROCESS_SNAPSHOT',
      reasonHints: [],
      portDateSource: draft.technicalHints.portDateSource,
    },
    metadata: buildMetadata({
      requestId: draft.requestId,
      clientId: draft.clientId,
      clientDisplayName: draft.clientDisplayName,
      subscriberDisplayName: draft.subscriberDisplayName,
      sourceDraftMessageType: draft.messageType,
    }),
  }

  return {
    payload,
    technicalWarnings: buildCommonWarnings(payload).concat(
      buildE03TechnicalWarnings(draft, payload),
    ),
  }
}

export function mapE12DraftToTechnicalPayload(
  draft: PliCbdE12DraftDto,
): PliCbdTechnicalMappingResult<PliCbdE12TechnicalPayloadDto> {
  const payload: PliCbdE12TechnicalPayloadDto = {
    messageType: 'E12',
    serviceType: draft.serviceType,
    messageVersion: PLI_CBD_TECHNICAL_PAYLOAD_VERSION,
    caseNumber: draft.caseNumber,
    recipientOperatorRoutingNumber: draft.recipientOperator.routingNumber,
    donorOperatorRoutingNumber: draft.donorOperator.routingNumber,
    infrastructureOperatorRoutingNumber: draft.infrastructureOperator?.routingNumber ?? null,
    subscriber: buildSubscriberFromDraft({
      subscriberKind: draft.subscriberKind,
      subscriberDisplayName: draft.subscriberDisplayName,
      subscriberFirstName: draft.subscriberFirstName,
      subscriberLastName: draft.subscriberLastName,
      subscriberCompanyName: draft.subscriberCompanyName,
      identity: draft.identity,
      correspondenceAddress: draft.correspondenceAddress,
      contactChannel: draft.contactChannel,
    }),
    numbering: buildNumbering({
      numberType: draft.numberType,
      portedNumberKind: draft.numberRangeKind,
      numberDisplay: draft.numberDisplay,
      primaryNumber: draft.primaryNumber,
      rangeStart: draft.rangeStart,
      rangeEnd: draft.rangeEnd,
      selectionSource: draft.technicalHints.numberSelectionSource,
    }),
    porting: buildPorting({
      portingMode: draft.portingMode,
      requestedPortDate: null,
      earliestAcceptablePortDate: null,
      donorAssignedPortDate: draft.confirmationContext.donorAssignedPortDate,
      donorAssignedPortTime: draft.confirmationContext.donorAssignedPortTime,
      confirmedPortDate: null,
      requestDocumentNumber: draft.requestDocumentNumber,
      hasPowerOfAttorney: draft.hasPowerOfAttorney,
      linkedWholesaleServiceOnRecipientSide: draft.linkedWholesaleServiceOnRecipientSide,
    }),
    context: {
      currentStage: draft.confirmationContext.currentStage,
      currentStageLabel: draft.confirmationContext.currentStageLabel,
      statusInternal: draft.confirmationContext.statusInternal,
      statusInternalLabel: draft.confirmationContext.statusInternalLabel,
      exportStatus: draft.confirmationContext.exportStatus,
      lastReceivedMessageType: draft.confirmationContext.lastReceivedMessageType,
      allowedMessagesAtStage: draft.technicalHints.allowedMessagesAtStage,
      dataSource: draft.technicalHints.dataSource,
      reasonHints: draft.reasonHints,
      portDateSource: draft.technicalHints.portDateSource,
    },
    metadata: buildMetadata({
      requestId: draft.portingRequestId,
      clientId: draft.clientId,
      clientDisplayName: draft.clientDisplayName,
      subscriberDisplayName: draft.subscriberDisplayName,
      sourceDraftMessageType: draft.messageType,
    }),
  }

  return {
    payload,
    technicalWarnings: buildCommonWarnings(payload).concat(buildE12TechnicalWarnings(payload)),
  }
}

export function mapE18DraftToTechnicalPayload(
  draft: PliCbdE18DraftDto,
): PliCbdTechnicalMappingResult<PliCbdE18TechnicalPayloadDto> {
  const payload: PliCbdE18TechnicalPayloadDto = {
    messageType: 'E18',
    serviceType: draft.serviceType,
    messageVersion: PLI_CBD_TECHNICAL_PAYLOAD_VERSION,
    caseNumber: draft.caseNumber,
    recipientOperatorRoutingNumber: draft.recipientOperator.routingNumber,
    donorOperatorRoutingNumber: draft.donorOperator.routingNumber,
    infrastructureOperatorRoutingNumber: draft.infrastructureOperator?.routingNumber ?? null,
    subscriber: buildSubscriberFromDraft({
      subscriberKind: draft.subscriberKind,
      subscriberDisplayName: draft.subscriberDisplayName,
      subscriberFirstName: draft.subscriberFirstName,
      subscriberLastName: draft.subscriberLastName,
      subscriberCompanyName: draft.subscriberCompanyName,
      identity: draft.identity,
      correspondenceAddress: draft.correspondenceAddress,
      contactChannel: draft.contactChannel,
    }),
    numbering: buildNumbering({
      numberType: draft.numberType,
      portedNumberKind: draft.numberRangeKind,
      numberDisplay: draft.numberDisplay,
      primaryNumber: draft.primaryNumber,
      rangeStart: draft.rangeStart,
      rangeEnd: draft.rangeEnd,
      selectionSource: draft.technicalHints.numberSelectionSource,
    }),
    porting: buildPorting({
      portingMode: draft.portingMode,
      requestedPortDate: null,
      earliestAcceptablePortDate: null,
      donorAssignedPortDate: draft.completionContext.donorAssignedPortDate,
      donorAssignedPortTime: draft.completionContext.donorAssignedPortTime,
      confirmedPortDate: draft.completionContext.confirmedPortDate,
      requestDocumentNumber: draft.requestDocumentNumber,
      hasPowerOfAttorney: draft.hasPowerOfAttorney,
      linkedWholesaleServiceOnRecipientSide: draft.linkedWholesaleServiceOnRecipientSide,
    }),
    context: {
      currentStage: draft.completionContext.currentStage,
      currentStageLabel: draft.completionContext.currentStageLabel,
      statusInternal: draft.completionContext.statusInternal,
      statusInternalLabel: draft.completionContext.statusInternalLabel,
      exportStatus: draft.completionContext.exportStatus,
      lastReceivedMessageType: draft.completionContext.lastReceivedMessageType,
      allowedMessagesAtStage: draft.technicalHints.allowedMessagesAtStage,
      dataSource: draft.technicalHints.dataSource,
      reasonHints: draft.reasonHints,
    },
    metadata: buildMetadata({
      requestId: draft.requestId,
      clientId: draft.clientId,
      clientDisplayName: draft.clientDisplayName,
      subscriberDisplayName: draft.subscriberDisplayName,
      sourceDraftMessageType: draft.messageType,
    }),
  }

  return {
    payload,
    technicalWarnings: buildCommonWarnings(payload).concat(buildE18TechnicalWarnings(payload)),
  }
}

export function mapE23DraftToTechnicalPayload(
  draft: PliCbdE23DraftDto,
): PliCbdTechnicalMappingResult<PliCbdE23TechnicalPayloadDto> {
  const payload: PliCbdE23TechnicalPayloadDto = {
    messageType: 'E23',
    serviceType: draft.serviceType,
    messageVersion: PLI_CBD_TECHNICAL_PAYLOAD_VERSION,
    caseNumber: draft.caseNumber,
    recipientOperatorRoutingNumber: draft.recipientOperator.routingNumber,
    donorOperatorRoutingNumber: draft.donorOperator.routingNumber,
    infrastructureOperatorRoutingNumber: draft.infrastructureOperator?.routingNumber ?? null,
    subscriber: buildSubscriberFromDraft({
      subscriberKind: draft.subscriberKind,
      subscriberDisplayName: draft.subscriberDisplayName,
      subscriberFirstName: draft.subscriberFirstName,
      subscriberLastName: draft.subscriberLastName,
      subscriberCompanyName: draft.subscriberCompanyName,
      identity: draft.identity,
      correspondenceAddress: draft.correspondenceAddress,
      contactChannel: draft.contactChannel,
    }),
    numbering: buildNumbering({
      numberType: draft.numberType,
      portedNumberKind: draft.numberRangeKind,
      numberDisplay: draft.numberDisplay,
      primaryNumber: draft.primaryNumber,
      rangeStart: draft.rangeStart,
      rangeEnd: draft.rangeEnd,
      selectionSource: draft.technicalHints.numberSelectionSource,
    }),
    porting: buildPorting({
      portingMode: draft.portingMode,
      requestedPortDate: null,
      earliestAcceptablePortDate: null,
      donorAssignedPortDate: draft.cancellationContext.donorAssignedPortDate,
      donorAssignedPortTime: draft.cancellationContext.donorAssignedPortTime,
      confirmedPortDate: draft.cancellationContext.confirmedPortDate,
      requestDocumentNumber: draft.requestDocumentNumber,
      hasPowerOfAttorney: draft.hasPowerOfAttorney,
      linkedWholesaleServiceOnRecipientSide: draft.linkedWholesaleServiceOnRecipientSide,
    }),
    context: {
      currentStage: draft.cancellationContext.currentStage,
      currentStageLabel: draft.cancellationContext.currentStageLabel,
      statusInternal: draft.cancellationContext.statusInternal,
      statusInternalLabel: draft.cancellationContext.statusInternalLabel,
      exportStatus: draft.cancellationContext.exportStatus,
      lastReceivedMessageType: draft.cancellationContext.lastReceivedMessageType,
      allowedMessagesAtStage: draft.technicalHints.allowedMessagesAtStage,
      dataSource: draft.technicalHints.dataSource,
      reasonHints: draft.reasonHints,
      cancellationReasonCode: 'RECIPIENT_MANUAL_CANCELLATION',
    },
    metadata: buildMetadata({
      requestId: draft.requestId,
      clientId: draft.clientId,
      clientDisplayName: draft.clientDisplayName,
      subscriberDisplayName: draft.subscriberDisplayName,
      sourceDraftMessageType: draft.messageType,
    }),
  }

  return {
    payload,
    technicalWarnings: buildCommonWarnings(payload).concat(buildE23TechnicalWarnings(payload)),
  }
}

function buildSubscriberFromDraft(input: {
  subscriberKind: PliCbdTechnicalPayloadSubscriberDto['kind']
  subscriberDisplayName: string
  subscriberFirstName: string | null
  subscriberLastName: string | null
  subscriberCompanyName: string | null
  identity: PliCbdTechnicalPayloadSubscriberDto['identity']
  correspondenceAddress: string
  contactChannel: PliCbdTechnicalPayloadSubscriberDto['contactChannel']
}): PliCbdTechnicalPayloadSubscriberDto {
  return {
    kind: input.subscriberKind,
    displayName: input.subscriberDisplayName,
    firstName: input.subscriberFirstName,
    lastName: input.subscriberLastName,
    companyName: input.subscriberCompanyName,
    identity: input.identity,
    correspondenceAddress: input.correspondenceAddress,
    contactChannel: input.contactChannel,
  }
}

function buildNumbering(input: {
  numberType: PliCbdTechnicalPayloadNumberingDto['numberType']
  portedNumberKind: PliCbdTechnicalPayloadNumberingDto['portedNumberKind']
  numberDisplay: string
  primaryNumber: string | null
  rangeStart: string | null
  rangeEnd: string | null
  selectionSource: PliCbdTechnicalPayloadNumberingDto['selectionSource']
}): PliCbdTechnicalPayloadNumberingDto {
  return {
    numberType: input.numberType,
    portedNumberKind: input.portedNumberKind,
    numberDisplay: input.numberDisplay,
    primaryNumber: input.primaryNumber,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    selectionSource: input.selectionSource,
  }
}

function buildPorting(input: PliCbdTechnicalPayloadPortingDto): PliCbdTechnicalPayloadPortingDto {
  return input
}

function buildMetadata(input: {
  requestId: string
  clientId: string
  clientDisplayName: string
  subscriberDisplayName: string
  sourceDraftMessageType: PliCbdTechnicalPayloadMetadataDto['sourceDraftMessageType']
}): PliCbdTechnicalPayloadMetadataDto {
  return {
    requestId: input.requestId,
    clientId: input.clientId,
    clientDisplayName: input.clientDisplayName,
    subscriberDisplayName: input.subscriberDisplayName,
    sourceDraftMessageType: input.sourceDraftMessageType,
    serializerTarget: 'XML_PENDING',
    envelopeTarget: 'SOAP_PENDING',
    transportTarget: 'NONE',
  }
}

function buildCommonWarnings(
  payload: PliCbdTechnicalPayloadDto,
): PliCbdTechnicalPayloadWarningDto[] {
  const warnings: PliCbdTechnicalPayloadWarningDto[] = []

  pushMissingValueWarning(warnings, 'CASE_NUMBER_MISSING', payload.caseNumber, 'caseNumber')
  pushMissingValueWarning(
    warnings,
    'RECIPIENT_ROUTING_NUMBER_MISSING',
    payload.recipientOperatorRoutingNumber,
    'recipientOperatorRoutingNumber',
  )
  pushMissingValueWarning(
    warnings,
    'DONOR_ROUTING_NUMBER_MISSING',
    payload.donorOperatorRoutingNumber,
    'donorOperatorRoutingNumber',
  )
  pushMissingValueWarning(
    warnings,
    'SUBSCRIBER_IDENTITY_MISSING',
    payload.subscriber.identity.value,
    'subscriber.identity.value',
  )
  pushMissingValueWarning(
    warnings,
    'CORRESPONDENCE_ADDRESS_MISSING',
    payload.subscriber.correspondenceAddress,
    'subscriber.correspondenceAddress',
  )

  if (
    payload.porting.linkedWholesaleServiceOnRecipientSide &&
    !payload.infrastructureOperatorRoutingNumber
  ) {
    warnings.push({
      code: 'INFRASTRUCTURE_ROUTING_NUMBER_MISSING',
      message: 'Dla sprawy z usluga hurtowa brakuje routing number operatora infrastrukturalnego.',
      field: 'infrastructureOperatorRoutingNumber',
    })
  }

  if (payload.numbering.selectionSource === 'PRIMARY_NUMBER' && !payload.numbering.primaryNumber) {
    warnings.push({
      code: 'PRIMARY_NUMBER_MISSING',
      message: 'Payload wskazuje pojedynczy numer, ale primaryNumber jest puste.',
      field: 'numbering.primaryNumber',
    })
  }

  if (
    payload.numbering.selectionSource === 'NUMBER_RANGE' &&
    (!payload.numbering.rangeStart || !payload.numbering.rangeEnd)
  ) {
    warnings.push({
      code: 'NUMBER_RANGE_INCOMPLETE',
      message: 'Payload wskazuje zakres numerow, ale rangeStart lub rangeEnd sa puste.',
      field: 'numbering.rangeStart',
    })
  }

  return warnings
}

function buildE03TechnicalWarnings(
  draft: PliCbdE03DraftDto,
  payload: PliCbdE03TechnicalPayloadDto,
): PliCbdTechnicalPayloadWarningDto[] {
  const warnings: PliCbdTechnicalPayloadWarningDto[] = []

  pushMissingValueWarning(
    warnings,
    'REQUEST_DOCUMENT_NUMBER_MISSING',
    payload.porting.requestDocumentNumber,
    'porting.requestDocumentNumber',
  )

  if (draft.portingMode === 'DAY' && !payload.porting.requestedPortDate) {
    warnings.push({
      code: 'REQUESTED_PORT_DATE_MISSING',
      message: 'Techniczny payload E03 nie zawiera requestedPortDate dla trybu DAY.',
      field: 'porting.requestedPortDate',
    })
  }

  if (draft.portingMode !== 'DAY' && !payload.porting.earliestAcceptablePortDate) {
    warnings.push({
      code: 'EARLIEST_ACCEPTABLE_PORT_DATE_MISSING',
      message: 'Techniczny payload E03 nie zawiera earliestAcceptablePortDate dla trybu END/EOP.',
      field: 'porting.earliestAcceptablePortDate',
    })
  }

  return warnings
}

function buildE12TechnicalWarnings(
  payload: PliCbdE12TechnicalPayloadDto,
): PliCbdTechnicalPayloadWarningDto[] {
  const warnings: PliCbdTechnicalPayloadWarningDto[] = []

  pushMissingValueWarning(
    warnings,
    'DONOR_ASSIGNED_PORT_DATE_MISSING',
    payload.porting.donorAssignedPortDate,
    'porting.donorAssignedPortDate',
  )

  if (!payload.porting.donorAssignedPortTime) {
    warnings.push({
      code: 'DONOR_ASSIGNED_PORT_TIME_MISSING',
      message:
        'Payload E12 nie zawiera donorAssignedPortTime. Serializer XML moze wymagac doprecyzowania tej wartosci.',
      field: 'porting.donorAssignedPortTime',
    })
  }

  return warnings
}

function buildE18TechnicalWarnings(
  payload: PliCbdE18TechnicalPayloadDto,
): PliCbdTechnicalPayloadWarningDto[] {
  const warnings: PliCbdTechnicalPayloadWarningDto[] = []

  if (!payload.porting.confirmedPortDate) {
    warnings.push({
      code: 'CONFIRMED_PORT_DATE_MISSING',
      message:
        'Payload E18 nie zawiera confirmedPortDate. To pole moze byc potrzebne przy serializacji technicznego potwierdzenia przeniesienia.',
      field: 'porting.confirmedPortDate',
    })
  }

  return warnings
}

function buildE23TechnicalWarnings(
  payload: PliCbdE23TechnicalPayloadDto,
): PliCbdTechnicalPayloadWarningDto[] {
  const warnings: PliCbdTechnicalPayloadWarningDto[] = []

  if (!payload.context.lastReceivedMessageType) {
    warnings.push({
      code: 'LAST_RECEIVED_MESSAGE_MISSING',
      message:
        'Payload E23 nie zawiera informacji o ostatnim komunikacie Exx w kontekscie anulowania.',
      field: 'context.lastReceivedMessageType',
    })
  }

  return warnings
}

function pushMissingValueWarning(
  warnings: PliCbdTechnicalPayloadWarningDto[],
  code: string,
  value: string | null,
  field: string,
): void {
  if (value) return

  warnings.push({
    code,
    message: `Brakuje wartosci technicznej dla pola ${field}.`,
    field,
  })
}
