import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { CommunicationTemplatesAdminPage } from './CommunicationTemplatesAdminPage'

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    user: { role: 'BOK_CONSULTANT', firstName: 'Jan', lastName: 'Tester' },
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/admin/communication-templates', state: null }),
    useParams: () => ({ id: undefined }),
  }
})

describe('CommunicationTemplatesAdminPage', () => {
  it('blocks non-admin users from admin templates views', () => {
    const html = renderToStaticMarkup(<CommunicationTemplatesAdminPage />)

    expect(html).toContain('Szablony komunikatow')
    expect(html).toContain('Ten widok jest dostepny wylacznie dla administratora.')
  })
})
