import { USER_ROLE_LABELS } from '@np-manager/shared'
import type { AdminUserListItemDto, UserRole } from '@np-manager/shared'
import {
  formatAdminUsersSummaryValue,
  formatAdminUserDateTime,
  getAdminUserDisplayName,
  getAdminUserStatusLabel,
} from '@/lib/adminUsers'

export type AdminUsersRoleFilter = 'ALL' | UserRole
export type AdminUsersStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

export interface AdminUsersListFilters {
  search: string
  role: AdminUsersRoleFilter
  status: AdminUsersStatusFilter
}

export interface AdminUsersSummary {
  activeCount: number
  inactiveCount: number
  adminCount: number
  consultantCount: number
}

interface AdminUsersListProps {
  users: AdminUserListItemDto[]
  totalUsersCount: number
  summary: AdminUsersSummary
  filters: AdminUsersListFilters
  isLoading: boolean
  error: string | null
  feedbackSuccess: string | null
  feedbackError: string | null
  onSearchChange: (value: string) => void
  onRoleChange: (value: AdminUsersRoleFilter) => void
  onStatusChange: (value: AdminUsersStatusFilter) => void
  onCreate: () => void
  onOpen: (id: string) => void
}

export function AdminUsersList({
  users,
  totalUsersCount,
  summary,
  filters,
  isLoading,
  error,
  feedbackSuccess,
  feedbackError,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onCreate,
  onOpen,
}: AdminUsersListProps) {
  const hasActiveFilters =
    filters.search.trim().length > 0 || filters.role !== 'ALL' || filters.status !== 'ALL'

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Uzytkownicy</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Zarzadzaj kontami aplikacji, rolami oraz stanem aktywnosci bez duplikowania logiki
            bezpieczenstwa z backendu.
          </p>
        </div>

        <button type="button" onClick={onCreate} className="btn-primary">
          + Nowy uzytkownik
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Aktywni"
          value={summary.activeCount}
          tone="success"
          isLoading={isLoading}
          testId="admin-users-summary-active"
        />
        <SummaryCard
          label="Nieaktywni"
          value={summary.inactiveCount}
          tone="neutral"
          isLoading={isLoading}
          testId="admin-users-summary-inactive"
        />
        <SummaryCard
          label="Administratorzy"
          value={summary.adminCount}
          tone="primary"
          isLoading={isLoading}
          testId="admin-users-summary-admin"
        />
        <SummaryCard
          label="Konsultanci BOK"
          value={summary.consultantCount}
          tone="warning"
          isLoading={isLoading}
          testId="admin-users-summary-consultant"
        />
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1.4fr,0.9fr,0.9fr]">
          <label className="block">
            <span className="label">Wyszukaj</span>
            <input
              type="search"
              value={filters.search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="input-field mt-1"
              placeholder="Email, imie lub nazwisko"
              data-testid="admin-users-search"
            />
          </label>

          <label className="block">
            <span className="label">Rola</span>
            <select
              value={filters.role}
              onChange={(event) => onRoleChange(event.target.value as AdminUsersRoleFilter)}
              className="input-field mt-1"
              data-testid="admin-users-role-filter"
            >
              <option value="ALL">Wszystkie role</option>
              {Object.entries(USER_ROLE_LABELS).map(([role, label]) => (
                <option key={role} value={role}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Status</span>
            <select
              value={filters.status}
              onChange={(event) => onStatusChange(event.target.value as AdminUsersStatusFilter)}
              className="input-field mt-1"
              data-testid="admin-users-status-filter"
            >
              <option value="ALL">Wszystkie konta</option>
              <option value="ACTIVE">Aktywne</option>
              <option value="INACTIVE">Nieaktywne</option>
            </select>
          </label>
        </div>
      </section>

      {feedbackSuccess && <Banner tone="success">{feedbackSuccess}</Banner>}

      {(feedbackError || error) && <Banner tone="danger">{feedbackError ?? error}</Banner>}

      <section className="rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Lista kont</h2>
            <p className="mt-1 text-sm text-gray-500">
              {hasActiveFilters
                ? `${users.length} z ${totalUsersCount} kont spelnia aktywne filtry.`
                : `${totalUsersCount} kont dostepnych w systemie.`}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="px-6 py-14 text-center text-sm text-gray-600">
            Ladowanie kont uzytkownikow...
          </div>
        ) : totalUsersCount === 0 ? (
          <div className="px-6 py-14 text-center">
            <h3 className="text-xl font-semibold text-gray-900">Brak kont w systemie</h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Utworz pierwsze konto aplikacyjne, aby rozpoczec prace z panelem administracji
              uzytkownikami.
            </p>
            <button type="button" onClick={onCreate} className="btn-primary mt-6">
              Utworz pierwsze konto
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <h3 className="text-xl font-semibold text-gray-900">Brak wynikow</h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Zmien kryteria filtrowania, aby zobaczyc inne konta.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="px-5 py-3 font-medium">Uzytkownik</th>
                  <th className="px-5 py-3 font-medium">Rola</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Wymuszona zmiana hasla</th>
                  <th className="px-5 py-3 font-medium">Utworzono</th>
                  <th className="px-5 py-3 font-medium text-right">Akcja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="transition hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900">
                        {getAdminUserDisplayName(user)}
                      </div>
                      <div className="mt-1 text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-5 py-4 text-gray-700">{USER_ROLE_LABELS[user.role]}</td>
                    <td className="px-5 py-4">
                      <StatusPill active={user.isActive}>
                        {getAdminUserStatusLabel(user.isActive)}
                      </StatusPill>
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      {user.forcePasswordChange ? 'Tak' : 'Nie'}
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      {formatAdminUserDateTime(user.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => onOpen(user.id)}
                        className="btn-secondary"
                      >
                        Szczegoly
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tone,
  isLoading,
  testId,
}: {
  label: string
  value: number
  tone: 'success' | 'neutral' | 'primary' | 'warning'
  isLoading: boolean
  testId: string
}) {
  const toneClasses = {
    success: 'border-green-200 bg-green-50 text-green-800',
    neutral: 'border-gray-200 bg-white text-gray-900',
    primary: 'border-blue-200 bg-blue-50 text-blue-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
  } as const

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight" data-testid={`${testId}-value`}>
        {formatAdminUsersSummaryValue(value, isLoading)}
      </p>
    </div>
  )
}

function StatusPill({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
        active
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-gray-200 bg-gray-100 text-gray-600'
      }`}
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
