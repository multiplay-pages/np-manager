import type { CommunicationDeliveryOutcome } from '@np-manager/shared'

// ============================================================
// INTERFEJS ADAPTERA TRANSPORTU KOMUNIKACJI
// Wzorowany na PliCbdTransportAdapter.
// ============================================================

export interface CommunicationDeliveryEnvelope {
  communicationId: string
  channel: 'EMAIL' | 'SMS'
  recipient: string
  subject: string
  body: string
}

export interface CommunicationDeliveryResult {
  outcome: CommunicationDeliveryOutcome
  adapterName: string
  transportMessageId: string | null
  transportReference: string | null
  errorCode: string | null
  errorMessage: string | null
  responsePayloadJson: Record<string, unknown> | null
  respondedAt: Date
}

export interface CommunicationDeliveryAdapter {
  readonly name: string
  send(envelope: CommunicationDeliveryEnvelope): Promise<CommunicationDeliveryResult>
}

// ============================================================
// STUB — nie wysyla niczego, symuluje sukces transportu
// ============================================================

export class CommunicationDeliveryStubAdapter implements CommunicationDeliveryAdapter {
  readonly name = 'COMMUNICATION_DELIVERY_STUB'

  async send(envelope: CommunicationDeliveryEnvelope): Promise<CommunicationDeliveryResult> {
    return {
      outcome: 'STUBBED',
      adapterName: this.name,
      transportMessageId: `stub-msg-${Date.now()}`,
      transportReference: `stub-ref-${envelope.communicationId}`,
      errorCode: null,
      errorMessage: null,
      responsePayloadJson: {
        mode: 'STUB',
        recipient: envelope.recipient,
        channel: envelope.channel,
        note: 'Transport STUB — zadna wiadomosc nie zostala faktycznie wyslana.',
      },
      respondedAt: new Date(),
    }
  }
}

// ============================================================
// FABRYKA ADAPTERA
// Wybiera adapter na podstawie zmiennej srodowiskowej
// COMMUNICATION_DELIVERY_ADAPTER (domyslnie: STUB)
// ============================================================

export function resolveCommunicationDeliveryAdapter(): CommunicationDeliveryAdapter {
  const profile = process.env.COMMUNICATION_DELIVERY_ADAPTER ?? 'STUB'

  if (profile === 'STUB') {
    return new CommunicationDeliveryStubAdapter()
  }

  // Placeholder: w przyszlosci mozna dodac REAL_EMAIL, REAL_SMS itd.
  throw new Error(
    `Nieobslugiwany adapter dostarczania komunikacji: "${profile}". Uzyj STUB lub zdefiniuj nowy adapter.`,
  )
}
