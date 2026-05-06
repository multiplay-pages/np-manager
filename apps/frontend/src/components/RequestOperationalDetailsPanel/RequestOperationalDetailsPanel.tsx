import { CONTACT_CHANNEL_LABELS, type ContactChannel } from '@np-manager/shared'

export interface RequestOperationalDetailsPanelProps {
  correspondenceAddress: string
  contactChannel: ContactChannel
  internalNotes: string | null
  requestDocumentNumber: string | null
}

export function RequestOperationalDetailsPanel({
  correspondenceAddress,
  contactChannel,
  internalNotes,
  requestDocumentNumber,
}: RequestOperationalDetailsPanelProps) {
  return (
    <div data-testid="request-operational-details-panel" className="space-y-4">
      <p className="text-sm text-ink-500">
        Dane operacyjne są tylko do podglądu. Jeśli dane sprawy zostały wprowadzone błędnie,
        anuluj sprawę z powodem i załóż nową poprawną sprawę.
      </p>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-400">
            Numer dokumentu
          </dt>
          <dd className="text-sm font-mono font-medium text-ink-800">
            {requestDocumentNumber ?? <span className="font-sans font-normal text-ink-400">-</span>}
          </dd>
        </div>

        <div>
          <dt className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-400">
            Kanał kontaktu
          </dt>
          <dd className="text-sm font-medium text-ink-800">{CONTACT_CHANNEL_LABELS[contactChannel]}</dd>
        </div>

        <div className="sm:col-span-2">
          <dt className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-400">
            Adres korespondencyjny
          </dt>
          <dd className="whitespace-pre-wrap break-words text-sm font-medium text-ink-800">
            {correspondenceAddress}
          </dd>
        </div>

        <div className="sm:col-span-2">
          <dt className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-400">
            Notatki wewnętrzne
          </dt>
          <dd className="whitespace-pre-wrap break-words text-sm font-medium text-ink-800">
            {internalNotes ?? <span className="font-normal text-ink-400">-</span>}
          </dd>
        </div>
      </dl>
    </div>
  )
}
