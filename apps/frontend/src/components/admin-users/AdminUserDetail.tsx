import { USER_ROLE_LABELS, type AdminUserDetailDto, type UserRole } from '@np-manager/shared'
import {
  formatAdminUserDateTime,
  getAdminUserDisplayName,
  getAdminUserStatusLabel,
  type AdminUserAuditEntryView,
} from '@/lib/adminUsers'
import {
  AlertBanner,
  Badge,
  Button,
  DataField,
  EmptyState,
  PageHeader,
  SectionCard,
} from '@/components/ui'
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
        <SectionCard padding="sm">
          <EmptyState title="Ładowanie szczegółów użytkownika..." />
        </SectionCard>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="space-y-6 p-6">
        <Button type="button" onClick={onBack} variant="ghost">
          Wróć do listy
        </Button>
        <AlertBanner
          tone="danger"
          title="Nie udało się otworzyć konta"
          description={error ?? 'Brak danych użytkownika.'}
        />
      </div>
    )
  }

  const displayName = getAdminUserDisplayName(user)

  return (
    <>
      <div className="space-y-6 p-6">
        <PageHeader
          eyebrow="Użytkownik"
          title={displayName}
          description={
            <div className="space-y-3">
              <div>{user.email}</div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="brand">{USER_ROLE_LABELS[user.role]}</Badge>
                <Badge tone={user.isActive ? 'emerald' : 'neutral'} leadingDot>
                  {getAdminUserStatusLabel(user.isActive)}
                </Badge>
                {user.forcePasswordChange && <Badge tone="amber">Wymagana zmiana hasła</Badge>}
              </div>
            </div>
          }
          actions={
            <Button type="button" onClick={onBack} variant="ghost">
              Wróć do listy
            </Button>
          }
        />

        {feedbackSuccess && <AlertBanner tone="success" title={feedbackSuccess} />}
        {(feedbackError || error) && <AlertBanner tone="danger" title={feedbackError ?? error} />}

        <section className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-6">
            <SectionCard title="Dane użytkownika">
              <dl className="grid gap-4 md:grid-cols-2">
                <DataField label="Imię i nazwisko" value={displayName} />
                <DataField label="E-mail" value={user.email} />
                <DataField
                  label="Ostatnie logowanie"
                  value={formatAdminUserDateTime(user.lastLoginAt)}
                />
                <DataField
                  label="Zmiana hasła"
                  value={formatAdminUserDateTime(user.passwordChangedAt)}
                />
                <DataField label="Utworzono" value={formatAdminUserDateTime(user.createdAt)} />
                <DataField
                  label="Ostatnia aktualizacja"
                  value={formatAdminUserDateTime(user.updatedAt)}
                />
              </dl>

              {(user.deactivatedAt || user.reactivatedAt) && (
                <dl className="mt-5 grid gap-4 rounded-ui border border-line bg-ink-50/70 p-4 md:grid-cols-2">
                  {user.deactivatedAt && (
                    <DataField
                      label="Dezaktywacja"
                      value={formatAdminUserDateTime(user.deactivatedAt)}
                    />
                  )}
                  {user.reactivatedAt && (
                    <DataField
                      label="Reaktywacja"
                      value={formatAdminUserDateTime(user.reactivatedAt)}
                    />
                  )}
                </dl>
              )}
            </SectionCard>

            <SectionCard
              title="Historia audytu"
              description="Zdarzenia pokazywane od najnowszych do najstarszych."
            >
              {auditEntries.length === 0 ? (
                <EmptyState title="Brak historii administracyjnej dla tego konta." />
              ) : (
                <div className="space-y-4">
                  {auditEntries.map((entry) => (
                    <article
                      key={entry.id}
                      className="rounded-ui border border-line bg-ink-50/70 px-4 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-ink-900">
                            {entry.actionLabel}
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-ink-700">
                            {entry.description}
                          </p>
                        </div>
                        <div className="text-right text-xs text-ink-500">
                          <div>{formatAdminUserDateTime(entry.createdAt)}</div>
                          <div className="mt-1">{entry.actorLabel}</div>
                        </div>
                      </div>

                      {entry.detailLines.length > 0 && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-medium text-brand-700">
                            Pokaż szczegóły
                          </summary>
                          <ul className="mt-3 space-y-2 text-sm text-ink-600">
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
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard title="Rola">
              <div className="rounded-ui border border-line bg-ink-50/70 p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex-1">
                    <span className="label">Rola użytkownika</span>
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
                  <Button
                    type="button"
                    onClick={onRoleSave}
                    variant="primary"
                    isLoading={isRoleSaving}
                    loadingLabel="Zapisywanie..."
                  >
                    Zmień rolę
                  </Button>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Status konta">
              <div className="rounded-ui border border-line bg-ink-50/70 p-4">
                <p className="text-sm leading-6 text-ink-600">
                  {user.isActive
                    ? 'Dezaktywacja zablokuje kolejne logowania, ale nie usuwa konta z systemu.'
                    : 'Reaktywacja przywróci możliwość logowania i korzystania z aplikacji.'}
                </p>
                <Button
                  type="button"
                  onClick={user.isActive ? onDeactivate : onReactivate}
                  className="mt-4"
                  disabled={isStatusUpdating || (user.isActive && isDeactivateDisabled)}
                  title={
                    user.isActive && isDeactivateDisabled
                      ? 'Nie możesz dezaktywować własnego konta.'
                      : undefined
                  }
                  data-testid="admin-user-status-action"
                  isLoading={isStatusUpdating}
                  loadingLabel="Zapisywanie..."
                >
                  {user.isActive ? 'Dezaktywuj konto' : 'Aktywuj konto'}
                </Button>
                {user.isActive && isDeactivateDisabled && (
                  <p
                    className="mt-3 text-sm text-ink-500"
                    data-testid="admin-user-self-deactivate-hint"
                  >
                    Nie możesz dezaktywować własnego konta.
                  </p>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Akcje administracyjne">
              <div className="rounded-ui border border-line bg-ink-50/70 p-4">
                <h3 className="text-sm font-semibold text-ink-900">Reset hasła</h3>
                <p className="mt-2 text-sm leading-6 text-ink-600">
                  Ustaw nowe hasło tymczasowe. Przy kolejnym logowaniu użytkownik będzie musiał je
                  zmienić.
                </p>
                <Button type="button" onClick={onOpenResetPassword} className="mt-4">
                  Reset hasła
                </Button>
              </div>
            </SectionCard>
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
