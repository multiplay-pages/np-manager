import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { LoginPage } from '@/pages/Login/LoginPage'
import { ForcePasswordChangePage } from '@/pages/Auth/ForcePasswordChangePage'
import { DashboardPage } from '@/pages/Dashboard/DashboardPage'
import { AppLayout } from '@/components/layout/AppLayout'
import { ClientsPage } from '@/pages/Clients/ClientsPage'
import { ClientDetailPage } from '@/pages/Clients/ClientDetailPage'
import { ClientNewPage } from '@/pages/Clients/ClientNewPage'
import { ClientEditPage } from '@/pages/Clients/ClientEditPage'
import { OperatorsPage } from '@/pages/Operators/OperatorsPage'
import { RequestsPage } from '@/pages/Requests/RequestsPage'
import { RequestNewPage } from '@/pages/Requests/RequestNewPage'
import { RequestDetailPage } from '@/pages/Requests/RequestDetailPage'
import { CommunicationTemplatesAdminPage } from '@/pages/Admin/CommunicationTemplatesAdminPage'
import { AdminUsersPage } from '@/pages/Admin/AdminUsersPage'
import { PortingNotificationSettingsPage } from '@/pages/Admin/PortingNotificationSettingsPage'
import {
  getDefaultAuthenticatedRoute,
  getForcePasswordChangeRouteRedirect,
  getProtectedRouteRedirect,
} from '@/lib/authFlow'
import { useAuthStore } from '@/stores/auth.store'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isHydrated, user } = useAuthStore()
  const location = useLocation()

  if (!isHydrated) return null

  const redirectTo = getProtectedRouteRedirect({
    isAuthenticated,
    user,
    pathname: location.pathname,
  })

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}

function GuestOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isHydrated, user } = useAuthStore()

  if (!isHydrated) return null

  if (isAuthenticated && user) {
    return <Navigate to={getDefaultAuthenticatedRoute(user)} replace />
  }

  return <>{children}</>
}

function ForcePasswordChangeRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isHydrated, user } = useAuthStore()

  if (!isHydrated) return null

  const redirectTo = getForcePasswordChangeRouteRedirect({
    isAuthenticated,
    user,
  })

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}

export function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isHydrated } = useAuthStore()

  if (!isHydrated) return null

  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-6">
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Brak dostepu do administracji</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            Ta sekcja jest dostepna tylko dla administratora systemu.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    path: ROUTES.LOGIN,
    element: (
      <GuestOnlyRoute>
        <LoginPage />
      </GuestOnlyRoute>
    ),
  },
  {
    path: ROUTES.FORCE_PASSWORD_CHANGE,
    element: (
      <ForcePasswordChangeRoute>
        <ForcePasswordChangePage />
      </ForcePasswordChangeRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: ROUTES.CLIENTS,
        element: <ClientsPage />,
      },
      {
        path: ROUTES.CLIENT_NEW,
        element: <ClientNewPage />,
      },
      {
        path: ROUTES.CLIENT_DETAIL,
        element: <ClientDetailPage />,
      },
      {
        path: ROUTES.CLIENT_EDIT,
        element: <ClientEditPage />,
      },
      {
        path: ROUTES.OPERATORS,
        element: <OperatorsPage />,
      },
      {
        path: ROUTES.REQUESTS,
        element: <RequestsPage />,
      },
      {
        path: ROUTES.REQUEST_NEW,
        element: <RequestNewPage />,
      },
      {
        path: ROUTES.REQUEST_DETAIL,
        element: <RequestDetailPage />,
      },
      {
        path: ROUTES.TASKS,
        element: (
          <PlaceholderPage title="Zadania" description="Implementacja w Sprint 2 (Faza 2)" />
        ),
      },
      {
        path: ROUTES.REPORTS,
        element: <PlaceholderPage title="Raporty" description="Implementacja w Sprint 8" />,
      },
      {
        path: ROUTES.ADMIN,
        element: (
          <AdminOnlyRoute>
            <Navigate to={ROUTES.ADMIN_USERS} replace />
          </AdminOnlyRoute>
        ),
      },
      {
        path: ROUTES.ADMIN_USERS,
        element: (
          <AdminOnlyRoute>
            <AdminUsersPage />
          </AdminOnlyRoute>
        ),
      },
      {
        path: ROUTES.ADMIN_USER_NEW,
        element: (
          <AdminOnlyRoute>
            <AdminUsersPage />
          </AdminOnlyRoute>
        ),
      },
      {
        path: ROUTES.ADMIN_USER_DETAIL,
        element: (
          <AdminOnlyRoute>
            <AdminUsersPage />
          </AdminOnlyRoute>
        ),
      },
      {
        path: ROUTES.ADMIN_OPERATORS,
        element: (
          <AdminOnlyRoute>
            <OperatorsPage />
          </AdminOnlyRoute>
        ),
      },
      {
        path: ROUTES.ADMIN_COMMUNICATION_TEMPLATES,
        element: (
          <AdminOnlyRoute>
            <CommunicationTemplatesAdminPage />
          </AdminOnlyRoute>
        ),
      },
      {
        path: ROUTES.ADMIN_PORTING_NOTIFICATION_SETTINGS,
        element: (
          <AdminOnlyRoute>
            <PortingNotificationSettingsPage />
          </AdminOnlyRoute>
        ),
      },
      {
        path: ROUTES.ADMIN_COMMUNICATION_TEMPLATE_NEW,
        element: (
          <AdminOnlyRoute>
            <CommunicationTemplatesAdminPage />
          </AdminOnlyRoute>
        ),
      },
      {
        path: ROUTES.ADMIN_COMMUNICATION_TEMPLATE_DETAIL,
        element: (
          <AdminOnlyRoute>
            <CommunicationTemplatesAdminPage />
          </AdminOnlyRoute>
        ),
      },
      {
        path: ROUTES.ADMIN_COMMUNICATION_TEMPLATE_EDIT,
        element: (
          <AdminOnlyRoute>
            <CommunicationTemplatesAdminPage />
          </AdminOnlyRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to={ROUTES.DASHBOARD} replace />,
  },
])

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6">
      <div className="card flex flex-col items-center justify-center p-12 text-center">
        <div className="mb-4 text-5xl">...</div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  )
}
