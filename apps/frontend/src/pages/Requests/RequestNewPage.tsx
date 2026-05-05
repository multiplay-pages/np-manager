import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import axios from 'axios'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { buildPath, ROUTES } from '@/constants/routes'
import { useOperators } from '@/hooks/useOperators'
import { getClientById, searchClients } from '@/services/clients.api'
import { createPortingRequest } from '@/services/portingRequests.api'
import {
  CONTACT_CHANNEL_LABELS,
  PORTED_NUMBER_KIND_LABELS,
  PORTING_MODE_DESCRIPTIONS,
  PORTING_MODE_LABELS,
  SUBSCRIBER_IDENTITY_TYPE_LABELS,
  normalizePhoneNumber,
} from '@np-manager/shared'
import type {
  ClientDetailDto,
  ClientSearchItemDto,
  ContactChannel,
  CreatePortingRequestDto,
  PortedNumberKind,
  PortingMode,
  SubscriberIdentityType,
} from '@np-manager/shared'

export interface RequestNewFormFields {
  donorOperatorId: string
  numberRangeKind: PortedNumberKind
  primaryNumber: string
  rangeStart: string
  rangeEnd: string
  requestDocumentNumber: string
  portingMode: PortingMode
  requestedPortDate: string
  earliestAcceptablePortDate: string
  subscriberFirstName: string
  subscriberLastName: string
  subscriberCompanyName: string
  identityType: SubscriberIdentityType
  identityValue: string
  correspondenceAddress: string
  hasPowerOfAttorney: boolean
  linkedWholesaleServiceOnRecipientSide: boolean
  infrastructureOperatorId: string
  contactChannel: ContactChannel
  internalNotes: string
}

export type RequestNewFormErrors = Partial<Record<keyof RequestNewFormFields | 'clientId' | '_root', string>>

const EMPTY_FORM: RequestNewFormFields = {
  donorOperatorId: '',
  numberRangeKind: 'SINGLE',
  primaryNumber: '',
  rangeStart: '',
  rangeEnd: '',
  requestDocumentNumber: '',
  portingMode: 'DAY',
  requestedPortDate: '',
  earliestAcceptablePortDate: '',
  subscriberFirstName: '',
  subscriberLastName: '',
  subscriberCompanyName: '',
  identityType: 'PESEL',
  identityValue: '',
  correspondenceAddress: '',
  hasPowerOfAttorney: false,
  linkedWholesaleServiceOnRecipientSide: false,
  infrastructureOperatorId: '',
  contactChannel: 'EMAIL',
  internalNotes: '',
}

const WHOLESALE_HELPER =
  'Sprawa powiazana z Usluga Hurtowa po stronie Biorcy wymaga pelnomocnictwa.'

function todayString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function isWeekend(value: string): boolean {
  const day = new Date(`${value}T12:00:00.000Z`).getUTCDay()
  return day === 0 || day === 6
}

export function normalizeRequestNewPhone(value: string): string {
  return normalizePhoneNumber(value.trim())
}

export function getRequestNumberKindPatch(
  numberRangeKind: PortedNumberKind,
  current: Pick<RequestNewFormFields, 'numberRangeKind' | 'primaryNumber' | 'rangeStart' | 'rangeEnd'>,
): Pick<RequestNewFormFields, 'numberRangeKind' | 'primaryNumber' | 'rangeStart' | 'rangeEnd'> {
  if (numberRangeKind === current.numberRangeKind) {
    return {
      numberRangeKind,
      primaryNumber: current.primaryNumber,
      rangeStart: current.rangeStart,
      rangeEnd: current.rangeEnd,
    }
  }

  return {
    numberRangeKind,
    primaryNumber: numberRangeKind === 'SINGLE' ? current.primaryNumber : '',
    rangeStart: numberRangeKind === 'DDI_RANGE' ? current.rangeStart : '',
    rangeEnd: numberRangeKind === 'DDI_RANGE' ? current.rangeEnd : '',
  }
}

export function getCreatedRequestDetailPath(caseNumber: string): string {
  return buildPath(ROUTES.REQUEST_DETAIL, caseNumber)
}

function buildCorrespondenceAddress(client: ClientDetailDto): string {
  return `${client.addressStreet}, ${client.addressZip} ${client.addressCity}`
}

function inferIdentityType(client: ClientDetailDto): SubscriberIdentityType {
  return client.clientType === 'BUSINESS' ? 'NIP' : 'PESEL'
}

function inferIdentityValue(client: ClientDetailDto): string {
  return client.clientType === 'BUSINESS' ? client.nip ?? '' : client.pesel ?? ''
}

function getDeferredModeDateLabel(mode: PortingMode): string {
  return mode === 'EOP'
    ? 'Najwczesniejsza akceptowalna data po koncu promocji'
    : 'Najwczesniejsza akceptowalna data przeniesienia'
}

function getDeferredModeHelperText(mode: PortingMode): string {
  return mode === 'EOP'
    ? 'Finalna date przeniesienia wyznaczy Dawca zgodnie z koncem okresu promocyjnego. To pole okresla najwczesniejszy termin akceptowalny po stronie Biorcy i nie moze wskazywac daty z przeszlosci.'
    : 'Finalna date przeniesienia wyznaczy Dawca zgodnie z okresem wypowiedzenia. To pole okresla najwczesniejszy termin akceptowalny po stronie Biorcy i nie moze wskazywac daty z przeszlosci.'
}

export function getRequestNewValidationErrors(
  fields: RequestNewFormFields,
  selectedClient: ClientDetailDto | null,
  today = todayString(),
): RequestNewFormErrors {
  const nextErrors: RequestNewFormErrors = {}
  if (!selectedClient) nextErrors.clientId = 'Wybierz klienta z kartoteki.'
  if (!fields.donorOperatorId) nextErrors.donorOperatorId = 'Operator oddajacy jest wymagany.'
  if (fields.numberRangeKind === 'SINGLE') {
    if (!fields.primaryNumber.trim()) nextErrors.primaryNumber = 'Podaj numer glowny.'
  } else {
    if (!fields.rangeStart.trim()) nextErrors.rangeStart = 'Podaj numer poczatkowy zakresu.'
    if (!fields.rangeEnd.trim()) nextErrors.rangeEnd = 'Podaj numer koncowy zakresu.'
    if (fields.rangeStart.trim() && fields.rangeEnd.trim()) {
      const start = normalizeRequestNewPhone(fields.rangeStart)
      const end = normalizeRequestNewPhone(fields.rangeEnd)
      if (start.length !== end.length) nextErrors.rangeEnd = 'Numery zakresu musza miec zgodny format.'
      else if (start > end) nextErrors.rangeEnd = 'Numer koncowy zakresu nie moze byc mniejszy niz poczatkowy.'
    }
  }
  if (fields.portingMode === 'DAY') {
    if (!fields.requestedPortDate) nextErrors.requestedPortDate = 'Dla trybu DAY wskaz wnioskowany dzien przeniesienia.'
    else if (fields.requestedPortDate < today) nextErrors.requestedPortDate = 'Wnioskowany dzien przeniesienia nie moze byc z przeszlosci.'
    else if (isWeekend(fields.requestedPortDate)) nextErrors.requestedPortDate = 'Wnioskowany dzien przeniesienia nie moze przypasc w weekend.'
    if (!fields.hasPowerOfAttorney) nextErrors.hasPowerOfAttorney = 'Tryb DAY wymaga pelnomocnictwa.'
  } else if (!fields.earliestAcceptablePortDate) {
    nextErrors.earliestAcceptablePortDate = 'Wskaz najwczesniejsza akceptowalna date po stronie Biorcy.'
  } else if (fields.earliestAcceptablePortDate < today) {
    nextErrors.earliestAcceptablePortDate = 'Najwczesniejsza akceptowalna data nie moze byc z przeszlosci.'
  }
  if (fields.linkedWholesaleServiceOnRecipientSide) {
    if (!fields.hasPowerOfAttorney) nextErrors.hasPowerOfAttorney = WHOLESALE_HELPER
    if (!fields.infrastructureOperatorId) nextErrors.infrastructureOperatorId = 'Wskaz operatora infrastrukturalnego.'
  }
  if (selectedClient?.clientType === 'INDIVIDUAL') {
    if (!fields.subscriberFirstName.trim()) nextErrors.subscriberFirstName = 'Imie abonenta jest wymagane.'
    if (!fields.subscriberLastName.trim()) nextErrors.subscriberLastName = 'Nazwisko abonenta jest wymagane.'
  }
  if (selectedClient?.clientType === 'BUSINESS' && !fields.subscriberCompanyName.trim()) {
    nextErrors.subscriberCompanyName = 'Nazwa firmy abonenta jest wymagana.'
  }
  if (!fields.identityValue.trim()) nextErrors.identityValue = 'Wartosc identyfikatora jest wymagana.'
  else if (fields.identityType === 'PESEL' && !/^\d{11}$/.test(fields.identityValue.trim())) nextErrors.identityValue = 'PESEL musi zawierac dokladnie 11 cyfr.'
  else if (fields.identityType === 'NIP' && !/^\d{10}$/.test(fields.identityValue.replace(/[-\s]/g, ''))) nextErrors.identityValue = 'NIP musi zawierac 10 cyfr.'
  else if (fields.identityType === 'REGON' && !/^(\d{9}|\d{14})$/.test(fields.identityValue.trim())) nextErrors.identityValue = 'REGON musi zawierac 9 albo 14 cyfr.'
  if (!fields.correspondenceAddress.trim()) nextErrors.correspondenceAddress = 'Adres korespondencyjny jest wymagany.'
  return nextErrors
}

export function buildRequestNewPayload(
  fields: RequestNewFormFields,
  selectedClient: ClientDetailDto,
): CreatePortingRequestDto {
  return {
    clientId: selectedClient.id,
    donorOperatorId: fields.donorOperatorId,
    numberType: 'FIXED_LINE',
    numberRangeKind: fields.numberRangeKind,
    primaryNumber: fields.numberRangeKind === 'SINGLE'
      ? normalizeRequestNewPhone(fields.primaryNumber)
      : undefined,
    rangeStart: fields.numberRangeKind === 'DDI_RANGE'
      ? normalizeRequestNewPhone(fields.rangeStart)
      : undefined,
    rangeEnd: fields.numberRangeKind === 'DDI_RANGE'
      ? normalizeRequestNewPhone(fields.rangeEnd)
      : undefined,
    requestDocumentNumber: fields.requestDocumentNumber.trim() || undefined,
    portingMode: fields.portingMode,
    requestedPortDate: fields.portingMode === 'DAY' ? fields.requestedPortDate || undefined : undefined,
    earliestAcceptablePortDate: fields.portingMode !== 'DAY' ? fields.earliestAcceptablePortDate || undefined : undefined,
    subscriberKind: selectedClient.clientType,
    subscriberFirstName: selectedClient.clientType === 'INDIVIDUAL' ? fields.subscriberFirstName.trim() : undefined,
    subscriberLastName: selectedClient.clientType === 'INDIVIDUAL' ? fields.subscriberLastName.trim() : undefined,
    subscriberCompanyName: selectedClient.clientType === 'BUSINESS' ? fields.subscriberCompanyName.trim() : undefined,
    identityType: fields.identityType,
    identityValue: fields.identityValue.trim(),
    correspondenceAddress: fields.correspondenceAddress.trim(),
    hasPowerOfAttorney: fields.hasPowerOfAttorney,
    linkedWholesaleServiceOnRecipientSide: fields.linkedWholesaleServiceOnRecipientSide,
    infrastructureOperatorId: fields.linkedWholesaleServiceOnRecipientSide && fields.infrastructureOperatorId
      ? fields.infrastructureOperatorId
      : undefined,
    contactChannel: fields.contactChannel,
    internalNotes: fields.internalNotes.trim() || undefined,
  }
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  )
}

function FormField({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="error-message">{error}</p>}
    </div>
  )
}

export function RequestNewPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { operators, isLoading: operatorsLoading, error: operatorsError } = useOperators()
  const [clientQuery, setClientQuery] = useState('')
  const [clientResults, setClientResults] = useState<ClientSearchItemDto[]>([])
  const [isSearchingClients, setIsSearchingClients] = useState(false)
  const [clientSearchError, setClientSearchError] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<ClientDetailDto | null>(null)
  const [isLoadingClient, setIsLoadingClient] = useState(false)
  const [initializedClientId, setInitializedClientId] = useState<string | null>(null)
  const [fields, setFields] = useState<RequestNewFormFields>(EMPTY_FORM)
  const [errors, setErrors] = useState<RequestNewFormErrors>({})
  const [isSaving, setIsSaving] = useState(false)
  const isBusiness = selectedClient?.clientType === 'BUSINESS'
  const selectedClientIdFromQuery = searchParams.get('clientId')
  const showCreatedClientSuccess = searchParams.get('requestCreatedClient') === '1'
  const donorOptions = useMemo(() => operators.filter((operator) => operator.isActive), [operators])
  const infrastructureOptions = donorOptions
  const createClientHref = `${ROUTES.CLIENT_NEW}?returnTo=${encodeURIComponent(ROUTES.REQUEST_NEW)}`

  const syncSelectedClientParams = useCallback(
    (clientId: string | null, showSuccessMessage = false) => {
      const nextParams = new URLSearchParams(searchParams)

      if (clientId) nextParams.set('clientId', clientId)
      else nextParams.delete('clientId')

      if (showSuccessMessage) nextParams.set('requestCreatedClient', '1')
      else nextParams.delete('requestCreatedClient')

      if (nextParams.toString() !== searchParams.toString()) {
        setSearchParams(nextParams, { replace: true })
      }
    },
    [searchParams, setSearchParams],
  )

  useEffect(() => {
    if (selectedClient || clientQuery.trim().length < 2) {
      setClientResults([])
      setClientSearchError(null)
      return
    }
    let cancelled = false
    setIsSearchingClients(true)
    setClientSearchError(null)
    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchClients(clientQuery.trim())
        if (!cancelled) setClientResults(results)
      } catch {
        if (!cancelled) setClientSearchError('Nie udalo sie wyszukac klientow.')
      } finally {
        if (!cancelled) setIsSearchingClients(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [clientQuery, selectedClient])

  const setTextField =
    (key: keyof RequestNewFormFields) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setFields((previous) => ({ ...previous, [key]: event.target.value }))
      setErrors((previous) => ({ ...previous, [key]: undefined, _root: undefined }))
    }

  const setCheckboxField =
    (key: keyof RequestNewFormFields) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFields((previous) => ({ ...previous, [key]: event.target.checked }))
      setErrors((previous) => ({ ...previous, [key]: undefined, _root: undefined }))
    }

  const applyClientSnapshot = (client: ClientDetailDto) => {
    setFields((previous) => ({
      ...previous,
      subscriberFirstName: client.firstName ?? '',
      subscriberLastName: client.lastName ?? '',
      subscriberCompanyName: client.companyName ?? '',
      identityType: inferIdentityType(client),
      identityValue: inferIdentityValue(client),
      correspondenceAddress: buildCorrespondenceAddress(client),
    }))
  }

  const handleSelectClient = useCallback(async (
    clientId: string,
    options?: { showSuccessMessage?: boolean },
  ) => {
    setIsLoadingClient(true)
    setClientSearchError(null)
    try {
      const client = await getClientById(clientId)
      setSelectedClient(client)
      setClientQuery('')
      setClientResults([])
      setErrors((previous) => ({ ...previous, clientId: undefined }))
      applyClientSnapshot(client)
      syncSelectedClientParams(client.id, options?.showSuccessMessage ?? false)
    } catch {
      setClientSearchError('Nie udalo sie pobrac pelnych danych wybranego klienta.')
    } finally {
      setIsLoadingClient(false)
    }
  }, [syncSelectedClientParams])

  useEffect(() => {
    if (
      !selectedClientIdFromQuery ||
      initializedClientId === selectedClientIdFromQuery ||
      selectedClient?.id === selectedClientIdFromQuery ||
      isLoadingClient
    ) {
      return
    }

    setInitializedClientId(selectedClientIdFromQuery)
    void handleSelectClient(selectedClientIdFromQuery, {
      showSuccessMessage: showCreatedClientSuccess,
    })
  }, [
    handleSelectClient,
    initializedClientId,
    isLoadingClient,
    selectedClient?.id,
    selectedClientIdFromQuery,
    showCreatedClientSuccess,
  ])

  const resetSelectedClient = () => {
    setSelectedClient(null)
    setInitializedClientId(null)
    syncSelectedClientParams(null)
    setFields((previous) => ({
      ...EMPTY_FORM,
      donorOperatorId: previous.donorOperatorId,
      numberRangeKind: previous.numberRangeKind,
      primaryNumber: previous.primaryNumber,
      rangeStart: previous.rangeStart,
      rangeEnd: previous.rangeEnd,
      requestDocumentNumber: previous.requestDocumentNumber,
      portingMode: previous.portingMode,
      requestedPortDate: previous.requestedPortDate,
      earliestAcceptablePortDate: previous.earliestAcceptablePortDate,
      hasPowerOfAttorney: previous.hasPowerOfAttorney,
      linkedWholesaleServiceOnRecipientSide: previous.linkedWholesaleServiceOnRecipientSide,
      infrastructureOperatorId: previous.infrastructureOperatorId,
      contactChannel: previous.contactChannel,
      internalNotes: previous.internalNotes,
    }))
  }

  const handleModeChange = (mode: PortingMode) => {
    setFields((previous) => ({
      ...previous,
      portingMode: mode,
      requestedPortDate: mode === 'DAY' ? previous.requestedPortDate : '',
      earliestAcceptablePortDate: mode === 'DAY' ? '' : previous.earliestAcceptablePortDate,
    }))
    setErrors((previous) => ({
      ...previous,
      requestedPortDate: undefined,
      earliestAcceptablePortDate: undefined,
      hasPowerOfAttorney: undefined,
      _root: undefined,
    }))
  }

  const handleNumberKindChange = (numberRangeKind: PortedNumberKind) => {
    setFields((previous) => ({
      ...previous,
      ...getRequestNumberKindPatch(numberRangeKind, previous),
    }))
    setErrors((previous) => ({
      ...previous,
      primaryNumber: undefined,
      rangeStart: undefined,
      rangeEnd: undefined,
      _root: undefined,
    }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSaving || !selectedClient) return
    const validationErrors = getRequestNewValidationErrors(fields, selectedClient)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setIsSaving(true)
    setErrors({})
    const payload = buildRequestNewPayload(fields, selectedClient)
    try {
      const request = await createPortingRequest(payload)
      void navigate(getCreatedRequestDetailPath(request.caseNumber), {
        state: { createdRequest: true },
      })
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          setErrors({ _root: (error.response.data as { error?: { message?: string } })?.error?.message ?? 'Dla wskazanej numeracji istnieje juz aktywna sprawa.' })
        } else if (error.response?.status === 400) {
          const details = (error.response.data as { error?: { details?: Record<string, string[]> } } )?.error?.details
          if (details) {
            const fieldErrors: RequestNewFormErrors = {}
            for (const [field, messages] of Object.entries(details)) {
              if (messages?.[0]) fieldErrors[field as keyof RequestNewFormErrors] = messages[0]
            }
            setErrors(fieldErrors)
          } else {
            setErrors({ _root: (error.response.data as { error?: { message?: string } })?.error?.message ?? 'Nieprawidlowe dane. Sprawdz formularz.' })
          }
        } else if (error.response?.status === 403) {
          setErrors({ _root: 'Brak uprawnien do zakladania spraw portowania.' })
        } else {
          setErrors({ _root: 'Wystapil blad serwera. Sprobuj ponownie.' })
        }
      } else {
        setErrors({ _root: 'Brak polaczenia z serwerem.' })
      }
    } finally {
      setIsSaving(false)
    }
  }

  const identityTypeOptions: SubscriberIdentityType[] = isBusiness ? ['NIP', 'REGON', 'OTHER'] : ['PESEL', 'ID_CARD', 'PASSPORT', 'OTHER']
  const modeDescription = PORTING_MODE_DESCRIPTIONS[fields.portingMode]
  const selectedDonorOperator = donorOptions.find((operator) => operator.id === fields.donorOperatorId)
  const selectedInfrastructureOperator = infrastructureOptions.find(
    (operator) => operator.id === fields.infrastructureOperatorId,
  )
  const numberingSummary = fields.numberRangeKind === 'SINGLE'
    ? fields.primaryNumber.trim() || 'Nie podano'
    : `${fields.rangeStart.trim() || 'Nie podano'} - ${fields.rangeEnd.trim() || 'Nie podano'}`
  const dateSummary = fields.portingMode === 'DAY'
    ? fields.requestedPortDate || 'Nie podano'
    : fields.earliestAcceptablePortDate || 'Nie podano'

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <button onClick={() => void navigate(ROUTES.REQUESTS)} className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1">
          {'<-'} Sprawy portowania
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Nowa sprawa portowania</h1>
      </div>
      <form onSubmit={(event) => void handleSubmit(event)} noValidate className="space-y-5">
        <SectionCard title="1. Klient">
          {selectedClient ? (
            <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">{selectedClient.displayName}</p>
                <p className="text-sm text-gray-500 mt-1">{selectedClient.clientType === 'BUSINESS' ? 'Firma / podmiot prawny' : 'Osoba fizyczna'}</p>
                {showCreatedClientSuccess && (
                  <p className="mt-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                    Klient zostal utworzony i zostal podpiety do nowej sprawy portowania.
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">Dane abonenta zostaly wstepnie uzupelnione z kartoteki i mozna je doprecyzowac ponizej.</p>
              </div>
              <button type="button" onClick={resetSelectedClient} className="btn-secondary">Zmien klienta</button>
            </div>
          ) : (
            <div className="space-y-3">
              <FormField label="Wyszukaj klienta" error={errors.clientId || clientSearchError || undefined}>
                <input type="search" value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} className={`input-field ${errors.clientId || clientSearchError ? 'input-error' : ''}`} placeholder="Wpisz nazwisko, firme, PESEL albo NIP..." disabled={isLoadingClient} />
              </FormField>
              <button
                type="button"
                onClick={() => void navigate(createClientHref)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Nie ma klienta? Dodaj nowego klienta
              </button>
              {isSearchingClients && <p className="text-xs text-gray-400">Wyszukiwanie klientow...</p>}
              {clientResults.length > 0 && (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  {clientResults.map((client) => (
                    <button key={client.id} type="button" onClick={() => void handleSelectClient(client.id)} className="w-full text-left px-4 py-3 bg-white hover:bg-blue-50 border-b border-gray-100 last:border-b-0">
                      <div className="font-medium text-sm text-gray-900">{client.displayName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{client.identifierMasked ?? 'Brak identyfikatora'}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </SectionCard>
        <SectionCard title="2. Zakres numeracji">
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Ten formularz dotyczy numerów stacjonarnych FNP.
          </div>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden w-fit">
            {(['SINGLE', 'DDI_RANGE'] as PortedNumberKind[]).map((kind) => (
              <button key={kind} type="button" onClick={() => handleNumberKindChange(kind)} className={`px-6 py-2 text-sm font-medium transition-colors ${fields.numberRangeKind === kind ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                {PORTED_NUMBER_KIND_LABELS[kind]}
              </button>
            ))}
          </div>
          {fields.numberRangeKind === 'SINGLE' ? (
            <FormField label="Numer glowny" error={errors.primaryNumber}>
              <input className={`input-field font-mono ${errors.primaryNumber ? 'input-error' : ''}`} value={fields.primaryNumber} onChange={setTextField('primaryNumber')} placeholder="+48 22 123 45 67" />
            </FormField>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Numer poczatkowy zakresu" error={errors.rangeStart}>
                <input className={`input-field font-mono ${errors.rangeStart ? 'input-error' : ''}`} value={fields.rangeStart} onChange={setTextField('rangeStart')} placeholder="+48 22 555 10 00" />
              </FormField>
              <FormField label="Numer koncowy zakresu" error={errors.rangeEnd}>
                <input className={`input-field font-mono ${errors.rangeEnd ? 'input-error' : ''}`} value={fields.rangeEnd} onChange={setTextField('rangeEnd')} placeholder="+48 22 555 10 99" />
              </FormField>
            </div>
          )}
          <FormField label="Numer wniosku / dokumentu (opcjonalnie)" error={errors.requestDocumentNumber}>
            <input className={`input-field ${errors.requestDocumentNumber ? 'input-error' : ''}`} value={fields.requestDocumentNumber} onChange={setTextField('requestDocumentNumber')} placeholder="np. WN-2026/03/001" />
          </FormField>
        </SectionCard>

        <SectionCard title="3. Operatorzy">
          <FormField label="Operator oddajacy" error={errors.donorOperatorId}>
            <select value={fields.donorOperatorId} onChange={setTextField('donorOperatorId')} className={`input-field ${errors.donorOperatorId ? 'input-error' : ''}`} disabled={operatorsLoading}>
              <option value="">Wybierz operatora oddajacego</option>
              {donorOptions.map((operator) => (
                <option key={operator.id} value={operator.id}>
                  {operator.name} ({operator.routingNumber})
                </option>
              ))}
            </select>
          </FormField>
          {operatorsError && <p className="text-sm text-red-600">{operatorsError}</p>}
        </SectionCard>

        <SectionCard title="4. Tryb i termin">
          <div className="flex flex-wrap rounded-lg border border-gray-300 overflow-hidden w-fit">
            {(['DAY', 'END', 'EOP'] as PortingMode[]).map((mode) => (
              <button key={mode} type="button" onClick={() => handleModeChange(mode)} className={`px-6 py-2 text-sm font-medium transition-colors ${fields.portingMode === mode ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                {PORTING_MODE_LABELS[mode]}
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">{modeDescription}</div>
          {fields.portingMode === 'DAY' ? (
            <>
              <FormField label="Wnioskowany dzien przeniesienia" error={errors.requestedPortDate}>
                <input type="date" value={fields.requestedPortDate} onChange={setTextField('requestedPortDate')} min={todayString()} className={`input-field ${errors.requestedPortDate ? 'input-error' : ''}`} />
              </FormField>
              <p className="text-xs text-gray-500">Klient wskazuje konkretny termin przeniesienia. Data nie moze byc z przeszlosci i nie moze wypasc w weekend.</p>
            </>
          ) : (
            <>
              <FormField label={getDeferredModeDateLabel(fields.portingMode)} error={errors.earliestAcceptablePortDate}>
                <input type="date" value={fields.earliestAcceptablePortDate} onChange={setTextField('earliestAcceptablePortDate')} min={todayString()} className={`input-field ${errors.earliestAcceptablePortDate ? 'input-error' : ''}`} />
              </FormField>
              <p className="text-xs text-gray-500">{getDeferredModeHelperText(fields.portingMode)}</p>
            </>
          )}
        </SectionCard>

        <SectionCard title="5. Dane abonenta / identyfikacyjne">
          {!selectedClient && <p className="text-sm text-gray-500">Najpierw wybierz klienta z kartoteki.</p>}
          {selectedClient && (
            <>
              {selectedClient.clientType === 'INDIVIDUAL' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Imie abonenta" error={errors.subscriberFirstName}>
                    <input className={`input-field ${errors.subscriberFirstName ? 'input-error' : ''}`} value={fields.subscriberFirstName} onChange={setTextField('subscriberFirstName')} />
                  </FormField>
                  <FormField label="Nazwisko abonenta" error={errors.subscriberLastName}>
                    <input className={`input-field ${errors.subscriberLastName ? 'input-error' : ''}`} value={fields.subscriberLastName} onChange={setTextField('subscriberLastName')} />
                  </FormField>
                </div>
              ) : (
                <FormField label="Nazwa firmy abonenta" error={errors.subscriberCompanyName}>
                  <input className={`input-field ${errors.subscriberCompanyName ? 'input-error' : ''}`} value={fields.subscriberCompanyName} onChange={setTextField('subscriberCompanyName')} />
                </FormField>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Typ identyfikatora" error={errors.identityType}>
                  <select value={fields.identityType} onChange={setTextField('identityType')} className={`input-field ${errors.identityType ? 'input-error' : ''}`}>
                    {identityTypeOptions.map((identityType) => (
                      <option key={identityType} value={identityType}>
                        {SUBSCRIBER_IDENTITY_TYPE_LABELS[identityType]}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Wartosc identyfikatora" error={errors.identityValue}>
                  <input className={`input-field font-mono ${errors.identityValue ? 'input-error' : ''}`} value={fields.identityValue} onChange={setTextField('identityValue')} />
                </FormField>
              </div>
              <FormField label="Adres korespondencyjny" error={errors.correspondenceAddress}>
                <textarea value={fields.correspondenceAddress} onChange={setTextField('correspondenceAddress')} className={`input-field min-h-24 ${errors.correspondenceAddress ? 'input-error' : ''}`} />
              </FormField>
            </>
          )}
        </SectionCard>
        <SectionCard title="6. Upowaznienie i proces">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={fields.hasPowerOfAttorney} onChange={setCheckboxField('hasPowerOfAttorney')} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
            <span className="text-sm text-gray-700">Klient udzielil pelnomocnictwa</span>
          </label>
          <p className="text-xs text-gray-500">
            System rejestruje informację operacyjną o pełnomocnictwie. Skan dokumentu nie jest przechowywany w tym formularzu.
          </p>
          {errors.hasPowerOfAttorney && <p className="error-message">{errors.hasPowerOfAttorney}</p>}

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={fields.linkedWholesaleServiceOnRecipientSide} onChange={setCheckboxField('linkedWholesaleServiceOnRecipientSide')} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
            <span className="text-sm text-gray-700">Sprawa jest powiazana z Usluga Hurtowa po stronie Biorcy</span>
          </label>

          {fields.linkedWholesaleServiceOnRecipientSide && (
            <>
              <p className="text-xs text-amber-700">{WHOLESALE_HELPER}</p>
              <FormField label="Operator infrastrukturalny" error={errors.infrastructureOperatorId}>
                <select value={fields.infrastructureOperatorId} onChange={setTextField('infrastructureOperatorId')} className={`input-field ${errors.infrastructureOperatorId ? 'input-error' : ''}`}>
                  <option value="">Wybierz operatora infrastrukturalnego</option>
                  {infrastructureOptions.map((operator) => (
                    <option key={operator.id} value={operator.id}>
                      {operator.name} ({operator.routingNumber})
                    </option>
                  ))}
                </select>
              </FormField>
            </>
          )}

          <FormField label="Preferowany kanal kontaktu" error={errors.contactChannel}>
            <select value={fields.contactChannel} onChange={setTextField('contactChannel')} className={`input-field ${errors.contactChannel ? 'input-error' : ''}`}>
              {(['EMAIL', 'SMS', 'LETTER'] as ContactChannel[]).map((channel) => (
                <option key={channel} value={channel}>
                  {CONTACT_CHANNEL_LABELS[channel]}
                </option>
              ))}
            </select>
          </FormField>
        </SectionCard>

        <SectionCard title="7. Uwagi">
          <FormField label="Notatki wewnetrzne (opcjonalnie)" error={errors.internalNotes}>
            <textarea value={fields.internalNotes} onChange={setTextField('internalNotes')} className={`input-field min-h-28 ${errors.internalNotes ? 'input-error' : ''}`} placeholder="Dodatkowe informacje operacyjne, ustalenia z klientem, kontekst sprawy..." />
          </FormField>
        </SectionCard>

        <SectionCard title="Sprawdź przed utworzeniem">
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Klient</dt>
              <dd className="font-medium text-gray-900">{selectedClient?.displayName ?? 'Nie wybrano'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Numeracja</dt>
              <dd className="font-mono text-gray-900">{numberingSummary}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Operator oddający</dt>
              <dd className="font-medium text-gray-900">{selectedDonorOperator?.name ?? 'Nie wybrano'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Tryb i data</dt>
              <dd className="font-medium text-gray-900">
                {PORTING_MODE_LABELS[fields.portingMode]} · {dateSummary}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Pełnomocnictwo</dt>
              <dd className="font-medium text-gray-900">{fields.hasPowerOfAttorney ? 'Zarejestrowane' : 'Brak informacji'}</dd>
            </div>
            {fields.linkedWholesaleServiceOnRecipientSide && (
              <div>
                <dt className="text-gray-500">Usługa hurtowa</dt>
                <dd className="font-medium text-gray-900">
                  {selectedInfrastructureOperator?.name ?? 'Wymaga wskazania operatora infrastrukturalnego'}
                </dd>
              </div>
            )}
          </dl>
        </SectionCard>

        {errors._root && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-red-500 text-sm mt-0.5">!</span>
            <p className="text-sm text-red-700">{errors._root}</p>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={() => void navigate(ROUTES.REQUESTS)} className="btn-secondary" disabled={isSaving}>
            Anuluj
          </button>
          <button type="submit" className="btn-primary" disabled={isSaving || operatorsLoading}>
            {isSaving ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Zapisywanie...
              </>
            ) : (
              'Zapisz sprawe'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
