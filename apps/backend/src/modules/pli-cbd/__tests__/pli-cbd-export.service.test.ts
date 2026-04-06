import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  PliCbdAnyXmlPreviewBuildResultDto,
  PliCbdTransportEnvelopeDto,
  PliCbdTransportMode,
} from '@np-manager/shared'
import type { PliCbdTransportResult } from '../pli-cbd-transport.adapter'

// ============================================================
// Mocki — przed importem testowanego modułu
// ============================================================

const mockCreate = vi.fn()
const mockUpdate = vi.fn()

vi.mock('../../../config/database', () => ({
  prisma: {
    pliCbdIntegrationEvent: {
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}))

const mockBuildXmlPreview = vi.fn()
vi.mock('../pli-cbd-xml-preview.service', () => ({
  buildXmlPreviewForPortingRequest: (...args: unknown[]) => mockBuildXmlPreview(...args),
}))

const mockBuildEnvelope = vi.fn()
vi.mock('../pli-cbd-soap-envelope.builder', () => ({
  PLI_CBD_HUB_ROUTING_STUB: 'PLI_CBD_HUB_STUB',
  buildPliCbdTransportEnvelope: (...args: unknown[]) => mockBuildEnvelope(...args),
}))

// ── Fabryka adaptera: mockujemy tryb + adapter ──────────────
const mockAdapterSend = vi.fn()
let mockTransportMode: PliCbdTransportMode = 'STUB'

vi.mock('../pli-cbd-transport-adapter.factory', () => ({
  getActiveTransportMode: () => mockTransportMode,
  getActiveTransportAdapter: () => ({
    name: 'PLI_CBD_TRANSPORT_STUB',
    send: (...args: unknown[]) => mockAdapterSend(...args),
  }),
}))

import { triggerManualPliCbdExport } from '../pli-cbd-export.service'

// ============================================================
// Stałe testowe
// ============================================================

const MOCK_EVENT_ID = 'evt-test-001'
const MOCK_CREATED_AT = new Date('2026-04-04T10:00:00.000Z')
const MOCK_REQUEST_ID = 'req-test-001'
const MOCK_XML = '<?xml version="1.0" encoding="UTF-8"?><PliCbdMessagePreview/>'
const MOCK_CASE_NUMBER = 'FNP-2026-TEST'
const MOCK_SENDER_ROUTING = 'R-BIORCA-001'

// ============================================================
// Factory helpers
// ============================================================

function makeXmlResult(overrides: Record<string, unknown> = {}): PliCbdAnyXmlPreviewBuildResultDto {
  return {
    requestId: MOCK_REQUEST_ID,
    caseNumber: MOCK_CASE_NUMBER,
    messageType: 'E03',
    isReady: true,
    blockingReasons: [],
    technicalWarnings: [],
    payload: { recipientOperatorRoutingNumber: MOCK_SENDER_ROUTING } as never,
    xml: MOCK_XML,
    ...overrides,
  } as PliCbdAnyXmlPreviewBuildResultDto
}

function makeEnvelope(overrides: Partial<PliCbdTransportEnvelopeDto> = {}): PliCbdTransportEnvelopeDto {
  return {
    messageId: 'msg-uuid-001',
    messageType: 'E03',
    caseNumber: MOCK_CASE_NUMBER,
    senderRoutingNumber: MOCK_SENDER_ROUTING,
    receiverRoutingNumber: 'PLI_CBD_HUB_STUB',
    soapAction: 'urn:PLI_CBD_FNP_E03',
    protocolVersion: 'PLI_CBD_FNP_1.0',
    xmlPayload: MOCK_XML,
    builtAt: '2026-04-04T10:00:01.000Z',
    ...overrides,
  }
}

function makeTransportResult(overrides: Partial<PliCbdTransportResult> = {}): PliCbdTransportResult {
  return {
    outcome: 'STUBBED',
    adapterName: 'PLI_CBD_TRANSPORT_STUB',
    referenceId: null,
    rejectionReason: null,
    errorMessage: null,
    diagnostics: null,
    respondedAt: new Date('2026-04-04T10:00:02.000Z'),
    ...overrides,
  }
}

// ============================================================
// Setup
// ============================================================

describe('pli-cbd-export.service — triggerManualPliCbdExport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransportMode = 'STUB'
    mockCreate.mockResolvedValue({ id: MOCK_EVENT_ID, createdAt: MOCK_CREATED_AT })
    mockUpdate.mockResolvedValue({})
    mockBuildXmlPreview.mockResolvedValue(makeXmlResult())
    mockBuildEnvelope.mockReturnValue(makeEnvelope())
    mockAdapterSend.mockResolvedValue(makeTransportResult())
  })

  // ──────────────────────────────────────────────────────────
  // Przepływ: PENDING → envelope → adapter → SUCCESS
  // ──────────────────────────────────────────────────────────

  it('tworzy PENDING, buduje envelope, wysyła przez adapter i zamyka SUCCESS', async () => {
    await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E03', 'user-1')

    // Historia: PENDING na starcie
    expect(mockCreate).toHaveBeenCalledOnce()
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          operationType: 'EXPORT',
          operationStatus: 'PENDING',
          actionName: 'PLI_CBD_MANUAL_EXPORT_E03',
        }),
      }),
    )

    // Envelope builder wywołany
    expect(mockBuildEnvelope).toHaveBeenCalledOnce()

    // Adapter dostaje envelope (nie surowy XML)
    expect(mockAdapterSend).toHaveBeenCalledOnce()
    expect(mockAdapterSend).toHaveBeenCalledWith(expect.objectContaining({ messageId: 'msg-uuid-001' }))

    // Historia: SUCCESS na końcu
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: MOCK_EVENT_ID },
        data: expect.objectContaining({ operationStatus: 'SUCCESS' }),
      }),
    )
  })

  // ──────────────────────────────────────────────────────────
  // transportMode w DTO i requestPayloadJson
  // ──────────────────────────────────────────────────────────

  it('transportMode z fabryki jest zawarty w zwróconym DTO', async () => {
    mockTransportMode = 'STUB'
    const result = await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E03', 'user-tm1')
    expect(result.transportMode).toBe('STUB')
  })

  it('transportMode DISABLED jest zawarty w zwróconym DTO', async () => {
    mockTransportMode = 'DISABLED'
    mockAdapterSend.mockResolvedValue(makeTransportResult({ outcome: 'DISABLED' }))
    const result = await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E03', 'user-tm2')
    expect(result.transportMode).toBe('DISABLED')
  })

  it('transportMode REAL_SOAP jest zawarty w zwróconym DTO', async () => {
    mockTransportMode = 'REAL_SOAP'
    mockAdapterSend.mockResolvedValue(makeTransportResult({ outcome: 'NOT_IMPLEMENTED' }))
    const result = await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E03', 'user-tm3')
    expect(result.transportMode).toBe('REAL_SOAP')
  })

  it('transportMode trafia do requestPayloadJson historii integracji', async () => {
    mockTransportMode = 'DISABLED'
    mockAdapterSend.mockResolvedValue(makeTransportResult({ outcome: 'DISABLED' }))

    await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E03', 'user-tm4')

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requestPayloadJson: expect.objectContaining({ transportMode: 'DISABLED' }),
        }),
      }),
    )
  })

  // ──────────────────────────────────────────────────────────
  // Tryb DISABLED: artefakty zbudowane, SUCCESS (nie ERROR)
  // ──────────────────────────────────────────────────────────

  it('DISABLED: XML i envelope zbudowane, adapter wywołany, historia SUCCESS', async () => {
    mockTransportMode = 'DISABLED'
    mockAdapterSend.mockResolvedValue(makeTransportResult({ outcome: 'DISABLED' }))

    const result = await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E03', 'user-dis1')

    // Artefakty zbudowane
    expect(mockBuildEnvelope).toHaveBeenCalledOnce()
    expect(mockAdapterSend).toHaveBeenCalledOnce()

    // Historia SUCCESS (DISABLED = transport pominięty, nie błąd)
    expect(result.status).toBe('SUCCESS')
    expect(result.transportResult?.outcome).toBe('DISABLED')
    expect(result.envelopeSnapshot).not.toBeNull()

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ operationStatus: 'SUCCESS' }),
      }),
    )
  })

  // ──────────────────────────────────────────────────────────
  // Tryb REAL_SOAP placeholder: NOT_IMPLEMENTED → SUCCESS
  // ──────────────────────────────────────────────────────────

  it('REAL_SOAP placeholder: artefakty zbudowane, NOT_IMPLEMENTED → historia SUCCESS', async () => {
    mockTransportMode = 'REAL_SOAP'
    mockAdapterSend.mockResolvedValue(
      makeTransportResult({ outcome: 'NOT_IMPLEMENTED', errorMessage: 'SOAP niezaimplementowany' }),
    )

    const result = await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E03', 'user-soap1')

    expect(result.status).toBe('SUCCESS')
    expect(result.transportResult?.outcome).toBe('NOT_IMPLEMENTED')
    expect(result.transportMode).toBe('REAL_SOAP')
    expect(result.envelopeSnapshot).not.toBeNull()
  })

  // ──────────────────────────────────────────────────────────
  // Adapter dostaje envelope, nie surowy XML string
  // ──────────────────────────────────────────────────────────

  it('adapter.send otrzymuje cały PliCbdTransportEnvelopeDto', async () => {
    const envelope = makeEnvelope({ messageId: 'uuid-specific', soapAction: 'urn:PLI_CBD_FNP_E12' })
    mockBuildEnvelope.mockReturnValue(envelope)

    await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E12', 'user-2')

    const [calledWith] = mockAdapterSend.mock.calls[0] as [PliCbdTransportEnvelopeDto]
    expect(calledWith.messageId).toBe('uuid-specific')
    expect(calledWith.soapAction).toBe('urn:PLI_CBD_FNP_E12')
    expect(calledWith.xmlPayload).toBe(MOCK_XML)
    // Nie ma oddzielnych parametrów messageType/xml — wszystko w envelope
  })

  // ──────────────────────────────────────────────────────────
  // Builder dostaje poprawny kontekst (routingi, caseNumber)
  // ──────────────────────────────────────────────────────────

  it('envelope builder otrzymuje xml, messageType i kontekst sprawy', async () => {
    mockBuildXmlPreview.mockResolvedValue(
      makeXmlResult({ caseNumber: 'FNP-2026-CTX', payload: { recipientOperatorRoutingNumber: 'R-CTX' } as never }),
    )

    await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E03', 'user-3')

    expect(mockBuildEnvelope).toHaveBeenCalledWith(
      MOCK_XML,
      'E03',
      expect.objectContaining({
        caseNumber: 'FNP-2026-CTX',
        portingRequestId: MOCK_REQUEST_ID,
        senderRoutingNumber: 'R-CTX',
        receiverRoutingNumber: 'PLI_CBD_HUB_STUB',
      }),
    )
  })

  // ──────────────────────────────────────────────────────────
  // Snapshot envelope trafia do responsePayloadJson historii
  // ──────────────────────────────────────────────────────────

  it('envelope snapshot jest zapisany w responsePayloadJson historii integracji', async () => {
    const envelope = makeEnvelope({ messageId: 'snap-uuid', caseNumber: 'FNP-SNAP' })
    mockBuildEnvelope.mockReturnValue(envelope)

    await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E03', 'user-4')

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          responsePayloadJson: expect.objectContaining({
            envelopeSnapshot: expect.objectContaining({
              messageId: 'snap-uuid',
              caseNumber: 'FNP-SNAP',
            }),
          }),
        }),
      }),
    )
  })

  it('wynik adaptera (transport) też jest w responsePayloadJson obok envelope', async () => {
    mockBuildEnvelope.mockReturnValue(makeEnvelope())
    mockAdapterSend.mockResolvedValue(makeTransportResult({ outcome: 'ACCEPTED', referenceId: 'REF-001' }))

    await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E03', 'user-5')

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          responsePayloadJson: expect.objectContaining({
            envelopeSnapshot: expect.objectContaining({ messageId: 'msg-uuid-001' }),
            transport: expect.objectContaining({ outcome: 'ACCEPTED', referenceId: 'REF-001' }),
          }),
        }),
      }),
    )
  })

  it('xmlPreviewSnapshot jest w requestPayloadJson (oddzielnie od envelope)', async () => {
    await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E03', 'user-6')

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requestPayloadJson: expect.objectContaining({
            xmlPreviewSnapshot: MOCK_XML,
            messageType: 'E03',
            exportMode: 'MANUAL',
          }),
        }),
      }),
    )
  })

  // ──────────────────────────────────────────────────────────
  // Brak XML = brak envelope i brak wywołania adaptera
  // ──────────────────────────────────────────────────────────

  it('brak XML (blockingReasons) → envelope nie budowany, adapter nie wywoływany', async () => {
    mockBuildXmlPreview.mockResolvedValue(
      makeXmlResult({
        isReady: false,
        blockingReasons: [{ code: 'MISSING_DONOR_E06', message: 'Brak E06' }],
        xml: null,
        payload: null,
      }),
    )

    const result = await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E12', 'user-7')

    expect(mockBuildEnvelope).not.toHaveBeenCalled()
    expect(mockAdapterSend).not.toHaveBeenCalled()
    expect(result.status).toBe('ERROR')
    expect(result.envelopeSnapshot).toBeNull()
    expect(result.transportResult).toBeNull()
  })

  it('brak XML bez blockingReasons → envelope nie budowany, adapter nie wywoływany', async () => {
    mockBuildXmlPreview.mockResolvedValue(
      makeXmlResult({ isReady: false, blockingReasons: [], xml: null, payload: null }),
    )

    await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E18', null)

    expect(mockBuildEnvelope).not.toHaveBeenCalled()
    expect(mockAdapterSend).not.toHaveBeenCalled()
  })

  it('brak XML z blokadą → transportMode też trafia do requestPayloadJson', async () => {
    mockTransportMode = 'DISABLED'
    mockBuildXmlPreview.mockResolvedValue(
      makeXmlResult({ isReady: false, blockingReasons: [{ code: 'BLK', message: 'X' }], xml: null, payload: null }),
    )

    const result = await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E12', 'user-blk1')

    expect(result.transportMode).toBe('DISABLED')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requestPayloadJson: expect.objectContaining({ transportMode: 'DISABLED' }),
        }),
      }),
    )
  })

  // ──────────────────────────────────────────────────────────
  // Wyniki adaptera: ACCEPTED / REJECTED / TRANSPORT_ERROR / STUBBED
  // ──────────────────────────────────────────────────────────

  it('adapter ACCEPTED → SUCCESS, envelopeSnapshot i transportResult w DTO', async () => {
    mockAdapterSend.mockResolvedValue(
      makeTransportResult({ outcome: 'ACCEPTED', referenceId: 'PKG-ACC-001' }),
    )

    const result = await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E03', 'user-8')

    expect(result.status).toBe('SUCCESS')
    expect(result.transportResult?.outcome).toBe('ACCEPTED')
    expect(result.transportResult?.referenceId).toBe('PKG-ACC-001')
    expect(result.envelopeSnapshot?.messageId).toBe('msg-uuid-001')
  })

  it('adapter STUBBED → SUCCESS, envelopeSnapshot dostępny', async () => {
    mockAdapterSend.mockResolvedValue(makeTransportResult({ outcome: 'STUBBED' }))

    const result = await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E03', null)

    expect(result.status).toBe('SUCCESS')
    expect(result.envelopeSnapshot).not.toBeNull()
  })

  it('adapter REJECTED → ERROR, rejectionReason w historii', async () => {
    mockAdapterSend.mockResolvedValue(
      makeTransportResult({ outcome: 'REJECTED', rejectionReason: 'ERR-PLI-042: Format numeru' }),
    )

    const result = await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E12', 'user-9')

    expect(result.status).toBe('ERROR')
    expect(result.transportResult?.outcome).toBe('REJECTED')
    expect(result.errorMessage).toBe('ERR-PLI-042: Format numeru')
    // Envelope był zbudowany — XML powstał
    expect(result.envelopeSnapshot).not.toBeNull()

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ operationStatus: 'ERROR' }),
      }),
    )
  })

  it('adapter TRANSPORT_ERROR → ERROR, errorMessage z adaptera', async () => {
    mockAdapterSend.mockResolvedValue(
      makeTransportResult({ outcome: 'TRANSPORT_ERROR', errorMessage: 'Connection timeout 30s' }),
    )

    const result = await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E18', 'user-10')

    expect(result.status).toBe('ERROR')
    expect(result.transportResult?.outcome).toBe('TRANSPORT_ERROR')
    expect(result.errorMessage).toBe('Connection timeout 30s')
  })

  // ──────────────────────────────────────────────────────────
  // Adapter rzuca wyjątek
  // ──────────────────────────────────────────────────────────

  it('adapter rzuca wyjątek → ERROR, envelopeSnapshot zachowany w historii', async () => {
    mockAdapterSend.mockRejectedValue(new Error('ECONNREFUSED — PLI CBD niedostepny'))

    const result = await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E03', 'user-11')

    expect(result.status).toBe('ERROR')
    expect(result.transportResult).toBeNull()
    expect(result.errorMessage).toContain('ECONNREFUSED')
    // Envelope był zbudowany przed wyjątkiem
    expect(result.envelopeSnapshot).not.toBeNull()

    // Historia zapisuje envelopeSnapshot nawet gdy adapter rzucił
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          operationStatus: 'ERROR',
          responsePayloadJson: expect.objectContaining({
            envelopeSnapshot: expect.objectContaining({ messageId: 'msg-uuid-001' }),
          }),
        }),
      }),
    )
  })

  it('pipeline rzuca wyjątek przed envelope → ERROR bez envelopeSnapshot w historii', async () => {
    mockBuildXmlPreview.mockRejectedValue(new Error('DB connection lost'))

    const result = await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E03', 'user-12')

    expect(result.status).toBe('ERROR')
    expect(result.envelopeSnapshot).toBeNull()
    expect(mockBuildEnvelope).not.toHaveBeenCalled()
    expect(mockAdapterSend).not.toHaveBeenCalled()
  })

  // ──────────────────────────────────────────────────────────
  // technicalWarnings
  // ──────────────────────────────────────────────────────────

  it('technicalWarnings są w requestPayloadJson niezależnie od wyniku adaptera', async () => {
    const warnings = [{ code: 'DONOR_ASSIGNED_PORT_TIME_MISSING', message: 'Brak godziny' }]
    mockBuildXmlPreview.mockResolvedValue(makeXmlResult({ technicalWarnings: warnings }))

    await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E12', 'user-13')

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requestPayloadJson: expect.objectContaining({ technicalWarnings: warnings }),
        }),
      }),
    )
  })

  // ──────────────────────────────────────────────────────────
  // Regresja: historia ZAWSZE zamykana jako ERROR gdy wysyłka nieudana
  // ──────────────────────────────────────────────────────────

  it('[regresja] REJECTED → historia ma operationStatus ERROR i completedAt', async () => {
    mockAdapterSend.mockResolvedValue(makeTransportResult({ outcome: 'REJECTED', rejectionReason: 'X' }))

    await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E23', 'user-reg1')

    const updateData = (mockUpdate.mock.calls[0] as [{ data: Record<string, unknown> }])[0].data
    expect(updateData.operationStatus).toBe('ERROR')
    expect(updateData.completedAt).toBeInstanceOf(Date)
  })

  it('[regresja] TRANSPORT_ERROR → historia ma operationStatus ERROR i completedAt', async () => {
    mockAdapterSend.mockResolvedValue(makeTransportResult({ outcome: 'TRANSPORT_ERROR', errorMessage: 'timeout' }))

    await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E03', null)

    const updateData = (mockUpdate.mock.calls[0] as [{ data: Record<string, unknown> }])[0].data
    expect(updateData.operationStatus).toBe('ERROR')
    expect(updateData.completedAt).toBeInstanceOf(Date)
  })

  it('[regresja] blockingReasons → historia ERROR bez responsePayloadJson', async () => {
    mockBuildXmlPreview.mockResolvedValue(
      makeXmlResult({ isReady: false, blockingReasons: [{ code: 'BLK', message: 'X' }], xml: null, payload: null }),
    )

    await triggerManualPliCbdExport(MOCK_REQUEST_ID, 'E12', 'user-reg3')

    const updateData = (mockUpdate.mock.calls[0] as [{ data: Record<string, unknown> }])[0].data
    expect(updateData.operationStatus).toBe('ERROR')
    expect(updateData.responsePayloadJson).toBeUndefined()
  })
})
