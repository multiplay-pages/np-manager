import { USER_ROLE_LABELS, type UserRole } from '@np-manager/shared'
import { AlertBanner, Button, PageHeader, SectionCard } from '@/components/ui'

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
      <PageHeader
        eyebrow="Administracja"
        title="Nowy użytkownik"
        description="Utwórz konto aplikacyjne z hasłem tymczasowym. Backend ustawi wymuszenie zmiany hasła przy pierwszym logowaniu."
        actions={
          <Button type="button" onClick={onCancel} variant="ghost">
            Wróć do listy
          </Button>
        }
      />

      {feedbackSuccess && <AlertBanner tone="success" title={feedbackSuccess} />}
      {(feedbackError || errors._root) && (
        <AlertBanner tone="danger" title={feedbackError ?? errors._root} />
      )}

      <SectionCard
        title="Dane konta"
        description="Wypełnij dane wymagane przez istniejący flow tworzenia użytkownika."
      >
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

          <FormField label="Imię" error={errors.firstName}>
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
          <FormField label="Hasło tymczasowe" error={errors.temporaryPassword}>
            <input
              type="password"
              value={form.temporaryPassword}
              onChange={(event) => onChange('temporaryPassword', event.target.value)}
              className={`input-field ${errors.temporaryPassword ? 'input-error' : ''}`}
              placeholder="Minimum 8 znaków"
              autoComplete="new-password"
              disabled={isSaving}
              data-testid="admin-user-create-password"
            />
          </FormField>

          <div className="rounded-ui border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
            <p className="font-medium">Po utworzeniu konta:</p>
            <p className="mt-2 leading-6">
              konto będzie aktywne, a flaga wymagania zmiany hasła zostanie ustawiona przez
              backend.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" onClick={onCancel} disabled={isSaving}>
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            variant="primary"
            isLoading={isSaving}
            loadingLabel="Tworzenie..."
          >
            Utwórz konto
          </Button>
        </div>
      </SectionCard>
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
