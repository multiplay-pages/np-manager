import { useState } from 'react'
import {
  CONTACT_CHANNEL_LABELS,
  type ContactChannel,
  type UpdatePortingRequestDetailsDto,
} from '@np-manager/shared'

export interface RequestOperationalDetailsPanelProps {
  correspondenceAddress: string
  contactChannel: ContactChannel
  internalNotes: string | null
  requestDocumentNumber: string | null
  canEdit: boolean
  disabledReason?: string | null
  onSave: (payload: UpdatePortingRequestDetailsDto) => Promise<void>
}

const CONTACT_CHANNEL_OPTIONS: ContactChannel[] = ['EMAIL', 'SMS', 'LETTER']

const MAX_LENGTHS = {
  correspondenceAddress: 1000,
  internalNotes: 5000,
  requestDocumentNumber: 100,
} as const

function diffPayload(
  initial: {
    correspondenceAddress: string
    contactChannel: ContactChannel
    internalNotes: string | null
    requestDocumentNumber: string | null
  },
  next: {
    correspondenceAddress: string
    contactChannel: ContactChannel
    internalNotes: string
    requestDocumentNumber: string
  },
): UpdatePortingRequestDetailsDto {
  const payload: UpdatePortingRequestDetailsDto = {}

  if (next.correspondenceAddress.trim() !== initial.correspondenceAddress) {
    payload.correspondenceAddress = next.correspondenceAddress.trim()
  }

  if (next.contactChannel !== initial.contactChannel) {
    payload.contactChannel = next.contactChannel
  }

  const nextNotes = next.internalNotes.trim() === '' ? null : next.internalNotes.trim()
  if (nextNotes !== initial.internalNotes) {
    payload.internalNotes = nextNotes
  }

  const nextDoc =
    next.requestDocumentNumber.trim() === '' ? null : next.requestDocumentNumber.trim()
  if (nextDoc !== initial.requestDocumentNumber) {
    payload.requestDocumentNumber = nextDoc
  }

  return payload
}

export function RequestOperationalDetailsPanel({
  correspondenceAddress,
  contactChannel,
  internalNotes,
  requestDocumentNumber,
  canEdit,
  disabledReason,
  onSave,
}: RequestOperationalDetailsPanelProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [formCorrespondenceAddress, setFormCorrespondenceAddress] = useState(correspondenceAddress)
  const [formContactChannel, setFormContactChannel] = useState<ContactChannel>(contactChannel)
  const [formInternalNotes, setFormInternalNotes] = useState(internalNotes ?? '')
  const [formRequestDocumentNumber, setFormRequestDocumentNumber] = useState(
    requestDocumentNumber ?? '',
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function enterEditMode() {
    setFormCorrespondenceAddress(correspondenceAddress)
    setFormContactChannel(contactChannel)
    setFormInternalNotes(internalNotes ?? '')
    setFormRequestDocumentNumber(requestDocumentNumber ?? '')
    setError(null)
    setSuccess(null)
    setMode('edit')
  }

  function cancelEdit() {
    setMode('view')
    setError(null)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const payload = diffPayload(
      { correspondenceAddress, contactChannel, internalNotes, requestDocumentNumber },
      {
        correspondenceAddress: formCorrespondenceAddress,
        contactChannel: formContactChannel,
        internalNotes: formInternalNotes,
        requestDocumentNumber: formRequestDocumentNumber,
      },
    )

    if (Object.keys(payload).length === 0) {
      setError('Nie wprowadzono zmian.')
      return
    }

    if (
      payload.correspondenceAddress !== undefined &&
      payload.correspondenceAddress.trim() === ''
    ) {
      setError('Adres korespondencyjny nie moze byc pusty.')
      return
    }

    setError(null)
    setSuccess(null)
    setIsSaving(true)

    try {
      await onSave(payload)
      setSuccess('Dane sprawy zostaly zaktualizowane.')
      setMode('view')
    } catch (saveError) {
      const message =
        saveError instanceof Error && saveError.message
          ? saveError.message
          : 'Nie udalo sie zapisac zmian.'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div data-testid="request-operational-details-panel" className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-ink-500">
          Waska edycja operacyjna. Zmieniasz dane kontaktowe i notatki bez przebudowy sprawy.
        </p>
        {mode === 'view' && (
          <button
            type="button"
            onClick={enterEditMode}
            disabled={!canEdit}
            title={!canEdit ? disabledReason ?? undefined : undefined}
            className="btn-secondary"
          >
            Edytuj
          </button>
        )}
      </div>

      {mode === 'view' && !canEdit && disabledReason && (
        <div className="rounded-panel border border-line bg-ink-50 px-3 py-2 text-xs text-ink-500">
          {disabledReason}
        </div>
      )}

      {mode === 'view' && success && (
        <div
          role="status"
          className="rounded-panel border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      {mode === 'view' ? (
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
              Kanal kontaktu
            </dt>
            <dd className="text-sm font-medium text-ink-800">
              {CONTACT_CHANNEL_LABELS[contactChannel]}
            </dd>
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
              Notatki wewnetrzne
            </dt>
            <dd className="whitespace-pre-wrap break-words text-sm font-medium text-ink-800">
              {internalNotes ?? <span className="font-normal text-ink-400">-</span>}
            </dd>
          </div>
        </dl>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">
                Numer dokumentu
              </span>
              <input
                type="text"
                value={formRequestDocumentNumber}
                onChange={(event) => setFormRequestDocumentNumber(event.target.value)}
                maxLength={MAX_LENGTHS.requestDocumentNumber}
                className="input-field"
                placeholder="np. DOC-2026-001"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">
                Kanal kontaktu
              </span>
              <select
                value={formContactChannel}
                onChange={(event) => setFormContactChannel(event.target.value as ContactChannel)}
                className="input-field"
              >
                {CONTACT_CHANNEL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {CONTACT_CHANNEL_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">
                Adres korespondencyjny
              </span>
              <textarea
                value={formCorrespondenceAddress}
                onChange={(event) => setFormCorrespondenceAddress(event.target.value)}
                maxLength={MAX_LENGTHS.correspondenceAddress}
                rows={3}
                className="input-field"
                placeholder="Ulica, kod, miejscowosc"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">
                Notatki wewnetrzne
              </span>
              <textarea
                value={formInternalNotes}
                onChange={(event) => setFormInternalNotes(event.target.value)}
                maxLength={MAX_LENGTHS.internalNotes}
                rows={4}
                className="input-field"
                placeholder="Opcjonalne notatki operacyjne"
              />
            </label>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-panel border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Zapis...' : 'Zapisz zmiany'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="btn-secondary"
              disabled={isSaving}
            >
              Anuluj
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
