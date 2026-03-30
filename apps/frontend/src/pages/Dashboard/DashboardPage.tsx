import { useAuthStore } from '@/stores/auth.store'
import { USER_ROLE_LABELS } from '@np-manager/shared'

/**
 * Strona Dashboard — placeholder na Sprint 0.
 *
 * Docelowy wygląd (Sprint 7):
 *  - 4 kafelki KPI (aktywne sprawy, SLA, pilne, moje)
 *  - Lista pilnych spraw
 *  - Wykres kołowy statusów
 *  - Panel powiadomień
 *
 * Na tym etapie: szkielet layoutu z informacją o statusie gotowości.
 */
export function DashboardPage() {
  const { user } = useAuthStore()

  return (
    <div className="p-6 space-y-6">
      {/* Nagłówek */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Dzień dobry{user ? `, ${user.firstName}` : ''}!
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {user ? USER_ROLE_LABELS[user.role] : ''} ·{' '}
          {new Date().toLocaleDateString('pl-PL', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Placeholder KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Aktywne sprawy', value: '—', color: 'blue', icon: '📋' },
          { label: 'Przekroczone SLA', value: '—', color: 'red', icon: '⏰' },
          { label: 'Do realizacji dziś', value: '—', color: 'yellow', icon: '⚡' },
          { label: 'Moje sprawy', value: '—', color: 'green', icon: '👤' },
        ].map((card) => (
          <div key={card.label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">{card.label}</span>
              <span className="text-xl">{card.icon}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{card.value}</div>
            <p className="text-xs text-gray-400 mt-1">Dostępne po implementacji modułu spraw</p>
          </div>
        ))}
      </div>

      {/* Status systemu */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Status projektu</h2>

        <div className="space-y-3">
          {[
            { label: 'Monorepo i konfiguracja projektu', done: true },
            { label: 'Schemat bazy danych (Prisma)', done: true },
            { label: 'Dane startowe (seed)', done: true },
            { label: 'Walidatory PESEL, NIP, numery PL', done: true },
            { label: 'Stałe i typy współdzielone (packages/shared)', done: true },
            { label: 'Fundament backendu (Fastify + error handler)', done: true },
            { label: 'Fundament frontendu (React + Vite + Tailwind)', done: true },
            { label: 'Autoryzacja JWT (Sprint 1)', done: false },
            { label: 'Rejestracja spraw (Sprint 3)', done: false },
            { label: 'Workflow statusów (Sprint 5)', done: false },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span
                className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  item.done
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {item.done ? '✓' : '○'}
              </span>
              <span
                className={`text-sm ${
                  item.done ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
