import {
  FNP_EXX_MESSAGE_LABELS,
  NUMBER_TYPE_LABELS,
  PLI_CBD_EXPORT_STATUS_LABELS,
  PORTED_NUMBER_KIND_LABELS,
  PORTING_CASE_STATUS_LABELS,
  PORTING_MODE_LABELS,
} from '@np-manager/shared'
import type { PliCbdE12DraftBuildResultDto } from '@np-manager/shared'

interface PliCbdE12DraftPreviewProps {
  result: PliCbdE12DraftBuildResultDto | null
  isLoading: boolean
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

export function PliCbdE12DraftPreview({ result, isLoading }: PliCbdE12DraftPreviewProps) {
  return (
    <div className="card p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
          Draft E12
        </h2>
        <p className="text-sm text-gray-500">
          Read-only preview danych, ktore weszlyby do komunikatu E12 dla PLI CBD.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          Ladowanie draftu E12...
        </div>
      ) : !result ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          Nie udalo sie zaladowac draftu E12.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                result.isReady ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {result.isReady ? 'Gotowe do zbudowania E12' : 'Draft E12 zablokowany'}
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
              Draft E12 nie zostal wygenerowany dla tej sprawy.
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Typ komunikatu" value={result.draft.messageType} mono />
                  <Field label="Serwis" value={result.draft.serviceType} mono />
                  <Field label="Kartoteka klienta" value={result.draft.clientDisplayName} />
                  <Field label="Abonent w sprawie" value={result.draft.subscriberDisplayName} />
                  <Field label="ID sprawy portowania" value={result.draft.portingRequestId} mono />
                  <Field label="Numer sprawy" value={result.draft.caseNumber} mono />
                </dl>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">
                  Numeracja i operatorzy
                </p>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Typ uslugi" value={NUMBER_TYPE_LABELS[result.draft.numberType]} />
                  <Field
                    label="Typ numeracji"
                    value={PORTED_NUMBER_KIND_LABELS[result.draft.numberRangeKind]}
                  />
                  <Field label="Numer / zakres" value={result.draft.numberDisplay} mono />
                  <Field
                    label="Tryb przeniesienia"
                    value={PORTING_MODE_LABELS[result.draft.portingMode]}
                  />
                  <Field label="Operator oddajacy" value={result.draft.donorOperator.name} />
                  <Field
                    label="Routing dawcy"
                    value={result.draft.donorOperator.routingNumber}
                    mono
                  />
                  <Field label="Operator bioracy" value={result.draft.recipientOperator.name} />
                  <Field
                    label="Routing biorcy"
                    value={result.draft.recipientOperator.routingNumber}
                    mono
                  />
                </dl>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">
                  Kontekst potwierdzenia
                </p>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="Etap procesu"
                    value={result.draft.confirmationContext.currentStageLabel}
                  />
                  <Field
                    label="Status wewnetrzny"
                    value={
                      PORTING_CASE_STATUS_LABELS[result.draft.confirmationContext.statusInternal] ??
                      result.draft.confirmationContext.statusInternalLabel
                    }
                  />
                  <Field
                    label="Status eksportu"
                    value={
                      PLI_CBD_EXPORT_STATUS_LABELS[result.draft.confirmationContext.exportStatus]
                    }
                  />
                  <Field
                    label="Ostatni komunikat Exx"
                    value={
                      result.draft.confirmationContext.lastReceivedMessageType
                        ? FNP_EXX_MESSAGE_LABELS[
                            result.draft.confirmationContext.lastReceivedMessageType
                          ]
                        : 'Brak'
                    }
                  />
                  <Field
                    label="Data od Dawcy do potwierdzenia"
                    value={result.draft.confirmationContext.donorAssignedPortDate}
                    mono
                  />
                  <Field
                    label="Godzina od Dawcy"
                    value={result.draft.confirmationContext.donorAssignedPortTime}
                    mono
                  />
                </dl>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">
                    Podpowiedzi domenowe
                  </p>
                  <ul className="space-y-2">
                    {result.draft.reasonHints.map((hint) => (
                      <li key={hint} className="text-sm text-gray-700">
                        {hint}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">
                    Wskazowki techniczne
                  </p>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="Zrodlo danych"
                      value={
                        result.draft.technicalHints.dataSource ===
                        'CURRENT_CASE_AND_PROCESS_SNAPSHOT'
                          ? 'Aktualna sprawa i aktualny snapshot procesu'
                          : result.draft.technicalHints.dataSource
                      }
                    />
                    <Field
                      label="Zrodlo daty potwierdzenia"
                      value={
                        result.draft.technicalHints.portDateSource === 'DONOR_ASSIGNED_PORT_DATE'
                          ? 'Data wyznaczona przez Dawce'
                          : result.draft.technicalHints.portDateSource
                      }
                    />
                    <Field
                      label="Zrodlo wyboru numeracji"
                      value={
                        result.draft.technicalHints.numberSelectionSource === 'NUMBER_RANGE'
                          ? 'Zakres numerow'
                          : 'Numer podstawowy'
                      }
                    />
                    <Field
                      label="Dozwolone komunikaty na etapie"
                      value={result.draft.technicalHints.allowedMessagesAtStage.join(', ')}
                      mono
                    />
                  </dl>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
