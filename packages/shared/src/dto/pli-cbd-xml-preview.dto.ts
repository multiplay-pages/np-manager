import type { FnpBlockingReason } from './pli-cbd-process.dto'
import type {
  PliCbdAnyTechnicalPayloadDto,
  PliCbdE03TechnicalPayloadDto,
  PliCbdE12TechnicalPayloadDto,
  PliCbdE18TechnicalPayloadDto,
  PliCbdE23TechnicalPayloadDto,
  PliCbdTechnicalPayloadDto,
  PliCbdTechnicalPayloadWarningDto,
} from './pli-cbd-technical-payload.dto'

export interface PliCbdXmlPreviewBuildResultDto<TPayload extends PliCbdTechnicalPayloadDto> {
  requestId: string
  caseNumber: string
  messageType: TPayload['messageType']
  isReady: boolean
  blockingReasons: FnpBlockingReason[]
  technicalWarnings: PliCbdTechnicalPayloadWarningDto[]
  payload: TPayload | null
  xml: string | null
}

export interface PliCbdE03XmlPreviewBuildResultDto extends PliCbdXmlPreviewBuildResultDto<PliCbdE03TechnicalPayloadDto> {}

export interface PliCbdE12XmlPreviewBuildResultDto extends PliCbdXmlPreviewBuildResultDto<PliCbdE12TechnicalPayloadDto> {}

export interface PliCbdE18XmlPreviewBuildResultDto extends PliCbdXmlPreviewBuildResultDto<PliCbdE18TechnicalPayloadDto> {}

export interface PliCbdE23XmlPreviewBuildResultDto extends PliCbdXmlPreviewBuildResultDto<PliCbdE23TechnicalPayloadDto> {}

export type PliCbdAnyXmlPreviewBuildResultDto =
  | PliCbdE03XmlPreviewBuildResultDto
  | PliCbdE12XmlPreviewBuildResultDto
  | PliCbdE18XmlPreviewBuildResultDto
  | PliCbdE23XmlPreviewBuildResultDto

export interface PliCbdXmlSerializationResultDto<TPayload extends PliCbdAnyTechnicalPayloadDto> {
  payload: TPayload
  xml: string
}
