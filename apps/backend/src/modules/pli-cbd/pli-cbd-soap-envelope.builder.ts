import { randomUUID } from 'crypto'
import type { PliCbdManualExportMessageType, PliCbdTransportEnvelopeDto } from '@np-manager/shared'

// ============================================================
// Stałe protokołu
// ============================================================

/**
 * Wersja protokołu PLI CBD FNP wpisywana do envelopa.
 * Zmieniana przy upgrade protokołu — tylko tutaj.
 */
export const PLI_CBD_FNP_PROTOCOL_VERSION = 'PLI_CBD_FNP_1.0'

/**
 * Stub routing number docelowego hub PLI CBD.
 * Zastępowany adresem Adescom / platformy pośredniej przy podpięciu
 * realnego transportu SOAP.
 */
export const PLI_CBD_HUB_ROUTING_STUB = 'PLI_CBD_HUB_STUB'

// ============================================================
// Kontrakt buildera
// ============================================================

export interface PliCbdEnvelopeBuildContext {
  /** Numer sprawy portowania (z wyników pipeline XML) */
  caseNumber: string
  /** ID sprawy portowania (do celów audytu) */
  portingRequestId: string
  /**
   * Routing number nadawcy — operator bioracy (Recipient).
   * Pobierany z technicalPayload.recipientOperatorRoutingNumber.
   */
  senderRoutingNumber: string
  /**
   * Routing number odbiorcy — PLI CBD hub / platforma pośrednia.
   * W trybie stub: PLI_CBD_HUB_STUB.
   * W produkcji: z konfiguracji środowiskowej.
   */
  receiverRoutingNumber: string
}

// ============================================================
// Builder
//
// Czysta funkcja — brak side-effectów, brak DB, brak I/O.
// Jedyne źródło niedeterminizmu to randomUUID() i new Date(),
// które można podmienić w testach przez mockowanie modułu.
//
// Odpowiedzialność: opakowanie XML preview w transport envelope.
// NIE buduje SOAP XML body — to zadanie realnego SOAP adaptera.
// ============================================================

export function buildPliCbdTransportEnvelope(
  xmlPayload: string,
  messageType: PliCbdManualExportMessageType,
  context: PliCbdEnvelopeBuildContext,
): PliCbdTransportEnvelopeDto {
  return {
    messageId: randomUUID(),
    messageType,
    caseNumber: context.caseNumber,
    senderRoutingNumber: context.senderRoutingNumber,
    receiverRoutingNumber: context.receiverRoutingNumber,
    soapAction: `urn:PLI_CBD_FNP_${messageType}`,
    protocolVersion: PLI_CBD_FNP_PROTOCOL_VERSION,
    xmlPayload,
    builtAt: new Date().toISOString(),
  }
}
