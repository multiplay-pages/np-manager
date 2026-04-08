import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { AdminUsersPage } from './AdminUsersPage'

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    user: {
      id: 'bok-1',
      email: 'bok@np-manager.local',
      firstName: 'Jan',
      lastName: 'Konsultant',
      role: 'BOK_CONSULTANT',
      forcePasswordChange: false,
    },
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/admin/users', state: null }),
    useParams: () => ({ id: undefined }),
  }
})

describe('AdminUsersPage', () => {
  it('blocks non-admin users from admin users views', () => {
    const html = renderToStaticMarkup(<AdminUsersPage />)

    expect(html).toContain('Brak dostepu do administracji')
    expect(html).toContain('Ta sekcja jest dostepna tylko dla administratora systemu.')
  })
})
