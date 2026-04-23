import { useState } from 'react'
import type { UpdatePortingRequestPortDateDto } from '@np-manager/shared'

export interface RequestPortDatePanelProps {
  confirmedPortDate: string | null
  canEdit: boolean
  disabledReason?: string | null
  onSave: (payload: UpdatePortingRequestPortDateDto) => Promise<void>
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

export function RequestPortDatePanel({
  confirmedPortDate,
  canEdit,
  disabledReason,
  onSave,
}: RequestPortDatePanelProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [formDate, setFormDate] = useState(confirmedPortDate ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function enterEditMode() {
    setFormDate(confirmedPortDate ?? '')
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

    const newDate = formDate.trim() === '' ? null : formDate.trim()

    if (newDate === confirmedPortDate) {
      setError('Nie wprowadzono zmian.')
      return
    }

    setError(null)
    setSuccess(null)
    setIsSaving(true)

    try {
      await onSave({ confirmedPortDate: newDate })
      setSuccess('Data przeniesienia zostala zapisana.')
      setMode('view')
    } catch (saveError) {
      const message =
        saveError instanceof Error && saveError.message
          ? saveError.message
          : 'Nie udalo sie zapisac daty.'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div data-testid="request-port-date-panel" className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-ink-500">
          Wpisz date, ktora operator uzyskal z Adescom lub od dawcy numeru.
        </p>
        {mode === 'view' && (
          <button
            type="button"
            onClick={enterEditMode}
            disabled={!canEdit}
            title={!canEdit ? (disabledReason ?? undefined) : undefined}
            className="btn-secondary"
          >
            {confirmedPortDate ? 'Zmien' : 'Ustaw date'}
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
        <div>
          <dt className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-400">
            Wyznaczona data przeniesienia numeru
          </dt>
          <dd className="text-sm font-mono font-medium text-ink-800">
            {confirmedPortDate ?? (
              <span className="font-sans font-normal text-ink-400">Nie uzupelniono</span>
            )}
          </dd>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">
              Wyznaczona data przeniesienia numeru
            </span>
            <input
              type="date"
              value={formDate}
              onChange={(event) => setFormDate(event.target.value)}
              min={todayString()}
              className="input-field w-full sm:w-auto"
            />
            <p className="mt-1 text-xs text-ink-400">
              Pozostaw puste, aby usunac date (sprawa bez daty portowania).
            </p>
          </label>

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
              {isSaving ? 'Zapis...' : 'Zapisz date'}
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
