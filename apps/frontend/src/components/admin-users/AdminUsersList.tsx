import { USER_ROLE_LABELS } from '@np-manager/shared'
import type { AdminUserListItemDto, UserRole } from '@np-manager/shared'
import {
  formatAdminUsersSummaryValue,
  formatAdminUserDateTime,
  getAdminUserDisplayName,
  getAdminUserStatusLabel,
} from '@/lib/adminUsers'
import {
  AlertBanner,
  Badge,
  Button,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
} from '@/components/ui'

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
      <PageHeader
        eyebrow="Administracja"
        title="Użytkownicy"
        description="Zarządzaj kontami aplikacji, rolami oraz stanem aktywności bez duplikowania logiki bezpieczeństwa z backendu."
        actions={
          <Button type="button" onClick={onCreate} variant="primary">
            Nowy użytkownik
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Aktywni"
          value={formatAdminUsersSummaryValue(summary.activeCount, isLoading)}
          tone="success"
        />
        <MetricCard
          title="Nieaktywni"
          value={formatAdminUsersSummaryValue(summary.inactiveCount, isLoading)}
          tone="neutral"
        />
        <MetricCard
          title="Administratorzy"
          value={formatAdminUsersSummaryValue(summary.adminCount, isLoading)}
          tone="brand"
        />
        <MetricCard
          title="Konsultanci BOK"
          value={formatAdminUsersSummaryValue(summary.consultantCount, isLoading)}
          tone="warning"
        />
      </section>

      <SectionCard
        title="Filtry"
        description="Zawęź listę bez zmiany zasad pobierania danych z API."
      >
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
      </SectionCard>

      {feedbackSuccess && <AlertBanner tone="success" title={feedbackSuccess} />}

      {(feedbackError || error) && <AlertBanner tone="danger" title={feedbackError ?? error} />}

      <SectionCard
        title="Lista kont"
        description={
          hasActiveFilters
            ? `${users.length} z ${totalUsersCount} kont spełnia aktywne filtry.`
            : `${totalUsersCount} kont dostępnych w systemie.`
        }
        padding="none"
      >
        {isLoading ? (
          <EmptyState title="Ładowanie kont użytkowników..." />
        ) : totalUsersCount === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Brak kont w systemie"
              description="Utwórz pierwsze konto aplikacyjne, aby rozpocząć pracę z panelem administracji użytkownikami."
              action={
                <Button type="button" onClick={onCreate} variant="primary">
                  Utwórz pierwsze konto
                </Button>
              }
            />
          </div>
        ) : users.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Brak wyników"
              description="Zmień kryteria filtrowania, aby zobaczyć inne konta."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-ink-50">
                <tr className="border-b border-line text-left text-ink-500">
                  <th className="px-5 py-3 font-medium">Użytkownik</th>
                  <th className="px-5 py-3 font-medium">Rola</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Wymuszona zmiana hasła</th>
                  <th className="px-5 py-3 font-medium">Utworzono</th>
                  <th className="px-5 py-3 font-medium text-right">Akcja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((user) => (
                  <tr key={user.id} className="transition hover:bg-ink-50/70">
                    <td className="px-5 py-4">
                      <div className="font-medium text-ink-900">
                        {getAdminUserDisplayName(user)}
                      </div>
                      <div className="mt-1 text-sm text-ink-500">{user.email}</div>
                    </td>
                    <td className="px-5 py-4 text-ink-700">{USER_ROLE_LABELS[user.role]}</td>
                    <td className="px-5 py-4">
                      <Badge tone={user.isActive ? 'emerald' : 'neutral'} leadingDot>
                        {getAdminUserStatusLabel(user.isActive)}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-ink-700">
                      {user.forcePasswordChange ? 'Tak' : 'Nie'}
                    </td>
                    <td className="px-5 py-4 text-ink-700">
                      {formatAdminUserDateTime(user.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button type="button" onClick={() => onOpen(user.id)} size="sm">
                        Szczegóły
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
