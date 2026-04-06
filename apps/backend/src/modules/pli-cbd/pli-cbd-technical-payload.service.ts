import type {
  FnpBlockingReason,
  PliCbdAnyTechnicalPayloadBuildResultDto,
  PliCbdAnyTechnicalPayloadDto,
  PliCbdE03TechnicalPayloadBuildResultDto,
  PliCbdE12TechnicalPayloadBuildResultDto,
  PliCbdE18TechnicalPayloadBuildResultDto,
  PliCbdE23TechnicalPayloadBuildResultDto,
  PliCbdTechnicalPayloadBuildResultDto,
} from '@np-manager/shared'
import {
  buildE03DraftForPortingRequest,
  buildE12DraftForPortingRequest,
  buildE18DraftForPortingRequest,
  buildE23DraftForPortingRequest,
} from './fnp-process.service'
import {
  mapE03DraftToTechnicalPayload,
  mapE12DraftToTechnicalPayload,
  mapE18DraftToTechnicalPayload,
  mapE23DraftToTechnicalPayload,
} from './pli-cbd-technical-payload.mapper'
import { AppError } from '../../shared/errors/app-error'

export type PliCbdTechnicalPayloadMessageType = 'E03' | 'E12' | 'E18' | 'E23'

export async function buildE03TechnicalPayloadForPortingRequest(
  requestId: string,
): Promise<PliCbdE03TechnicalPayloadBuildResultDto> {
  const draftResult = await buildE03DraftForPortingRequest(requestId)
  return mapDraftBuildResult(draftResult, mapE03DraftToTechnicalPayload)
}

export async function buildE12TechnicalPayloadForPortingRequest(
  requestId: string,
): Promise<PliCbdE12TechnicalPayloadBuildResultDto> {
  const draftResult = await buildE12DraftForPortingRequest(requestId)
  return mapDraftBuildResult(draftResult, mapE12DraftToTechnicalPayload)
}

export async function buildE18TechnicalPayloadForPortingRequest(
  requestId: string,
): Promise<PliCbdE18TechnicalPayloadBuildResultDto> {
  const draftResult = await buildE18DraftForPortingRequest(requestId)
  return mapDraftBuildResult(draftResult, mapE18DraftToTechnicalPayload)
}

export async function buildE23TechnicalPayloadForPortingRequest(
  requestId: string,
): Promise<PliCbdE23TechnicalPayloadBuildResultDto> {
  const draftResult = await buildE23DraftForPortingRequest(requestId)
  return mapDraftBuildResult(draftResult, mapE23DraftToTechnicalPayload)
}

export async function buildTechnicalPayloadForPortingRequest(
  requestId: string,
  messageType: PliCbdTechnicalPayloadMessageType,
): Promise<PliCbdAnyTechnicalPayloadBuildResultDto> {
  switch (messageType) {
    case 'E03':
      return buildE03TechnicalPayloadForPortingRequest(requestId)
    case 'E12':
      return buildE12TechnicalPayloadForPortingRequest(requestId)
    case 'E18':
      return buildE18TechnicalPayloadForPortingRequest(requestId)
    case 'E23':
      return buildE23TechnicalPayloadForPortingRequest(requestId)
    default:
      throw AppError.badRequest(
        `Nieobslugiwany typ payloadu technicznego: ${messageType}.`,
        'PLI_CBD_TECHNICAL_PAYLOAD_MESSAGE_UNSUPPORTED',
      )
  }
}

function mapDraftBuildResult<
  TDraftBuildResult extends {
    requestId: string
    caseNumber: string
    isReady: boolean
    blockingReasons: FnpBlockingReason[]
    draft: unknown
  },
  TPayload extends PliCbdAnyTechnicalPayloadDto,
>(
  draftResult: TDraftBuildResult,
  mapper: (draft: NonNullable<TDraftBuildResult['draft']>) => {
    payload: TPayload
    technicalWarnings: PliCbdTechnicalPayloadBuildResultDto<TPayload>['technicalWarnings']
  },
): PliCbdTechnicalPayloadBuildResultDto<TPayload> {
  if (!draftResult.isReady || !draftResult.draft) {
    return {
      requestId: draftResult.requestId,
      caseNumber: draftResult.caseNumber,
      isReady: false,
      blockingReasons: draftResult.blockingReasons,
      technicalWarnings: [],
      payload: null,
    }
  }

  const mapped = mapper(draftResult.draft)

  return {
    requestId: draftResult.requestId,
    caseNumber: draftResult.caseNumber,
    isReady: true,
    blockingReasons: draftResult.blockingReasons,
    technicalWarnings: mapped.technicalWarnings,
    payload: mapped.payload,
  }
}
