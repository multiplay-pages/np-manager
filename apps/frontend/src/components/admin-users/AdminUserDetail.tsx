import { USER_ROLE_LABELS, type AdminUserDetailDto, type UserRole } from '@np-manager/shared'
import {
  formatAdminUserDateTime,
  getAdminUserDisplayName,
  getAdminUserStatusLabel,
  type AdminUserAuditEntryView,
} from '@/lib/adminUsers'
import { AdminUserDeactivateModal } from './AdminUserDeactivateModal'
import { AdminUserPasswordResetModal } from './AdminUserPasswordResetModal'

interface AdminUserDetailProps {
  user: AdminUserDetailDto | null
  auditEntries: AdminUserAuditEntryView[]
  isLoading: boolean
  error: string | null
  feedbackSuccess: string | null
  feedbackError: string | null
  roleDraft: UserRole
  isRoleSaving: boolean
  isStatusUpdating: boolean
  isDeactivateDisabled: boolean
  deactivateModalOpen: boolean
  isResettingPassword: boolean
  resetPasswordModalOpen: boolean
  resetPasswordValue: string
  resetPasswordError: string | null
  onBack: () => void
  onRoleChange: (value: UserRole) => void
  onRoleSave: () => void
  onDeactivate: () => void
  onCloseDeactivateModal: () => void
  onConfirmDeactivate: () => void
  onReactivate: () => void
  onOpenResetPassword: () => void
  onCloseResetPassword: () => void
  onResetPasswordValueChange: (value: string) => void
  onResetPasswordSubmit: () => void
}

export function AdminUserDetail({
  user,
  auditEntries,
  isLoading,
  error,
  feedbackSuccess,
  feedbackError,
  roleDraft,
  isRoleSaving,
  isStatusUpdating,
  isDeactivateDisabled,
  deactivateModalOpen,
  isResettingPassword,
  resetPasswordModalOpen,
  resetPasswordValue,
  resetPasswordError,
  onBack,
  onRoleChange,
  onRoleSave,
  onDeactivate,
  onCloseDeactivateModal,
  onConfirmDeactivate,
  onReactivate,
  onOpenResetPassword,
  onCloseResetPassword,
  onResetPasswordValueChange,
  onResetPasswordSubmit,
}: AdminUserDetailProps) {
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center text-sm text-gray-600">
          Ladowanie szczegolow uzytkownika...
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="space-y-6 p-6">
        <button type="button" onClick={onBack} className="text-sm font-medium text-blue-700">
          {'<'} Wroc do listy
        </button>
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-14 text-center">
          <h1 className="text-2xl font-semibold text-red-900">Nie udalo sie otworzyc konta</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-red-700">
            {error ?? 'Brak danych uzytkownika.'}
          </p>
        </div>
      </div>
    )
  }

  const displayName = getAdminUserDisplayName(user)

  return (
    <>
      <div className="space-y-6 p-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-4 text-sm font-medium text-blue-700"
            >
              {'<'} Wroc do listy
            </button>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">{displayName}</h1>
            <p className="mt-2 text-sm text-gray-600">{user.email}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="primary">{USER_ROLE_LABELS[user.role]}</Badge>
              <Badge tone={user.isActive ? 'success' : 'neutral'}>
                {getAdminUserStatusLabel(user.isActive)}
              </Badge>
              {user.forcePasswordChange && <Badge tone="warning">Wymagana zmiana hasla</Badge>}
            </div>
          </div>
        </header>

        {feedbackSuccess && <Banner tone="success">{feedbackSuccess}</Banner>}
        {(feedbackError || error) && <Banner tone="danger">{feedbackError ?? error}</Banner>}

        <section className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Dane konta</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <InfoBox label="Imie i nazwisko" value={displayName} />
                <InfoBox label="Rola" value={USER_ROLE_LABELS[user.role]} />
                <InfoBox label="Status konta" value={getAdminUserStatusLabel(user.isActive)} />
                <InfoBox
                  label="Wymagana zmiana hasla"
                  value={user.forcePasswordChange ? 'Tak' : 'Nie'}
                />
                <InfoBox
                  label="Ostatnie logowanie"
                  value={formatAdminUserDateTime(user.lastLoginAt)}
                />
                <InfoBox
                  label="Zmiana hasla"
                  value={formatAdminUserDateTime(user.passwordChangedAt)}
                />
                <InfoBox label="Utworzono" value={formatAdminUserDateTime(user.createdAt)} />
                <InfoBox
                  label="Ostatnia aktualizacja"
                  value={formatAdminUserDateTime(user.updatedAt)}
                />
              </div>

              {(user.deactivatedAt || user.reactivatedAt) && (
                <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700">
                  {user.deactivatedAt && (
                    <p>Dezaktywacja: {formatAdminUserDateTime(user.deactivatedAt)}</p>
                  )}
                  {user.reactivatedAt && (
                    <p className={user.deactivatedAt ? 'mt-2' : ''}>
                      Reaktywacja: {formatAdminUserDateTime(user.reactivatedAt)}
                    </p>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Historia administracyjna</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Zdarzenia pokazywane od najnowszych do najstarszych.
                  </p>
                </div>
              </div>

              {auditEntries.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-600">
                  Brak historii administracyjnej dla tego konta.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {auditEntries.map((entry) => (
                    <article
                      key={entry.id}
                      className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">
                            {entry.actionLabel}
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-gray-700">
                            {entry.description}
                          </p>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <div>{formatAdminUserDateTime(entry.createdAt)}</div>
                          <div className="mt-1">{entry.actorLabel}</div>
                        </div>
                      </div>

                      {entry.detailLines.length > 0 && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-medium text-blue-700">
                            Pokaz szczegoly
                          </summary>
                          <ul className="mt-3 space-y-2 text-sm text-gray-600">
                            {entry.detailLines.map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Akcje administracyjne</h2>

              <div className="mt-5 rounded-2xl border border-gray-200 p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex-1">
                    <span className="label">Rola uzytkownika</span>
                    <select
                      value={roleDraft}
                      onChange={(event) => onRoleChange(event.target.value as UserRole)}
                      className="input-field"
                      disabled={isRoleSaving}
                      data-testid="admin-user-role-select"
                    >
                      {Object.entries(USER_ROLE_LABELS).map(([role, label]) => (
                        <option key={role} value={role}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={onRoleSave}
                    className="btn-primary"
                    disabled={isRoleSaving}
                  >
                    {isRoleSaving ? 'Zapisywanie...' : 'Zmien role'}
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900">Status konta</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {user.isActive
                    ? 'Dezaktywacja zablokuje kolejne logowania, ale nie usuwa konta z systemu.'
                    : 'Reaktywacja przywroci mozliwosc logowania i korzystania z aplikacji.'}
                </p>
                <button
                  type="button"
                  onClick={user.isActive ? onDeactivate : onReactivate}
                  className="btn-secondary mt-4"
                  disabled={isStatusUpdating || (user.isActive && isDeactivateDisabled)}
                  title={
                    user.isActive && isDeactivateDisabled
                      ? 'Nie możesz dezaktywować własnego konta.'
                      : undefined
                  }
                  data-testid="admin-user-status-action"
                >
                  {isStatusUpdating
                    ? 'Zapisywanie...'
                    : user.isActive
                      ? 'Dezaktywuj konto'
                      : 'Aktywuj konto'}
                </button>
                {user.isActive && isDeactivateDisabled && (
                  <p
                    className="mt-3 text-sm text-gray-500"
                    data-testid="admin-user-self-deactivate-hint"
                  >
                    Nie możesz dezaktywować własnego konta.
                  </p>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900">Reset hasla</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Ustaw nowe haslo tymczasowe. Przy kolejnym logowaniu uzytkownik bedzie musial je
                  zmienic.
                </p>
                <button type="button" onClick={onOpenResetPassword} className="btn-secondary mt-4">
                  Reset hasla
                </button>
              </div>
            </section>
          </div>
        </section>
      </div>

      <AdminUserPasswordResetModal
        isOpen={resetPasswordModalOpen}
        email={user.email}
        temporaryPassword={resetPasswordValue}
        error={resetPasswordError}
        isSaving={isResettingPassword}
        onTemporaryPasswordChange={onResetPasswordValueChange}
        onClose={onCloseResetPassword}
        onSubmit={onResetPasswordSubmit}
      />
      <AdminUserDeactivateModal
        isOpen={deactivateModalOpen}
        email={user.email}
        isSaving={isStatusUpdating}
        onClose={onCloseDeactivateModal}
        onConfirm={onConfirmDeactivate}
      />
    </>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">{label}</div>
      <div className="mt-1 text-sm text-gray-800">{value}</div>
    </div>
  )
}

function Badge({
  tone,
  children,
}: {
  tone: 'primary' | 'success' | 'neutral' | 'warning'
  children: React.ReactNode
}) {
  const toneClasses = {
    primary: 'border-blue-200 bg-blue-50 text-blue-700',
    success: 'border-green-200 bg-green-50 text-green-700',
    neutral: 'border-gray-200 bg-gray-100 text-gray-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
  } as const

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {children}
    </span>
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
