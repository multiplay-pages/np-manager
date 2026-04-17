import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SystemCapabilitiesDto } from '@np-manager/shared'

const { mockResolveSystemCapabilities } = vi.hoisted(() => ({
  mockResolveSystemCapabilities: vi.fn(),
}))

vi.mock('../system-capabilities.service', () => ({
  resolveSystemCapabilities: (...args: unknown[]) => mockResolveSystemCapabilities(...args),
}))

import { requireCapability, type CapabilityPath } from '../require-capability.hook'
import { AppError } from '../../../shared/errors/app-error'

function buildSnapshot(
  overrides: Partial<SystemCapabilitiesDto['pliCbd']> & { mode?: SystemCapabilitiesDto['mode'] } = {},
): SystemCapabilitiesDto {
  const { mode = 'STANDALONE', ...pliCbdOverrides } = overrides
  const active =
    mode === 'PLI_CBD_INTEGRATED' &&
    (pliCbdOverrides.enabled ?? false) &&
    (pliCbdOverrides.configured ?? false)
  return {
    mode,
    pliCbd: {
      enabled: false,
      configured: false,
      active,
      capabilities: {
        export: active,
        sync: active,
        diagnostics: active,
        externalActions: active,
      },
      ...pliCbdOverrides,
    },
    resolvedAt: new Date().toISOString(),
  }
}

/** Wywołuje hook z minimalnym fakeRequest — fastify this binding jest pominiety. */
type SimpleHook = (req: { log: { info: (...args: unknown[]) => void } }, reply: unknown) => Promise<void>

function hookOf(path: CapabilityPath): SimpleHook {
  return requireCapability(path) as unknown as SimpleHook
}

function fakeRequest() {
  return { log: { info: vi.fn() } }
}

describe('requireCapability hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes when capability is active', async () => {
    mockResolveSystemCapabilities.mockResolvedValueOnce(
      buildSnapshot({
        mode: 'PLI_CBD_INTEGRATED',
        enabled: true,
        configured: true,
      }),
    )

    await expect(hookOf('pliCbd.active')(fakeRequest(), {})).resolves.toBeUndefined()
  })

  it('throws 404 CAPABILITY_NOT_AVAILABLE for STANDALONE mode', async () => {
    mockResolveSystemCapabilities.mockResolvedValueOnce(buildSnapshot({ mode: 'STANDALONE' }))

    await expect(hookOf('pliCbd.active')(fakeRequest(), {})).rejects.toMatchObject({
      statusCode: 404,
      code: 'CAPABILITY_NOT_AVAILABLE',
    })
  })

  it('throws 404 when INTEGRATED but enabled=false', async () => {
    mockResolveSystemCapabilities.mockResolvedValueOnce(
      buildSnapshot({
        mode: 'PLI_CBD_INTEGRATED',
        enabled: false,
        configured: true,
      }),
    )

    await expect(hookOf('pliCbd.active')(fakeRequest(), {})).rejects.toMatchObject({
      statusCode: 404,
      code: 'CAPABILITY_NOT_AVAILABLE',
    })
  })

  it('throws 503 CAPABILITY_NOT_CONFIGURED when INTEGRATED + enabled but not configured', async () => {
    mockResolveSystemCapabilities.mockResolvedValueOnce(
      buildSnapshot({
        mode: 'PLI_CBD_INTEGRATED',
        enabled: true,
        configured: false,
      }),
    )

    const promise = hookOf('pliCbd.active')(fakeRequest(), {})
    await expect(promise).rejects.toBeInstanceOf(AppError)
    await expect(promise).rejects.toMatchObject({
      statusCode: 503,
      code: 'CAPABILITY_NOT_CONFIGURED',
    })
  })

  it('gates granular capabilities independently', async () => {
    mockResolveSystemCapabilities.mockResolvedValue(
      buildSnapshot({
        mode: 'PLI_CBD_INTEGRATED',
        enabled: true,
        configured: true,
        active: true,
        capabilities: {
          export: true,
          sync: false,
          diagnostics: true,
          externalActions: false,
        },
      }),
    )

    await expect(
      hookOf('pliCbd.capabilities.export')(fakeRequest(), {}),
    ).resolves.toBeUndefined()

    await expect(
      hookOf('pliCbd.capabilities.sync')(fakeRequest(), {}),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})
