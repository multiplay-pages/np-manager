import { useState, type FormEvent } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import type { AuthUser } from '@np-manager/shared'
import { ROUTES } from '@/constants/routes'
import { apiClient } from '@/services/api.client'
import { useAuthStore } from '@/stores/auth.store'

interface LoginResponse {
  token: string
  user: AuthUser
}

interface ApiErrorResponse {
  success: false
  error?: {
    code?: string
    message?: string
  }
}

/**
 * Strona logowania.
 *
 * Wysyla POST /api/auth/login z danymi formularza.
 * Przy sukcesie zapisuje token+user w store i przenosi na dashboard.
 * Rozroznia bledne dane logowania, brak backendu, brak bazy i bledy 5xx.
 */
export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (isLoading) return

    setError(null)

    if (!email.trim() || !password) {
      setError('Wypelnij adres e-mail i haslo.')
      return
    }

    setIsLoading(true)

    try {
      const response = await apiClient.post<{ success: true; data: LoginResponse }>(
        '/auth/login',
        { email: email.trim().toLowerCase(), password },
      )

      const { token, user } = response.data.data
      setAuth(token, user)
      void navigate(ROUTES.DASHBOARD, { replace: true })
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        const apiError = err.response?.data as ApiErrorResponse | undefined

        if (!err.response) {
          setError(
            'Brak polaczenia z backendem logowania. Upewnij sie, ze backend dziala na http://localhost:3001.',
          )
        } else if (status === 401) {
          setError('Nieprawidlowy e-mail lub haslo.')
        } else if (status === 400) {
          setError('Nieprawidlowy format danych. Sprawdz wprowadzone dane.')
        } else if (status === 404) {
          setError(
            'Nie znaleziono endpointu logowania. Sprawdz konfiguracje proxy Vite oraz trase backendu /api/auth/login.',
          )
        } else if (status === 503 && apiError?.error?.code === 'DATABASE_UNAVAILABLE') {
          setError(
            'Backend dziala, ale lokalna baza danych jest niedostepna. Sprawdz GET /health/ready, uruchom PostgreSQL, wykonaj migracje i seed, a nastepnie sproboj ponownie.',
          )
        } else {
          setError(
            apiError?.error?.message ?? 'Wystapil blad serwera. Sprobuj ponownie.',
          )
        }
      } else {
        setError('Brak polaczenia z serwerem. Sprawdz polaczenie z siecia.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <span className="text-white font-bold text-2xl">NP</span>
          </div>
          <h1 className="text-2xl font-bold text-white">NP-Manager</h1>
          <p className="text-gray-400 text-sm mt-1">System zarzadzania portabilnoscia numerow</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Logowanie do systemu</h2>

          <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-5">
            <div>
              <label htmlFor="email" className="label">
                Adres e-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`input-field ${error ? 'input-error' : ''}`}
                placeholder="uzytkownik@firma.pl"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Haslo
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`input-field ${error ? 'input-error' : ''}`}
                placeholder="........"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-red-500 text-sm mt-0.5">!</span>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-2.5"
            >
              {isLoading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Logowanie...
                </>
              ) : (
                'Zaloguj sie'
              )}
            </button>
          </form>

          <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700 font-medium mb-1">Dane konta administratora (seed):</p>
            <p className="text-xs text-blue-600 font-mono">admin@np-manager.local</p>
            <p className="text-xs text-blue-600 font-mono">Admin@NP2026!</p>
          </div>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          NP-Manager v1.0 | System wewnetrzny | Dostep tylko dla uprawnionych pracownikow
        </p>
      </div>
    </div>
  )
}
