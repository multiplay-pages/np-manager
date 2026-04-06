import { describe, expect, it } from 'vitest'
import {
  PLI_CBD_TECHNICAL_PAYLOAD_VERSION,
  type PliCbdDraftOperatorDto,
  type PliCbdE03DraftDto,
  type PliCbdE12DraftDto,
  type PliCbdE18DraftDto,
  type PliCbdE23DraftDto,
} from '@np-manager/shared'
import {
  mapE03DraftToTechnicalPayload,
  mapE12DraftToTechnicalPayload,
  mapE18DraftToTechnicalPayload,
  mapE23DraftToTechnicalPayload,
} from '../pli-cbd-technical-payload.mapper'

function createOperator(name: string, routingNumber: string): PliCbdDraftOperatorDto {
  return {
    id: `${routingNumber}-id`,
    name,
    shortName: name,
    routingNumber,
  }
}

describe('pli-cbd technical payload mapper', () => {
  it('maps E03 draft into XML-ready technical payload structure', () => {
    const draft: PliCbdE03DraftDto = {
      messageType: 'E03',
      serviceType: 'FNP',
      requestId: 'req-e03',
      caseNumber: 'FNP-20260403-E03',
      clientId: 'client-1',
      clientDisplayName: 'Acme Sp. z o.o.',
      subscriberKind: 'BUSINESS',
      subscriberDisplayName: 'Acme Sp. z o.o.',
      subscriberFirstName: null,
      subscriberLastName: null,
      subscriberCompanyName: 'Acme Sp. z o.o.',
      numberType: 'FIXED_LINE',
      portedNumberKind: 'SINGLE',
      primaryNumber: '221234567',
      rangeStart: null,
      rangeEnd: null,
      numberDisplay: '221234567',
      portingMode: 'DAY',
      requestedPortDate: '2026-04-10',
      earliestAcceptablePortDate: null,
      requestDocumentNumber: 'DOC-001',
      donorOperator: createOperator('Donor', 'D-001'),
      recipientOperator: createOperator('Recipient', 'R-001'),
      infrastructureOperator: null,
      identity: {
        type: 'NIP',
        value: '1234567890',
      },
      correspondenceAddress: 'Warszawa, ul. Testowa 1',
      hasPowerOfAttorney: true,
      linkedWholesaleServiceOnRecipientSide: false,
      contactChannel: 'EMAIL',
      technicalHints: {
        portDateSource: 'REQUESTED_PORT_DATE',
        numberSelectionSource: 'PRIMARY_NUMBER',
      },
    }

    const result = mapE03DraftToTechnicalPayload(draft)

    expect(result.payload.messageVersion).toBe(PLI_CBD_TECHNICAL_PAYLOAD_VERSION)
    expect(result.payload.recipientOperatorRoutingNumber).toBe('R-001')
    expect(result.payload.numbering.selectionSource).toBe('PRIMARY_NUMBER')
    expect(result.payload.context.portDateSource).toBe('REQUESTED_PORT_DATE')
    expect(result.payload.metadata.transportTarget).toBe('NONE')
    expect(result.technicalWarnings).toEqual([])
  })

  it('returns technical warning for E12 when donor assigned time is missing', () => {
    const draft: PliCbdE12DraftDto = {
      messageType: 'E12',
      serviceType: 'FNP',
      portingRequestId: 'req-e12',
      caseNumber: 'FNP-20260403-E12',
      clientId: 'client-2',
      clientDisplayName: 'Jan Kowalski',
      subscriberKind: 'INDIVIDUAL',
      subscriberDisplayName: 'Jan Kowalski',
      subscriberFirstName: 'Jan',
      subscriberLastName: 'Kowalski',
      subscriberCompanyName: null,
      donorOperator: createOperator('Donor', 'D-002'),
      recipientOperator: createOperator('Recipient', 'R-002'),
      infrastructureOperator: null,
      portingMode: 'END',
      numberType: 'FIXED_LINE',
      numberRangeKind: 'SINGLE',
      numberDisplay: '221112223',
      primaryNumber: '221112223',
      rangeStart: null,
      rangeEnd: null,
      identity: {
        type: 'PESEL',
        value: '90010112345',
      },
      correspondenceAddress: 'Lodz, ul. Przykladowa 2',
      hasPowerOfAttorney: false,
      linkedWholesaleServiceOnRecipientSide: false,
      contactChannel: 'SMS',
      requestDocumentNumber: 'DOC-012',
      confirmationContext: {
        currentStage: 'AWAITING_E12',
        currentStageLabel: 'Wymagane potwierdzenie terminu (E12)',
        statusInternal: 'PENDING_DONOR',
        statusInternalLabel: 'Oczekuje na dawce',
        exportStatus: 'EXPORTED',
        lastReceivedMessageType: 'E06',
        donorAssignedPortDate: '2026-04-15',
        donorAssignedPortTime: null,
      },
      reasonHints: ['Dawca przekazal termin do potwierdzenia.'],
      technicalHints: {
        dataSource: 'CURRENT_CASE_AND_PROCESS_SNAPSHOT',
        portDateSource: 'DONOR_ASSIGNED_PORT_DATE',
        numberSelectionSource: 'PRIMARY_NUMBER',
        allowedMessagesAtStage: ['E12', 'E23'],
      },
    }

    const result = mapE12DraftToTechnicalPayload(draft)

    expect(result.payload.context.currentStage).toBe('AWAITING_E12')
    expect(result.payload.porting.donorAssignedPortDate).toBe('2026-04-15')
    expect(result.technicalWarnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'DONOR_ASSIGNED_PORT_TIME_MISSING' }),
      ]),
    )
  })

  it('returns technical warning for E18 when confirmed port date is missing', () => {
    const draft: PliCbdE18DraftDto = {
      messageType: 'E18',
      serviceType: 'FNP',
      requestId: 'req-e18',
      caseNumber: 'FNP-20260403-E18',
      clientId: 'client-3',
      clientDisplayName: 'Beta Sp. z o.o.',
      subscriberKind: 'BUSINESS',
      subscriberDisplayName: 'Beta Sp. z o.o.',
      subscriberFirstName: null,
      subscriberLastName: null,
      subscriberCompanyName: 'Beta Sp. z o.o.',
      donorOperator: createOperator('Donor', 'D-003'),
      recipientOperator: createOperator('Recipient', 'R-003'),
      infrastructureOperator: null,
      portingMode: 'END',
      numberType: 'FIXED_LINE',
      numberRangeKind: 'DDI_RANGE',
      numberDisplay: '221000100 - 221000199',
      primaryNumber: null,
      rangeStart: '221000100',
      rangeEnd: '221000199',
      identity: {
        type: 'NIP',
        value: '5556667778',
      },
      correspondenceAddress: 'Poznan, ul. Firmowa 3',
      hasPowerOfAttorney: true,
      linkedWholesaleServiceOnRecipientSide: false,
      contactChannel: 'LETTER',
      requestDocumentNumber: 'DOC-018',
      completionContext: {
        currentStage: 'READY_TO_PORT',
        currentStageLabel: 'Termin uzgodniony - gotowe do przeniesienia',
        statusInternal: 'PORTED',
        statusInternalLabel: 'Przeniesiona',
        exportStatus: 'EXPORTED',
        lastReceivedMessageType: 'E13',
        confirmedPortDate: null,
        donorAssignedPortDate: '2026-04-20',
        donorAssignedPortTime: '03:00',
      },
      reasonHints: ['Numeracja zostala przeniesiona technicznie.'],
      technicalHints: {
        dataSource: 'CURRENT_CASE_AND_PROCESS_SNAPSHOT',
        numberSelectionSource: 'NUMBER_RANGE',
        allowedMessagesAtStage: ['E18', 'E23'],
      },
    }

    const result = mapE18DraftToTechnicalPayload(draft)

    expect(result.payload.numbering.selectionSource).toBe('NUMBER_RANGE')
    expect(result.payload.porting.donorAssignedPortTime).toBe('03:00')
    expect(result.technicalWarnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'CONFIRMED_PORT_DATE_MISSING' })]),
    )
  })

  it('maps E23 cancellation context and warns when last received message is missing', () => {
    const draft: PliCbdE23DraftDto = {
      messageType: 'E23',
      serviceType: 'FNP',
      requestId: 'req-e23',
      caseNumber: 'FNP-20260403-E23',
      clientId: 'client-4',
      clientDisplayName: 'Gamma Sp. z o.o.',
      subscriberKind: 'BUSINESS',
      subscriberDisplayName: 'Gamma Sp. z o.o.',
      subscriberFirstName: null,
      subscriberLastName: null,
      subscriberCompanyName: 'Gamma Sp. z o.o.',
      donorOperator: createOperator('Donor', 'D-004'),
      recipientOperator: createOperator('Recipient', 'R-004'),
      infrastructureOperator: createOperator('Infra', 'I-004'),
      portingMode: 'EOP',
      numberType: 'FIXED_LINE',
      numberRangeKind: 'SINGLE',
      numberDisplay: '229998887',
      primaryNumber: '229998887',
      rangeStart: null,
      rangeEnd: null,
      identity: {
        type: 'REGON',
        value: '123456789',
      },
      correspondenceAddress: 'Gdansk, ul. Portowa 4',
      hasPowerOfAttorney: true,
      linkedWholesaleServiceOnRecipientSide: true,
      contactChannel: 'EMAIL',
      requestDocumentNumber: 'DOC-023',
      cancellationContext: {
        currentStage: 'AWAITING_E13',
        currentStageLabel: 'Oczekuje na potwierdzenie terminu przez Dawce (E13)',
        statusInternal: 'CONFIRMED',
        statusInternalLabel: 'Potwierdzona',
        exportStatus: 'EXPORTED',
        lastReceivedMessageType: null,
        confirmedPortDate: null,
        donorAssignedPortDate: '2026-04-22',
        donorAssignedPortTime: '01:00',
      },
      reasonHints: ['Operator bioracy zdecydowal o anulowaniu sprawy.'],
      technicalHints: {
        dataSource: 'CURRENT_CASE_AND_PROCESS_SNAPSHOT',
        numberSelectionSource: 'PRIMARY_NUMBER',
        allowedMessagesAtStage: ['E23'],
      },
    }

    const result = mapE23DraftToTechnicalPayload(draft)

    expect(result.payload.context.cancellationReasonCode).toBe('RECIPIENT_MANUAL_CANCELLATION')
    expect(result.payload.infrastructureOperatorRoutingNumber).toBe('I-004')
    expect(result.technicalWarnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'LAST_RECEIVED_MESSAGE_MISSING' })]),
    )
  })
})
