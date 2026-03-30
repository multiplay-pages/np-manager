import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ROUTES, buildPath } from '@/constants/routes'
import { getClientById, updateClient, type UpdateClientPayload } from '@/services/clients.api'
import { CLIENT_TYPE_LABELS } from '@np-manager/shared'
import type { ClientDetailDto } from '@np-manager/shared'

interface EditFields {
  // INDIVIDUAL
  firstName: string
  lastName: string
  // BUSINESS
  companyName: string
  krs: string
  // Wspólne
  email: string
  phoneContact: string
  addressStreet: string
  addressCity: string
  addressZip: string
  // Pełnomocnik
  proxyName: string
  proxyPesel: string
}

type FieldErrors = Partial<Record<keyof EditFields | '_root', string>>

export function ClientEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<ClientDetailDto | null>(null)
  const [fields, setFields] = useState<EditFields>({
    firstName: '', lastName: '',
    companyName: '', krs: '',
    email: '', phoneContact: '',
    addressStreet: '', addressCity: '', addressZip: '',
    proxyName: '', proxyPesel: '',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Załaduj dane klienta
  useEffect(() => {
    if (!id) return
    const load = async () => {
      setIsLoading(true)
      try {
        const data = await getClientById(id)
        setClient(data)
        // Wypełnij formularz załadowanymi danymi
        setFields({
          firstName: data.firstName ?? '',
          lastName: data.lastName ?? '',
          companyName: data.companyName ?? '',
          krs: data.krs ?? '',
          email: data.email,
          phoneContact: data.phoneContact,
          addressStreet: data.addressStreet,
          addressCity: data.addressCity,
          addressZip: data.addressZip,
          proxyName: data.proxyName ?? '',
          proxyPesel: data.proxyPesel ?? '',
        })
      } catch {
        setLoadError('Nie udało się załadować danych klienta.')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [id])

  const setField = (key: keyof EditFields) => (e: ChangeEvent<HTMLInputElement>) => {
    setFields((prev) => ({ ...prev, [key]: e.target.value }))
    setErrors((prev) => ({ ...prev, [key]: undefined, _root: undefined }))
  }

  // ============================================================
  // WALIDACJA
  // ============================================================

  function validate(): FieldErrors {
    const errs: FieldErrors = {}
    if (!client) return errs

    if (client.clientType === 'INDIVIDUAL') {
      if (!fields.firstName.trim()) errs.firstName = 'Imię jest wymagane'
      if (!fields.lastName.trim()) errs.lastName = 'Nazwisko jest wymagane'
    } else {
      if (!fields.companyName.trim()) errs.companyName = 'Nazwa firmy jest wymagana'
      if (fields.krs.trim() && !/^\d{10}$/.test(fields.krs.trim())) {
        errs.krs = 'KRS musi zawierać 10 cyfr'
      }
    }

    if (!fields.email.trim()) {
      errs.email = 'E-mail jest wymagany'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
      errs.email = 'Nieprawidłowy format e-mail'
    }
    if (!fields.phoneContact.trim()) errs.phoneContact = 'Numer telefonu jest wymagany'
    if (!fields.addressStreet.trim()) errs.addressStreet = 'Ulica i numer są wymagane'
    if (!fields.addressCity.trim()) errs.addressCity = 'Miejscowość jest wymagana'
    if (!fields.addressZip.trim()) {
      errs.addressZip = 'Kod pocztowy jest wymagany'
    } else if (!/^\d{2}-\d{3}$/.test(fields.addressZip)) {
      errs.addressZip = 'Format: XX-XXX'
    }

    return errs
  }

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isSaving || !client) return

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSaving(true)
    setErrors({})

    // Buduj payload — null czyści pole, string aktualizuje, pominięte nie zmienia
    const payload: UpdateClientPayload = {
      email: fields.email.trim(),
      phoneContact: fields.phoneContact.trim(),
      addressStreet: fields.addressStreet.trim(),
      addressCity: fields.addressCity.trim(),
      addressZip: fields.addressZip,
      proxyName: fields.proxyName.trim() || null,
      proxyPesel: fields.proxyPesel.trim() || null,
    }

    if (client.clientType === 'INDIVIDUAL') {
      payload.firstName = fields.firstName.trim()
      payload.lastName = fields.lastName.trim()
    } else {
      payload.companyName = fields.companyName.trim()
      payload.krs = fields.krs.trim() || null
    }

    try {
      await updateClient(client.id, payload)
      void navigate(buildPath(ROUTES.CLIENT_DETAIL, client.id))
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 400) {
          const details = (err.response.data as { error?: { details?: Record<string, string[]> } })
            ?.error?.details
          if (details) {
            const fieldErrors: FieldErrors = {}
            for (const [field, messages] of Object.entries(details)) {
              if (messages?.[0]) {
                fieldErrors[field as keyof EditFields] = messages[0]
              }
            }
            setErrors(fieldErrors)
          } else {
            setErrors({ _root: 'Nieprawidłowe dane. Sprawdź formularz.' })
          }
        } else if (err.response?.status === 404) {
          setErrors({ _root: 'Klient nie istnieje lub został usunięty.' })
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
  // RENDER — stany ładowania / błędu
  // ============================================================

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-24 text-gray-400 text-sm">
        Ładowanie...
      </div>
    )
  }

  if (loadError || !client) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center">
          <p className="text-red-500 text-sm mb-4">{loadError ?? 'Klient nie został znaleziony.'}</p>
          <button onClick={() => void navigate(ROUTES.CLIENTS)} className="btn-secondary">
            Wróć do listy
          </button>
        </div>
      </div>
    )
  }

  const detailPath = buildPath(ROUTES.CLIENT_DETAIL, client.id)
  const isIndividual = client.clientType === 'INDIVIDUAL'

  return (
    <div className="p-6 max-w-2xl">
      {/* Nagłówek */}
      <div className="mb-6">
        <button
          onClick={() => void navigate(detailPath)}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
        >
          ← {client.displayName}
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Edytuj klienta</h1>
        <span
          className={`inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isIndividual ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {CLIENT_TYPE_LABELS[client.clientType]}
        </span>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-5">
        {/* Dane podstawowe */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {isIndividual ? 'Dane osobowe' : 'Dane firmy'}
          </h2>

          {/* Identyfikatory — read-only */}
          {isIndividual && client.pesel && (
            <ReadOnlyField label="PESEL (nie można zmienić)" value={client.pesel} />
          )}
          {!isIndividual && client.nip && (
            <ReadOnlyField label="NIP (nie można zmienić)" value={client.nip} />
          )}

          {isIndividual ? (
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Imię" error={errors.firstName}>
                <input className={`input-field ${errors.firstName ? 'input-error' : ''}`}
                  value={fields.firstName} onChange={setField('firstName')} disabled={isSaving} />
              </FormField>
              <FormField label="Nazwisko" error={errors.lastName}>
                <input className={`input-field ${errors.lastName ? 'input-error' : ''}`}
                  value={fields.lastName} onChange={setField('lastName')} disabled={isSaving} />
              </FormField>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Nazwa firmy" error={errors.companyName}>
                <input className={`input-field ${errors.companyName ? 'input-error' : ''}`}
                  value={fields.companyName} onChange={setField('companyName')} disabled={isSaving} />
              </FormField>
              <FormField label="KRS" error={errors.krs}>
                <input className={`input-field font-mono ${errors.krs ? 'input-error' : ''}`}
                  value={fields.krs} onChange={setField('krs')} disabled={isSaving}
                  placeholder="Opcjonalnie" maxLength={10} />
              </FormField>
            </div>
          )}
        </div>

        {/* Kontakt */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Kontakt</h2>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="E-mail" error={errors.email}>
              <input type="email" className={`input-field ${errors.email ? 'input-error' : ''}`}
                value={fields.email} onChange={setField('email')} disabled={isSaving} />
            </FormField>
            <FormField label="Telefon kontaktowy" error={errors.phoneContact}>
              <input type="tel" className={`input-field font-mono ${errors.phoneContact ? 'input-error' : ''}`}
                value={fields.phoneContact} onChange={setField('phoneContact')} disabled={isSaving} />
            </FormField>
          </div>
        </div>

        {/* Adres */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Adres</h2>
          <FormField label="Ulica i numer" error={errors.addressStreet}>
            <input className={`input-field ${errors.addressStreet ? 'input-error' : ''}`}
              value={fields.addressStreet} onChange={setField('addressStreet')} disabled={isSaving} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Miejscowość" error={errors.addressCity}>
              <input className={`input-field ${errors.addressCity ? 'input-error' : ''}`}
                value={fields.addressCity} onChange={setField('addressCity')} disabled={isSaving} />
            </FormField>
            <FormField label="Kod pocztowy" error={errors.addressZip}>
              <input className={`input-field font-mono ${errors.addressZip ? 'input-error' : ''}`}
                value={fields.addressZip} onChange={setField('addressZip')} disabled={isSaving}
                maxLength={6} />
            </FormField>
          </div>
        </div>

        {/* Pełnomocnik */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Pełnomocnik <span className="font-normal text-gray-400 normal-case">(opcjonalnie — wyczyść aby usunąć)</span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Imię i nazwisko" error={errors.proxyName}>
              <input className={`input-field ${errors.proxyName ? 'input-error' : ''}`}
                value={fields.proxyName} onChange={setField('proxyName')} disabled={isSaving} />
            </FormField>
            <FormField label="PESEL pełnomocnika" error={errors.proxyPesel}>
              <input className={`input-field font-mono ${errors.proxyPesel ? 'input-error' : ''}`}
                value={fields.proxyPesel} onChange={setField('proxyPesel')} disabled={isSaving}
                maxLength={11} />
            </FormField>
          </div>
        </div>

        {/* Błąd globalny */}
        {errors._root && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-red-500 text-sm mt-0.5">⚠</span>
            <p className="text-sm text-red-700">{errors._root}</p>
          </div>
        )}

        {/* Przyciski */}
        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={() => void navigate(detailPath)}
            className="btn-secondary"
            disabled={isSaving}
          >
            Anuluj
          </button>
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Zapisywanie...
              </>
            ) : (
              'Zapisz zmiany'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

// ============================================================
// HELPERS
// ============================================================

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="text-sm font-mono text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        {value}
      </p>
    </div>
  )
}

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
