import { describe, expect, it } from 'vitest'
import {
  PLI_CBD_TECHNICAL_PAYLOAD_VERSION,
  type PliCbdE03TechnicalPayloadDto,
  type PliCbdE12TechnicalPayloadDto,
  type PliCbdE18TechnicalPayloadDto,
  type PliCbdE23TechnicalPayloadDto,
} from '@np-manager/shared'
import {
  serializeE03TechnicalPayloadToXml,
  serializeE12TechnicalPayloadToXml,
  serializeE18TechnicalPayloadToXml,
  serializeE23TechnicalPayloadToXml,
} from '../pli-cbd-xml-preview.serializer'

describe('pli-cbd xml preview serializer', () => {
  it('serializes E03 payload with stable section order and escaped values', () => {
    const payload: PliCbdE03TechnicalPayloadDto = {
      messageType: 'E03',
      serviceType: 'FNP',
      messageVersion: PLI_CBD_TECHNICAL_PAYLOAD_VERSION,
      caseNumber: 'CASE<&>"\'-001',
      recipientOperatorRoutingNumber: 'R-001',
      donorOperatorRoutingNumber: 'D-001',
      infrastructureOperatorRoutingNumber: null,
      subscriber: {
        kind: 'BUSINESS',
        displayName: 'Acme & <Telecom>',
        firstName: null,
        lastName: null,
        companyName: 'Acme "Sp. z o.o."',
        identity: {
          type: 'NIP',
          value: '1234567890',
        },
        correspondenceAddress: 'Warszawa <ul. Testowa> & 1',
        contactChannel: 'EMAIL',
      },
      numbering: {
        numberType: 'FIXED_LINE',
        portedNumberKind: 'SINGLE',
        numberDisplay: '221234567',
        primaryNumber: '221234567',
        rangeStart: null,
        rangeEnd: null,
        selectionSource: 'PRIMARY_NUMBER',
      },
      porting: {
        portingMode: 'DAY',
        requestedPortDate: '2026-04-15',
        earliestAcceptablePortDate: null,
        donorAssignedPortDate: null,
        donorAssignedPortTime: null,
        confirmedPortDate: null,
        requestDocumentNumber: 'REQ-<&>"\'',
        hasPowerOfAttorney: true,
        linkedWholesaleServiceOnRecipientSide: false,
      },
      context: {
        currentStage: null,
        currentStageLabel: null,
        statusInternal: null,
        statusInternalLabel: null,
        exportStatus: null,
        lastReceivedMessageType: null,
        allowedMessagesAtStage: ['E03'],
        dataSource: 'CURRENT_CASE_AND_PROCESS_SNAPSHOT',
        reasonHints: ['Hint & <1>'],
        portDateSource: 'REQUESTED_PORT_DATE',
      },
      metadata: {
        requestId: 'req-1',
        clientId: 'client-1',
        clientDisplayName: 'Acme',
        subscriberDisplayName: 'Acme & <Telecom>',
        sourceDraftMessageType: 'E03',
        serializerTarget: 'XML_PENDING',
        envelopeTarget: 'SOAP_PENDING',
        transportTarget: 'NONE',
      },
    }

    const { xml } = serializeE03TechnicalPayloadToXml(payload)

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<PliCbdMessagePreview>')
    expect(xml).toContain('<MessageType>E03</MessageType>')
    expect(xml).toContain('<PortDateSource>REQUESTED_PORT_DATE</PortDateSource>')
    expect(xml).toContain('Acme &amp; &lt;Telecom&gt;')
    expect(xml).toContain('CASE&lt;&amp;&gt;&quot;&apos;-001')
    expect(xml.indexOf('<Header>')).toBeLessThan(xml.indexOf('<Routing>'))
    expect(xml.indexOf('<Routing>')).toBeLessThan(xml.indexOf('<Subscriber>'))
    expect(xml.indexOf('<Subscriber>')).toBeLessThan(xml.indexOf('<Numbering>'))
    expect(xml.indexOf('<Numbering>')).toBeLessThan(xml.indexOf('<Porting>'))
    expect(xml.indexOf('<Porting>')).toBeLessThan(xml.indexOf('<Context>'))
    expect(xml.indexOf('<Context>')).toBeLessThan(xml.indexOf('<Metadata>'))
  })

  it('serializes E12 payload with confirmation context fields in context section', () => {
    const payload: PliCbdE12TechnicalPayloadDto = {
      messageType: 'E12',
      serviceType: 'FNP',
      messageVersion: PLI_CBD_TECHNICAL_PAYLOAD_VERSION,
      caseNumber: 'CASE-012',
      recipientOperatorRoutingNumber: 'R-012',
      donorOperatorRoutingNumber: 'D-012',
      infrastructureOperatorRoutingNumber: null,
      subscriber: {
        kind: 'INDIVIDUAL',
        displayName: 'Jan Kowalski',
        firstName: 'Jan',
        lastName: 'Kowalski',
        companyName: null,
        identity: {
          type: 'PESEL',
          value: '90010112345',
        },
        correspondenceAddress: 'Lodz, ul. Przykladowa 2',
        contactChannel: 'SMS',
      },
      numbering: {
        numberType: 'FIXED_LINE',
        portedNumberKind: 'SINGLE',
        numberDisplay: '221112223',
        primaryNumber: '221112223',
        rangeStart: null,
        rangeEnd: null,
        selectionSource: 'PRIMARY_NUMBER',
      },
      porting: {
        portingMode: 'END',
        requestedPortDate: null,
        earliestAcceptablePortDate: null,
        donorAssignedPortDate: '2026-04-20',
        donorAssignedPortTime: '04:30',
        confirmedPortDate: null,
        requestDocumentNumber: 'REQ-012',
        hasPowerOfAttorney: false,
        linkedWholesaleServiceOnRecipientSide: false,
      },
      context: {
        currentStage: 'AWAITING_E12',
        currentStageLabel: 'Wymagane potwierdzenie terminu (E12)',
        statusInternal: 'PENDING_DONOR',
        statusInternalLabel: 'Oczekuje na dawce',
        exportStatus: 'EXPORTED',
        lastReceivedMessageType: 'E06',
        allowedMessagesAtStage: ['E12', 'E23'],
        dataSource: 'CURRENT_CASE_AND_PROCESS_SNAPSHOT',
        reasonHints: ['Dawca przekazal termin do potwierdzenia.'],
        portDateSource: 'DONOR_ASSIGNED_PORT_DATE',
      },
      metadata: {
        requestId: 'req-12',
        clientId: 'client-12',
        clientDisplayName: 'Jan Kowalski',
        subscriberDisplayName: 'Jan Kowalski',
        sourceDraftMessageType: 'E12',
        serializerTarget: 'XML_PENDING',
        envelopeTarget: 'SOAP_PENDING',
        transportTarget: 'NONE',
      },
    }

    const { xml } = serializeE12TechnicalPayloadToXml(payload)

    expect(xml).toContain('<MessageType>E12</MessageType>')
    expect(xml).toContain('<CurrentStage>AWAITING_E12</CurrentStage>')
    expect(xml).toContain('<LastReceivedMessageType>E06</LastReceivedMessageType>')
    expect(xml).toContain('<PortDateSource>DONOR_ASSIGNED_PORT_DATE</PortDateSource>')
    expect(xml).toContain('<AllowedMessagesAtStage>')
    expect(xml).toContain('<Message>E12</Message>')
    expect(xml).toContain('<Message>E23</Message>')
    expect(xml.indexOf('<AllowedMessagesAtStage>')).toBeLessThan(xml.indexOf('<DataSource>'))
  })

  it('serializes E18 payload with stable porting section values', () => {
    const payload: PliCbdE18TechnicalPayloadDto = {
      messageType: 'E18',
      serviceType: 'FNP',
      messageVersion: PLI_CBD_TECHNICAL_PAYLOAD_VERSION,
      caseNumber: 'CASE-018',
      recipientOperatorRoutingNumber: 'R-018',
      donorOperatorRoutingNumber: 'D-018',
      infrastructureOperatorRoutingNumber: null,
      subscriber: {
        kind: 'BUSINESS',
        displayName: 'Beta Sp. z o.o.',
        firstName: null,
        lastName: null,
        companyName: 'Beta Sp. z o.o.',
        identity: {
          type: 'NIP',
          value: '5556667778',
        },
        correspondenceAddress: 'Poznan, ul. Firmowa 3',
        contactChannel: 'LETTER',
      },
      numbering: {
        numberType: 'FIXED_LINE',
        portedNumberKind: 'DDI_RANGE',
        numberDisplay: '221000100 - 221000199',
        primaryNumber: null,
        rangeStart: '221000100',
        rangeEnd: '221000199',
        selectionSource: 'NUMBER_RANGE',
      },
      porting: {
        portingMode: 'END',
        requestedPortDate: null,
        earliestAcceptablePortDate: null,
        donorAssignedPortDate: '2026-04-22',
        donorAssignedPortTime: '03:00',
        confirmedPortDate: '2026-04-22',
        requestDocumentNumber: 'REQ-018',
        hasPowerOfAttorney: true,
        linkedWholesaleServiceOnRecipientSide: false,
      },
      context: {
        currentStage: 'READY_TO_PORT',
        currentStageLabel: 'Termin uzgodniony - gotowe do przeniesienia',
        statusInternal: 'PORTED',
        statusInternalLabel: 'Przeniesiona',
        exportStatus: 'EXPORTED',
        lastReceivedMessageType: 'E13',
        allowedMessagesAtStage: ['E18', 'E23'],
        dataSource: 'CURRENT_CASE_AND_PROCESS_SNAPSHOT',
        reasonHints: ['Numeracja zostala przeniesiona technicznie.'],
      },
      metadata: {
        requestId: 'req-18',
        clientId: 'client-18',
        clientDisplayName: 'Beta Sp. z o.o.',
        subscriberDisplayName: 'Beta Sp. z o.o.',
        sourceDraftMessageType: 'E18',
        serializerTarget: 'XML_PENDING',
        envelopeTarget: 'SOAP_PENDING',
        transportTarget: 'NONE',
      },
    }

    const { xml } = serializeE18TechnicalPayloadToXml(payload)

    expect(xml).toContain('<MessageType>E18</MessageType>')
    expect(xml).toContain('<SelectionSource>NUMBER_RANGE</SelectionSource>')
    expect(xml).toContain('<RangeStart>221000100</RangeStart>')
    expect(xml).toContain('<RangeEnd>221000199</RangeEnd>')
    expect(xml).toContain('<ConfirmedPortDate>2026-04-22</ConfirmedPortDate>')
    expect(xml.indexOf('<RequestedPortDate />')).toBeLessThan(
      xml.indexOf('<ConfirmedPortDate>2026-04-22</ConfirmedPortDate>'),
    )
  })

  it('serializes E23 payload with cancellation reason code', () => {
    const payload: PliCbdE23TechnicalPayloadDto = {
      messageType: 'E23',
      serviceType: 'FNP',
      messageVersion: PLI_CBD_TECHNICAL_PAYLOAD_VERSION,
      caseNumber: 'CASE-023',
      recipientOperatorRoutingNumber: 'R-023',
      donorOperatorRoutingNumber: 'D-023',
      infrastructureOperatorRoutingNumber: 'I-023',
      subscriber: {
        kind: 'BUSINESS',
        displayName: 'Gamma Sp. z o.o.',
        firstName: null,
        lastName: null,
        companyName: 'Gamma Sp. z o.o.',
        identity: {
          type: 'REGON',
          value: '123456789',
        },
        correspondenceAddress: 'Gdansk, ul. Portowa 4',
        contactChannel: 'EMAIL',
      },
      numbering: {
        numberType: 'FIXED_LINE',
        portedNumberKind: 'SINGLE',
        numberDisplay: '229998887',
        primaryNumber: '229998887',
        rangeStart: null,
        rangeEnd: null,
        selectionSource: 'PRIMARY_NUMBER',
      },
      porting: {
        portingMode: 'EOP',
        requestedPortDate: null,
        earliestAcceptablePortDate: null,
        donorAssignedPortDate: '2026-04-25',
        donorAssignedPortTime: '01:00',
        confirmedPortDate: null,
        requestDocumentNumber: 'REQ-023',
        hasPowerOfAttorney: true,
        linkedWholesaleServiceOnRecipientSide: true,
      },
      context: {
        currentStage: 'AWAITING_E13',
        currentStageLabel: 'Oczekuje na potwierdzenie terminu przez Dawce (E13)',
        statusInternal: 'CONFIRMED',
        statusInternalLabel: 'Potwierdzona',
        exportStatus: 'EXPORTED',
        lastReceivedMessageType: 'E12',
        allowedMessagesAtStage: ['E23'],
        dataSource: 'CURRENT_CASE_AND_PROCESS_SNAPSHOT',
        reasonHints: ['Operator bioracy zdecydowal o anulowaniu sprawy.'],
        cancellationReasonCode: 'RECIPIENT_MANUAL_CANCELLATION',
      },
      metadata: {
        requestId: 'req-23',
        clientId: 'client-23',
        clientDisplayName: 'Gamma Sp. z o.o.',
        subscriberDisplayName: 'Gamma Sp. z o.o.',
        sourceDraftMessageType: 'E23',
        serializerTarget: 'XML_PENDING',
        envelopeTarget: 'SOAP_PENDING',
        transportTarget: 'NONE',
      },
    }

    const { xml } = serializeE23TechnicalPayloadToXml(payload)

    expect(xml).toContain('<MessageType>E23</MessageType>')
    expect(xml).toContain(
      '<CancellationReasonCode>RECIPIENT_MANUAL_CANCELLATION</CancellationReasonCode>',
    )
    expect(xml).toContain(
      '<InfrastructureOperatorRoutingNumber>I-023</InfrastructureOperatorRoutingNumber>',
    )
    expect(xml.indexOf('<DataSource>')).toBeLessThan(xml.indexOf('<CancellationReasonCode>'))
    expect(xml.indexOf('<CancellationReasonCode>')).toBeLessThan(xml.indexOf('<ReasonHints>'))
  })
})
