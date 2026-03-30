import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ROUTES } from '@/constants/routes'
import { apiClient } from '@/services/api.client'
import { useAuthStore } from '@/stores/auth.store'
import type { AuthUser } from '@np-manager/shared'

interface LoginResponse {
  token: string
  user: AuthUser
}

/**
 * Strona logowania.
 *
 * Wysyła POST /api/auth/login z danymi formularza.
 * Przy sukcesie zapisuje token+user w store i przenosi na dashboard.
 * Przy 401 wyświetla ogólny komunikat (nie ujawnia, co jest błędne).
 * Blokuje wielokrotne kliknięcie przez czas trwania requestu (isLoading).
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

    // Blokada wielokrotnego kliknięcia
    if (isLoading) return

    setError(null)

    if (!email.trim() || !password) {
      setError('Wypełnij adres e-mail i hasło.')
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
        if (err.response?.status === 401) {
          setError('Nieprawidłowy e-mail lub hasło.')
        } else if (err.response?.status === 400) {
          setError('Nieprawidłowy format danych. Sprawdź wprowadzone dane.')
        } else {
          setError('Wystąpił błąd serwera. Spróbuj ponownie.')
        }
      } else {
        setError('Brak połączenia z serwerem. Sprawdź połączenie z siecią.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <span className="text-white font-bold text-2xl">NP</span>
          </div>
          <h1 className="text-2xl font-bold text-white">NP-Manager</h1>
          <p className="text-gray-400 text-sm mt-1">System zarządzania portabilnością numerów</p>
        </div>

        {/* Karta formularza */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Logowanie do systemu</h2>

          <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-5">
            {/* Email */}
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

            {/* Hasło */}
            <div>
              <label htmlFor="password" className="label">
                Hasło
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`input-field ${error ? 'input-error' : ''}`}
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            {/* Komunikat błędu */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-red-500 text-sm mt-0.5">⚠</span>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Przycisk submit */}
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
                'Zaloguj się'
              )}
            </button>
          </form>

          {/* Info o danych testowych */}
          <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700 font-medium mb-1">Dane konta administratora (seed):</p>
            <p className="text-xs text-blue-600 font-mono">admin@np-manager.local</p>
            <p className="text-xs text-blue-600 font-mono">Admin@NP2026!</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-6">
          NP-Manager v1.0 · System wewnętrzny · Dostęp tylko dla uprawnionych pracowników
        </p>
      </div>
    </div>
  )
}
