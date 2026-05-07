import { afterEach, describe, expect, it, vi } from 'vitest'

// Import after env stub — module-level getApiBaseUrl() reads import.meta.env at call time
import { getApiBaseUrl } from './api.client'

describe('getApiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns /api when VITE_API_URL is not set', () => {
    vi.stubEnv('VITE_API_URL', '')
    expect(getApiBaseUrl()).toBe('/api')
  })

  it('builds Railway URL when VITE_API_URL is set', () => {
    vi.stubEnv('VITE_API_URL', 'https://np-manager-production.up.railway.app')
    expect(getApiBaseUrl()).toBe('https://np-manager-production.up.railway.app/api')
  })

  it('strips trailing slash from VITE_API_URL', () => {
    vi.stubEnv('VITE_API_URL', 'https://np-manager-production.up.railway.app/')
    expect(getApiBaseUrl()).toBe('https://np-manager-production.up.railway.app/api')
  })
})
