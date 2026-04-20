import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppLayout } from './AppLayout'

const { authState, mockedUseAuthStore } = vi.hoisted(() => {
  const state: {
    user: {
      id: string
      email: string
      firstName: string
      lastName: string
      role: 'ADMIN' | 'BOK_CONSULTANT'
      forcePasswordChange: boolean
    }
    clearAuth: ReturnType<typeof vi.fn>
  } = {
    user: {
      id: 'admin-1',
      email: 'admin@np-manager.local',
      firstName: 'Anna',
      lastName: 'Admin',
      role: 'ADMIN',
      forcePasswordChange: false,
    },
    clearAuth: vi.fn(),
  }

  const store = Object.assign((selector?: (value: typeof state) => unknown) => {
    return selector ? selector(state) : state
  }, {
    getState: () => state,
  })

  return { authState: state, mockedUseAuthStore: store }
})

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: mockedUseAuthStore,
}))

describe('AppLayout admin navigation', () => {
  beforeEach(() => {
    authState.user = {
      id: 'admin-1',
      email: 'admin@np-manager.local',
      firstName: 'Anna',
      lastName: 'Admin',
      role: 'ADMIN',
      forcePasswordChange: false,
    }
  })

  it('shows Users navigation link for ADMIN', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<div>Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(html).toContain('Uzytkownicy')
    expect(html).toContain('Szablony komunikatow')
    expect(html).toContain('Tryb systemu')
    expect(html).toContain('Tryb pracy systemu')
    expect(html).not.toContain('capabilities')
    expect(html).toContain('Powiadomienia portingu')
    expect(html).toContain('Proby notyfikacji')
  })

  it('hides Users navigation link for non-admin', () => {
    authState.user = {
      id: 'bok-1',
      email: 'bok@np-manager.local',
      firstName: 'Jan',
      lastName: 'Konsultant',
      role: 'BOK_CONSULTANT',
      forcePasswordChange: false,
    }

    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<div>Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(html).not.toContain('Uzytkownicy')
    expect(html).not.toContain('Administracja')
  })
})
