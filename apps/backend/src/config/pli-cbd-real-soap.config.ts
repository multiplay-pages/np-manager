import type { PliCbdManualExportMessageType } from '@np-manager/shared'
import { env, type Env } from './env'

type PliCbdRealSoapSoapActions = Record<PliCbdManualExportMessageType, string>

type PliCbdRealSoapEnvSource = Pick<
  Env,
  | 'PLI_CBD_TRANSPORT_MODE'
  | 'PLI_CBD_REAL_SOAP_ENDPOINT_URL'
  | 'PLI_CBD_REAL_SOAP_CONNECT_TIMEOUT_MS'
  | 'PLI_CBD_REAL_SOAP_REQUEST_TIMEOUT_MS'
  | 'PLI_CBD_REAL_SOAP_CLIENT_CERTIFICATE_PATH'
  | 'PLI_CBD_REAL_SOAP_CLIENT_CERTIFICATE_ALIAS'
  | 'PLI_CBD_REAL_SOAP_CLIENT_KEY_PATH'
  | 'PLI_CBD_REAL_SOAP_CA_CERTIFICATE_PATH'
  | 'PLI_CBD_REAL_SOAP_ENVIRONMENT_NAME'
  | 'PLI_CBD_REAL_SOAP_PROFILE'
  | 'PLI_CBD_REAL_SOAP_ACTION_E03'
  | 'PLI_CBD_REAL_SOAP_ACTION_E12'
  | 'PLI_CBD_REAL_SOAP_ACTION_E18'
  | 'PLI_CBD_REAL_SOAP_ACTION_E23'
>

export interface PliCbdRealSoapConfigDiagnostics {
  profile: string
  environmentName: string
  endpointHost: string
  connectTimeoutMs: number
  requestTimeoutMs: number
  clientCertificateSource: 'PATH' | 'ALIAS'
  hasClientKeyPath: boolean
  hasCaCertificatePath: boolean
  soapActions: PliCbdRealSoapSoapActions
}

export interface PliCbdRealSoapConfig {
  endpointUrl: string
  endpointHost: string
  connectTimeoutMs: number
  requestTimeoutMs: number
  clientCertificatePath: string | null
  clientCertificateAlias: string | null
  clientKeyPath: string
  caCertificatePath: string
  soapActions: PliCbdRealSoapSoapActions
  environmentName: string
  profile: string
  diagnostics: PliCbdRealSoapConfigDiagnostics
}

function buildSoapActions(source: PliCbdRealSoapEnvSource): PliCbdRealSoapSoapActions {
  return {
    E03: source.PLI_CBD_REAL_SOAP_ACTION_E03,
    E12: source.PLI_CBD_REAL_SOAP_ACTION_E12,
    E18: source.PLI_CBD_REAL_SOAP_ACTION_E18,
    E23: source.PLI_CBD_REAL_SOAP_ACTION_E23,
  }
}

function validateRealSoapRequirements(source: PliCbdRealSoapEnvSource): void {
  if (source.PLI_CBD_TRANSPORT_MODE !== 'REAL_SOAP') {
    return
  }

  const missingFields: string[] = []

  if (!source.PLI_CBD_REAL_SOAP_ENDPOINT_URL) {
    missingFields.push('PLI_CBD_REAL_SOAP_ENDPOINT_URL')
  }

  if (
    !source.PLI_CBD_REAL_SOAP_CLIENT_CERTIFICATE_PATH &&
    !source.PLI_CBD_REAL_SOAP_CLIENT_CERTIFICATE_ALIAS
  ) {
    missingFields.push(
      'PLI_CBD_REAL_SOAP_CLIENT_CERTIFICATE_PATH lub PLI_CBD_REAL_SOAP_CLIENT_CERTIFICATE_ALIAS',
    )
  }

  if (!source.PLI_CBD_REAL_SOAP_CLIENT_KEY_PATH) {
    missingFields.push('PLI_CBD_REAL_SOAP_CLIENT_KEY_PATH')
  }

  if (!source.PLI_CBD_REAL_SOAP_CA_CERTIFICATE_PATH) {
    missingFields.push('PLI_CBD_REAL_SOAP_CA_CERTIFICATE_PATH')
  }

  if (missingFields.length > 0) {
    throw new Error(
      `Transport REAL_SOAP wymaga kompletnego bundle konfiguracji. Brakujace pola: ${missingFields.join(', ')}.`,
    )
  }

  if (
    source.PLI_CBD_REAL_SOAP_REQUEST_TIMEOUT_MS <
    source.PLI_CBD_REAL_SOAP_CONNECT_TIMEOUT_MS
  ) {
    throw new Error(
      'Transport REAL_SOAP ma niepoprawne timeouty: PLI_CBD_REAL_SOAP_REQUEST_TIMEOUT_MS musi byc >= PLI_CBD_REAL_SOAP_CONNECT_TIMEOUT_MS.',
    )
  }
}

export function buildPliCbdRealSoapConfig(
  source: PliCbdRealSoapEnvSource,
): PliCbdRealSoapConfig {
  validateRealSoapRequirements(source)

  const endpointUrl =
    source.PLI_CBD_REAL_SOAP_ENDPOINT_URL ?? 'https://placeholder.invalid/pli-cbd-soap'
  const endpointHost = new URL(endpointUrl).host
  const soapActions = buildSoapActions(source)
  const clientCertificateSource =
    source.PLI_CBD_REAL_SOAP_CLIENT_CERTIFICATE_ALIAS !== undefined ? 'ALIAS' : 'PATH'

  return {
    endpointUrl,
    endpointHost,
    connectTimeoutMs: source.PLI_CBD_REAL_SOAP_CONNECT_TIMEOUT_MS,
    requestTimeoutMs: source.PLI_CBD_REAL_SOAP_REQUEST_TIMEOUT_MS,
    clientCertificatePath: source.PLI_CBD_REAL_SOAP_CLIENT_CERTIFICATE_PATH ?? null,
    clientCertificateAlias: source.PLI_CBD_REAL_SOAP_CLIENT_CERTIFICATE_ALIAS ?? null,
    clientKeyPath: source.PLI_CBD_REAL_SOAP_CLIENT_KEY_PATH ?? 'REAL_SOAP_CLIENT_KEY_PATH_REQUIRED',
    caCertificatePath:
      source.PLI_CBD_REAL_SOAP_CA_CERTIFICATE_PATH ?? 'REAL_SOAP_CA_CERTIFICATE_PATH_REQUIRED',
    soapActions,
    environmentName: source.PLI_CBD_REAL_SOAP_ENVIRONMENT_NAME,
    profile: source.PLI_CBD_REAL_SOAP_PROFILE,
    diagnostics: {
      profile: source.PLI_CBD_REAL_SOAP_PROFILE,
      environmentName: source.PLI_CBD_REAL_SOAP_ENVIRONMENT_NAME,
      endpointHost,
      connectTimeoutMs: source.PLI_CBD_REAL_SOAP_CONNECT_TIMEOUT_MS,
      requestTimeoutMs: source.PLI_CBD_REAL_SOAP_REQUEST_TIMEOUT_MS,
      clientCertificateSource,
      hasClientKeyPath: Boolean(source.PLI_CBD_REAL_SOAP_CLIENT_KEY_PATH),
      hasCaCertificatePath: Boolean(source.PLI_CBD_REAL_SOAP_CA_CERTIFICATE_PATH),
      soapActions,
    },
  }
}

export function getPliCbdRealSoapConfig(): PliCbdRealSoapConfig {
  return buildPliCbdRealSoapConfig(env)
}
