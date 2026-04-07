import { describe, expect, it } from 'vitest'
import { buildApp, getRuntimeRouteDiagnostics } from '../app'

describe('runtime route diagnostics', () => {
  it('reports required API routes as registered in the runtime app', async () => {
    const app = await buildApp()

    try {
      const diagnostics = getRuntimeRouteDiagnostics(app)

      expect(diagnostics.apiPrefixes).toEqual([
        '/api/auth',
        '/api/users',
        '/api/clients',
        '/api/operators',
        '/api/porting-requests',
        '/api/admin',
      ])

      expect(diagnostics.requiredRoutes).toEqual([
        { method: 'POST', url: '/api/auth/login', registered: true },
        { method: 'GET', url: '/api/porting-requests', registered: true },
        { method: 'GET', url: '/api/porting-requests/:id', registered: true },
        {
          method: 'POST',
          url: '/api/porting-requests/:id/communications/preview',
          registered: true,
        },
        {
          method: 'POST',
          url: '/api/porting-requests/:id/communications/drafts',
          registered: true,
        },
      ])

      expect(diagnostics.routeTable).toContain('login (POST)')
      expect(diagnostics.routeTable).toContain('communication-template')
      expect(diagnostics.routeTable).toContain('porting-requests')
      expect(diagnostics.routeTable).toContain('preview (POST)')
      expect(diagnostics.routeTable).toContain('drafts (POST)')
    } finally {
      await app.close()
    }
  })
})
