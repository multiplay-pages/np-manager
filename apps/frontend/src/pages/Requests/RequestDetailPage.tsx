import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { getPortingRequestById } from '@/services/portingRequests.api'
import {
  CONTACT_CHANNEL_LABELS,
  NUMBER_TYPE_LABELS,
  PORTED_NUMBER_KIND_LABELS,
  PORTING_CASE_STATUS_LABELS,
  PORTING_MODE_LABELS,
  SUBSCRIBER_IDENTITY_TYPE_LABELS,
} from '@np-manager/shared'
import type { PortingRequestDetailDto } from '@np-manager/shared'

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [request, setRequest] = useState<PortingRequestDetailDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        setRequest(await getPortingRequestById(id))
      } catch {
        setError('Nie udało się załadować szczegółów sprawy portowania.')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [id])

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-24 text-gray-400 text-sm">
        Ładowanie...
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center">
          <p className="text-red-500 text-sm mb-4">{error ?? 'Sprawa nie została znaleziona.'}</p>
          <button onClick={() => void navigate(ROUTES.REQUESTS)} className="btn-secondary">
            Wróć do listy
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => void navigate(ROUTES.REQUESTS)}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
          >
            ← Sprawy portowania
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{request.caseNumber}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {PORTING_CASE_STATUS_LABELS[request.statusInternal]}
            </span>
            <span className="text-sm text-gray-500">{request.client.displayName}</span>
            <span className="text-sm text-gray-500">{request.numberDisplay}</span>
          </div>
        </div>
        <button onClick={() => void navigate(ROUTES.REQUEST_NEW)} className="btn-secondary">
          + Nowa sprawa
        </button>
      </div>

      <Section title="Klient">
        <Field label="Kartoteka klienta" value={request.client.displayName} />
        <Field label="Typ klienta" value={request.client.clientType === 'INDIVIDUAL' ? 'Osoba fizyczna' : 'Firma / podmiot prawny'} />
      </Section>

      <Section title="Numeracja">
        <Field label="Typ usługi" value={NUMBER_TYPE_LABELS[request.numberType]} />
        <Field label="Typ numeracji" value={PORTED_NUMBER_KIND_LABELS[request.numberRangeKind]} />
        <Field label="Numer / zakres" value={request.numberDisplay} mono />
        {request.requestDocumentNumber && (
          <Field label="Numer wniosku / dokumentu" value={request.requestDocumentNumber} mono />
        )}
      </Section>

      <Section title="Operatorzy">
        <Field label="Operator oddający" value={request.donorOperator.name} />
        <Field label="Routing dawcy" value={request.donorRoutingNumber} mono />
        <Field label="Operator biorący" value={request.recipientOperator.name} />
        <Field label="Routing biorcy" value={request.recipientRoutingNumber} mono />
        {request.infrastructureOperator && (
          <Field label="Operator infrastrukturalny" value={request.infrastructureOperator.name} />
        )}
      </Section>

      <Section title="Tryb i termin">
        <Field label="Tryb przeniesienia" value={PORTING_MODE_LABELS[request.portingMode]} />
        <Field label="Kanał kontaktu" value={CONTACT_CHANNEL_LABELS[request.contactChannel]} />
        <Field label="Data DAY" value={request.requestedPortDate} mono />
        <Field label="Godzina DAY" value={request.requestedPortTime} mono />
        <Field label="Najwcześniejsza akceptowalna data" value={request.earliestAcceptablePortDate} mono />
        <Field label="Potwierdzona data przeniesienia" value={request.confirmedPortDate} mono />
      </Section>

      <Section title="Tożsamość abonenta">
        <Field label="Abonent" value={request.subscriberDisplayName} />
        <Field label="Rodzaj identyfikatora" value={SUBSCRIBER_IDENTITY_TYPE_LABELS[request.identityType]} />
        <Field label="Wartość identyfikatora" value={request.identityValue} mono />
        <WideField label="Adres korespondencyjny" value={request.correspondenceAddress} />
      </Section>

      <Section title="Upoważnienie i proces">
        <Field label="Pełnomocnictwo" value={request.hasPowerOfAttorney ? 'Tak' : 'Nie'} />
        <Field
          label="Usługa Hurtowa po stronie Biorcy"
          value={request.linkedWholesaleServiceOnRecipientSide ? 'Tak' : 'Nie'}
        />
        <WideField label="Notatki wewnętrzne" value={request.internalNotes} />
      </Section>

      <Section title="Meta i status">
        <Field label="Status wewnętrzny" value={PORTING_CASE_STATUS_LABELS[request.statusInternal]} />
        <Field label="Status PLI CBD" value={request.statusPliCbd} mono />
        <Field label="Ostatni komunikat Exx" value={request.lastExxReceived} mono />
        <Field label="PLI CBD case ID" value={request.pliCbdCaseId} mono />
        <Field label="PLI CBD package ID" value={request.pliCbdPackageId} mono />
        <Field label="Kod odrzucenia" value={request.rejectionCode} mono />
        <WideField label="Powód odrzucenia" value={request.rejectionReason} />
      </Section>

      <div className="card p-5 border-dashed">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
          Integracja PLI CBD
        </h2>
        <p className="text-sm text-gray-500">
          W kolejnym kroku dojdzie historia komunikatów Exx i mapowanie workflow do integracji z PLI CBD.
        </p>
      </div>

      <div className="text-xs text-gray-400 space-y-0.5 pt-1">
        <p>Utworzono: {formatDateTime(request.createdAt)}</p>
        <p>Ostatnia zmiana: {formatDateTime(request.updatedAt)}</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
        {title}
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</dl>
    </div>
  )
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
      <dd className={`text-sm text-gray-900 ${mono ? 'font-mono' : ''}`}>
        {value ?? <span className="text-gray-400">—</span>}
      </dd>
    </div>
  )
}

function WideField({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="sm:col-span-2">
      <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900 whitespace-pre-wrap">
        {value ?? <span className="text-gray-400">—</span>}
      </dd>
    </div>
  )
}
