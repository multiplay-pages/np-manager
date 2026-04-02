import {
  CLIENT_TYPE_LABELS,
  CONTACT_CHANNEL_LABELS,
  NUMBER_TYPE_LABELS,
  PORTED_NUMBER_KIND_LABELS,
  PORTING_MODE_LABELS,
  SUBSCRIBER_IDENTITY_TYPE_LABELS,
} from '@np-manager/shared'
import type { PliCbdE03DraftBuildResultDto } from '@np-manager/shared'

interface PliCbdE03DraftPreviewProps {
  result: PliCbdE03DraftBuildResultDto | null
  isLoading: boolean
}

const PORT_DATE_SOURCE_LABELS = {
  REQUESTED_PORT_DATE: 'Wnioskowany dzien przeniesienia',
  EARLIEST_ACCEPTABLE_PORT_DATE: 'Najwczesniejsza akceptowalna data',
} as const

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

export function PliCbdE03DraftPreview({
  result,
  isLoading,
}: PliCbdE03DraftPreviewProps) {
  return (
    <div className="card p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
          Draft E03
        </h2>
        <p className="text-sm text-gray-500">
          Read-only preview danych, ktore weszlyby do komunikatu E03 dla PLI CBD.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          Ladowanie draftu E03...
        </div>
      ) : !result ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          Nie udalo sie zaladowac draftu E03.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                result.isReady
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {result.isReady ? 'Gotowe do zbudowania E03' : 'Draft E03 zablokowany'}
            </span>
            <span className="text-xs text-gray-500">Sprawa: {result.caseNumber}</span>
          </div>

          {result.blockingReasons.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
                Blokady draftu
              </p>
              <ul className="space-y-1">
                {result.blockingReasons.map((reason) => (
                  <li key={reason.code} className="text-sm text-amber-900">
                    {reason.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!result.draft ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-600">
              Draft E03 nie zostal wygenerowany dla tej sprawy.
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Typ komunikatu" value={result.draft.messageType} mono />
                  <Field label="Serwis" value={result.draft.serviceType} mono />
                  <Field label="Kartoteka klienta" value={result.draft.clientDisplayName} />
                  <Field
                    label="Typ abonenta"
                    value={CLIENT_TYPE_LABELS[result.draft.subscriberKind]}
                  />
                  <Field label="Abonent w sprawie" value={result.draft.subscriberDisplayName} />
                  <Field
                    label="Numer dokumentu / wniosku"
                    value={result.draft.requestDocumentNumber}
                    mono
                  />
                </dl>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">
                  Numeracja i terminy
                </p>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Typ uslugi" value={NUMBER_TYPE_LABELS[result.draft.numberType]} />
                  <Field
                    label="Typ numeracji"
                    value={PORTED_NUMBER_KIND_LABELS[result.draft.portedNumberKind]}
                  />
                  <Field label="Numer / zakres" value={result.draft.numberDisplay} mono />
                  <Field
                    label="Tryb przeniesienia"
                    value={PORTING_MODE_LABELS[result.draft.portingMode]}
                  />
                  <Field
                    label="Wnioskowany dzien przeniesienia"
                    value={result.draft.requestedPortDate}
                    mono
                  />
                  <Field
                    label="Najwczesniejsza akceptowalna data"
                    value={result.draft.earliestAcceptablePortDate}
                    mono
                  />
                  <Field
                    label="Zrodlo daty w draftcie"
                    value={
                      PORT_DATE_SOURCE_LABELS[result.draft.technicalHints.portDateSource]
                    }
                  />
                </dl>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">
                  Operatorzy i proces
                </p>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Operator oddajacy" value={result.draft.donorOperator.name} />
                  <Field
                    label="Routing dawcy"
                    value={result.draft.donorOperator.routingNumber}
                    mono
                  />
                  <Field
                    label="Operator bioracy"
                    value={result.draft.recipientOperator.name}
                  />
                  <Field
                    label="Routing biorcy"
                    value={result.draft.recipientOperator.routingNumber}
                    mono
                  />
                  <Field
                    label="Operator infrastrukturalny"
                    value={result.draft.infrastructureOperator?.name}
                  />
                  <Field
                    label="Kanal kontaktu"
                    value={CONTACT_CHANNEL_LABELS[result.draft.contactChannel]}
                  />
                  <Field
                    label="Pelnomocnictwo"
                    value={result.draft.hasPowerOfAttorney ? 'Tak' : 'Nie'}
                  />
                  <Field
                    label="Usluga Hurtowa po stronie Biorcy"
                    value={
                      result.draft.linkedWholesaleServiceOnRecipientSide ? 'Tak' : 'Nie'
                    }
                  />
                </dl>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">
                  Tozsamosc abonenta
                </p>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="Rodzaj identyfikatora"
                    value={SUBSCRIBER_IDENTITY_TYPE_LABELS[result.draft.identity.type]}
                  />
                  <Field
                    label="Wartosc identyfikatora"
                    value={result.draft.identity.value}
                    mono
                  />
                  <WideField
                    label="Adres korespondencyjny"
                    value={result.draft.correspondenceAddress}
                  />
                </dl>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
