import { useMemo, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Settings, Users, Zap } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { useAuthStore } from '@/stores/auth.store'
import { USER_ROLE_LABELS } from '@np-manager/shared'
import { AppIcon, Button, cx } from '@/components/ui'

interface NavItem {
  label: string
  description: string
  path: string
  icon: ReactNode
  roles?: string[]
  exact?: boolean
}

const primaryNavItems: NavItem[] = [
  { label: 'Dashboard', description: 'Pulpit operacyjny', path: ROUTES.DASHBOARD, icon: 'D', exact: true },
  { label: 'Sprawy', description: 'Portowanie numerow', path: ROUTES.REQUESTS, icon: 'S' },
  { label: 'Klienci', description: 'Kartoteka klientow', path: ROUTES.CLIENTS, icon: 'K' },
  { label: 'Zadania', description: 'Praca zespolu', path: ROUTES.TASKS, icon: 'Z' },
  { label: 'Raporty', description: 'Kontrola i wyniki', path: ROUTES.REPORTS, icon: 'R', roles: ['ADMIN', 'MANAGER', 'AUDITOR'] },
  { label: 'Operatorzy', description: 'Slownik operatorow', path: ROUTES.OPERATORS, icon: 'O' },
]

const adminNavItems: NavItem[] = [
  {
    label: 'Uzytkownicy',
    description: 'Role i dostep',
    path: ROUTES.ADMIN_USERS,
    icon: <AppIcon icon={Users} className="h-[18px] w-[18px]" />,
  },
  { label: 'Operatorzy', description: 'Administracja slownika', path: ROUTES.ADMIN_OPERATORS, icon: 'O' },
  { label: 'Szablony komunikatow', description: 'Tresci klienta', path: ROUTES.ADMIN_COMMUNICATION_TEMPLATES, icon: 'T' },
  {
    label: 'Tryb systemu',
    description: 'Tryb pracy systemu',
    path: ROUTES.ADMIN_SYSTEM_MODE_SETTINGS,
    icon: <AppIcon icon={Zap} className="h-[18px] w-[18px]" />,
  },
  {
    label: 'Powiadomienia portingu',
    description: 'Routing zespolowy',
    path: ROUTES.ADMIN_PORTING_NOTIFICATION_SETTINGS,
    icon: <AppIcon icon={Bell} className="h-[18px] w-[18px]" />,
  },
  {
    label: 'Fallback notyfikacji',
    description: 'Obsluga bledow',
    path: ROUTES.ADMIN_NOTIFICATION_FALLBACK_SETTINGS,
    icon: <AppIcon icon={Settings} className="h-[18px] w-[18px]" />,
  },
  {
    label: 'Proby notyfikacji',
    description: 'Diagnostyka dostarczen',
    path: ROUTES.NOTIFICATION_ATTEMPTS,
    icon: <AppIcon icon={Bell} className="h-[18px] w-[18px]" />,
  },
  {
    label: 'Bledy notyfikacji',
    description: 'Kolejka diagnostyczna',
    path: ROUTES.NOTIFICATION_FAILURES,
    icon: <AppIcon icon={Bell} className="h-[18px] w-[18px]" />,
  },
]

function SidebarLink({ item, sidebarCollapsed }: { item: NavItem; sidebarCollapsed: boolean }) {
  return (
    <NavLink
      to={item.path}
      end={item.exact ?? false}
      className={({ isActive }) =>
        cx(
          'group flex min-h-11 items-center gap-3 rounded-ui px-3 py-2 text-sm font-semibold transition-colors',
          isActive
            ? 'bg-brand-600 text-white shadow-soft'
            : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
        )
      }
      title={sidebarCollapsed ? item.label : undefined}
    >
      {({ isActive }) => (
        <>
          <span
            className={cx(
              'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-ui text-xs font-bold',
              isActive ? 'bg-white/18 text-white' : 'bg-ink-100 text-ink-650 group-hover:bg-white',
            )}
          >
            {item.icon}
          </span>
          {!sidebarCollapsed && (
            <span className="min-w-0">
              <span className="block truncate">{item.label}</span>
              <span
                className={cx(
                  'block truncate text-[11px] font-medium',
                  isActive ? 'text-brand-100' : 'text-ink-400',
                )}
              >
                {item.description}
              </span>
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

function getSectionLabel(pathname: string): string {
  if (pathname.startsWith('/requests')) return 'Sprawy portowania'
  if (pathname.startsWith('/clients')) return 'Klienci'
  if (pathname.startsWith('/notifications')) return 'Notyfikacje'
  if (pathname.startsWith('/admin')) return 'Administracja'
  if (pathname.startsWith('/operators')) return 'Operatorzy'
  if (pathname.startsWith('/reports')) return 'Raporty'
  if (pathname.startsWith('/tasks')) return 'Zadania'
  return 'Pulpit'
}

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const isAdmin = user?.role === 'ADMIN'

  const handleLogout = () => {
    clearAuth()
    void navigate(ROUTES.LOGIN)
  }

  const visiblePrimaryItems = useMemo(
    () =>
      primaryNavItems.filter((item) => {
        if (item.path === ROUTES.OPERATORS && isAdmin) {
          return false
        }

        if (!item.roles) return true
        return user ? item.roles.includes(user.role) : false
      }),
    [isAdmin, user],
  )

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <aside
        className={cx(
          'flex flex-shrink-0 flex-col border-r border-line bg-surface transition-all duration-200',
          sidebarCollapsed ? 'w-20' : 'w-72',
        )}
      >
        <div className="flex h-20 items-center gap-3 border-b border-line px-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-ui bg-ink-900 text-sm font-bold text-white">
            NP
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-ink-900">NP-Manager</div>
              <div className="truncate text-xs font-medium text-ink-500">Operacje portingu</div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <div className="space-y-1">
            {visiblePrimaryItems.map((item) => (
              <SidebarLink key={item.path} item={item} sidebarCollapsed={sidebarCollapsed} />
            ))}
          </div>

          {isAdmin && (
            <div className="mt-7">
              {!sidebarCollapsed && (
                <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
                  Administracja
                </div>
              )}
              <div className="space-y-1">
                {adminNavItems.map((item) => (
                  <SidebarLink key={item.path} item={item} sidebarCollapsed={sidebarCollapsed} />
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="border-t border-line p-3">
          {user && (
            <div
              className={cx(
                'rounded-panel border border-line bg-ink-50 p-3',
                sidebarCollapsed && 'flex justify-center px-2',
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-ui bg-brand-600 text-sm font-bold text-white">
                  {user.firstName[0]}
                  {user.lastName[0]}
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink-900">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="truncate text-xs text-ink-500">{USER_ROLE_LABELS[user.role]}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex h-11 items-center justify-center border-t border-line text-sm font-semibold text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
          title={sidebarCollapsed ? 'Rozwin menu' : 'Zwin menu'}
          type="button"
        >
          {sidebarCollapsed ? '>' : '<'}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-20 flex-shrink-0 items-center justify-between border-b border-line bg-surface/95 px-6 backdrop-blur">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              NP-Manager
            </div>
            <div className="mt-1 truncate text-sm font-semibold text-ink-800">
              {getSectionLabel(location.pathname)}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-ui border border-line bg-ink-50 px-3 py-2 text-xs font-medium text-ink-500 md:block">
              Portabilnosc numerow
            </div>
            <Button onClick={handleLogout} variant="ghost" size="sm">
              Wyloguj
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] px-5 py-6 md:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
