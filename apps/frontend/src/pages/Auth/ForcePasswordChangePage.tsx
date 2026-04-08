import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import {
  getDefaultAuthenticatedRoute,
  getForcePasswordChangeErrorMessage,
  validateForcePasswordChangeForm,
  type ForcePasswordChangeFormErrors,
  type ForcePasswordChangeFormState,
} from '@/lib/authFlow'
import { changeOwnPassword, getAuthMe } from '@/services/auth.api'
import { useAuthStore } from '@/stores/auth.store'

const INITIAL_FORM: ForcePasswordChangeFormState = {
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
}

export function ForcePasswordChangePage() {
  const navigate = useNavigate()
  const { token, user, setAuth, clearAuth } = useAuthStore()
  const [form, setForm] = useState<ForcePasswordChangeFormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<ForcePasswordChangeFormErrors>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = <K extends keyof ForcePasswordChangeFormState>(
    field: K,
    value: ForcePasswordChangeFormState[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, _root: undefined }))
    setSuccessMessage(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!token || !user || isSubmitting) {
      return
    }

    const nextErrors = validateForcePasswordChangeForm(form)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    setSuccessMessage(null)
    setErrors({})

    try {
      const result = await changeOwnPassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      const refreshedUser = await getAuthMe()

      setAuth(token, refreshedUser)
      setSuccessMessage(result.message)
      setForm(INITIAL_FORM)
      window.setTimeout(() => {
        void navigate(getDefaultAuthenticatedRoute(refreshedUser), { replace: true })
      }, 800)
    } catch (error) {
      setErrors({
        _root: getForcePasswordChangeErrorMessage(error),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = () => {
    clearAuth()
    void navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-700">
                Bezpieczeństwo konta
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
                Ustaw nowe hasło
              </h1>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Ze względów bezpieczeństwa musisz ustawić nowe hasło przed dalszym korzystaniem z
                aplikacji.
              </p>
              {user && (
                <p className="mt-3 text-sm text-gray-500">
                  Zalogowano jako <span className="font-medium text-gray-700">{user.email}</span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Wyloguj
            </button>
          </div>

          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="mt-8 space-y-5"
            noValidate
          >
            <FormField label="Obecne hasło / hasło tymczasowe" error={errors.currentPassword}>
              <input
                type="password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(event) => handleChange('currentPassword', event.target.value)}
                className={`input-field ${errors.currentPassword ? 'input-error' : ''}`}
                placeholder="Wpisz obecne hasło"
                disabled={isSubmitting}
                data-testid="force-password-current"
              />
            </FormField>

            <FormField label="Nowe hasło" error={errors.newPassword}>
              <input
                type="password"
                autoComplete="new-password"
                value={form.newPassword}
                onChange={(event) => handleChange('newPassword', event.target.value)}
                className={`input-field ${errors.newPassword ? 'input-error' : ''}`}
                placeholder="Minimum 8 znaków"
                disabled={isSubmitting}
                data-testid="force-password-new"
              />
            </FormField>

            <FormField label="Potwierdź nowe hasło" error={errors.confirmNewPassword}>
              <input
                type="password"
                autoComplete="new-password"
                value={form.confirmNewPassword}
                onChange={(event) => handleChange('confirmNewPassword', event.target.value)}
                className={`input-field ${errors.confirmNewPassword ? 'input-error' : ''}`}
                placeholder="Powtórz nowe hasło"
                disabled={isSubmitting}
                data-testid="force-password-confirm"
              />
            </FormField>

            {errors._root && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errors._root}
              </div>
            )}

            {successMessage && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {successMessage} Możesz teraz korzystać z aplikacji.
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isSubmitting}
              data-testid="force-password-submit"
            >
              {isSubmitting ? 'Zapisywanie...' : 'Zapisz nowe hasło'}
            </button>
          </form>
        </div>
      </div>
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
