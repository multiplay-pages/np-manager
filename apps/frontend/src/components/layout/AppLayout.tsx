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
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: '⊞' },
  { label: 'Sprawy', path: ROUTES.REQUESTS, icon: '📋' },
  { label: 'Klienci', path: ROUTES.CLIENTS, icon: '👥' },
  { label: 'Zadania', path: ROUTES.TASKS, icon: '✓' },
  { label: 'Raporty', path: ROUTES.REPORTS, icon: '📊', roles: ['ADMIN', 'MANAGER', 'AUDITOR'] },
  { label: 'Operatorzy', path: ROUTES.OPERATORS, icon: '📡' },
  { label: 'Administracja', path: ROUTES.ADMIN, icon: '⚙', roles: ['ADMIN'] },
]

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    clearAuth()
    void navigate(ROUTES.LOGIN)
  }

  const visibleNavItems = navItems.filter((item) => {
    if (!item.roles) return true
    return user ? item.roles.includes(user.role) : false
  })

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ====================================================
          SIDEBAR
          ==================================================== */}
      <aside
        className={`
          flex flex-col bg-gray-900 text-white transition-all duration-200 flex-shrink-0
          ${sidebarCollapsed ? 'w-16' : 'w-60'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-700 h-16">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            NP
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <div className="font-semibold text-sm truncate">NP-Manager</div>
              <div className="text-xs text-gray-400 truncate">Portabilność numerów</div>
            </div>
          )}
        </div>

        {/* Nawigacja */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === ROUTES.DASHBOARD}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                transition-colors duration-150
                ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              `}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Profil użytkownika */}
        <div className="border-t border-gray-700 p-3">
          {user && (
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="flex-shrink-0 w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm font-medium">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-medium truncate">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {USER_ROLE_LABELS[user.role]}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toggle sidebar */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex items-center justify-center h-10 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors border-t border-gray-700"
          title={sidebarCollapsed ? 'Rozwiń menu' : 'Zwiń menu'}
        >
          <span className="text-sm">{sidebarCollapsed ? '→' : '←'}</span>
        </button>
      </aside>

      {/* ====================================================
          GŁÓWNA TREŚĆ
          ==================================================== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            {/* Breadcrumb będzie tu w następnym sprincie */}
            <span className="text-sm text-gray-500">System zarządzania portabilnością</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Powiadomienia — placeholder (Sprint 7) */}
            <button
              className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Powiadomienia"
            >
              <span className="text-lg">🔔</span>
              {/* Badge będzie dynamiczny po implementacji powiadomień */}
            </button>

            {/* Wylogowanie */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
            >
              <span>↩</span>
              <span>Wyloguj</span>
            </button>
          </div>
        </header>

        {/* Treść strony */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
