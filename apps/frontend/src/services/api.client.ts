import axios from 'axios'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Zwraca bazowy URL klienta HTTP.
 *
 * Prod: VITE_API_URL=https://np-manager-production.up.railway.app (wymagane)
 *   → baseURL = 'https://np-manager-production.up.railway.app/api'
 *
 * Dev (brak VITE_API_URL lub localhost): baseURL = '/api' — Vite proxy → localhost:3001.
 *
 * Prod + brak VITE_API_URL lub localhost: blokuje wywołanie, loguje błąd, zwraca '/api'.
 *
 * Request interceptor: dołącza token JWT z auth store do każdego żądania.
 *
 * Response interceptor: przy 401 czyści sesję i przekierowuje na /login,
 * ALE tylko jeśli użytkownik był zalogowany. Dzięki temu formularz loginu
 * może normalnie obsłużyć błąd 401 (nieprawidłowe dane) bez niechcianego
 * czyszczenia sesji i przekierowania.
 */
export const getApiBaseUrl = (): string => {
  const rawUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim()

  const isLocalhost = (() => {
    try {
      const { hostname } = new URL(rawUrl ?? '')
      return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
    } catch {
      return false
    }
  })()

  if (import.meta.env.PROD && (!rawUrl || isLocalhost)) {
    console.error(
      `[api.client] VITE_API_URL nie jest skonfigurowany dla produkcji` +
        ` (wartość: "${rawUrl ?? 'undefined'}").` +
        ` Ustaw VITE_API_URL=https://np-manager-production.up.railway.app` +
        ` w Vercel Environment Variables.`,
    )
    return '/api'
  }

  if (!rawUrl) return '/api'

  return `${rawUrl.replace(/\/$/, '')}/api`
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
})

// ============================================================
// REQUEST INTERCEPTOR — dołączanie tokenu JWT
// ============================================================

apiClient.interceptors.request.use((config) => {
  // Użycie .getState() zamiast hooka — interceptor nie jest komponentem React
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ============================================================
// RESPONSE INTERCEPTOR — obsługa wygasłej sesji
// ============================================================

apiClient.interceptors.response.use(
  // Odpowiedzi 2xx — przepuszczamy bez zmian
  (response) => response,

  // Odpowiedzi błędne
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const { isAuthenticated, clearAuth } = useAuthStore.getState()

      // Czyść sesję tylko jeśli użytkownik był zalogowany.
      // Gdy isAuthenticated=false (próba logowania) — błąd propaguje normalnie
      // i LoginPage wyświetla komunikat użytkownikowi.
      if (isAuthenticated) {
        clearAuth()
        // Hard redirect — router nie jest dostępny poza komponentami React
        window.location.replace('/login')
      }
    }

    return Promise.reject(error)
  },
)
