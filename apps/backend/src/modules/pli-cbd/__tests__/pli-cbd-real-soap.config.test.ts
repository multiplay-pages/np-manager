import { describe, expect, it } from 'vitest'
import type { Env } from '../../../config/env'
import { buildPliCbdRealSoapConfig } from '../../../config/pli-cbd-real-soap.config'

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    NODE_ENV: 'development',
    PORT: 3001,
    FRONTEND_URL: 'http://localhost:5173',
    DATABASE_URL: 'postgresql://np_user:np_password@localhost:5432/np_manager',
    JWT_SECRET: '12345678901234567890123456789012',
    JWT_EXPIRES_IN: '8h',
    UPLOAD_DIR: './uploads',
    MAX_FILE_SIZE_MB: 10,
    LOG_LEVEL: 'info',
    PLI_CBD_TRANSPORT_MODE: 'REAL_SOAP',
    PLI_CBD_REAL_SOAP_ENDPOINT_URL: 'https://soap.example.local/fnp',
    PLI_CBD_REAL_SOAP_CONNECT_TIMEOUT_MS: 5000,
    PLI_CBD_REAL_SOAP_REQUEST_TIMEOUT_MS: 20000,
    PLI_CBD_REAL_SOAP_CLIENT_CERTIFICATE_PATH: 'C:/certs/client.pem',
    PLI_CBD_REAL_SOAP_CLIENT_CERTIFICATE_ALIAS: undefined,
    PLI_CBD_REAL_SOAP_CLIENT_KEY_PATH: 'C:/certs/client.key',
    PLI_CBD_REAL_SOAP_CA_CERTIFICATE_PATH: 'C:/certs/ca.pem',
    PLI_CBD_REAL_SOAP_ENVIRONMENT_NAME: 'LOCAL',
    PLI_CBD_REAL_SOAP_PROFILE: 'LOCAL_DEFAULT',
    PLI_CBD_REAL_SOAP_ACTION_E03: 'urn:test:E03',
    PLI_CBD_REAL_SOAP_ACTION_E12: 'urn:test:E12',
    PLI_CBD_REAL_SOAP_ACTION_E18: 'urn:test:E18',
    PLI_CBD_REAL_SOAP_ACTION_E23: 'urn:test:E23',
    SMTP_HOST: undefined,
    SMTP_PORT: undefined,
    SMTP_USER: undefined,
    SMTP_PASS: undefined,
    SMTP_FROM: undefined,
    ...overrides,
  }
}

describe('buildPliCbdRealSoapConfig', () => {
  it('builds typed config bundle with safe diagnostics', () => {
    const config = buildPliCbdRealSoapConfig(makeEnv())

    expect(config.profile).toBe('LOCAL_DEFAULT')
    expect(config.environmentName).toBe('LOCAL')
    expect(config.endpointHost).toBe('soap.example.local')
    expect(config.soapActions.E18).toBe('urn:test:E18')
    expect(config.diagnostics).toEqual({
      profile: 'LOCAL_DEFAULT',
      environmentName: 'LOCAL',
      endpointHost: 'soap.example.local',
      connectTimeoutMs: 5000,
      requestTimeoutMs: 20000,
      clientCertificateSource: 'PATH',
      hasClientKeyPath: true,
      hasCaCertificatePath: true,
      soapActions: {
        E03: 'urn:test:E03',
        E12: 'urn:test:E12',
        E18: 'urn:test:E18',
        E23: 'urn:test:E23',
      },
    })
  })

  it('fails clearly when REAL_SOAP is missing required fields', () => {
    expect(() =>
      buildPliCbdRealSoapConfig(
        makeEnv({
          PLI_CBD_REAL_SOAP_ENDPOINT_URL: undefined,
          PLI_CBD_REAL_SOAP_CLIENT_CERTIFICATE_PATH: undefined,
          PLI_CBD_REAL_SOAP_CLIENT_CERTIFICATE_ALIAS: undefined,
          PLI_CBD_REAL_SOAP_CLIENT_KEY_PATH: undefined,
          PLI_CBD_REAL_SOAP_CA_CERTIFICATE_PATH: undefined,
        }),
      ),
    ).toThrow(
      'Transport REAL_SOAP wymaga kompletnego bundle konfiguracji.',
    )
  })

  it('fails clearly when request timeout is lower than connect timeout', () => {
    expect(() =>
      buildPliCbdRealSoapConfig(
        makeEnv({
          PLI_CBD_REAL_SOAP_CONNECT_TIMEOUT_MS: 10000,
          PLI_CBD_REAL_SOAP_REQUEST_TIMEOUT_MS: 5000,
        }),
      ),
    ).toThrow('PLI_CBD_REAL_SOAP_REQUEST_TIMEOUT_MS musi byc >=')
  })

  it('allows non-REAL_SOAP modes to keep placeholder values without failing', () => {
    const config = buildPliCbdRealSoapConfig(
      makeEnv({
        PLI_CBD_TRANSPORT_MODE: 'STUB',
        PLI_CBD_REAL_SOAP_ENDPOINT_URL: undefined,
        PLI_CBD_REAL_SOAP_CLIENT_CERTIFICATE_PATH: undefined,
        PLI_CBD_REAL_SOAP_CLIENT_CERTIFICATE_ALIAS: undefined,
        PLI_CBD_REAL_SOAP_CLIENT_KEY_PATH: undefined,
        PLI_CBD_REAL_SOAP_CA_CERTIFICATE_PATH: undefined,
      }),
    )

    expect(config.endpointUrl).toBe('https://placeholder.invalid/pli-cbd-soap')
    expect(config.diagnostics.clientCertificateSource).toBe('PATH')
  })
})
