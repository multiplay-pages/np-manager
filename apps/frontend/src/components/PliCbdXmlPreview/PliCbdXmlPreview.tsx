import type { PliCbdAnyXmlPreviewBuildResultDto } from '@np-manager/shared'

interface PliCbdXmlPreviewProps {
  messageType: 'E03' | 'E12' | 'E18' | 'E23'
  result: PliCbdAnyXmlPreviewBuildResultDto | null
  isLoading: boolean
}

export function PliCbdXmlPreview({ messageType, result, isLoading }: PliCbdXmlPreviewProps) {
  return (
    <div className="card p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
          XML preview {messageType}
        </h2>
        <p className="text-sm text-gray-500">
          Internal read-only serializer preview nad technical payload, bez SOAP i bez transportu.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          Ladowanie XML preview {messageType}...
        </div>
      ) : !result ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          Nie udalo sie zaladowac XML preview {messageType}.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                result.isReady ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {result.isReady
                ? `XML ${messageType} gotowy do podgladu`
                : `XML ${messageType} zablokowany`}
            </span>
            <span className="text-xs text-gray-500">Sprawa: {result.caseNumber}</span>
          </div>

          {result.blockingReasons.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
                Blokady draftu zrodlowego
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

          {result.technicalWarnings.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-800">
                Warningi techniczne
              </p>
              <ul className="space-y-1">
                {result.technicalWarnings.map((warning) => (
                  <li
                    key={`${warning.code}-${warning.field ?? 'general'}`}
                    className="text-sm text-blue-900"
                  >
                    {warning.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!result.xml ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-600">
              XML preview {messageType} nie zostal zbudowany dla tej sprawy.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-xs text-gray-500 mb-0.5">Typ komunikatu</dt>
                    <dd className="text-sm text-gray-900 font-mono">{result.messageType}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500 mb-0.5">Tryb preview</dt>
                    <dd className="text-sm text-gray-900 font-mono">
                      INTERNAL_XML_SERIALIZATION_PREVIEW
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg border border-gray-200 bg-slate-950 text-slate-100 p-4 overflow-x-auto">
                <pre className="text-xs leading-6 whitespace-pre-wrap">{result.xml}</pre>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
