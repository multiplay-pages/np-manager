import { USER_ROLE_LABELS, type UserRole } from '@np-manager/shared'

export interface AdminUserFormState {
  email: string
  firstName: string
  lastName: string
  role: UserRole
  temporaryPassword: string
}

export type AdminUserFormErrors = Partial<Record<keyof AdminUserFormState | '_root', string>>

interface AdminUserFormProps {
  form: AdminUserFormState
  errors: AdminUserFormErrors
  isSaving: boolean
  feedbackSuccess: string | null
  feedbackError: string | null
  onChange: <K extends keyof AdminUserFormState>(field: K, value: AdminUserFormState[K]) => void
  onSubmit: () => void
  onCancel: () => void
}

export function AdminUserForm({
  form,
  errors,
  isSaving,
  feedbackSuccess,
  feedbackError,
  onChange,
  onSubmit,
  onCancel,
}: AdminUserFormProps) {
  return (
    <div className="space-y-6 p-6">
      <header className="max-w-3xl">
        <button type="button" onClick={onCancel} className="mb-4 text-sm font-medium text-blue-700">
          {'<'} Wroc do listy
        </button>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Nowy uzytkownik</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Utworz konto aplikacyjne z haslem tymczasowym. Backend ustawi wymuszenie zmiany hasla
          przy pierwszym logowaniu.
        </p>
      </header>

      {feedbackSuccess && <Banner tone="success">{feedbackSuccess}</Banner>}
      {(feedbackError || errors._root) && <Banner tone="danger">{feedbackError ?? errors._root}</Banner>}

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Adres e-mail" error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(event) => onChange('email', event.target.value)}
              className={`input-field ${errors.email ? 'input-error' : ''}`}
              placeholder="anna.admin@firma.pl"
              disabled={isSaving}
              data-testid="admin-user-create-email"
            />
          </FormField>

          <FormField label="Rola" error={errors.role}>
            <select
              value={form.role}
              onChange={(event) => onChange('role', event.target.value as UserRole)}
              className={`input-field ${errors.role ? 'input-error' : ''}`}
              disabled={isSaving}
              data-testid="admin-user-create-role"
            >
              {Object.entries(USER_ROLE_LABELS).map(([role, label]) => (
                <option key={role} value={role}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Imie" error={errors.firstName}>
            <input
              value={form.firstName}
              onChange={(event) => onChange('firstName', event.target.value)}
              className={`input-field ${errors.firstName ? 'input-error' : ''}`}
              placeholder="Anna"
              disabled={isSaving}
              data-testid="admin-user-create-first-name"
            />
          </FormField>

          <FormField label="Nazwisko" error={errors.lastName}>
            <input
              value={form.lastName}
              onChange={(event) => onChange('lastName', event.target.value)}
              className={`input-field ${errors.lastName ? 'input-error' : ''}`}
              placeholder="Nowak"
              disabled={isSaving}
              data-testid="admin-user-create-last-name"
            />
          </FormField>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr,0.8fr]">
          <FormField label="Haslo tymczasowe" error={errors.temporaryPassword}>
            <input
              type="password"
              value={form.temporaryPassword}
              onChange={(event) => onChange('temporaryPassword', event.target.value)}
              className={`input-field ${errors.temporaryPassword ? 'input-error' : ''}`}
              placeholder="Minimum 8 znakow"
              autoComplete="new-password"
              disabled={isSaving}
              data-testid="admin-user-create-password"
            />
          </FormField>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <p className="font-medium">Po utworzeniu konta:</p>
            <p className="mt-2 leading-6">
              konto bedzie aktywne, a flaga wymagania zmiany hasla zostanie ustawiona przez backend.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn-secondary" disabled={isSaving}>
            Anuluj
          </button>
          <button type="button" onClick={onSubmit} className="btn-primary" disabled={isSaving}>
            {isSaving ? 'Tworzenie...' : 'Utworz konto'}
          </button>
        </div>
      </section>
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
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error && <p className="error-message">{error}</p>}
    </label>
  )
}

function Banner({ tone, children }: { tone: 'success' | 'danger'; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${
        tone === 'success'
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      {children}
    </div>
  )
}
