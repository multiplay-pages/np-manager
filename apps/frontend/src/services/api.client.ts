import axios from 'axios'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Klient HTTP dla całej aplikacji.
 *
 * baseURL: '/api' — Vite proxy przekierowuje na http://localhost:3001/api
 *
 * Request interceptor: dołącza token JWT z auth store do każdego żądania.
 *
 * Response interceptor: przy 401 czyści sesję i przekierowuje na /login,
 * ALE tylko jeśli użytkownik był zalogowany. Dzięki temu formularz loginu
 * może normalnie obsłużyć błąd 401 (nieprawidłowe dane) bez niechcianego
 * czyszczenia sesji i przekierowania.
 */
export const apiClient = axios.create({
  baseURL: '/api',
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
