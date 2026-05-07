import { afterEach, describe, expect, it, vi } from 'vitest'

// Import after env stub — module-level getApiBaseUrl() reads import.meta.env at call time
import { getApiBaseUrl } from './api.client'

describe('getApiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns /api when VITE_API_URL is not set (dev)', () => {
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

  it('returns /api and logs error when PROD=true and VITE_API_URL not set', () => {
    vi.stubEnv('PROD', true)
    vi.stubEnv('VITE_API_URL', '')
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(getApiBaseUrl()).toBe('/api')
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('VITE_API_URL'))
    consoleSpy.mockRestore()
  })

  it('returns /api and logs error when PROD=true and VITE_API_URL is localhost', () => {
    vi.stubEnv('PROD', true)
    vi.stubEnv('VITE_API_URL', 'http://localhost:3001')
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(getApiBaseUrl()).toBe('/api')
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('VITE_API_URL'))
    consoleSpy.mockRestore()
  })
})
