import type { PliCbdTransportEnvelopeDto, PliCbdTransportOutcome } from '@np-manager/shared'
import type { PliCbdRealSoapConfig } from '../../config/pli-cbd-real-soap.config'

export interface PliCbdTransportResult {
  outcome: PliCbdTransportOutcome
  adapterName: string
  referenceId: string | null
  rejectionReason: string | null
  errorMessage: string | null
  diagnostics: Record<string, unknown> | null
  respondedAt: Date
}

export interface PliCbdTransportAdapter {
  readonly name: string
  send(envelope: PliCbdTransportEnvelopeDto): Promise<PliCbdTransportResult>
}

export class PliCbdTransportStubAdapter implements PliCbdTransportAdapter {
  readonly name = 'PLI_CBD_TRANSPORT_STUB'

  async send(_envelope: PliCbdTransportEnvelopeDto): Promise<PliCbdTransportResult> {
    return {
      outcome: 'STUBBED',
      adapterName: this.name,
      referenceId: null,
      rejectionReason: null,
      errorMessage: null,
      diagnostics: null,
      respondedAt: new Date(),
    }
  }
}

export class PliCbdTransportDisabledAdapter implements PliCbdTransportAdapter {
  readonly name = 'PLI_CBD_TRANSPORT_DISABLED'

  async send(_envelope: PliCbdTransportEnvelopeDto): Promise<PliCbdTransportResult> {
    return {
      outcome: 'DISABLED',
      adapterName: this.name,
      referenceId: null,
      rejectionReason: null,
      errorMessage: null,
      diagnostics: null,
      respondedAt: new Date(),
    }
  }
}

export class PliCbdRealSoapPlaceholderAdapter implements PliCbdTransportAdapter {
  readonly name = 'PLI_CBD_REAL_SOAP_PLACEHOLDER'

  constructor(private readonly config: PliCbdRealSoapConfig) {}

  async send(envelope: PliCbdTransportEnvelopeDto): Promise<PliCbdTransportResult> {
    return {
      outcome: 'NOT_IMPLEMENTED',
      adapterName: this.name,
      referenceId: null,
      rejectionReason: null,
      errorMessage: `Realny transport SOAP PLI CBD nie jest jeszcze zaimplementowany dla profilu ${this.config.profile}.`,
      diagnostics: {
        profile: this.config.profile,
        environmentName: this.config.environmentName,
        endpointHost: this.config.endpointHost,
        configuredSoapAction: this.config.soapActions[envelope.messageType],
        envelopeSoapAction: envelope.soapAction,
        connectTimeoutMs: this.config.connectTimeoutMs,
        requestTimeoutMs: this.config.requestTimeoutMs,
        certificateSource: this.config.diagnostics.clientCertificateSource,
        hasClientKeyPath: this.config.diagnostics.hasClientKeyPath,
        hasCaCertificatePath: this.config.diagnostics.hasCaCertificatePath,
      },
      respondedAt: new Date(),
    }
  }
}
