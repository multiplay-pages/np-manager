import type {
  PliCbdAnyTechnicalPayloadBuildResultDto,
  PliCbdAnyTechnicalPayloadDto,
  PliCbdAnyXmlPreviewBuildResultDto,
  PliCbdE03XmlPreviewBuildResultDto,
  PliCbdE12XmlPreviewBuildResultDto,
  PliCbdE18XmlPreviewBuildResultDto,
  PliCbdE23XmlPreviewBuildResultDto,
  PliCbdTechnicalPayloadDto,
  PliCbdXmlPreviewBuildResultDto,
} from '@np-manager/shared'
import {
  buildE03TechnicalPayloadForPortingRequest,
  buildE12TechnicalPayloadForPortingRequest,
  buildE18TechnicalPayloadForPortingRequest,
  buildE23TechnicalPayloadForPortingRequest,
  type PliCbdTechnicalPayloadMessageType,
} from './pli-cbd-technical-payload.service'
import { serializeTechnicalPayloadToXmlPreview } from './pli-cbd-xml-preview.serializer'
import { AppError } from '../../shared/errors/app-error'

export async function buildE03XmlPreviewForPortingRequest(
  requestId: string,
): Promise<PliCbdE03XmlPreviewBuildResultDto> {
  const payloadResult = await buildE03TechnicalPayloadForPortingRequest(requestId)
  return mapPayloadResultToXmlPreview('E03', payloadResult)
}

export async function buildE12XmlPreviewForPortingRequest(
  requestId: string,
): Promise<PliCbdE12XmlPreviewBuildResultDto> {
  const payloadResult = await buildE12TechnicalPayloadForPortingRequest(requestId)
  return mapPayloadResultToXmlPreview('E12', payloadResult)
}

export async function buildE18XmlPreviewForPortingRequest(
  requestId: string,
): Promise<PliCbdE18XmlPreviewBuildResultDto> {
  const payloadResult = await buildE18TechnicalPayloadForPortingRequest(requestId)
  return mapPayloadResultToXmlPreview('E18', payloadResult)
}

export async function buildE23XmlPreviewForPortingRequest(
  requestId: string,
): Promise<PliCbdE23XmlPreviewBuildResultDto> {
  const payloadResult = await buildE23TechnicalPayloadForPortingRequest(requestId)
  return mapPayloadResultToXmlPreview('E23', payloadResult)
}

export async function buildXmlPreviewForPortingRequest(
  requestId: string,
  messageType: PliCbdTechnicalPayloadMessageType,
): Promise<PliCbdAnyXmlPreviewBuildResultDto> {
  switch (messageType) {
    case 'E03':
      return buildE03XmlPreviewForPortingRequest(requestId)
    case 'E12':
      return buildE12XmlPreviewForPortingRequest(requestId)
    case 'E18':
      return buildE18XmlPreviewForPortingRequest(requestId)
    case 'E23':
      return buildE23XmlPreviewForPortingRequest(requestId)
    default:
      throw AppError.badRequest(
        `Nieobslugiwany typ XML preview: ${messageType}.`,
        'PLI_CBD_XML_PREVIEW_MESSAGE_UNSUPPORTED',
      )
  }
}

function mapPayloadResultToXmlPreview<TPayload extends PliCbdTechnicalPayloadDto>(
  messageType: TPayload['messageType'],
  payloadResult: PliCbdAnyTechnicalPayloadBuildResultDto & { payload: TPayload | null },
): PliCbdXmlPreviewBuildResultDto<TPayload> {
  if (!payloadResult.payload) {
    return {
      requestId: payloadResult.requestId,
      caseNumber: payloadResult.caseNumber,
      messageType,
      isReady: payloadResult.isReady,
      blockingReasons: payloadResult.blockingReasons,
      technicalWarnings: payloadResult.technicalWarnings,
      payload: null,
      xml: null,
    }
  }

  const serialized = serializeTechnicalPayloadToXmlPreview(
    payloadResult.payload as PliCbdAnyTechnicalPayloadDto,
  )

  return {
    requestId: payloadResult.requestId,
    caseNumber: payloadResult.caseNumber,
    messageType,
    isReady: payloadResult.isReady,
    blockingReasons: payloadResult.blockingReasons,
    technicalWarnings: payloadResult.technicalWarnings,
    payload: payloadResult.payload,
    xml: serialized.xml,
  }
}
