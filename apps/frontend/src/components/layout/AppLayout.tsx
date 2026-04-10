import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { ROUTES } from '@/constants/routes'
import { USER_ROLE_LABELS } from '@np-manager/shared'

interface NavItem {
  label: string
  path: string
  icon: string
  roles?: string[]
  exact?: boolean
}

const primaryNavItems: NavItem[] = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: 'D', exact: true },
  { label: 'Sprawy', path: ROUTES.REQUESTS, icon: 'S' },
  { label: 'Klienci', path: ROUTES.CLIENTS, icon: 'K' },
  { label: 'Zadania', path: ROUTES.TASKS, icon: 'Z' },
  { label: 'Raporty', path: ROUTES.REPORTS, icon: 'R', roles: ['ADMIN', 'MANAGER', 'AUDITOR'] },
  { label: 'Operatorzy', path: ROUTES.OPERATORS, icon: 'O' },
]

const adminNavItems: NavItem[] = [
  { label: 'Uzytkownicy', path: ROUTES.ADMIN_USERS, icon: 'U' },
  { label: 'Operatorzy', path: ROUTES.ADMIN_OPERATORS, icon: 'O' },
  { label: 'Szablony komunikatow', path: ROUTES.ADMIN_COMMUNICATION_TEMPLATES, icon: 'T' },
  { label: 'Powiadomienia portingu', path: ROUTES.ADMIN_PORTING_NOTIFICATION_SETTINGS, icon: 'P' },
  { label: 'Fallback notyfikacji', path: ROUTES.ADMIN_NOTIFICATION_FALLBACK_SETTINGS, icon: 'F' },
]

function SidebarLink({ item, sidebarCollapsed }: { item: NavItem; sidebarCollapsed: boolean }) {
  return (
    <NavLink
      to={item.path}
      end={item.exact ?? false}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
          isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`
      }
    >
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-gray-800 text-xs font-semibold text-gray-200">
        {item.icon}
      </span>
      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  )
}

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'ADMIN'

  const handleLogout = () => {
    clearAuth()
    void navigate(ROUTES.LOGIN)
  }

  const visiblePrimaryItems = primaryNavItems.filter((item) => {
    if (item.path === ROUTES.OPERATORS && isAdmin) {
      return false
    }

    if (!item.roles) return true
    return user ? item.roles.includes(user.role) : false
  })

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside
        className={`flex flex-shrink-0 flex-col bg-gray-900 text-white transition-all duration-200 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-gray-700 px-4 py-4">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            NP
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <div className="truncate text-sm font-semibold">NP-Manager</div>
              <div className="truncate text-xs text-gray-400">Portabilnosc numerow</div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <div className="space-y-1">
            {visiblePrimaryItems.map((item) => (
              <SidebarLink key={item.path} item={item} sidebarCollapsed={sidebarCollapsed} />
            ))}
          </div>

          {isAdmin && (
            <div className="mt-6">
              {!sidebarCollapsed && (
                <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
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

        <div className="border-t border-gray-700 p-3">
          {user && (
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-600 text-sm font-medium">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 overflow-hidden">
                  <div className="truncate text-sm font-medium">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="truncate text-xs text-gray-400">
                    {USER_ROLE_LABELS[user.role]}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex h-10 items-center justify-center border-t border-gray-700 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
          title={sidebarCollapsed ? 'Rozwin menu' : 'Zwin menu'}
        >
          <span className="text-sm">{sidebarCollapsed ? '>' : '<'}</span>
        </button>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">System zarzadzania portabilnoscia</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="relative rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              title="Powiadomienia"
            >
              <span className="text-lg">!</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <span>{'<'}</span>
              <span>Wyloguj</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
