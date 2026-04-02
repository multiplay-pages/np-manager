import type { FnpMessageReadiness, PliCbdProcessSnapshotDto } from '@np-manager/shared'

interface PliCbdProcessSnapshotProps {
  snapshot: PliCbdProcessSnapshotDto | null
  isLoading: boolean
}

function MessageReadinessCard({ msg }: { msg: FnpMessageReadiness }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900">{msg.label}</span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            msg.ready
              ? 'bg-green-100 text-green-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {msg.ready ? 'Gotowe' : 'Zablokowane'}
        </span>
      </div>
      <p className="text-xs text-gray-500">{msg.description}</p>

      {msg.blockingReasons.length > 0 && (
        <ul className="space-y-1 mt-1">
          {msg.blockingReasons.map((reason) => (
            <li
              key={reason.code}
              className="flex items-start gap-1.5 text-xs text-red-700"
            >
              <span className="mt-0.5 shrink-0">&#x26A0;</span>
              <span>{reason.message}</span>
            </li>
          ))}
        </ul>
      )}

      {Object.keys(msg.summaryFields).length > 0 && (
        <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(msg.summaryFields).map(([key, value]) => (
            <div key={key}>
              <dt className="text-xs text-gray-400">{key}</dt>
              <dd className="text-xs font-mono text-gray-700">{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

export function PliCbdProcessSnapshot({ snapshot, isLoading }: PliCbdProcessSnapshotProps) {
  return (
    <div className="card p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
          Proces FNP / PLI CBD
        </h2>
        <p className="text-sm text-gray-500">
          Aktualny etap procesu przeniesienia numeru w systemie PLI CBD.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          Ladowanie stanu procesu...
        </div>
      ) : !snapshot ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          Nie udalo sie zaladowac stanu procesu PLI CBD.
        </div>
      ) : (
        <>
          {/* Aktualny etap */}
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${snapshot.currentStage === 'NOT_IN_PROCESS' ? 'bg-gray-100 text-gray-600' : snapshot.currentStage === 'COMPLETED' ? 'bg-green-100 text-green-700' : snapshot.currentStage === 'REJECTED' || snapshot.currentStage === 'PROCESS_ERROR' ? 'bg-red-100 text-red-700' : snapshot.currentStage === 'CANCELLED' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}
            >
              {snapshot.currentStageLabel}
            </span>
            <span className="text-xs text-gray-500">{snapshot.portingModeLabel}</span>
          </div>

          {/* Blokady globalne */}
          {snapshot.blockingReasons.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
              {snapshot.blockingReasons.map((reason) => (
                <p key={reason.code} className="text-sm text-amber-800">
                  {reason.message}
                </p>
              ))}
            </div>
          )}

          {/* Walidacja daty */}
          {snapshot.dateValidation.portDate && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-1">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Walidacja daty przeniesienia
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                <div>
                  <p className="text-xs text-gray-400">Data portowania</p>
                  <p className="text-sm font-mono text-gray-800">{snapshot.dateValidation.portDate}</p>
                </div>
                {snapshot.dateValidation.minPortDate && (
                  <div>
                    <p className="text-xs text-gray-400">
                      Min. data{snapshot.dateValidation.wholesaleLeadTimeApplied ? ' (hurtowa)' : ''}
                    </p>
                    <p className="text-sm font-mono text-gray-800">
                      {snapshot.dateValidation.minPortDate}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400">Dzien roboczy</p>
                  <p className="text-sm text-gray-800">
                    {snapshot.dateValidation.isWorkingDay === null
                      ? '—'
                      : snapshot.dateValidation.isWorkingDay
                        ? 'Tak'
                        : 'Nie (weekend / swiateczny)'}
                  </p>
                </div>
              </div>
              {snapshot.dateValidation.blockingReasons.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {snapshot.dateValidation.blockingReasons.map((reason) => (
                    <li key={reason.code} className="text-xs text-red-700">
                      {reason.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Dozwolone komunikaty */}
          {snapshot.draftableMessages.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Komunikaty Exx dostepne na tym etapie
              </p>
              {snapshot.draftableMessages.map((msg) => (
                <MessageReadinessCard key={msg.messageType} msg={msg} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500">
              Brak mozliwych akcji na tym etapie procesu.
            </div>
          )}
        </>
      )}
    </div>
  )
}
