import { Prisma, type PliCbdExportStatus } from '@prisma/client'
import type { PliCbdExxType } from '@np-manager/shared'

export const PLI_CBD_TRIGGER_SELECT = {
  id: true,
  caseNumber: true,
  numberType: true,
  numberRangeKind: true,
  primaryNumber: true,
  rangeStart: true,
  rangeEnd: true,
  portingMode: true,
  requestedPortDate: true,
  earliestAcceptablePortDate: true,
  statusInternal: true,
  pliCbdCaseId: true,
  pliCbdCaseNumber: true,
  pliCbdExportStatus: true,
  donorAssignedPortDate: true,
  donorAssignedPortTime: true,
  lastExxReceived: true,
  lastPliCbdStatusCode: true,
  lastPliCbdStatusDescription: true,
  donorOperator: {
    select: { id: true, name: true, routingNumber: true },
  },
  recipientOperator: {
    select: { id: true, name: true, routingNumber: true },
  },
} as const

export type PliCbdTriggerRow = Prisma.PortingRequestGetPayload<{
  select: typeof PLI_CBD_TRIGGER_SELECT
}>

export interface PortingRequestPliCbdAdapterResult {
  exportStatus?: PliCbdExportStatus
  pliCbdCaseId?: string | null
  pliCbdCaseNumber?: string | null
  pliCbdLastSyncAt?: Date | null
  donorAssignedPortDate?: Date | null
  donorAssignedPortTime?: string | null
  lastPliCbdMessageType?: PliCbdExxType | null
  lastPliCbdStatusCode?: string | null
  lastPliCbdStatusDescription?: string | null
}

export interface PortingRequestPliCbdAdapter {
  exportPortingRequestToPliCbd(
    request: PliCbdTriggerRow,
  ): Promise<PortingRequestPliCbdAdapterResult>
  syncPortingRequestFromPliCbd(
    request: PliCbdTriggerRow,
  ): Promise<PortingRequestPliCbdAdapterResult>
}

class ManualPliCbdAdapter implements PortingRequestPliCbdAdapter {
  async exportPortingRequestToPliCbd(): Promise<PortingRequestPliCbdAdapterResult> {
    return {
      exportStatus: 'EXPORT_PENDING',
    }
  }

  async syncPortingRequestFromPliCbd(): Promise<PortingRequestPliCbdAdapterResult> {
    return {
      pliCbdLastSyncAt: new Date(),
    }
  }
}

export const portingRequestPliCbdAdapter: PortingRequestPliCbdAdapter =
  new ManualPliCbdAdapter()
