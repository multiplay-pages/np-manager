import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PliCbdTransportMode } from '@np-manager/shared'
import type { PliCbdRealSoapConfig } from '../../../config/pli-cbd-real-soap.config'

const { mockEnv, mockRealSoapConfig, mockGetPliCbdRealSoapConfig } = vi.hoisted(() => ({
  mockEnv: { PLI_CBD_TRANSPORT_MODE: 'STUB' as PliCbdTransportMode },
  mockRealSoapConfig: {
    endpointUrl: 'https://soap.example.local/fnp',
    endpointHost: 'soap.example.local',
    connectTimeoutMs: 5000,
    requestTimeoutMs: 20000,
    clientCertificatePath: 'C:/certs/client.pem',
    clientCertificateAlias: null,
    clientKeyPath: 'C:/certs/client.key',
    caCertificatePath: 'C:/certs/ca.pem',
    soapActions: {
      E03: 'urn:test:E03',
      E12: 'urn:test:E12',
      E18: 'urn:test:E18',
      E23: 'urn:test:E23',
    },
    environmentName: 'LOCAL',
    profile: 'LOCAL_DEFAULT',
    diagnostics: {
      profile: 'LOCAL_DEFAULT',
      environmentName: 'LOCAL',
      endpointHost: 'soap.example.local',
      connectTimeoutMs: 5000,
      requestTimeoutMs: 20000,
      clientCertificateSource: 'PATH' as const,
      hasClientKeyPath: true,
      hasCaCertificatePath: true,
      soapActions: {
        E03: 'urn:test:E03',
        E12: 'urn:test:E12',
        E18: 'urn:test:E18',
        E23: 'urn:test:E23',
      },
    },
  } satisfies PliCbdRealSoapConfig,
  mockGetPliCbdRealSoapConfig: vi.fn(),
}))

vi.mock('../../../config/env', () => ({
  env: mockEnv,
}))

vi.mock('../../../config/pli-cbd-real-soap.config', () => ({
  getPliCbdRealSoapConfig: mockGetPliCbdRealSoapConfig,
}))

import {
  getActiveTransportAdapter,
  getActiveTransportMode,
  resolveTransportAdapter,
} from '../pli-cbd-transport-adapter.factory'
import {
  PliCbdRealSoapPlaceholderAdapter,
  PliCbdTransportDisabledAdapter,
  PliCbdTransportStubAdapter,
} from '../pli-cbd-transport.adapter'

const STUB_ENVELOPE = {
  messageId: 'test-id',
  messageType: 'E03' as const,
  caseNumber: 'CASE-001',
  senderRoutingNumber: 'SENDER',
  receiverRoutingNumber: 'RECEIVER',
  soapAction: 'urn:PLI_CBD_FNP_E03',
  protocolVersion: 'PLI_CBD_FNP_1.0',
  xmlPayload: '<xml/>',
  builtAt: new Date().toISOString(),
}

describe('resolveTransportAdapter', () => {
  it('returns stub adapter for STUB mode', () => {
    const adapter = resolveTransportAdapter('STUB')
    expect(adapter).toBeInstanceOf(PliCbdTransportStubAdapter)
    expect(adapter.name).toBe('PLI_CBD_TRANSPORT_STUB')
  })

  it('returns disabled adapter for DISABLED mode', () => {
    const adapter = resolveTransportAdapter('DISABLED')
    expect(adapter).toBeInstanceOf(PliCbdTransportDisabledAdapter)
    expect(adapter.name).toBe('PLI_CBD_TRANSPORT_DISABLED')
  })

  it('requires typed config bundle for REAL_SOAP', () => {
    expect(() => resolveTransportAdapter('REAL_SOAP')).toThrow(
      'Transport REAL_SOAP wymaga przygotowanego bundle pliCbdRealSoapConfig.',
    )
  })

  it('returns placeholder adapter for REAL_SOAP when config bundle is provided', async () => {
    const adapter = resolveTransportAdapter('REAL_SOAP', mockRealSoapConfig)
    const result = await adapter.send(STUB_ENVELOPE)

    expect(adapter).toBeInstanceOf(PliCbdRealSoapPlaceholderAdapter)
    expect(result.outcome).toBe('NOT_IMPLEMENTED')
    expect(result.diagnostics).toMatchObject({
      profile: 'LOCAL_DEFAULT',
      environmentName: 'LOCAL',
      endpointHost: 'soap.example.local',
      configuredSoapAction: 'urn:test:E03',
    })
  })
})

describe('getActiveTransportMode', () => {
  beforeEach(() => {
    mockEnv.PLI_CBD_TRANSPORT_MODE = 'STUB'
  })

  it('reads STUB mode from env', () => {
    mockEnv.PLI_CBD_TRANSPORT_MODE = 'STUB'
    expect(getActiveTransportMode()).toBe('STUB')
  })

  it('reads DISABLED mode from env', () => {
    mockEnv.PLI_CBD_TRANSPORT_MODE = 'DISABLED'
    expect(getActiveTransportMode()).toBe('DISABLED')
  })

  it('reads REAL_SOAP mode from env', () => {
    mockEnv.PLI_CBD_TRANSPORT_MODE = 'REAL_SOAP'
    expect(getActiveTransportMode()).toBe('REAL_SOAP')
  })
})

describe('getActiveTransportAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv.PLI_CBD_TRANSPORT_MODE = 'STUB'
    mockGetPliCbdRealSoapConfig.mockReturnValue(mockRealSoapConfig)
  })

  it('does not affect STUB mode', () => {
    expect(getActiveTransportAdapter()).toBeInstanceOf(PliCbdTransportStubAdapter)
    expect(mockGetPliCbdRealSoapConfig).not.toHaveBeenCalled()
  })

  it('does not affect DISABLED mode', () => {
    mockEnv.PLI_CBD_TRANSPORT_MODE = 'DISABLED'
    expect(getActiveTransportAdapter()).toBeInstanceOf(PliCbdTransportDisabledAdapter)
    expect(mockGetPliCbdRealSoapConfig).not.toHaveBeenCalled()
  })

  it('builds REAL_SOAP adapter from typed config bundle', async () => {
    mockEnv.PLI_CBD_TRANSPORT_MODE = 'REAL_SOAP'

    const adapter = getActiveTransportAdapter()
    const result = await adapter.send(STUB_ENVELOPE)

    expect(adapter).toBeInstanceOf(PliCbdRealSoapPlaceholderAdapter)
    expect(mockGetPliCbdRealSoapConfig).toHaveBeenCalledOnce()
    expect(result.diagnostics).toMatchObject({
      profile: 'LOCAL_DEFAULT',
      endpointHost: 'soap.example.local',
    })
  })
})
