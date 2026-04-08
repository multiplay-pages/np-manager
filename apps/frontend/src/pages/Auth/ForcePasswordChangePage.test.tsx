import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ForcePasswordChangePage } from './ForcePasswordChangePage'

const mockedSetAuth = vi.fn()
const mockedClearAuth = vi.fn()

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    token: 'jwt-token',
    user: {
      id: 'user-1',
      email: 'jan.kowalski@np-manager.local',
      firstName: 'Jan',
      lastName: 'Kowalski',
      role: 'BOK_CONSULTANT',
      forcePasswordChange: true,
    },
    setAuth: mockedSetAuth,
    clearAuth: mockedClearAuth,
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

describe('ForcePasswordChangePage', () => {
  it('renders the dedicated forced password change screen', () => {
    const html = renderToStaticMarkup(<ForcePasswordChangePage />)

    expect(html).toContain('Ustaw nowe hasło')
    expect(html).toContain(
      'Ze względów bezpieczeństwa musisz ustawić nowe hasło przed dalszym korzystaniem z aplikacji.',
    )
    expect(html).toContain('Obecne hasło / hasło tymczasowe')
    expect(html).toContain('Potwierdź nowe hasło')
    expect(html).toContain('Wyloguj')
  })
})
