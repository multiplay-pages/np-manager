import { Prisma } from '@prisma/client'
import { prisma } from '../../config/database'
import type {
  FnpBlockingReason,
  PliCbdManualExportMessageType,
  PliCbdManualExportResultDto,
  PliCbdTransportEnvelopeDto,
  PliCbdTransportResultDto,
  PliCbdTechnicalPayloadWarningDto,
} from '@np-manager/shared'
import { buildXmlPreviewForPortingRequest } from './pli-cbd-xml-preview.service'
import type { PliCbdTechnicalPayloadMessageType } from './pli-cbd-technical-payload.service'
import {
  buildPliCbdTransportEnvelope,
  PLI_CBD_HUB_ROUTING_STUB,
} from './pli-cbd-soap-envelope.builder'
import type { PliCbdTransportResult } from './pli-cbd-transport.adapter'
import {
  getActiveTransportAdapter,
  getActiveTransportMode,
} from './pli-cbd-transport-adapter.factory'

// ============================================================
// Helpers
// ============================================================

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined
  return JSON.parse(
    JSON.stringify(value, (_key, v: unknown) => {
      if (v instanceof Date) return v.toISOString()
      return v
    }),
  ) as Prisma.InputJsonValue
}

function buildBlockingErrorMessage(blockingReasons: FnpBlockingReason[]): string {
  if (blockingReasons.length > 0) {
    return `Eksport zablokowany: ${blockingReasons.map((r) => r.code).join(', ')}`
  }
  return 'Nie udalo sie zbudowac XML dla tego komunikatu.'
}

function toTransportResultDto(result: PliCbdTransportResult): PliCbdTransportResultDto {
  return {
    outcome: result.outcome,
    adapterName: result.adapterName,
    referenceId: result.referenceId,
    rejectionReason: result.rejectionReason,
    errorMessage: result.errorMessage,
    diagnostics: result.diagnostics,
    respondedAt: result.respondedAt.toISOString(),
  }
}

function isTransportSuccess(result: PliCbdTransportResult): boolean {
  return (
    result.outcome === 'ACCEPTED' ||
    result.outcome === 'STUBBED' ||
    result.outcome === 'DISABLED' ||
    result.outcome === 'NOT_IMPLEMENTED'
  )
}

function buildTransportErrorMessage(result: PliCbdTransportResult): string {
  if (result.outcome === 'REJECTED') {
    return result.rejectionReason ?? 'Komunikat odrzucony przez PLI CBD.'
  }
  return result.errorMessage ?? 'Blad transportu do PLI CBD.'
}

// ============================================================
// Serwis manualnego eksportu PLI CBD
//
// Pipeline — każdy krok ma pojedynczą odpowiedzialność:
//
//  Krok 1 — Historia  : utwórz PENDING              (startedAt)
//  Krok 2 — Pipeline  : draft → payload → xml
//  Krok 3 — Envelope  : xml → transport envelope    ← granica buildera
//  Krok 4 — Transport : adapter.send(envelope)      ← pobierany z fabryki
//  Krok 5 — Historia  : zamknij SUCCESS/ERROR        (finishedAt)
//
// Aby zmienić tryb transportu:
//   ustaw PLI_CBD_TRANSPORT_MODE=DISABLED|STUB|REAL_SOAP w .env
//
// Aby podmienić transport:
//   podmień adapter w pli-cbd-transport-adapter.factory.ts
//
// Aby zmienić format envelopa:
//   zmodyfikuj buildPliCbdTransportEnvelope w pli-cbd-soap-envelope.builder.ts
//
// Kroki 1, 2, 5 pozostają niezmienione przy wszystkich trybach.
// ============================================================

export async function triggerManualPliCbdExport(
  portingRequestId: string,
  messageType: PliCbdManualExportMessageType,
  triggeredByUserId: string | null,
): Promise<PliCbdManualExportResultDto> {
  const actionName = `PLI_CBD_MANUAL_EXPORT_${messageType}`
  const transportMode = getActiveTransportMode()
  const transportAdapter = getActiveTransportAdapter()

  // ── Krok 1: Historia — utwórz PENDING ──────────────────────
  const event = await prisma.pliCbdIntegrationEvent.create({
    data: {
      portingRequestId,
      operationType: 'EXPORT',
      operationStatus: 'PENDING',
      actionName,
      triggeredByUserId,
    },
    select: { id: true, createdAt: true },
  })

  let blockingReasons: FnpBlockingReason[] = []
  let technicalWarnings: PliCbdTechnicalPayloadWarningDto[] = []
  let xml: string | null = null
  let envelope: PliCbdTransportEnvelopeDto | null = null

  try {
    // ── Krok 2: Pipeline — draft → technical payload → xml ────
    const xmlResult = await buildXmlPreviewForPortingRequest(
      portingRequestId,
      messageType as PliCbdTechnicalPayloadMessageType,
    )

    blockingReasons = xmlResult.blockingReasons
    technicalWarnings = xmlResult.technicalWarnings
    xml = xmlResult.xml

    // Snapshot diagnostyczny budowany raz; trafia do requestPayloadJson
    const diagnosticSnapshot = toJson({
      messageType,
      exportMode: 'MANUAL',
      transportMode,
      blockingReasons,
      technicalWarnings,
      xmlPreviewSnapshot: xml,
    })

    if (!xml) {
      // XML nie powstał — eksport zablokowany; envelope i transport nie próbowane
      const errorMessage = buildBlockingErrorMessage(blockingReasons)
      const completedAt = new Date()

      await prisma.pliCbdIntegrationEvent.update({
        where: { id: event.id },
        data: {
          operationStatus: 'ERROR',
          requestPayloadJson: diagnosticSnapshot,
          errorMessage,
          completedAt,
        },
      })

      return {
        integrationEventId: event.id,
        portingRequestId,
        messageType,
        status: 'ERROR',
        transportMode,
        blockingReasons,
        technicalWarnings,
        xml: null,
        envelopeSnapshot: null,
        transportResult: null,
        errorMessage,
        startedAt: event.createdAt.toISOString(),
        finishedAt: completedAt.toISOString(),
      }
    }

    // ── Krok 3: Envelope — opakowuje xml w transport request ──
    //
    // Builder jest czystą funkcją. Routing numbers pobierane z payloadu
    // technicznego (zawsze dostępnego gdy xml !== null).
    // receiverRoutingNumber = stub; zastąpiony konfiguracją przy SOAP.
    envelope = buildPliCbdTransportEnvelope(xml, messageType, {
      caseNumber: xmlResult.caseNumber,
      portingRequestId,
      senderRoutingNumber:
        xmlResult.payload?.recipientOperatorRoutingNumber ?? 'STUB_SENDER',
      receiverRoutingNumber: PLI_CBD_HUB_ROUTING_STUB,
    })

    // ── Krok 4: Transport — adapter wysyła envelope ────────────
    //
    // Adapter pochodzi z fabryki; export service nie zna trybu bezpośrednio.
    const transportResult = await transportAdapter.send(envelope)

    // ── Krok 5: Historia — zamknij wpis z pełnym snapshotem ───
    const completedAt = new Date()
    const transportSucceeded = isTransportSuccess(transportResult)
    const errorMessage = transportSucceeded ? null : buildTransportErrorMessage(transportResult)

    await prisma.pliCbdIntegrationEvent.update({
      where: { id: event.id },
      data: {
        operationStatus: transportSucceeded ? 'SUCCESS' : 'ERROR',
        requestPayloadJson: diagnosticSnapshot,
        responsePayloadJson: toJson({
          envelopeSnapshot: envelope,
          transport: transportResult,
        }),
        errorMessage,
        completedAt,
      },
    })

    return {
      integrationEventId: event.id,
      portingRequestId,
      messageType,
      status: transportSucceeded ? 'SUCCESS' : 'ERROR',
      transportMode,
      blockingReasons,
      technicalWarnings,
      xml,
      envelopeSnapshot: envelope,
      transportResult: toTransportResultDto(transportResult),
      errorMessage,
      startedAt: event.createdAt.toISOString(),
      finishedAt: completedAt.toISOString(),
    }
  } catch (error) {
    // Nieoczekiwany wyjątek — zawsze zamknij PENDING jako ERROR
    const errorMessage =
      error instanceof Error ? error.message : 'Nieznany blad eksportu PLI CBD.'
    const completedAt = new Date()

    await prisma.pliCbdIntegrationEvent.update({
      where: { id: event.id },
      data: {
        operationStatus: 'ERROR',
        requestPayloadJson: toJson({
          messageType,
          exportMode: 'MANUAL',
          transportMode,
          blockingReasons,
          technicalWarnings,
          xmlPreviewSnapshot: xml,
        }),
        responsePayloadJson: envelope ? toJson({ envelopeSnapshot: envelope }) : undefined,
        errorMessage,
        completedAt,
      },
    })

    return {
      integrationEventId: event.id,
      portingRequestId,
      messageType,
      status: 'ERROR',
      transportMode,
      blockingReasons,
      technicalWarnings,
      xml,
      envelopeSnapshot: envelope,
      transportResult: null,
      errorMessage,
      startedAt: event.createdAt.toISOString(),
      finishedAt: completedAt.toISOString(),
    }
  }
}
