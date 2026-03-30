import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { LoginPage } from '@/pages/Login/LoginPage'
import { DashboardPage } from '@/pages/Dashboard/DashboardPage'
import { AppLayout } from '@/components/layout/AppLayout'
import { ClientsPage } from '@/pages/Clients/ClientsPage'
import { ClientDetailPage } from '@/pages/Clients/ClientDetailPage'
import { ClientNewPage } from '@/pages/Clients/ClientNewPage'
import { ClientEditPage } from '@/pages/Clients/ClientEditPage'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Komponent chroniący trasy wymagające zalogowania.
 *
 * Czeka na zakończenie rehydracji sessionStorage (isHydrated).
 * Renderowanie null podczas rehydracji zapobiega flicker — React nie
 * mountuje jeszcze żadnego widoku, dopóki nie wiadomo czy sesja istnieje.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isHydrated } = useAuthStore()

  if (!isHydrated) return null

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  return <>{children}</>
}

/**
 * Komponent blokujący trasy dostępne tylko dla niezalogowanych (np. /login).
 */
function GuestOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isHydrated } = useAuthStore()

  if (!isHydrated) return null

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return <>{children}</>
}

/**
 * Konfiguracja routera aplikacji.
 * Dodawanie nowych tras — tylko tutaj i w ROUTES.
 *
 * Ważna kolejność tras:
 *  - /clients/new musi być PRZED /clients/:id (React Router v6 preferuje trasy statyczne)
 *  - /clients/:id/edit jest rozpoznawane przez React Router poprawnie obok /clients/:id
 */
export const router = createBrowserRouter([
  // Strona logowania — tylko dla niezalogowanych
  {
    path: ROUTES.LOGIN,
    element: (
      <GuestOnlyRoute>
        <LoginPage />
      </GuestOnlyRoute>
    ),
  },

  // Trasy chronione — wymagają zalogowania
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

      // ── KLIENCI ──────────────────────────────────────────────
      {
        path: ROUTES.CLIENTS,          // /clients
        element: <ClientsPage />,
      },
      {
        path: ROUTES.CLIENT_NEW,       // /clients/new — PRZED /:id
        element: <ClientNewPage />,
      },
      {
        path: ROUTES.CLIENT_DETAIL,    // /clients/:id
        element: <ClientDetailPage />,
      },
      {
        path: ROUTES.CLIENT_EDIT,      // /clients/:id/edit
        element: <ClientEditPage />,
      },

      // ── POZOSTAŁE MODUŁY (placeholders) ──────────────────────
      {
        path: ROUTES.REQUESTS,
        element: <PlaceholderPage title="Lista spraw" description="Implementacja w Sprint 4" />,
      },
      {
        path: ROUTES.REQUEST_NEW,
        element: <PlaceholderPage title="Nowa sprawa" description="Implementacja w Sprint 3" />,
      },
      {
        path: ROUTES.TASKS,
        element: <PlaceholderPage title="Zadania" description="Implementacja w Sprint 2 (Faza 2)" />,
      },
      {
        path: ROUTES.REPORTS,
        element: <PlaceholderPage title="Raporty" description="Implementacja w Sprint 8" />,
      },
      {
        path: ROUTES.ADMIN,
        element: <PlaceholderPage title="Administracja" description="Implementacja w Sprint 2" />,
      },
    ],
  },

  // Przekierowanie na dashboard dla nieznanych tras
  {
    path: '*',
    element: <Navigate to={ROUTES.DASHBOARD} replace />,
  },
])

// Placeholder komponent dla niezaimplementowanych jeszcze modułów
function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6">
      <div className="card p-12 flex flex-col items-center justify-center text-center">
        <div className="text-5xl mb-4">🚧</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-500 text-sm">{description}</p>
      </div>
    </div>
  )
}
