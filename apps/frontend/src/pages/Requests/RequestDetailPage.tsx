import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAuthStore } from '@/stores/auth.store'
import {
  exportPortingRequest,
  getPortingRequestById,
  syncPortingRequest,
} from '@/services/portingRequests.api'
import {
  CONTACT_CHANNEL_LABELS,
  NUMBER_TYPE_LABELS,
  PLI_CBD_EXPORT_STATUS_LABELS,
  PORTED_NUMBER_KIND_LABELS,
  PORTING_CASE_STATUS_LABELS,
  PORTING_MODE_LABELS,
  SUBSCRIBER_IDENTITY_TYPE_LABELS,
} from '@np-manager/shared'
import type { PortingRequestDetailDto } from '@np-manager/shared'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">{title}</h2>
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
        {value ?? <span className="text-gray-400">-</span>}
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
        {value ?? <span className="text-gray-400">-</span>}
      </dd>
    </div>
  )
}

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [request, setRequest] = useState<PortingRequestDetailDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const canTriggerPliCbdActions = useMemo(
    () =>
      ['ADMIN', 'BOK_CONSULTANT', 'BACK_OFFICE', 'MANAGER'].includes(
        user?.role ?? '',
      ),
    [user?.role],
  )

  useEffect(() => {
    if (!id) return

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        setRequest(await getPortingRequestById(id))
      } catch {
        setError('Nie udalo sie zaladowac szczegolow sprawy portowania.')
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

  const handleExport = async () => {
    if (!id || !canTriggerPliCbdActions || isExporting) return
    setIsExporting(true)
    setActionError(null)
    try {
      setRequest(await exportPortingRequest(id))
    } catch {
      setActionError('Nie udalo sie uruchomic foundation eksportu do PLI CBD.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleSync = async () => {
    if (!id || !canTriggerPliCbdActions || isSyncing) return
    setIsSyncing(true)
    setActionError(null)
    try {
      setRequest(await syncPortingRequest(id))
    } catch {
      setActionError('Nie udalo sie uruchomic foundation synchronizacji z PLI CBD.')
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-24 text-gray-400 text-sm">
        Ladowanie...
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center">
          <p className="text-red-500 text-sm mb-4">{error ?? 'Sprawa nie zostala znaleziona.'}</p>
          <button onClick={() => void navigate(ROUTES.REQUESTS)} className="btn-secondary">
            Wroc do listy
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
            {'<-'} Sprawy portowania
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
        <Field
          label="Typ klienta"
          value={request.client.clientType === 'INDIVIDUAL' ? 'Osoba fizyczna' : 'Firma / podmiot prawny'}
        />
      </Section>

      <Section title="Numeracja">
        <Field label="Typ uslugi" value={NUMBER_TYPE_LABELS[request.numberType]} />
        <Field label="Typ numeracji" value={PORTED_NUMBER_KIND_LABELS[request.numberRangeKind]} />
        <Field label="Numer / zakres" value={request.numberDisplay} mono />
        <Field label="Numer wniosku / dokumentu" value={request.requestDocumentNumber} mono />
      </Section>

      <Section title="Operatorzy">
        <Field label="Operator oddajacy" value={request.donorOperator.name} />
        <Field label="Routing dawcy" value={request.donorRoutingNumber} mono />
        <Field label="Operator bioracy" value={request.recipientOperator.name} />
        <Field label="Routing biorcy" value={request.recipientRoutingNumber} mono />
        <Field label="Operator infrastrukturalny" value={request.infrastructureOperator?.name} />
      </Section>

      <Section title="Tryb i terminy">
        <Field label="Tryb przeniesienia" value={PORTING_MODE_LABELS[request.portingMode]} />
        <Field label="Kanal kontaktu" value={CONTACT_CHANNEL_LABELS[request.contactChannel]} />
        <Field label="Wnioskowany dzien przeniesienia" value={request.requestedPortDate} mono />
        <Field
          label="Najwczesniejsza akceptowalna data"
          value={request.earliestAcceptablePortDate}
          mono
        />
        <Field label="Data potwierdzona w systemie" value={request.confirmedPortDate} mono />
        <Field label="Data wyznaczona przez Dawce" value={request.donorAssignedPortDate} mono />
      </Section>

      <Section title="Tozsamosc abonenta">
        <Field label="Abonent" value={request.subscriberDisplayName} />
        <Field
          label="Rodzaj identyfikatora"
          value={SUBSCRIBER_IDENTITY_TYPE_LABELS[request.identityType]}
        />
        <Field label="Wartosc identyfikatora" value={request.identityValue} mono />
        <WideField label="Adres korespondencyjny" value={request.correspondenceAddress} />
      </Section>

      <Section title="Upowaznienie i proces">
        <Field label="Pelnomocnictwo" value={request.hasPowerOfAttorney ? 'Tak' : 'Nie'} />
        <Field
          label="Usluga Hurtowa po stronie Biorcy"
          value={request.linkedWholesaleServiceOnRecipientSide ? 'Tak' : 'Nie'}
        />
        <WideField label="Notatki wewnetrzne" value={request.internalNotes} />
      </Section>

      <Section title="Meta i status">
        <Field label="Status wewnetrzny" value={PORTING_CASE_STATUS_LABELS[request.statusInternal]} />
        <Field label="Status PLI CBD (legacy)" value={request.statusPliCbd} mono />
        <Field label="Kod odrzucenia" value={request.rejectionCode} mono />
        <WideField label="Powod odrzucenia" value={request.rejectionReason} />
      </Section>

      <div className="card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
              PLI CBD
            </h2>
            <p className="text-sm text-gray-500">
              Foundation pod przyszly eksport i synchronizacje sprawy z PLI CBD.
            </p>
          </div>
          {canTriggerPliCbdActions && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleExport()}
                className="btn-secondary"
                disabled={isExporting}
              >
                {isExporting ? 'Eksport...' : 'Manualny eksport'}
              </button>
              <button
                type="button"
                onClick={() => void handleSync()}
                className="btn-secondary"
                disabled={isSyncing || request.pliCbdExportStatus === 'NOT_EXPORTED'}
              >
                {isSyncing ? 'Synchronizacja...' : 'Manualna synchronizacja'}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Status eksportu"
              value={PLI_CBD_EXPORT_STATUS_LABELS[request.pliCbdExportStatus]}
            />
            <Field label="Ostatnia synchronizacja" value={request.pliCbdLastSyncAt ? formatDateTime(request.pliCbdLastSyncAt) : null} />
            <Field label="PLI CBD case ID" value={request.pliCbdCaseId} mono />
            <Field label="PLI CBD case number" value={request.pliCbdCaseNumber} mono />
            <Field label="PLI CBD package ID" value={request.pliCbdPackageId} mono />
            <Field label="Ostatni typ komunikatu" value={request.lastPliCbdMessageType} mono />
            <Field label="Ostatni kod statusu" value={request.lastPliCbdStatusCode} mono />
            <Field label="Godzina wyznaczona przez Dawce" value={request.donorAssignedPortTime} mono />
            <WideField
              label="Opis ostatniego statusu PLI CBD"
              value={
                request.pliCbdExportStatus === 'NOT_EXPORTED'
                  ? 'Nie wyeksportowano do PLI CBD.'
                  : request.lastPliCbdStatusDescription
              }
            />
          </dl>
        </div>

        {actionError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        )}

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Manualne akcje sa tylko foundation pod kolejny krok. Nie uruchamiaja jeszcze realnej
          integracji SOAP/XML z PLI CBD.
        </div>
      </div>

      <div className="card p-5 border-dashed">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
          Historia statusow i komunikatow
        </h2>
        <p className="text-sm text-gray-500">
          W kolejnym kroku dojdzie timeline zmian sprawy, historia eksportow i mapowanie
          komunikatow Exx.
        </p>
      </div>

      <div className="text-xs text-gray-400 space-y-0.5 pt-1">
        <p>Utworzono: {formatDateTime(request.createdAt)}</p>
        <p>Ostatnia zmiana: {formatDateTime(request.updatedAt)}</p>
      </div>
    </div>
  )
}
