import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth.store'
import { useOperators } from '@/hooks/useOperators'
import { createOperator } from '@/services/operators.api'
import type { OperatorDto } from '@np-manager/shared'

// ============================================================
// TYPES
// ============================================================

interface AddFormFields {
  name: string
  shortName: string
  routingNumber: string
  isRecipientDefault: boolean
  isActive: boolean
}

type FormErrors = Partial<Record<keyof AddFormFields | '_root', string>>

const EMPTY_FORM: AddFormFields = {
  name: '',
  shortName: '',
  routingNumber: '',
  isRecipientDefault: false,
  isActive: true,
}

// ============================================================
// PAGE
// ============================================================

export function OperatorsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  const { operators, isLoading, error: loadError, reload } = useOperators()

  // formularz
  const [showForm, setShowForm] = useState(false)
  const [fields, setFields] = useState<AddFormFields>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // dirty — ostrzeżenie przed zamknięciem z niezapisanymi zmianami
  const [isDirty, setIsDirty] = useState(false)

  // Czyść success po 4 s
  useEffect(() => {
    if (!successMessage) return
    const t = setTimeout(() => setSuccessMessage(null), 4000)
    return () => clearTimeout(t)
  }, [successMessage])

  // ── helpers ──────────────────────────────────────────────

  const setTextField =
    (key: keyof AddFormFields) => (e: ChangeEvent<HTMLInputElement>) => {
      const value = key === 'routingNumber' ? e.target.value.toUpperCase() : e.target.value
      setFields((prev) => ({ ...prev, [key]: value }))
      setErrors((prev) => ({ ...prev, [key]: undefined, _root: undefined }))
      setIsDirty(true)
    }

  const setCheckbox =
    (key: keyof AddFormFields) => (e: ChangeEvent<HTMLInputElement>) => {
      setFields((prev) => ({ ...prev, [key]: e.target.checked }))
      setIsDirty(true)
    }

  const handleOpenForm = () => {
    setShowForm(true)
    setErrors({})
    setSuccessMessage(null)
  }

  const handleCloseForm = () => {
    if (isDirty) {
      if (!window.confirm('Formularz zawiera niezapisane zmiany. Czy na pewno chcesz anulować?')) {
        return
      }
    }
    setShowForm(false)
    setFields(EMPTY_FORM)
    setErrors({})
    setIsDirty(false)
  }

  // ── walidacja ─────────────────────────────────────────────

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (!fields.name.trim()) errs.name = 'Nazwa operatora jest wymagana'
    if (!fields.shortName.trim()) errs.shortName = 'Skrócona nazwa jest wymagana'
    if (!fields.routingNumber.trim()) {
      errs.routingNumber = 'Numer rozliczeniowy jest wymagany'
    } else if (!/^[A-Z0-9]{1,20}$/.test(fields.routingNumber)) {
      errs.routingNumber = 'Tylko wielkie litery i cyfry, maks. 20 znaków'
    }
    return errs
  }

  // ── submit ────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isSaving) return

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSaving(true)
    setErrors({})

    try {
      const created = await createOperator({
        name: fields.name.trim(),
        shortName: fields.shortName.trim(),
        routingNumber: fields.routingNumber,
        isRecipientDefault: fields.isRecipientDefault,
        isActive: fields.isActive,
      })

      setSuccessMessage(`Operator „${created.name}" został dodany.`)
      setShowForm(false)
      setFields(EMPTY_FORM)
      setIsDirty(false)
      reload()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        const code = (err.response?.data as { error?: { code?: string; message?: string } })?.error

        if (status === 409 && code?.code === 'ROUTING_NUMBER_ALREADY_EXISTS') {
          setErrors({ routingNumber: 'Operator z tym numerem rozliczeniowym już istnieje.' })
        } else if (status === 403) {
          setErrors({ _root: 'Brak uprawnień. Dodawanie operatorów wymaga roli ADMIN.' })
        } else if (status === 400) {
          setErrors({ _root: code?.message ?? 'Nieprawidłowe dane. Sprawdź formularz.' })
        } else {
          setErrors({ _root: 'Wystąpił błąd serwera. Spróbuj ponownie.' })
        }
      } else {
        setErrors({ _root: 'Brak połączenia z serwerem.' })
      }
    } finally {
      setIsSaving(false)
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      {/* Nagłówek */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Słownik operatorów</h1>
          {!isLoading && !loadError && (
            <p className="text-sm text-gray-500 mt-0.5">
              {operators.length} {operators.length === 1 ? 'operator' : 'operatorów'}
            </p>
          )}
        </div>

        {/* Przycisk Dodaj — tylko ADMIN */}
        {isAdmin && !showForm && (
          <button onClick={handleOpenForm} className="btn-primary">
            + Dodaj operatora
          </button>
        )}
      </div>

      {/* Komunikat sukcesu */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-green-600 text-sm">✓</span>
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Formularz dodawania (tylko ADMIN) */}
      {isAdmin && showForm && (
        <div className="card p-5 border-blue-200 bg-blue-50/30">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Nowy operator
          </h2>

          <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Nazwa */}
              <FormField label="Nazwa operatora *" error={errors.name}>
                <input
                  className={`input-field ${errors.name ? 'input-error' : ''}`}
                  value={fields.name}
                  onChange={setTextField('name')}
                  disabled={isSaving}
                  placeholder="Orange Polska S.A."
                  maxLength={200}
                />
              </FormField>

              {/* Skrót */}
              <FormField label="Skrócona nazwa *" error={errors.shortName}>
                <input
                  className={`input-field ${errors.shortName ? 'input-error' : ''}`}
                  value={fields.shortName}
                  onChange={setTextField('shortName')}
                  disabled={isSaving}
                  placeholder="Orange"
                  maxLength={100}
                />
              </FormField>

              {/* Routing number */}
              <FormField label="Numer rozliczeniowy *" error={errors.routingNumber}>
                <input
                  className={`input-field font-mono ${errors.routingNumber ? 'input-error' : ''}`}
                  value={fields.routingNumber}
                  onChange={setTextField('routingNumber')}
                  disabled={isSaving}
                  placeholder="ORANGE"
                  maxLength={20}
                />
              </FormField>
            </div>

            <div className="flex gap-6">
              {/* isRecipientDefault */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  checked={fields.isRecipientDefault}
                  onChange={setCheckbox('isRecipientDefault')}
                  disabled={isSaving}
                />
                <span className="text-sm text-gray-700">Domyślny operator biorący</span>
              </label>

              {/* isActive */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  checked={fields.isActive}
                  onChange={setCheckbox('isActive')}
                  disabled={isSaving}
                />
                <span className="text-sm text-gray-700">Aktywny</span>
              </label>
            </div>

            {/* Błąd globalny */}
            {errors._root && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-red-500 text-sm mt-0.5">⚠</span>
                <p className="text-sm text-red-700">{errors._root}</p>
              </div>
            )}

            {/* Przyciski */}
            <div className="flex gap-3 justify-end pt-1">
              <button
                type="button"
                onClick={handleCloseForm}
                className="btn-secondary"
                disabled={isSaving}
              >
                Anuluj
              </button>
              <button type="submit" className="btn-primary" disabled={isSaving}>
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Zapisywanie...
                  </span>
                ) : (
                  'Dodaj operatora'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabela */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            Ładowanie...
          </div>
        ) : loadError ? (
          <div className="flex items-center justify-center py-16 text-red-500 text-sm">
            {loadError}
          </div>
        ) : operators.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <span className="text-4xl mb-3">📡</span>
            <p className="text-sm font-medium">Brak operatorów</p>
            {isAdmin && (
              <p className="text-xs mt-1">Dodaj pierwszego operatora przyciskiem powyżej</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-[35%]">
                    Nazwa
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-[20%]">
                    Skrót
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-[20%]">
                    Routing
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 w-[12%]">
                    Dom. biorący
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 w-[13%]">
                    Aktywny
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {operators.map((op) => (
                  <OperatorRow key={op.id} operator={op} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// ROW
// ============================================================

function OperatorRow({ operator: op }: { operator: OperatorDto }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* Nazwa — truncate z title jako tooltip na długich nazwach */}
      <td className="px-4 py-3 max-w-0">
        <div
          className="truncate font-medium text-gray-900"
          title={op.name}
        >
          {op.name}
        </div>
      </td>

      {/* Skrót — truncate z title */}
      <td className="px-4 py-3 max-w-0">
        <div className="truncate text-gray-600" title={op.shortName}>
          {op.shortName}
        </div>
      </td>

      {/* Routing number */}
      <td className="px-4 py-3 font-mono text-xs text-gray-600">
        {op.routingNumber}
      </td>

      {/* Dom. biorący */}
      <td className="px-4 py-3 text-center">
        {op.isRecipientDefault ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
            Tak
          </span>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>

      {/* Aktywny */}
      <td className="px-4 py-3 text-center">
        {op.isActive ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
            Aktywny
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
            Nieaktywny
          </span>
        )}
      </td>
    </tr>
  )
}

// ============================================================
// HELPER
// ============================================================

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
