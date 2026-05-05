import { describe, expect, it } from 'vitest'
import {
  buildRequestNewPayload,
  getCreatedRequestDetailPath,
  getRequestNewValidationErrors,
  getRequestNumberKindPatch,
  normalizeRequestNewPhone,
} from './RequestNewPage'
import type { ClientDetailDto } from '@np-manager/shared'

const CLIENT: ClientDetailDto = {
  id: 'client-1',
  clientType: 'INDIVIDUAL',
  displayName: 'Jan Kowalski',
  firstName: 'Jan',
  lastName: 'Kowalski',
  pesel: '90010112345',
  companyName: null,
  nip: null,
  krs: null,
  proxyName: null,
  proxyPesel: null,
  email: 'jan@example.com',
  phoneContact: '+48221234567',
  addressStreet: 'Testowa 1',
  addressCity: 'Warszawa',
  addressZip: '00-001',
  requestsCount: 0,
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z',
}

const BASE_FIELDS = {
  donorOperatorId: 'op-1',
  numberRangeKind: 'SINGLE' as const,
  primaryNumber: '+48 22 123 45 67',
  rangeStart: '',
  rangeEnd: '',
  requestDocumentNumber: '',
  portingMode: 'DAY' as const,
  requestedPortDate: '2026-05-06',
  earliestAcceptablePortDate: '',
  subscriberFirstName: 'Jan',
  subscriberLastName: 'Kowalski',
  subscriberCompanyName: '',
  identityType: 'PESEL' as const,
  identityValue: '90010112345',
  correspondenceAddress: 'Testowa 1, 00-001 Warszawa',
  hasPowerOfAttorney: true,
  linkedWholesaleServiceOnRecipientSide: false,
  infrastructureOperatorId: '',
  contactChannel: 'EMAIL' as const,
  internalNotes: '',
}

describe('RequestNewPage form logic', () => {
  it('validates required fields for BOK operator form', () => {
    const errors = getRequestNewValidationErrors(
      {
        ...BASE_FIELDS,
        donorOperatorId: '',
        primaryNumber: '',
        requestedPortDate: '',
        hasPowerOfAttorney: false,
        identityValue: '',
        correspondenceAddress: '',
      },
      CLIENT,
      '2026-05-05',
    )

    expect(errors).toMatchObject({
      donorOperatorId: 'Operator oddajacy jest wymagany.',
      primaryNumber: 'Podaj numer glowny.',
      requestedPortDate: 'Dla trybu DAY wskaz wnioskowany dzien przeniesienia.',
      hasPowerOfAttorney: 'Tryb DAY wymaga pelnomocnictwa.',
      identityValue: 'Wartosc identyfikatora jest wymagana.',
      correspondenceAddress: 'Adres korespondencyjny jest wymagany.',
    })
  })

  it('clears inactive number fields when switching between SINGLE and DDI_RANGE', () => {
    expect(
      getRequestNumberKindPatch('DDI_RANGE', {
        numberRangeKind: 'SINGLE',
        primaryNumber: '+48 22 123 45 67',
        rangeStart: '',
        rangeEnd: '',
      }),
    ).toEqual({
      numberRangeKind: 'DDI_RANGE',
      primaryNumber: '',
      rangeStart: '',
      rangeEnd: '',
    })

    expect(
      getRequestNumberKindPatch('SINGLE', {
        numberRangeKind: 'DDI_RANGE',
        primaryNumber: '',
        rangeStart: '+48 22 555 10 00',
        rangeEnd: '+48 22 555 10 99',
      }),
    ).toEqual({
      numberRangeKind: 'SINGLE',
      primaryNumber: '',
      rangeStart: '',
      rangeEnd: '',
    })
  })

  it('keeps entered SINGLE number when clicking active SINGLE again', () => {
    expect(
      getRequestNumberKindPatch('SINGLE', {
        numberRangeKind: 'SINGLE',
        primaryNumber: '+48 22 123 45 67',
        rangeStart: '',
        rangeEnd: '',
      }),
    ).toEqual({
      numberRangeKind: 'SINGLE',
      primaryNumber: '+48 22 123 45 67',
      rangeStart: '',
      rangeEnd: '',
    })
  })

  it('keeps entered DDI_RANGE numbers when clicking active DDI_RANGE again', () => {
    expect(
      getRequestNumberKindPatch('DDI_RANGE', {
        numberRangeKind: 'DDI_RANGE',
        primaryNumber: '',
        rangeStart: '+48 22 555 10 00',
        rangeEnd: '+48 22 555 10 99',
      }),
    ).toEqual({
      numberRangeKind: 'DDI_RANGE',
      primaryNumber: '',
      rangeStart: '+48 22 555 10 00',
      rangeEnd: '+48 22 555 10 99',
    })
  })

  it('builds canonical SINGLE create payload', () => {
    const payload = buildRequestNewPayload(BASE_FIELDS, CLIENT)

    expect(payload).toMatchObject({
      clientId: 'client-1',
      donorOperatorId: 'op-1',
      numberType: 'FIXED_LINE',
      numberRangeKind: 'SINGLE',
      primaryNumber: '+48221234567',
      rangeStart: undefined,
      rangeEnd: undefined,
      requestedPortDate: '2026-05-06',
      earliestAcceptablePortDate: undefined,
    })
  })

  it('builds canonical DDI_RANGE create payload', () => {
    const payload = buildRequestNewPayload(
      {
        ...BASE_FIELDS,
        numberRangeKind: 'DDI_RANGE',
        primaryNumber: '',
        rangeStart: '+48 22 555 10 00',
        rangeEnd: '22 555 10 99',
        portingMode: 'END',
        requestedPortDate: '',
        earliestAcceptablePortDate: '2026-05-08',
      },
      CLIENT,
    )

    expect(payload).toMatchObject({
      numberType: 'FIXED_LINE',
      numberRangeKind: 'DDI_RANGE',
      primaryNumber: undefined,
      rangeStart: '+48225551000',
      rangeEnd: '+48225551099',
      requestedPortDate: undefined,
      earliestAcceptablePortDate: '2026-05-08',
    })
  })

  it('uses the canonical detail route after create flow receives caseNumber', () => {
    expect(getCreatedRequestDetailPath('FNP-20260505-ABC123')).toBe('/requests/FNP-20260505-ABC123')
    expect(normalizeRequestNewPhone('0048 22 123 45 67')).toBe('+48221234567')
  })
})
