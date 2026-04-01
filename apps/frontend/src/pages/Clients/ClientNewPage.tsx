import { useState, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { ROUTES, buildPath } from '@/constants/routes'
import { createClient, type CreateClientPayload } from '@/services/clients.api'

type ClientType = 'INDIVIDUAL' | 'BUSINESS'

interface FormFields {
  // INDIVIDUAL
  firstName: string
  lastName: string
  pesel: string
  // BUSINESS
  companyName: string
  nip: string
  krs: string
  // Wspólne
  email: string
  phoneContact: string
  addressStreet: string
  addressCity: string
  addressZip: string
  // Pełnomocnik (opcjonalne)
  proxyName: string
  proxyPesel: string
}

type FieldErrors = Partial<Record<keyof FormFields | '_root', string>>

const EMPTY_FORM: FormFields = {
  firstName: '', lastName: '', pesel: '',
  companyName: '', nip: '', krs: '',
  email: '', phoneContact: '',
  addressStreet: '', addressCity: '', addressZip: '',
  proxyName: '', proxyPesel: '',
}

export function ClientNewPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [clientType, setClientType] = useState<ClientType>('INDIVIDUAL')
  const [fields, setFields] = useState<FormFields>(EMPTY_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const returnTo = searchParams.get('returnTo')
  const isRequestCreationFlow = returnTo === ROUTES.REQUEST_NEW
  const cancelTarget = isRequestCreationFlow ? ROUTES.REQUEST_NEW : ROUTES.CLIENTS

  const setField = (key: keyof FormFields) => (e: ChangeEvent<HTMLInputElement>) => {
    setFields((prev) => ({ ...prev, [key]: e.target.value }))
    setErrors((prev) => ({ ...prev, [key]: undefined, _root: undefined }))
  }

  const handleTypeChange = (t: ClientType) => {
    setClientType(t)
    setErrors({})
  }

  // ============================================================
  // WALIDACJA FRONTENDOWA (format — pełna logika na backendzie)
  // ============================================================

  function validate(): FieldErrors {
    const errs: FieldErrors = {}

    if (clientType === 'INDIVIDUAL') {
      if (!fields.firstName.trim()) errs.firstName = 'Imię jest wymagane'
      if (!fields.lastName.trim()) errs.lastName = 'Nazwisko jest wymagane'
      if (!fields.pesel.trim()) {
        errs.pesel = 'PESEL jest wymagany'
      } else if (!/^\d{11}$/.test(fields.pesel.trim())) {
        errs.pesel = 'PESEL musi zawierać dokładnie 11 cyfr'
      }
    } else {
      if (!fields.companyName.trim()) errs.companyName = 'Nazwa firmy jest wymagana'
      if (!fields.nip.trim()) {
        errs.nip = 'NIP jest wymagany'
      } else if (!/^\d{10}$/.test(fields.nip.replace(/[-\s]/g, ''))) {
        errs.nip = 'NIP musi zawierać 10 cyfr'
      }
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
      errs.addressZip = 'Format: XX-XXX (np. 00-001)'
    }

    return errs
  }

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isLoading) return

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsLoading(true)
    setErrors({})

    const common = {
      email: fields.email.trim(),
      phoneContact: fields.phoneContact.trim(),
      addressStreet: fields.addressStreet.trim(),
      addressCity: fields.addressCity.trim(),
      addressZip: fields.addressZip,
      proxyName: fields.proxyName.trim() || undefined,
      proxyPesel: fields.proxyPesel.trim() || undefined,
    }

    const payload: CreateClientPayload =
      clientType === 'INDIVIDUAL'
        ? {
            clientType: 'INDIVIDUAL' as const,
            firstName: fields.firstName.trim(),
            lastName: fields.lastName.trim(),
            pesel: fields.pesel.trim(),
            ...common,
          }
        : {
            clientType: 'BUSINESS' as const,
            companyName: fields.companyName.trim(),
            nip: fields.nip.replace(/[-\s]/g, ''),
            krs: fields.krs.trim() || undefined,
            ...common,
          }

    try {
      const client = await createClient(payload)
      if (isRequestCreationFlow) {
        const nextParams = new URLSearchParams({
          clientId: client.id,
          requestCreatedClient: '1',
        })
        void navigate(`${ROUTES.REQUEST_NEW}?${nextParams.toString()}`)
      } else {
        void navigate(buildPath(ROUTES.CLIENT_DETAIL, client.id))
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          const code = (err.response.data as { error?: { code?: string } })?.error?.code
          if (code === 'PESEL_ALREADY_EXISTS') {
            setErrors({ pesel: 'Klient z tym PESEL już istnieje w systemie.' })
          } else if (code === 'NIP_ALREADY_EXISTS') {
            setErrors({ nip: 'Klient z tym NIP już istnieje w systemie.' })
          } else {
            setErrors({ _root: 'Klient z podanymi danymi już istnieje.' })
          }
        } else if (err.response?.status === 400) {
          const details = (err.response.data as { error?: { details?: Record<string, string[]> } })
            ?.error?.details
          if (details) {
            const fieldErrors: FieldErrors = {}
            for (const [field, messages] of Object.entries(details)) {
              if (messages?.[0]) {
                fieldErrors[field as keyof FormFields] = messages[0]
              }
            }
            setErrors(fieldErrors)
          } else {
            setErrors({ _root: 'Nieprawidłowe dane. Sprawdź formularz.' })
          }
        } else {
          setErrors({ _root: 'Wystąpił błąd serwera. Spróbuj ponownie.' })
        }
      } else {
        setErrors({ _root: 'Brak połączenia z serwerem.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      {/* Nagłówek */}
      <div className="mb-6">
        <button
          onClick={() => void navigate(cancelTarget)}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
        >
          ← Kartoteka klientów
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Nowy klient</h1>
        {isRequestCreationFlow && (
          <p className="mt-2 text-sm text-gray-500">
            Po zapisaniu klient zostanie automatycznie podpiety do nowej sprawy portowania.
          </p>
        )}
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-5">
        {/* Wybór typu */}
        <div className="card p-5">
          <p className="label mb-3">Typ klienta</p>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden w-fit">
            {(['INDIVIDUAL', 'BUSINESS'] as ClientType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`px-6 py-2 text-sm font-medium transition-colors ${
                  clientType === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t === 'INDIVIDUAL' ? 'Osoba fizyczna' : 'Firma / podmiot prawny'}
              </button>
            ))}
          </div>
        </div>

        {/* Dane podstawowe */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {clientType === 'INDIVIDUAL' ? 'Dane osobowe' : 'Dane firmy'}
          </h2>

          {clientType === 'INDIVIDUAL' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Imię" error={errors.firstName}>
                  <input className={`input-field ${errors.firstName ? 'input-error' : ''}`}
                    value={fields.firstName} onChange={setField('firstName')}
                    disabled={isLoading} placeholder="Jan" />
                </FormField>
                <FormField label="Nazwisko" error={errors.lastName}>
                  <input className={`input-field ${errors.lastName ? 'input-error' : ''}`}
                    value={fields.lastName} onChange={setField('lastName')}
                    disabled={isLoading} placeholder="Kowalski" />
                </FormField>
              </div>
              <FormField label="PESEL" error={errors.pesel}>
                <input className={`input-field font-mono ${errors.pesel ? 'input-error' : ''}`}
                  value={fields.pesel} onChange={setField('pesel')}
                  disabled={isLoading} placeholder="90010112345" maxLength={11} />
              </FormField>
            </>
          ) : (
            <>
              <FormField label="Nazwa firmy" error={errors.companyName}>
                <input className={`input-field ${errors.companyName ? 'input-error' : ''}`}
                  value={fields.companyName} onChange={setField('companyName')}
                  disabled={isLoading} placeholder="Przykład Sp. z o.o." />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="NIP" error={errors.nip}>
                  <input className={`input-field font-mono ${errors.nip ? 'input-error' : ''}`}
                    value={fields.nip} onChange={setField('nip')}
                    disabled={isLoading} placeholder="1234567890" maxLength={10} />
                </FormField>
                <FormField label="KRS (opcjonalnie)" error={errors.krs}>
                  <input className={`input-field font-mono ${errors.krs ? 'input-error' : ''}`}
                    value={fields.krs} onChange={setField('krs')}
                    disabled={isLoading} placeholder="0000000000" maxLength={10} />
                </FormField>
              </div>
            </>
          )}
        </div>

        {/* Kontakt */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Kontakt</h2>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Adres e-mail" error={errors.email}>
              <input type="email" className={`input-field ${errors.email ? 'input-error' : ''}`}
                value={fields.email} onChange={setField('email')}
                disabled={isLoading} placeholder="jan@przyklad.pl" />
            </FormField>
            <FormField label="Telefon kontaktowy" error={errors.phoneContact}>
              <input type="tel" className={`input-field font-mono ${errors.phoneContact ? 'input-error' : ''}`}
                value={fields.phoneContact} onChange={setField('phoneContact')}
                disabled={isLoading} placeholder="123456789" />
            </FormField>
          </div>
        </div>

        {/* Adres */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Adres</h2>
          <FormField label="Ulica i numer" error={errors.addressStreet}>
            <input className={`input-field ${errors.addressStreet ? 'input-error' : ''}`}
              value={fields.addressStreet} onChange={setField('addressStreet')}
              disabled={isLoading} placeholder="ul. Przykładowa 1/2" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Miejscowość" error={errors.addressCity}>
              <input className={`input-field ${errors.addressCity ? 'input-error' : ''}`}
                value={fields.addressCity} onChange={setField('addressCity')}
                disabled={isLoading} placeholder="Warszawa" />
            </FormField>
            <FormField label="Kod pocztowy" error={errors.addressZip}>
              <input className={`input-field font-mono ${errors.addressZip ? 'input-error' : ''}`}
                value={fields.addressZip} onChange={setField('addressZip')}
                disabled={isLoading} placeholder="00-001" maxLength={6} />
            </FormField>
          </div>
        </div>

        {/* Pełnomocnik */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Pełnomocnik <span className="font-normal text-gray-400 normal-case">(opcjonalnie)</span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Imię i nazwisko pełnomocnika" error={errors.proxyName}>
              <input className={`input-field ${errors.proxyName ? 'input-error' : ''}`}
                value={fields.proxyName} onChange={setField('proxyName')}
                disabled={isLoading} placeholder="Anna Nowak" />
            </FormField>
            <FormField label="PESEL pełnomocnika" error={errors.proxyPesel}>
              <input className={`input-field font-mono ${errors.proxyPesel ? 'input-error' : ''}`}
                value={fields.proxyPesel} onChange={setField('proxyPesel')}
                disabled={isLoading} placeholder="85060512345" maxLength={11} />
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
            onClick={() => void navigate(cancelTarget)}
            className="btn-secondary"
            disabled={isLoading}
          >
            Anuluj
          </button>
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Zapisywanie...
              </>
            ) : (
              'Dodaj klienta'
            )}
          </button>
        </div>
      </form>
    </div>
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
