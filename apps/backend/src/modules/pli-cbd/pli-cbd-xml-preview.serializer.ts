import type {
  PliCbdAnyTechnicalPayloadDto,
  PliCbdE03TechnicalPayloadDto,
  PliCbdE12TechnicalPayloadDto,
  PliCbdE18TechnicalPayloadDto,
  PliCbdE23TechnicalPayloadDto,
  PliCbdTechnicalPayloadContextDto,
  PliCbdTechnicalPayloadDto,
  PliCbdXmlSerializationResultDto,
} from '@np-manager/shared'

export function serializeE03TechnicalPayloadToXml(
  payload: PliCbdE03TechnicalPayloadDto,
): PliCbdXmlSerializationResultDto<PliCbdE03TechnicalPayloadDto> {
  return {
    payload,
    xml: serializeTechnicalPayloadToXml(payload, [
      scalarElement('PortDateSource', payload.context.portDateSource, 2),
    ]),
  }
}

export function serializeE12TechnicalPayloadToXml(
  payload: PliCbdE12TechnicalPayloadDto,
): PliCbdXmlSerializationResultDto<PliCbdE12TechnicalPayloadDto> {
  return {
    payload,
    xml: serializeTechnicalPayloadToXml(payload, [
      scalarElement('PortDateSource', payload.context.portDateSource, 2),
    ]),
  }
}

export function serializeE18TechnicalPayloadToXml(
  payload: PliCbdE18TechnicalPayloadDto,
): PliCbdXmlSerializationResultDto<PliCbdE18TechnicalPayloadDto> {
  return {
    payload,
    xml: serializeTechnicalPayloadToXml(payload),
  }
}

export function serializeE23TechnicalPayloadToXml(
  payload: PliCbdE23TechnicalPayloadDto,
): PliCbdXmlSerializationResultDto<PliCbdE23TechnicalPayloadDto> {
  return {
    payload,
    xml: serializeTechnicalPayloadToXml(payload, [
      scalarElement('CancellationReasonCode', payload.context.cancellationReasonCode, 2),
    ]),
  }
}

export function serializeTechnicalPayloadToXmlPreview(
  payload: PliCbdAnyTechnicalPayloadDto,
): PliCbdXmlSerializationResultDto<PliCbdAnyTechnicalPayloadDto> {
  switch (payload.messageType) {
    case 'E03':
      return serializeE03TechnicalPayloadToXml(payload)
    case 'E12':
      return serializeE12TechnicalPayloadToXml(payload)
    case 'E18':
      return serializeE18TechnicalPayloadToXml(payload)
    case 'E23':
      return serializeE23TechnicalPayloadToXml(payload)
  }
}

function serializeTechnicalPayloadToXml(
  payload: PliCbdTechnicalPayloadDto,
  contextExtras: string[] = [],
): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<PliCbdMessagePreview>',
    block('Header', [
      scalarElement('PreviewMode', 'INTERNAL_XML_SERIALIZATION_PREVIEW', 2),
      scalarElement('MessageType', payload.messageType, 2),
      scalarElement('ServiceType', payload.serviceType, 2),
      scalarElement('MessageVersion', payload.messageVersion, 2),
      scalarElement('CaseNumber', payload.caseNumber, 2),
    ]),
    block('Routing', [
      scalarElement('RecipientOperatorRoutingNumber', payload.recipientOperatorRoutingNumber, 2),
      scalarElement('DonorOperatorRoutingNumber', payload.donorOperatorRoutingNumber, 2),
      scalarElement(
        'InfrastructureOperatorRoutingNumber',
        payload.infrastructureOperatorRoutingNumber,
        2,
      ),
    ]),
    block('Subscriber', [
      scalarElement('Kind', payload.subscriber.kind, 2),
      scalarElement('DisplayName', payload.subscriber.displayName, 2),
      scalarElement('FirstName', payload.subscriber.firstName, 2),
      scalarElement('LastName', payload.subscriber.lastName, 2),
      scalarElement('CompanyName', payload.subscriber.companyName, 2),
      block('Identity', [
        scalarElement('Type', payload.subscriber.identity.type, 3),
        scalarElement('Value', payload.subscriber.identity.value, 3),
      ]),
      scalarElement('CorrespondenceAddress', payload.subscriber.correspondenceAddress, 2),
      scalarElement('ContactChannel', payload.subscriber.contactChannel, 2),
    ]),
    block('Numbering', [
      scalarElement('NumberType', payload.numbering.numberType, 2),
      scalarElement('PortedNumberKind', payload.numbering.portedNumberKind, 2),
      scalarElement('NumberDisplay', payload.numbering.numberDisplay, 2),
      scalarElement('SelectionSource', payload.numbering.selectionSource, 2),
      scalarElement('PrimaryNumber', payload.numbering.primaryNumber, 2),
      scalarElement('RangeStart', payload.numbering.rangeStart, 2),
      scalarElement('RangeEnd', payload.numbering.rangeEnd, 2),
    ]),
    block('Porting', [
      scalarElement('PortingMode', payload.porting.portingMode, 2),
      scalarElement('RequestedPortDate', payload.porting.requestedPortDate, 2),
      scalarElement('EarliestAcceptablePortDate', payload.porting.earliestAcceptablePortDate, 2),
      scalarElement('DonorAssignedPortDate', payload.porting.donorAssignedPortDate, 2),
      scalarElement('DonorAssignedPortTime', payload.porting.donorAssignedPortTime, 2),
      scalarElement('ConfirmedPortDate', payload.porting.confirmedPortDate, 2),
      scalarElement('RequestDocumentNumber', payload.porting.requestDocumentNumber, 2),
      scalarElement('HasPowerOfAttorney', String(payload.porting.hasPowerOfAttorney), 2),
      scalarElement(
        'LinkedWholesaleServiceOnRecipientSide',
        String(payload.porting.linkedWholesaleServiceOnRecipientSide),
        2,
      ),
    ]),
    serializeContext(payload.context, contextExtras),
    block('Metadata', [
      scalarElement('RequestId', payload.metadata.requestId, 2),
      scalarElement('ClientId', payload.metadata.clientId, 2),
      scalarElement('ClientDisplayName', payload.metadata.clientDisplayName, 2),
      scalarElement('SubscriberDisplayName', payload.metadata.subscriberDisplayName, 2),
      scalarElement('SourceDraftMessageType', payload.metadata.sourceDraftMessageType, 2),
      scalarElement('SerializerTarget', payload.metadata.serializerTarget, 2),
      scalarElement('EnvelopeTarget', payload.metadata.envelopeTarget, 2),
      scalarElement('TransportTarget', payload.metadata.transportTarget, 2),
    ]),
    '</PliCbdMessagePreview>',
  ].join('\n')
}

function serializeContext(context: PliCbdTechnicalPayloadContextDto, extras: string[]): string {
  return block('Context', [
    scalarElement('CurrentStage', context.currentStage, 2),
    scalarElement('CurrentStageLabel', context.currentStageLabel, 2),
    scalarElement('StatusInternal', context.statusInternal, 2),
    scalarElement('StatusInternalLabel', context.statusInternalLabel, 2),
    scalarElement('ExportStatus', context.exportStatus, 2),
    scalarElement('LastReceivedMessageType', context.lastReceivedMessageType, 2),
    block(
      'AllowedMessagesAtStage',
      context.allowedMessagesAtStage.map((messageType) => scalarElement('Message', messageType, 3)),
      1,
      context.allowedMessagesAtStage.length === 0,
    ),
    scalarElement('DataSource', context.dataSource, 2),
    ...extras,
    block(
      'ReasonHints',
      context.reasonHints.map((hint) => scalarElement('Hint', hint, 3)),
      1,
      context.reasonHints.length === 0,
    ),
  ])
}

function block(
  name: string,
  children: string[],
  indentLevel = 1,
  forceSelfClosing = false,
): string {
  const indentText = indent(indentLevel)
  const filteredChildren = children.filter(Boolean)

  if (forceSelfClosing || filteredChildren.length === 0) {
    return `${indentText}<${name} />`
  }

  return `${indentText}<${name}>\n${filteredChildren.join('\n')}\n${indentText}</${name}>`
}

function scalarElement(name: string, value: string | null, indentLevel: number): string {
  const indentText = indent(indentLevel)

  if (value === null) {
    return `${indentText}<${name} />`
  }

  return `${indentText}<${name}>${escapeXml(value)}</${name}>`
}

function indent(level: number): string {
  return '  '.repeat(level)
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
