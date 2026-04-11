import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAuthStore } from '@/stores/auth.store'
import {
  assignPortingRequestToMe,
  cancelPortingCommunication,
  createPortingCommunicationDraft,
  executePortingRequestExternalAction,
  exportPortingRequest,
  getPortingRequestAssignmentHistory,
  getPortingCommunicationDeliveryAttempts,
  getPortingRequestById,
  getPortingRequestCaseHistory,
  getPortingRequestCommunicationHistory,
  getPortingRequestInternalNotificationAttempts,
  getPortingRequestInternalNotifications,
  getPortingRequestNotificationFailures,
  getPortingRequestE03Draft,
  getPortingRequestE12Draft,
  getPortingRequestE18Draft,
  getPortingRequestIntegrationEvents,
  getPortingRequestProcessSnapshot,
  getPortingRequestTechnicalPayload,
  getPortingRequestAssignmentUsers,
  getPortingRequestXmlPreview,
  markPortingCommunicationAsSent,
  previewPortingCommunicationDraft,
  retryPortingCommunication,
  sendPortingCommunication,
  triggerManualPliCbdExport,
  type PliCbdTechnicalPayloadApiMessageType,
  syncPortingRequest,
  updatePortingRequestAssignment,
  updatePortingRequestCommercialOwner,
  updatePortingRequestStatus,
  listCommercialOwnerCandidates,
} from '@/services/portingRequests.api'
import {
  CONTACT_CHANNEL_LABELS,
  NUMBER_TYPE_LABELS,
  PLI_CBD_EXPORT_STATUS_LABELS,
  PORTED_NUMBER_KIND_LABELS,
  PORTING_CASE_STATUS_LABELS,
  PORTING_MODE_LABELS,
  SUBSCRIBER_IDENTITY_TYPE_LABELS,
  type CommunicationDeliveryAttemptsResultDto,
  type PliCbdAnyTechnicalPayloadBuildResultDto,
  type PliCbdAnyXmlPreviewBuildResultDto,
  type PliCbdE03DraftBuildResultDto,
  type PliCbdE12DraftBuildResultDto,
  type PliCbdE18DraftBuildResultDto,
  type PliCbdIntegrationEventDto,
  type PliCbdManualExportMessageType,
  type PliCbdManualExportResultDto,
  type PliCbdProcessSnapshotDto,
  type PortingCommunicationDto,
  type PortingCommunicationPreviewDto,
  type PortingCommunicationSummaryDto,
  type InternalNotificationDeliveryAttemptDto,
  type PortingInternalNotificationHistoryItemDto,
  type PortingRequestAssignmentUserOptionDto,
  type PortingRequestCaseHistoryItemDto,
  type PortingRequestCommunicationActionType,
  type PortingRequestDetailDto,
  type PortingRequestExternalActionDto,
  type PortingRequestAssignmentHistoryItemDto,
  type PortingRequestStatusActionDto,
  type CommercialOwnerCandidateDto,
  type NotificationFailureHistoryItemDto,
  type NotificationHealthDiagnosticsDto,
} from '@np-manager/shared'
import { PortingAssignmentPanel } from '@/components/PortingAssignmentPanel/PortingAssignmentPanel'
import { PortingCaseHistory } from '@/components/PortingCaseHistory/PortingCaseHistory'
import { PortingCommunicationPanel } from '@/components/PortingCommunicationPanel/PortingCommunicationPanel'
import { PortingExternalActionsPanel } from '@/components/PortingExternalActionsPanel/PortingExternalActionsPanel'
import { PliCbdE03DraftPreview } from '@/components/PliCbdE03DraftPreview/PliCbdE03DraftPreview'
import { PliCbdE12DraftPreview } from '@/components/PliCbdE12DraftPreview/PliCbdE12DraftPreview'
import { PliCbdE18DraftPreview } from '@/components/PliCbdE18DraftPreview/PliCbdE18DraftPreview'
import { PliCbdIntegrationHistory } from '@/components/PliCbdIntegrationHistory/PliCbdIntegrationHistory'
import { PliCbdProcessSnapshot } from '@/components/PliCbdProcessSnapshot/PliCbdProcessSnapshot'
import { PliCbdTechnicalPayloadPreview } from '@/components/PliCbdTechnicalPayloadPreview/PliCbdTechnicalPayloadPreview'
import { PliCbdXmlPreview } from '@/components/PliCbdXmlPreview/PliCbdXmlPreview'
import { PortingInternalNotificationsPanel } from '@/components/PortingInternalNotificationsPanel/PortingInternalNotificationsPanel'
import { InternalNotificationAttemptsPanel } from '@/components/InternalNotificationAttemptsPanel/InternalNotificationAttemptsPanel'
import { NotificationFailureHistoryPanel } from '@/components/NotificationFailureHistoryPanel/NotificationFailureHistoryPanel'
import { getPortingStatusMeta } from '@/lib/portingStatusMeta'
import {
  canManagePortingOwnership,
  canSelectAnyAssignee,
} from '@/lib/portingOwnership'

const TECHNICAL_PAYLOAD_MESSAGE_TYPES = ['E03', 'E12', 'E18', 'E23'] as const

type TechnicalPayloadMessageType = (typeof TECHNICAL_PAYLOAD_MESSAGE_TYPES)[number]
type ManualExportResultsState = Record<PliCbdManualExportMessageType, PliCbdManualExportResultDto | null>
type ManualExportLoadingState = Record<PliCbdManualExportMessageType, boolean>
type TechnicalPayloadResultsState = Record<
  TechnicalPayloadMessageType,
  PliCbdAnyTechnicalPayloadBuildResultDto | null
>
type TechnicalPayloadLoadingState = Record<TechnicalPayloadMessageType, boolean>
type XmlPreviewResultsState = Record<TechnicalPayloadMessageType, PliCbdAnyXmlPreviewBuildResultDto | null>
type XmlPreviewLoadingState = Record<TechnicalPayloadMessageType, boolean>

const TECHNICAL_PAYLOAD_API_TYPES: Record<
  TechnicalPayloadMessageType,
  PliCbdTechnicalPayloadApiMessageType
> = {
  E03: 'e03',
  E12: 'e12',
  E18: 'e18',
  E23: 'e23',
}

function createManualExportResultsState(): ManualExportResultsState {
  return { E03: null, E12: null, E18: null, E23: null }
}

function createManualExportLoadingState(value: boolean): ManualExportLoadingState {
  return { E03: value, E12: value, E18: value, E23: value }
}

function createTechnicalPayloadResultsState(): TechnicalPayloadResultsState {
  return { E03: null, E12: null, E18: null, E23: null }
}

function createTechnicalPayloadLoadingState(value: boolean): TechnicalPayloadLoadingState {
  return { E03: value, E12: value, E18: value, E23: value }
}

function createXmlPreviewResultsState(): XmlPreviewResultsState {
  return { E03: null, E12: null, E18: null, E23: null }
}

function createXmlPreviewLoadingState(value: boolean): XmlPreviewLoadingState {
  return { E03: value, E12: value, E18: value, E23: value }
}

const EMPTY_COMMUNICATION_SUMMARY: PortingCommunicationSummaryDto = {
  totalCount: 0,
  draftCount: 0,
  sentCount: 0,
  errorCount: 0,
  lastCommunicationAt: null,
  lastCommunicationType: null,
}

const COMMUNICATION_FEEDBACK_TIMEOUT_MS = 5000

const COMMUNICATION_ERROR_MESSAGES: Record<string, string> = {
  PORTING_COMMUNICATION_ACTION_ROLE_NOT_ALLOWED: 'Nie masz uprawnien do tej akcji komunikacyjnej.',
  PORTING_COMMUNICATION_ACTION_NOT_ALLOWED:
    'Ta akcja komunikacyjna nie jest dostepna dla aktualnego statusu sprawy.',
  PORTING_COMMUNICATION_PREVIEW_NOT_ALLOWED:
    'Podglad tej komunikacji jest zablokowany dla aktualnej sprawy.',
  COMMUNICATION_DRAFT_ALREADY_EXISTS: 'Istnieje juz aktywny draft tego typu.',
  PORTING_COMMUNICATION_MARK_SENT_ROLE_NOT_ALLOWED:
    'Nie masz uprawnien do oznaczenia tej komunikacji jako wyslanej.',
  PORTING_COMMUNICATION_MARK_SENT_STATUS_NOT_ALLOWED:
    'Nie mozna oznaczyc tej komunikacji jako wyslanej dla aktualnego statusu sprawy.',
  PORTING_COMMUNICATION_MARK_SENT_NOT_ALLOWED:
    'Ta komunikacja nie moze zostac recznie oznaczona jako wyslana.',
  PORTING_COMMUNICATION_ALREADY_SENT: 'Ten komunikat jest juz oznaczony jako wyslany.',
  PORTING_COMMUNICATION_FAILED_CANNOT_MARK_SENT:
    'Komunikacja zakonczona bledem nie moze zostac oznaczona jako wyslana.',
}

const ASSIGNMENT_ERROR_MESSAGES: Record<string, string> = {
  ASSIGNEE_NOT_FOUND: 'Wybrany uzytkownik nie istnieje.',
  ASSIGNEE_INACTIVE: 'Nie mozna przypisac sprawy do nieaktywnego uzytkownika.',
}

function getCommunicationActionErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (!axios.isAxiosError(error)) {
    return fallback
  }

  const apiError = error.response?.data as { error?: { code?: string; message?: string } } | undefined
  const code = apiError?.error?.code
  const message = apiError?.error?.message

  if (code && COMMUNICATION_ERROR_MESSAGES[code]) {
    return message ?? COMMUNICATION_ERROR_MESSAGES[code]
  }

  return message ?? fallback
}

function getAssignmentActionErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback
  }

  const apiError = error.response?.data as { error?: { code?: string; message?: string } } | undefined
  const code = apiError?.error?.code
  const message = apiError?.error?.message

  if (code && ASSIGNMENT_ERROR_MESSAGES[code]) {
    return message ?? ASSIGNMENT_ERROR_MESSAGES[code]
  }

  if (message) {
    return message
  }

  return fallback
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="card p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function DisclosureCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <details className="card overflow-hidden">
      <summary className="cursor-pointer list-none px-5 py-4">
        <div className="pr-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
      </summary>
      <div className="border-t border-gray-100 px-5 py-5">{children}</div>
    </details>
  )
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  return (
    <div>
      <dt className="mb-0.5 text-xs text-gray-500">{label}</dt>
      <dd className={`text-sm text-gray-900 ${mono ? 'font-mono' : ''}`}>
        {value ?? <span className="text-gray-400">-</span>}
      </dd>
    </div>
  )
}

function WideField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="sm:col-span-2">
      <dt className="mb-0.5 text-xs text-gray-500">{label}</dt>
      <dd className="whitespace-pre-wrap text-sm text-gray-900">
        {value ?? <span className="text-gray-400">-</span>}
      </dd>
    </div>
  )
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildAdminTransportBanner(result: PliCbdManualExportResultDto) {
  const transportResult = result.transportResult
  const outcome = transportResult?.outcome ?? null

  const bannerClass =
    outcome === 'ACCEPTED'
      ? 'border-green-200 bg-green-50 text-green-800'
      : outcome === 'STUBBED'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : result.status === 'SUCCESS'
          ? 'border-green-200 bg-green-50 text-green-800'
          : 'border-red-200 bg-red-50 text-red-800'

  const headline =
    outcome === 'ACCEPTED'
      ? 'Zaakceptowany przez PLI CBD.'
      : outcome === 'STUBBED'
        ? 'Stub: brak realnego transportu, artefakty zapisane lokalnie.'
        : outcome === 'REJECTED'
          ? `Odrzucony przez PLI CBD: ${transportResult?.rejectionReason ?? 'brak powodu'}`
          : outcome === 'TRANSPORT_ERROR'
            ? `Blad transportu: ${transportResult?.errorMessage ?? result.errorMessage ?? 'Nieznany blad'}`
            : result.status === 'SUCCESS'
              ? 'Eksport zakonczony sukcesem.'
              : `Eksport nieudany: ${result.errorMessage ?? 'Nieznany blad'}`

  return { bannerClass, headline }
}

function NotificationHealthPanel({ health }: { health: NotificationHealthDiagnosticsDto }) {
  const statusConfig: Record<
    NotificationHealthDiagnosticsDto['status'],
    { label: string; badgeClass: string; panelClass: string }
  > = {
    OK: {
      label: 'OK — brak bledow notyfikacji',
      badgeClass: 'bg-emerald-100 text-emerald-700',
      panelClass: 'border-emerald-200 bg-emerald-50',
    },
    FAILED: {
      label: 'Blad wysylki',
      badgeClass: 'bg-red-100 text-red-700',
      panelClass: 'border-red-200 bg-red-50',
    },
    MISCONFIGURED: {
      label: 'Blad konfiguracji',
      badgeClass: 'bg-amber-100 text-amber-700',
      panelClass: 'border-amber-200 bg-amber-50',
    },
    MIXED: {
      label: 'Bledy mieszane',
      badgeClass: 'bg-orange-100 text-orange-700',
      panelClass: 'border-orange-200 bg-orange-50',
    },
  }

  const config = statusConfig[health.status]

  return (
    <div className={`rounded-lg border p-4 ${config.panelClass}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Diagnostyka powiadomien wewnetrznych</h3>
        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${config.badgeClass}`}>
          {config.label}
        </span>
      </div>
      {health.status !== 'OK' && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-gray-500">Wszystkich bledow</dt>
            <dd className="font-medium text-gray-800">{health.failureCount}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Blad wysylki</dt>
            <dd className="font-medium text-gray-800">{health.failedCount}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Blad konfiguracji</dt>
            <dd className="font-medium text-gray-800">{health.misconfiguredCount}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Ostatni blad</dt>
            <dd className="font-medium text-gray-800">
              {health.lastFailureAt
                ? new Date(health.lastFailureAt).toLocaleDateString('pl-PL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : '—'}
              {health.lastFailureOutcome ? ` (${health.lastFailureOutcome})` : ''}
            </dd>
          </div>
        </dl>
      )}
    </div>
  )
}

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [request, setRequest] = useState<PortingRequestDetailDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [caseHistoryItems, setCaseHistoryItems] = useState<PortingRequestCaseHistoryItemDto[]>([])
  const [isCaseHistoryLoading, setIsCaseHistoryLoading] = useState(true)
  const [internalNotificationItems, setInternalNotificationItems] = useState<
    PortingInternalNotificationHistoryItemDto[]
  >([])
  const [isInternalNotificationLoading, setIsInternalNotificationLoading] = useState(true)
  const [internalNotificationError, setInternalNotificationError] = useState<string | null>(null)
  const [internalNotificationAttemptItems, setInternalNotificationAttemptItems] = useState<
    InternalNotificationDeliveryAttemptDto[]
  >([])
  const [isInternalNotificationAttemptsLoading, setIsInternalNotificationAttemptsLoading] =
    useState(true)
  const [internalNotificationAttemptsError, setInternalNotificationAttemptsError] = useState<
    string | null
  >(null)
  const [notificationFailureItems, setNotificationFailureItems] = useState<
    NotificationFailureHistoryItemDto[]
  >([])
  const [isNotificationFailuresLoading, setIsNotificationFailuresLoading] = useState(true)
  const [notificationFailuresError, setNotificationFailuresError] = useState<string | null>(null)
  const [assignmentHistoryItems, setAssignmentHistoryItems] = useState<
    PortingRequestAssignmentHistoryItemDto[]
  >([])
  const [isAssignmentHistoryLoading, setIsAssignmentHistoryLoading] = useState(true)
  const [assignmentFeedbackError, setAssignmentFeedbackError] = useState<string | null>(null)
  const [assignmentFeedbackSuccess, setAssignmentFeedbackSuccess] = useState<string | null>(null)
  const [assigneeDraft, setAssigneeDraft] = useState('')
  const [assignableUsers, setAssignableUsers] = useState<PortingRequestAssignmentUserOptionDto[]>([])
  const [isAssignableUsersLoading, setIsAssignableUsersLoading] = useState(false)
  const [isAssigningToMe, setIsAssigningToMe] = useState(false)
  const [isUpdatingAssignment, setIsUpdatingAssignment] = useState(false)
  const [isUnassigning, setIsUnassigning] = useState(false)

  const [commercialOwnerCandidates, setCommercialOwnerCandidates] = useState<CommercialOwnerCandidateDto[]>([])
  const [isCommercialOwnerCandidatesLoading, setIsCommercialOwnerCandidatesLoading] = useState(false)
  const [commercialOwnerDraft, setCommercialOwnerDraft] = useState<string>('')
  const [isUpdatingCommercialOwner, setIsUpdatingCommercialOwner] = useState(false)
  const [commercialOwnerFeedbackError, setCommercialOwnerFeedbackError] = useState<string | null>(null)
  const [commercialOwnerFeedbackSuccess, setCommercialOwnerFeedbackSuccess] = useState<string | null>(null)

  const [communicationItems, setCommunicationItems] = useState<PortingCommunicationDto[]>([])
  const [isCommunicationLoading, setIsCommunicationLoading] = useState(true)
  const [communicationPreview, setCommunicationPreview] = useState<PortingCommunicationPreviewDto | null>(null)
  const [previewingCommunicationActionType, setPreviewingCommunicationActionType] =
    useState<PortingRequestCommunicationActionType | null>(null)
  const [creatingCommunicationActionType, setCreatingCommunicationActionType] =
    useState<PortingRequestCommunicationActionType | null>(null)
  const [communicationFeedbackError, setCommunicationFeedbackError] = useState<string | null>(null)
  const [communicationFeedbackSuccess, setCommunicationFeedbackSuccess] = useState<string | null>(null)
  const [markingCommunicationId, setMarkingCommunicationId] = useState<string | null>(null)
  const [sendingCommunicationId, setSendingCommunicationId] = useState<string | null>(null)
  const [retryingCommunicationId, setRetryingCommunicationId] = useState<string | null>(null)
  const [cancellingCommunicationId, setCancellingCommunicationId] = useState<string | null>(null)
  const [deliveryAttemptsByCommId, setDeliveryAttemptsByCommId] = useState<
    Record<string, CommunicationDeliveryAttemptsResultDto>
  >({})
  const [loadingDeliveryAttemptsId, setLoadingDeliveryAttemptsId] = useState<string | null>(null)
  const communicationFeedbackTimeoutRef = useRef<number | null>(null)

  const [selectedStatusAction, setSelectedStatusAction] = useState<PortingRequestStatusActionDto | null>(null)
  const [statusReason, setStatusReason] = useState('')
  const [statusComment, setStatusComment] = useState('')
  const [statusActionError, setStatusActionError] = useState<string | null>(null)
  const [statusActionSuccess, setStatusActionSuccess] = useState<string | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const [selectedExternalAction, setSelectedExternalAction] =
    useState<PortingRequestExternalActionDto | null>(null)
  const [externalScheduledPortDate, setExternalScheduledPortDate] = useState('')
  const [externalRejectionReason, setExternalRejectionReason] = useState('')
  const [externalActionComment, setExternalActionComment] = useState('')
  const [externalCreateDraft, setExternalCreateDraft] = useState(false)
  const [externalActionError, setExternalActionError] = useState<string | null>(null)
  const [externalActionSuccess, setExternalActionSuccess] = useState<string | null>(null)
  const [isSubmittingExternalAction, setIsSubmittingExternalAction] = useState(false)

  const [integrationEvents, setIntegrationEvents] = useState<PliCbdIntegrationEventDto[]>([])
  const [isIntegrationEventsLoading, setIsIntegrationEventsLoading] = useState(true)
  const [processSnapshot, setProcessSnapshot] = useState<PliCbdProcessSnapshotDto | null>(null)
  const [isProcessSnapshotLoading, setIsProcessSnapshotLoading] = useState(true)
  const [e03DraftResult, setE03DraftResult] = useState<PliCbdE03DraftBuildResultDto | null>(null)
  const [isE03DraftLoading, setIsE03DraftLoading] = useState(true)
  const [e12DraftResult, setE12DraftResult] = useState<PliCbdE12DraftBuildResultDto | null>(null)
  const [isE12DraftLoading, setIsE12DraftLoading] = useState(true)
  const [e18DraftResult, setE18DraftResult] = useState<PliCbdE18DraftBuildResultDto | null>(null)
  const [isE18DraftLoading, setIsE18DraftLoading] = useState(true)
  const [technicalPayloadResults, setTechnicalPayloadResults] =
    useState<TechnicalPayloadResultsState>(createTechnicalPayloadResultsState)
  const [technicalPayloadLoading, setTechnicalPayloadLoading] =
    useState<TechnicalPayloadLoadingState>(() => createTechnicalPayloadLoadingState(true))
  const [xmlPreviewResults, setXmlPreviewResults] = useState<XmlPreviewResultsState>(
    createXmlPreviewResultsState,
  )
  const [xmlPreviewLoading, setXmlPreviewLoading] = useState<XmlPreviewLoadingState>(() =>
    createXmlPreviewLoadingState(true),
  )
  const [manualExportResults, setManualExportResults] = useState<ManualExportResultsState>(
    createManualExportResultsState,
  )
  const [manualExportLoading, setManualExportLoading] = useState<ManualExportLoadingState>(() =>
    createManualExportLoadingState(false),
  )

  const canManageStatus = useMemo(
    () => ['ADMIN', 'BOK_CONSULTANT', 'BACK_OFFICE', 'MANAGER'].includes(user?.role ?? ''),
    [user?.role],
  )
  const isAdmin = useMemo(() => user?.role === 'ADMIN', [user?.role])
  const canManageAssignment = useMemo(() => canManagePortingOwnership(user?.role), [user?.role])
  const canSelectAssignee = useMemo(() => canSelectAnyAssignee(user?.role), [user?.role])
  const canManageCommercialOwner = useMemo(
    () => ['ADMIN', 'BOK_CONSULTANT', 'MANAGER'].includes(user?.role ?? ''),
    [user?.role],
  )
  const assigneeOptions = useMemo(
    () =>
      assignableUsers.map((candidate) => ({
        id: candidate.id,
        label: `${candidate.firstName} ${candidate.lastName} (${candidate.email})`,
      })),
    [assignableUsers],
  )
  const assignedByDisplayName = useMemo(() => {
    if (!request?.assignedByUserId) {
      return null
    }

    if (request.assignedByUserId === user?.id) {
      return `${user.firstName} ${user.lastName} (${user.email})`
    }

    const fromHistory = assignmentHistoryItems.find(
      (item) => item.changedByUser.id === request.assignedByUserId,
    )

    if (!fromHistory) {
      return null
    }

    return `${fromHistory.changedByUser.displayName} (${fromHistory.changedByUser.email})`
  }, [assignmentHistoryItems, request?.assignedByUserId, user?.email, user?.firstName, user?.id, user?.lastName])
  const availableStatusActions = request?.availableStatusActions ?? []
  const availableExternalActions = request?.availableExternalActions ?? []
  const availableCommunicationActions = request?.availableCommunicationActions ?? []
  const communicationSummary = request?.communicationSummary ?? EMPTY_COMMUNICATION_SUMMARY

  const clearCommunicationFeedbackTimer = useCallback(() => {
    if (communicationFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(communicationFeedbackTimeoutRef.current)
      communicationFeedbackTimeoutRef.current = null
    }
  }, [])

  const resetCommunicationFeedback = useCallback(() => {
    clearCommunicationFeedbackTimer()
    setCommunicationFeedbackError(null)
    setCommunicationFeedbackSuccess(null)
  }, [clearCommunicationFeedbackTimer])

  const showTemporaryCommunicationFeedback = useCallback(
    (kind: 'success' | 'error', message: string) => {
      clearCommunicationFeedbackTimer()

      if (kind === 'success') {
        setCommunicationFeedbackSuccess(message)
        setCommunicationFeedbackError(null)
      } else {
        setCommunicationFeedbackError(message)
        setCommunicationFeedbackSuccess(null)
      }

      communicationFeedbackTimeoutRef.current = window.setTimeout(() => {
        setCommunicationFeedbackError(null)
        setCommunicationFeedbackSuccess(null)
        communicationFeedbackTimeoutRef.current = null
      }, COMMUNICATION_FEEDBACK_TIMEOUT_MS)
    },
    [clearCommunicationFeedbackTimer],
  )

  const resetStatusActionForm = useCallback(() => {
    setSelectedStatusAction(null)
    setStatusReason('')
    setStatusComment('')
  }, [])

  const resetExternalActionForm = useCallback(() => {
    setSelectedExternalAction(null)
    setExternalScheduledPortDate('')
    setExternalRejectionReason('')
    setExternalActionComment('')
    setExternalCreateDraft(false)
  }, [])

  const loadRequest = useCallback(async () => {
    if (!id) return

    setIsLoading(true)
    setError(null)

    try {
      const nextRequest = await getPortingRequestById(id)
      setRequest(nextRequest)
      setAssigneeDraft(nextRequest.assignedUser?.id ?? '')
      setCommercialOwnerDraft(nextRequest.commercialOwner?.id ?? '')
      setSelectedStatusAction((current) =>
        current
          ? nextRequest.availableStatusActions.find(
              (action) =>
                action.actionId === current.actionId &&
                action.targetStatus === current.targetStatus,
            ) ?? null
          : null,
      )
      setSelectedExternalAction((current) =>
        current
          ? nextRequest.availableExternalActions.find((action) => action.actionId === current.actionId) ??
            null
          : null,
      )
    } catch (err) {
      const detail =
        axios.isAxiosError(err) && err.response
          ? ` (HTTP ${err.response.status})`
          : ''
      setError(`Nie udalo sie zaladowac szczegolow sprawy portowania.${detail}`)
      if (import.meta.env.DEV) {
        console.error('[RequestDetailPage] loadRequest failed:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }, [id])

  const loadCaseHistory = useCallback(async () => {
    if (!id) return

    setIsCaseHistoryLoading(true)
    try {
      const result = await getPortingRequestCaseHistory(id)
      setCaseHistoryItems(result.items)
    } catch {
      setCaseHistoryItems([])
    } finally {
      setIsCaseHistoryLoading(false)
    }
  }, [id])

  const loadInternalNotificationHistory = useCallback(async () => {
    if (!id) return

    setIsInternalNotificationLoading(true)
    setInternalNotificationError(null)

    try {
      const result = await getPortingRequestInternalNotifications(id)
      setInternalNotificationItems(result.items)
    } catch {
      setInternalNotificationItems([])
      setInternalNotificationError(
        'Nie udalo sie zaladowac historii powiadomien wewnetrznych.',
      )
    } finally {
      setIsInternalNotificationLoading(false)
    }
  }, [id])

  const loadInternalNotificationAttempts = useCallback(async () => {
    if (!id) return

    setIsInternalNotificationAttemptsLoading(true)
    setInternalNotificationAttemptsError(null)

    try {
      const result = await getPortingRequestInternalNotificationAttempts(id)
      setInternalNotificationAttemptItems(result.items)
    } catch {
      setInternalNotificationAttemptItems([])
      setInternalNotificationAttemptsError('Nie udalo sie zaladowac prob dostarczenia notyfikacji.')
    } finally {
      setIsInternalNotificationAttemptsLoading(false)
    }
  }, [id])

  const loadNotificationFailures = useCallback(async () => {
    if (!id) return

    setIsNotificationFailuresLoading(true)
    setNotificationFailuresError(null)

    try {
      const result = await getPortingRequestNotificationFailures(id)
      setNotificationFailureItems(result.items)
    } catch {
      setNotificationFailureItems([])
      setNotificationFailuresError('Nie udalo sie zaladowac historii problemow notyfikacji.')
    } finally {
      setIsNotificationFailuresLoading(false)
    }
  }, [id])

  const loadAssignmentHistory = useCallback(async () => {
    if (!id) return

    setIsAssignmentHistoryLoading(true)
    try {
      const result = await getPortingRequestAssignmentHistory(id)
      setAssignmentHistoryItems(result.items)
    } catch {
      setAssignmentHistoryItems([])
    } finally {
      setIsAssignmentHistoryLoading(false)
    }
  }, [id])

  const loadAssignableUsers = useCallback(async () => {
    if (!canSelectAssignee) {
      setAssignableUsers([])
      setIsAssignableUsersLoading(false)
      return
    }

    setIsAssignableUsersLoading(true)

    try {
      const result = await getPortingRequestAssignmentUsers()
      setAssignableUsers(result.users)
    } catch {
      setAssignableUsers([])
    } finally {
      setIsAssignableUsersLoading(false)
    }
  }, [canSelectAssignee])

  const loadCommercialOwnerCandidates = useCallback(async () => {
    if (!canManageCommercialOwner) {
      setCommercialOwnerCandidates([])
      setIsCommercialOwnerCandidatesLoading(false)
      return
    }

    setIsCommercialOwnerCandidatesLoading(true)
    try {
      const result = await listCommercialOwnerCandidates()
      setCommercialOwnerCandidates(result.users)
    } catch {
      setCommercialOwnerCandidates([])
    } finally {
      setIsCommercialOwnerCandidatesLoading(false)
    }
  }, [canManageCommercialOwner])

  const loadCommunicationHistory = useCallback(async () => {
    if (!id) return

    setIsCommunicationLoading(true)
    try {
      const result = await getPortingRequestCommunicationHistory(id)
      setCommunicationItems(result.items)
    } catch {
      setCommunicationItems([])
    } finally {
      setIsCommunicationLoading(false)
    }
  }, [id])

  const refreshCommunicationSection = useCallback(async () => {
    await Promise.all([loadRequest(), loadCommunicationHistory()])
  }, [loadCommunicationHistory, loadRequest])

  const loadProcessSnapshot = useCallback(async () => {
    if (!id || !isAdmin) {
      setProcessSnapshot(null)
      setIsProcessSnapshotLoading(false)
      return
    }

    setIsProcessSnapshotLoading(true)
    try {
      setProcessSnapshot(await getPortingRequestProcessSnapshot(id))
    } catch {
      setProcessSnapshot(null)
    } finally {
      setIsProcessSnapshotLoading(false)
    }
  }, [id, isAdmin])

  const loadE03Draft = useCallback(async () => {
    if (!id || !isAdmin) {
      setE03DraftResult(null)
      setIsE03DraftLoading(false)
      return
    }

    setIsE03DraftLoading(true)
    try {
      setE03DraftResult(await getPortingRequestE03Draft(id))
    } catch {
      setE03DraftResult(null)
    } finally {
      setIsE03DraftLoading(false)
    }
  }, [id, isAdmin])

  const loadE12Draft = useCallback(async () => {
    if (!id || !isAdmin) {
      setE12DraftResult(null)
      setIsE12DraftLoading(false)
      return
    }

    setIsE12DraftLoading(true)
    try {
      setE12DraftResult(await getPortingRequestE12Draft(id))
    } catch {
      setE12DraftResult(null)
    } finally {
      setIsE12DraftLoading(false)
    }
  }, [id, isAdmin])

  const loadE18Draft = useCallback(async () => {
    if (!id || !isAdmin) {
      setE18DraftResult(null)
      setIsE18DraftLoading(false)
      return
    }

    setIsE18DraftLoading(true)
    try {
      setE18DraftResult(await getPortingRequestE18Draft(id))
    } catch {
      setE18DraftResult(null)
    } finally {
      setIsE18DraftLoading(false)
    }
  }, [id, isAdmin])

  const refreshDraftPreviews = useCallback(() => {
    if (!isAdmin) return
    void loadE03Draft()
    void loadE12Draft()
    void loadE18Draft()
  }, [isAdmin, loadE03Draft, loadE12Draft, loadE18Draft])

  const loadTechnicalPayloads = useCallback(async () => {
    if (!id || !isAdmin) {
      setTechnicalPayloadResults(createTechnicalPayloadResultsState())
      setTechnicalPayloadLoading(createTechnicalPayloadLoadingState(false))
      return
    }

    setTechnicalPayloadLoading(createTechnicalPayloadLoadingState(true))

    const results = await Promise.all(
      TECHNICAL_PAYLOAD_MESSAGE_TYPES.map(async (messageType) => {
        try {
          const result = await getPortingRequestTechnicalPayload(
            id,
            TECHNICAL_PAYLOAD_API_TYPES[messageType],
          )

          return [messageType, result] as const
        } catch {
          return [messageType, null] as const
        }
      }),
    )

    const nextResults = createTechnicalPayloadResultsState()
    for (const [messageType, result] of results) {
      nextResults[messageType] = result
    }

    setTechnicalPayloadResults(nextResults)
    setTechnicalPayloadLoading(createTechnicalPayloadLoadingState(false))
  }, [id, isAdmin])

  const loadXmlPreviews = useCallback(async () => {
    if (!id || !isAdmin) {
      setXmlPreviewResults(createXmlPreviewResultsState())
      setXmlPreviewLoading(createXmlPreviewLoadingState(false))
      return
    }

    setXmlPreviewLoading(createXmlPreviewLoadingState(true))

    const results = await Promise.all(
      TECHNICAL_PAYLOAD_MESSAGE_TYPES.map(async (messageType) => {
        try {
          const result = await getPortingRequestXmlPreview(
            id,
            TECHNICAL_PAYLOAD_API_TYPES[messageType],
          )

          return [messageType, result] as const
        } catch {
          return [messageType, null] as const
        }
      }),
    )

    const nextResults = createXmlPreviewResultsState()
    for (const [messageType, result] of results) {
      nextResults[messageType] = result
    }

    setXmlPreviewResults(nextResults)
    setXmlPreviewLoading(createXmlPreviewLoadingState(false))
  }, [id, isAdmin])

  const loadIntegrationEvents = useCallback(async () => {
    if (!id || !isAdmin) {
      setIntegrationEvents([])
      setIsIntegrationEventsLoading(false)
      return
    }

    setIsIntegrationEventsLoading(true)
    try {
      const result = await getPortingRequestIntegrationEvents(id)
      setIntegrationEvents(result.items)
    } catch {
      setIntegrationEvents([])
    } finally {
      setIsIntegrationEventsLoading(false)
    }
  }, [id, isAdmin])

  useEffect(() => {
    resetCommunicationFeedback()
    setCommunicationPreview(null)
    setAssignmentFeedbackError(null)
    setAssignmentFeedbackSuccess(null)

    if (!id) return

    void loadRequest()
    void loadCaseHistory()
    void loadInternalNotificationHistory()
    void loadInternalNotificationAttempts()
    void loadNotificationFailures()
    void loadAssignmentHistory()
    void loadAssignableUsers()
    void loadCommercialOwnerCandidates()
    void loadCommunicationHistory()
    void loadIntegrationEvents()
    void loadProcessSnapshot()
    refreshDraftPreviews()
    void loadTechnicalPayloads()
    void loadXmlPreviews()
  }, [
    id,
    loadAssignableUsers,
    loadAssignmentHistory,
    loadCaseHistory,
    loadInternalNotificationHistory,
    loadInternalNotificationAttempts,
    loadNotificationFailures,
    loadCommercialOwnerCandidates,
    loadCommunicationHistory,
    loadIntegrationEvents,
    loadProcessSnapshot,
    loadRequest,
    loadTechnicalPayloads,
    loadXmlPreviews,
    refreshDraftPreviews,
    resetCommunicationFeedback,
  ])

  useEffect(() => {
    return () => {
      clearCommunicationFeedbackTimer()
    }
  }, [clearCommunicationFeedbackTimer])

  const clearAssignmentFeedback = useCallback(() => {
    setAssignmentFeedbackError(null)
    setAssignmentFeedbackSuccess(null)
  }, [])

  const clearCommercialOwnerFeedback = useCallback(() => {
    setCommercialOwnerFeedbackError(null)
    setCommercialOwnerFeedbackSuccess(null)
  }, [])

  const handleUpdateCommercialOwner = useCallback(
    async (newOwnerId: string | null) => {
      if (!id || !canManageCommercialOwner || isUpdatingCommercialOwner) return

      clearCommercialOwnerFeedback()
      setIsUpdatingCommercialOwner(true)

      try {
        const updatedRequest = await updatePortingRequestCommercialOwner(id, {
          commercialOwnerUserId: newOwnerId,
        })
        setRequest(updatedRequest)
        setCommercialOwnerDraft(updatedRequest.commercialOwner?.id ?? '')
        void loadInternalNotificationHistory()
        void loadInternalNotificationAttempts()
        void loadNotificationFailures()
        setCommercialOwnerFeedbackSuccess(
          newOwnerId ? 'Opiekun handlowy zostal przypisany.' : 'Opiekun handlowy zostal usunieto.',
        )
      } catch (errorValue) {
        const message =
          axios.isAxiosError(errorValue) && errorValue.response?.data?.error?.message
            ? String(errorValue.response.data.error.message)
            : 'Nie udalo sie zaktualizowac opiekuna handlowego.'
        setCommercialOwnerFeedbackError(message)
      } finally {
        setIsUpdatingCommercialOwner(false)
      }
    },
    [
      canManageCommercialOwner,
      clearCommercialOwnerFeedback,
      id,
      isUpdatingCommercialOwner,
      loadInternalNotificationHistory,
      loadInternalNotificationAttempts,
      loadNotificationFailures,
    ],
  )

  const applyUpdatedAssignment = useCallback(
    (updatedRequest: PortingRequestDetailDto) => {
      setRequest(updatedRequest)
      setAssigneeDraft(updatedRequest.assignedUser?.id ?? '')
      void loadAssignmentHistory()
    },
    [loadAssignmentHistory],
  )

  const handleAssignToMe = useCallback(async () => {
    if (!id || !canManageAssignment || isAssigningToMe) {
      return
    }

    clearAssignmentFeedback()
    setIsAssigningToMe(true)

    try {
      const updatedRequest = await assignPortingRequestToMe(id)
      applyUpdatedAssignment(updatedRequest)
      setAssignmentFeedbackSuccess('Sprawa zostala przypisana do Ciebie.')
    } catch (errorValue) {
      setAssignmentFeedbackError(
        getAssignmentActionErrorMessage(
          errorValue,
          'Nie udalo sie przypisac sprawy do Ciebie.',
        ),
      )
    } finally {
      setIsAssigningToMe(false)
    }
  }, [applyUpdatedAssignment, canManageAssignment, clearAssignmentFeedback, id, isAssigningToMe])

  const handleUpdateAssignment = useCallback(async () => {
    if (!id || !canManageAssignment || !assigneeDraft || isUpdatingAssignment) {
      return
    }

    clearAssignmentFeedback()
    setIsUpdatingAssignment(true)

    try {
      const updatedRequest = await updatePortingRequestAssignment(id, { assignedUserId: assigneeDraft })
      applyUpdatedAssignment(updatedRequest)
      setAssignmentFeedbackSuccess('Przypisanie sprawy zostalo zaktualizowane.')
    } catch (errorValue) {
      setAssignmentFeedbackError(
        getAssignmentActionErrorMessage(
          errorValue,
          'Nie udalo sie zaktualizowac przypisania sprawy.',
        ),
      )
    } finally {
      setIsUpdatingAssignment(false)
    }
  }, [
    applyUpdatedAssignment,
    assigneeDraft,
    canManageAssignment,
    clearAssignmentFeedback,
    id,
    isUpdatingAssignment,
  ])

  const handleUnassign = useCallback(async () => {
    if (!id || !canManageAssignment || isUnassigning) {
      return
    }

    clearAssignmentFeedback()
    setIsUnassigning(true)

    try {
      const updatedRequest = await updatePortingRequestAssignment(id, { assignedUserId: null })
      applyUpdatedAssignment(updatedRequest)
      setAssignmentFeedbackSuccess('Przypisanie sprawy zostalo usuniete.')
    } catch (errorValue) {
      setAssignmentFeedbackError(
        getAssignmentActionErrorMessage(errorValue, 'Nie udalo sie zdjac przypisania sprawy.'),
      )
    } finally {
      setIsUnassigning(false)
    }
  }, [applyUpdatedAssignment, canManageAssignment, clearAssignmentFeedback, id, isUnassigning])

  const handleSelectStatusAction = (action: PortingRequestStatusActionDto) => {
    setStatusActionError(null)
    setStatusActionSuccess(null)
    setSelectedStatusAction(action)
    setStatusReason('')
    setStatusComment('')
  }

  const handleSubmitStatusAction = async () => {
    if (!id || !selectedStatusAction || !canManageStatus || isUpdatingStatus) return

    setIsUpdatingStatus(true)
    setStatusActionError(null)
    setStatusActionSuccess(null)

    try {
      const updatedRequest = await updatePortingRequestStatus(id, {
        targetStatus: selectedStatusAction.targetStatus,
        reason: statusReason.trim() || undefined,
        comment: statusComment.trim() || undefined,
      })

      setRequest(updatedRequest)
      setCommunicationPreview(null)
      resetStatusActionForm()
      void loadCaseHistory()
      void loadInternalNotificationHistory()
      void loadInternalNotificationAttempts()
      void loadNotificationFailures()
      if (isAdmin) {
        void loadProcessSnapshot()
        refreshDraftPreviews()
        void loadTechnicalPayloads()
        void loadXmlPreviews()
      }
      setStatusActionSuccess('Status sprawy zostal zmieniony.')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message = (err.response?.data as { error?: { message?: string } })?.error?.message
        setStatusActionError(message ?? 'Nie mozna wykonac tej zmiany statusu.')
      } else {
        setStatusActionError('Nie mozna wykonac tej zmiany statusu.')
      }
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handlePreviewCommunicationDraft = async (
    actionType: PortingRequestCommunicationActionType,
  ) => {
    if (!id || previewingCommunicationActionType) return

    setPreviewingCommunicationActionType(actionType)
    resetCommunicationFeedback()

    try {
      const preview = await previewPortingCommunicationDraft(id, { actionType })
      setCommunicationPreview(preview)
    } catch (err) {
      showTemporaryCommunicationFeedback(
        'error',
        getCommunicationActionErrorMessage(err, 'Nie udalo sie przygotowac podgladu draftu.'),
      )
    } finally {
      setPreviewingCommunicationActionType(null)
    }
  }

  const handleCreateCommunicationDraft = async (
    actionType: PortingRequestCommunicationActionType,
  ) => {
    if (!id || creatingCommunicationActionType) return

    setCreatingCommunicationActionType(actionType)
    resetCommunicationFeedback()

    try {
      await createPortingCommunicationDraft(id, { actionType })
      setCommunicationPreview(null)
      await refreshCommunicationSection()
      showTemporaryCommunicationFeedback('success', 'Draft komunikacji zostal utworzony.')
    } catch (err) {
      showTemporaryCommunicationFeedback(
        'error',
        getCommunicationActionErrorMessage(err, 'Nie udalo sie utworzyc draftu komunikacji.'),
      )
    } finally {
      setCreatingCommunicationActionType(null)
    }
  }

  const handleMarkCommunicationAsSent = async (communicationId: string) => {
    if (!id || markingCommunicationId) return

    setMarkingCommunicationId(communicationId)
    resetCommunicationFeedback()

    try {
      await markPortingCommunicationAsSent(id, communicationId)
      setCommunicationPreview(null)
      await refreshCommunicationSection()
      showTemporaryCommunicationFeedback('success', 'Komunikat zostal oznaczony jako wyslany.')
    } catch (err) {
      showTemporaryCommunicationFeedback(
        'error',
        getCommunicationActionErrorMessage(
          err,
          'Nie udalo sie oznaczyc komunikatu jako wyslanego.',
        ),
      )
    } finally {
      setMarkingCommunicationId(null)
    }
  }

  const handleSendCommunication = async (communicationId: string) => {
    if (!id || sendingCommunicationId) return

    setSendingCommunicationId(communicationId)
    resetCommunicationFeedback()

    try {
      await sendPortingCommunication(id, communicationId)
      await refreshCommunicationSection()
      showTemporaryCommunicationFeedback('success', 'Komunikat zostal wyslany.')
    } catch (err) {
      showTemporaryCommunicationFeedback(
        'error',
        getCommunicationActionErrorMessage(err, 'Nie udalo sie wyslac komunikatu.'),
      )
    } finally {
      setSendingCommunicationId(null)
    }
  }

  const handleRetryCommunication = async (communicationId: string) => {
    if (!id || retryingCommunicationId) return

    setRetryingCommunicationId(communicationId)
    resetCommunicationFeedback()

    try {
      await retryPortingCommunication(id, communicationId)
      await refreshCommunicationSection()
      showTemporaryCommunicationFeedback('success', 'Ponowna wysylka zakonczona.')
    } catch (err) {
      showTemporaryCommunicationFeedback(
        'error',
        getCommunicationActionErrorMessage(err, 'Nie udalo sie ponowic wysylki.'),
      )
    } finally {
      setRetryingCommunicationId(null)
    }
  }

  const handleCancelCommunication = async (communicationId: string) => {
    if (!id || cancellingCommunicationId) return

    setCancellingCommunicationId(communicationId)
    resetCommunicationFeedback()

    try {
      await cancelPortingCommunication(id, communicationId)
      await refreshCommunicationSection()
      showTemporaryCommunicationFeedback('success', 'Komunikat zostal anulowany.')
    } catch (err) {
      showTemporaryCommunicationFeedback(
        'error',
        getCommunicationActionErrorMessage(err, 'Nie udalo sie anulowac komunikatu.'),
      )
    } finally {
      setCancellingCommunicationId(null)
    }
  }

  const handleLoadDeliveryAttempts = async (communicationId: string) => {
    if (!id || loadingDeliveryAttemptsId === communicationId) return

    setLoadingDeliveryAttemptsId(communicationId)

    try {
      const result = await getPortingCommunicationDeliveryAttempts(id, communicationId)
      setDeliveryAttemptsByCommId((prev) => ({ ...prev, [communicationId]: result }))
    } catch {
      // silent fail — nie zasmiecamy UI glownym bledem
    } finally {
      setLoadingDeliveryAttemptsId(null)
    }
  }

  const handleSelectExternalAction = (action: PortingRequestExternalActionDto) => {
    setExternalActionError(null)
    setExternalActionSuccess(null)
    setSelectedExternalAction(action)
    setExternalScheduledPortDate(request?.confirmedPortDate ?? request?.donorAssignedPortDate ?? '')
    setExternalRejectionReason(request?.rejectionReason ?? '')
    setExternalActionComment('')
    setExternalCreateDraft(false)
  }

  const handleSubmitExternalAction = async () => {
    if (!id || !selectedExternalAction || isSubmittingExternalAction) return

    setIsSubmittingExternalAction(true)
    setExternalActionError(null)
    setExternalActionSuccess(null)

    try {
      const result = await executePortingRequestExternalAction(id, {
        actionId: selectedExternalAction.actionId,
        scheduledPortDate: externalScheduledPortDate || undefined,
        rejectionReason: externalRejectionReason.trim() || undefined,
        comment: externalActionComment.trim() || undefined,
        createCommunicationDraft: externalCreateDraft,
      })

      setRequest(result.request)
      resetExternalActionForm()
      void loadCaseHistory()
      void loadCommunicationHistory()
      setCommunicationPreview(null)

      if (isAdmin) {
        void loadProcessSnapshot()
        refreshDraftPreviews()
        void loadTechnicalPayloads()
        void loadXmlPreviews()
      }

      setExternalActionSuccess(
        result.communication
          ? 'Akcja zewnetrzna zapisana wraz z draftem e-mail do klienta.'
          : 'Akcja zewnetrzna zostala zapisana.',
      )
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message = (err.response?.data as { error?: { message?: string } })?.error?.message
        setExternalActionError(message ?? 'Nie udalo sie zapisac akcji zewnetrznej.')
      } else {
        setExternalActionError('Nie udalo sie zapisac akcji zewnetrznej.')
      }
    } finally {
      setIsSubmittingExternalAction(false)
    }
  }

  const handleManualExport = async (messageType: PliCbdManualExportMessageType) => {
    if (!id || !isAdmin || manualExportLoading[messageType]) return

    setManualExportLoading((prev) => ({ ...prev, [messageType]: true }))
    setManualExportResults((prev) => ({ ...prev, [messageType]: null }))

    try {
      const result = await triggerManualPliCbdExport(id, messageType)
      setManualExportResults((prev) => ({ ...prev, [messageType]: result }))
    } catch {
      setManualExportResults((prev) => ({
        ...prev,
        [messageType]: {
          integrationEventId: '',
          portingRequestId: id,
          messageType,
          status: 'ERROR',
          transportMode: null,
          blockingReasons: [],
          technicalWarnings: [],
          xml: null,
          envelopeSnapshot: null,
          transportResult: null,
          errorMessage: 'Blad komunikacji z serwerem.',
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
        } satisfies PliCbdManualExportResultDto,
      }))
    } finally {
      setManualExportLoading((prev) => ({ ...prev, [messageType]: false }))
      void loadIntegrationEvents()
    }
  }

  const handleExport = async () => {
    if (!id || !isAdmin || isExporting) return

    setIsExporting(true)
    setActionError(null)
    setActionSuccess(null)

    try {
      setRequest(await exportPortingRequest(id))
      void loadCaseHistory()
      void loadIntegrationEvents()
      void loadProcessSnapshot()
      refreshDraftPreviews()
      void loadTechnicalPayloads()
      void loadXmlPreviews()
      setActionSuccess('Eksport do PLI CBD zostal wyzwolony pomyslnie.')
    } catch {
      void loadIntegrationEvents()
      void loadProcessSnapshot()
      refreshDraftPreviews()
      void loadTechnicalPayloads()
      void loadXmlPreviews()
      setActionError('Nie udalo sie uruchomic eksportu do PLI CBD.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleSync = async () => {
    if (!id || !isAdmin || isSyncing) return

    setIsSyncing(true)
    setActionError(null)
    setActionSuccess(null)

    try {
      setRequest(await syncPortingRequest(id))
      void loadCaseHistory()
      void loadIntegrationEvents()
      void loadProcessSnapshot()
      refreshDraftPreviews()
      void loadTechnicalPayloads()
      void loadXmlPreviews()
      setActionSuccess('Synchronizacja z PLI CBD zakonczona pomyslnie.')
    } catch {
      void loadIntegrationEvents()
      void loadProcessSnapshot()
      refreshDraftPreviews()
      void loadTechnicalPayloads()
      void loadXmlPreviews()
      setActionError('Nie udalo sie uruchomic synchronizacji z PLI CBD.')
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-400">Ladowanie...</div>
    )
  }

  if (error || !request) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center">
          <p className="mb-4 text-sm text-red-500">{error ?? 'Sprawa nie zostala znaleziona.'}</p>
          <button onClick={() => void navigate(ROUTES.REQUESTS)} className="btn-secondary">
            Wroc do listy
          </button>
        </div>
      </div>
    )
  }

  const statusMeta = getPortingStatusMeta(request.statusInternal)

  return (
    <div className="max-w-6xl space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            onClick={() => void navigate(ROUTES.REQUESTS)}
            className="mb-2 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            {'<-'} Sprawy portowania
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{request.caseNumber}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusMeta.className}`}
            >
              {statusMeta.label}
            </span>
            <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {PORTING_MODE_LABELS[request.portingMode]}
            </span>
            <span className="text-sm text-gray-500">{request.client.displayName}</span>
            <span className="text-sm text-gray-500">{request.numberDisplay}</span>
          </div>
        </div>

        <button onClick={() => void navigate(ROUTES.REQUEST_NEW)} className="btn-secondary">
          + Nowa sprawa
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-4">
          <SectionCard title="Przeglad" description="Najwazniejsze dane operacyjne sprawy.">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Klient" value={request.client.displayName} />
              <Field label="Abonent" value={request.subscriberDisplayName} />
              <Field label="Typ uslugi" value={NUMBER_TYPE_LABELS[request.numberType]} />
              <Field label="Typ numeracji" value={PORTED_NUMBER_KIND_LABELS[request.numberRangeKind]} />
              <Field label="Numer / zakres" value={request.numberDisplay} mono />
              <Field label="Status sprawy" value={PORTING_CASE_STATUS_LABELS[request.statusInternal]} />
              <Field label="Operator oddajacy" value={request.donorOperator.name} />
              <Field label="Operator bioracy" value={request.recipientOperator.name} />
              <Field label="Numer dokumentu" value={request.requestDocumentNumber} mono />
              <Field label="Kanal kontaktu" value={CONTACT_CHANNEL_LABELS[request.contactChannel]} />
            </dl>
          </SectionCard>

          <SectionCard title="Terminy" description="Terminy istotne z perspektywy codziennej obslugi.">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Wnioskowany dzien przeniesienia" value={request.requestedPortDate} mono />
              <Field label="Najwczesniejsza akceptowalna data" value={request.earliestAcceptablePortDate} mono />
              <Field label="Data potwierdzona" value={request.confirmedPortDate} mono />
              <Field label="Data od dawcy" value={request.donorAssignedPortDate} mono />
              <Field label="Godzina od dawcy" value={request.donorAssignedPortTime} mono />
              <Field label="Pelnomocnictwo" value={request.hasPowerOfAttorney ? 'Tak' : 'Nie'} />
            </dl>
          </SectionCard>

          <SectionCard title="Dane sprawy" description="Tozsamosc abonenta, kontakt i notatki operacyjne.">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Typ identyfikatora" value={SUBSCRIBER_IDENTITY_TYPE_LABELS[request.identityType]} />
              <Field label="Wartosc identyfikatora" value={request.identityValue} mono />
              <Field label="Usluga hurtowa po stronie biorcy" value={request.linkedWholesaleServiceOnRecipientSide ? 'Tak' : 'Nie'} />
              <Field label="Operator infrastrukturalny" value={request.infrastructureOperator?.name} />
              <WideField label="Adres korespondencyjny" value={request.correspondenceAddress} />
              <WideField label="Notatki wewnetrzne" value={request.internalNotes} />
            </dl>
          </SectionCard>

          <PortingCommunicationPanel
            actions={availableCommunicationActions}
            summary={communicationSummary}
            items={communicationItems}
            isLoadingHistory={isCommunicationLoading}
            preview={communicationPreview}
            feedbackError={communicationFeedbackError}
            feedbackSuccess={communicationFeedbackSuccess}
            previewingActionType={previewingCommunicationActionType}
            creatingDraftActionType={creatingCommunicationActionType}
            markingSentId={markingCommunicationId}
            sendingId={sendingCommunicationId}
            retryingId={retryingCommunicationId}
            cancellingId={cancellingCommunicationId}
            deliveryAttemptsByCommId={deliveryAttemptsByCommId}
            loadingDeliveryAttemptsId={loadingDeliveryAttemptsId}
            onCreateDraft={(actionType) => void handleCreateCommunicationDraft(actionType)}
            onPreviewDraft={(actionType) => void handlePreviewCommunicationDraft(actionType)}
            onMarkAsSent={(communicationId) => void handleMarkCommunicationAsSent(communicationId)}
            onSend={(communicationId) => void handleSendCommunication(communicationId)}
            onRetry={(communicationId) => void handleRetryCommunication(communicationId)}
            onCancel={(communicationId) => void handleCancelCommunication(communicationId)}
            onLoadDeliveryAttempts={(communicationId) => void handleLoadDeliveryAttempts(communicationId)}
          />

          <PortingCaseHistory items={caseHistoryItems} isLoading={isCaseHistoryLoading} />

          <NotificationHealthPanel health={request.notificationHealth} />

          {(request.notificationHealth.failureCount > 0 ||
            isNotificationFailuresLoading ||
            notificationFailuresError) && (
            <NotificationFailureHistoryPanel
              items={notificationFailureItems}
              isLoading={isNotificationFailuresLoading}
              error={notificationFailuresError}
            />
          )}

          <PortingInternalNotificationsPanel
            items={internalNotificationItems}
            isLoading={isInternalNotificationLoading}
            error={internalNotificationError}
          />

          <InternalNotificationAttemptsPanel
            items={internalNotificationAttemptItems}
            isLoading={isInternalNotificationAttemptsLoading}
            error={internalNotificationAttemptsError}
          />

          {isAdmin && (
            <DisclosureCard
              title="PLI CBD"
              description="Sekcja administracyjna z operacjami foundation i statusem procesu PLI CBD."
            >
              <div className="space-y-4">
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Status eksportu" value={PLI_CBD_EXPORT_STATUS_LABELS[request.pliCbdExportStatus]} />
                    <Field label="Ostatnia synchronizacja" value={request.pliCbdLastSyncAt ? formatDateTime(request.pliCbdLastSyncAt) : null} />
                    <Field label="PLI CBD case ID" value={request.pliCbdCaseId} mono />
                    <Field label="PLI CBD case number" value={request.pliCbdCaseNumber} mono />
                    <Field label="PLI CBD package ID" value={request.pliCbdPackageId} mono />
                    <Field label="Ostatni typ komunikatu" value={request.lastPliCbdMessageType} mono />
                    <Field label="Ostatni kod statusu" value={request.lastPliCbdStatusCode} mono />
                    <WideField label="Opis ostatniego statusu PLI CBD" value={request.pliCbdExportStatus === 'NOT_EXPORTED' ? 'Nie wyeksportowano do PLI CBD.' : request.lastPliCbdStatusDescription} />
                  </dl>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleExport()}
                    className="btn-secondary"
                    disabled={isExporting || isSyncing}
                  >
                    {isExporting ? 'Eksportowanie...' : 'Manualny eksport'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSync()}
                    className="btn-secondary"
                    disabled={isSyncing || isExporting || request.pliCbdExportStatus === 'NOT_EXPORTED'}
                  >
                    {isSyncing ? 'Synchronizowanie...' : 'Manualna synchronizacja'}
                  </button>
                </div>

                {actionSuccess && (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {actionSuccess}
                  </div>
                )}

                {actionError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {actionError}
                  </div>
                )}

                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Manualne akcje sa foundation pod przyszla integracje. Nadal nie ma realnego klienta SOAP do PLI CBD.
                </div>

                <PliCbdProcessSnapshot snapshot={processSnapshot} isLoading={isProcessSnapshotLoading} />
              </div>
            </DisclosureCard>
          )}

          {isAdmin && (
            <DisclosureCard
              title="Diagnostyka"
              description="Drafty, payloady techniczne, XML preview i historia integracji. Schowane domyslnie."
            >
              <div className="space-y-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Diagnostyka jest widoczna tylko dla administratora. Nie sugeruje jeszcze realnego transportu SOAP.
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Manualny eksport komunikatow PLI CBD</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Buduje draft, payload i XML, zapisuje historie integracji, ale nadal nie wysyla do realnego PLI CBD.
                    </p>
                  </div>

                  {TECHNICAL_PAYLOAD_MESSAGE_TYPES.map((messageType) => {
                    const result = manualExportResults[messageType]
                    const isMessageLoading = manualExportLoading[messageType]
                    return (
                      <div
                        key={messageType}
                        className="space-y-2 rounded-lg border border-gray-200 bg-white px-4 py-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="text-sm font-medium text-gray-800">Komunikat {messageType}</span>
                          <button
                            type="button"
                            onClick={() => void handleManualExport(messageType)}
                            className="btn-secondary"
                            disabled={isMessageLoading}
                          >
                            {isMessageLoading ? 'Eksportowanie...' : `Eksportuj ${messageType}`}
                          </button>
                        </div>

                        {result && (() => {
                          const { bannerClass, headline } = buildAdminTransportBanner(result)
                          const transportResult = result.transportResult

                          return (
                            <div className={`rounded-md border px-3 py-2 text-sm ${bannerClass}`}>
                              <p className="font-medium">{headline}</p>

                              {transportResult && (
                                <p className="mt-0.5 text-xs opacity-75">
                                  Tryb: <span className="font-mono">{result.transportMode ?? 'UNKNOWN'}</span>
                                  {' · '}Adapter: <span className="font-mono">{transportResult.adapterName}</span>
                                  {transportResult.referenceId && (
                                    <>
                                      {' · '}Ref: <span className="font-mono">{transportResult.referenceId}</span>
                                    </>
                                  )}
                                </p>
                              )}

                              {!transportResult && result.transportMode && (
                                <p className="mt-0.5 text-xs opacity-75">
                                  Tryb: <span className="font-mono">{result.transportMode}</span>
                                </p>
                              )}

                              {result.blockingReasons.length > 0 && (
                                <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
                                  {result.blockingReasons.map((blockingReason) => (
                                    <li key={blockingReason.code}>
                                      <span className="font-mono">{blockingReason.code}</span> - {blockingReason.message}
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {result.technicalWarnings.length > 0 && (
                                <details className="mt-1">
                                  <summary className="cursor-pointer text-xs opacity-75 hover:underline">
                                    Ostrzezenia techniczne ({result.technicalWarnings.length})
                                  </summary>
                                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
                                    {result.technicalWarnings.map((warning, index) => (
                                      <li key={`${warning.code}-${index}`}>
                                        <span className="font-mono">{warning.code}</span>
                                        {warning.field ? ` [${warning.field}]` : ''} - {warning.message}
                                      </li>
                                    ))}
                                  </ul>
                                </details>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })}
                </div>

                <PliCbdE03DraftPreview result={e03DraftResult} isLoading={isE03DraftLoading} />
                <PliCbdE12DraftPreview result={e12DraftResult} isLoading={isE12DraftLoading} />
                <PliCbdE18DraftPreview result={e18DraftResult} isLoading={isE18DraftLoading} />

                {TECHNICAL_PAYLOAD_MESSAGE_TYPES.map((messageType) => (
                  <div key={messageType} className="grid gap-4 xl:grid-cols-2">
                    <PliCbdTechnicalPayloadPreview
                      messageType={messageType}
                      result={technicalPayloadResults[messageType]}
                      isLoading={technicalPayloadLoading[messageType]}
                    />
                    <PliCbdXmlPreview
                      messageType={messageType}
                      result={xmlPreviewResults[messageType]}
                      isLoading={xmlPreviewLoading[messageType]}
                    />
                  </div>
                ))}

                <PliCbdIntegrationHistory
                  items={integrationEvents}
                  isLoading={isIntegrationEventsLoading}
                />
              </div>
            </DisclosureCard>
          )}
        </div>

        <div className="space-y-4">
          <PortingAssignmentPanel
            assignedUser={request.assignedUser}
            assignedAt={request.assignedAt}
            assignedByDisplayName={assignedByDisplayName}
            historyItems={assignmentHistoryItems}
            isHistoryLoading={isAssignmentHistoryLoading}
            canManageAssignment={canManageAssignment}
            canSelectAssignee={canSelectAssignee}
            isLoadingAssigneeOptions={isAssignableUsersLoading}
            assigneeOptions={assigneeOptions}
            selectedAssigneeId={assigneeDraft}
            currentUserId={user?.id ?? null}
            isAssigningToMe={isAssigningToMe}
            isUpdatingAssignment={isUpdatingAssignment}
            isUnassigning={isUnassigning}
            feedbackError={assignmentFeedbackError}
            feedbackSuccess={assignmentFeedbackSuccess}
            onSelectedAssigneeIdChange={setAssigneeDraft}
            onAssignToMe={() => void handleAssignToMe()}
            onUpdateAssignment={() => void handleUpdateAssignment()}
            onUnassign={() => void handleUnassign()}
          />

          <SectionCard
            title="Opiekun handlowy"
            description="Opcjonalny opiekun handlowy odpowiedzialny za relacje z klientem."
          >
            <div className="space-y-3">
              <div>
                <span className="block text-xs font-medium text-gray-500">Aktualny opiekun</span>
                {request.commercialOwner ? (
                  <span className="mt-0.5 block text-sm font-medium text-gray-900">
                    {request.commercialOwner.displayName}{' '}
                    <span className="font-normal text-gray-500">({request.commercialOwner.email})</span>
                  </span>
                ) : (
                  <span className="mt-0.5 block text-sm text-gray-400">Brak przypisanego opiekuna</span>
                )}
              </div>

              {canManageCommercialOwner && (
                <div className="space-y-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-600">
                      Zmien opiekuna handlowego
                    </span>
                    <select
                      value={commercialOwnerDraft}
                      onChange={(e) => setCommercialOwnerDraft(e.target.value)}
                      disabled={isUpdatingCommercialOwner || isCommercialOwnerCandidatesLoading}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value="">— brak —</option>
                      {commercialOwnerCandidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.firstName} {candidate.lastName} ({candidate.email})
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleUpdateCommercialOwner(commercialOwnerDraft || null)}
                      disabled={isUpdatingCommercialOwner || isCommercialOwnerCandidatesLoading}
                      className="btn-primary"
                    >
                      {isUpdatingCommercialOwner ? 'Zapisywanie...' : 'Zapisz'}
                    </button>
                    {request.commercialOwner && (
                      <button
                        type="button"
                        onClick={() => void handleUpdateCommercialOwner(null)}
                        disabled={isUpdatingCommercialOwner}
                        className="btn-secondary"
                      >
                        Usun opiekuna
                      </button>
                    )}
                  </div>
                </div>
              )}

              {commercialOwnerFeedbackSuccess && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {commercialOwnerFeedbackSuccess}
                </div>
              )}
              {commercialOwnerFeedbackError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {commercialOwnerFeedbackError}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Akcje"
            description="Frontend tylko pokazuje dozwolone akcje. Backend pozostaje zrodlem prawdy dla workflow."
          >
            {canManageStatus ? (
              <div className="space-y-4">
                {availableStatusActions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {availableStatusActions.map((action) => (
                      <button
                        key={`${action.actionId}-${action.targetStatus}`}
                        type="button"
                        onClick={() => handleSelectStatusAction(action)}
                        className={
                          selectedStatusAction?.actionId === action.actionId &&
                          selectedStatusAction.targetStatus === action.targetStatus
                            ? 'btn-primary'
                            : 'btn-secondary'
                        }
                        disabled={isUpdatingStatus || isExporting || isSyncing}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    Dla tego statusu nie ma dostepnych akcji.
                  </div>
                )}

                {selectedStatusAction ? (
                  <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">{selectedStatusAction.label}</h3>
                      <p className="mt-1 text-sm text-gray-500">{selectedStatusAction.description}</p>
                    </div>

                    {selectedStatusAction.requiresReason && (
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-600">
                          {selectedStatusAction.reasonLabel ?? 'Powod'}
                        </span>
                        <input
                          type="text"
                          value={statusReason}
                          onChange={(event) => setStatusReason(event.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                          placeholder={selectedStatusAction.reasonLabel ?? 'Podaj powod'}
                        />
                      </label>
                    )}

                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-gray-600">
                        {selectedStatusAction.commentLabel ??
                          (selectedStatusAction.requiresComment ? 'Komentarz' : 'Komentarz (opcjonalnie)')}
                      </span>
                      <textarea
                        value={statusComment}
                        onChange={(event) => setStatusComment(event.target.value)}
                        rows={selectedStatusAction.requiresComment ? 4 : 3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                        placeholder={
                          selectedStatusAction.requiresComment
                            ? 'Dodaj wymagany komentarz'
                            : 'Opcjonalny komentarz operacyjny'
                        }
                      />
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSubmitStatusAction()}
                        className="btn-primary"
                        disabled={isUpdatingStatus || isExporting || isSyncing}
                      >
                        {isUpdatingStatus ? 'Zapisywanie...' : selectedStatusAction.label}
                      </button>
                      <button
                        type="button"
                        onClick={resetStatusActionForm}
                        className="btn-secondary"
                        disabled={isUpdatingStatus}
                      >
                        Wyczysc
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    Wybierz akcje, aby zmienic status sprawy.
                  </div>
                )}

                {statusActionSuccess && (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {statusActionSuccess}
                  </div>
                )}

                {statusActionError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {statusActionError}
                  </div>
                )}

                <PortingExternalActionsPanel
                  availableActions={availableExternalActions}
                  selectedAction={selectedExternalAction}
                  scheduledPortDate={externalScheduledPortDate}
                  rejectionReason={externalRejectionReason}
                  comment={externalActionComment}
                  createDraft={externalCreateDraft}
                  isSubmitting={isSubmittingExternalAction}
                  successMessage={externalActionSuccess}
                  errorMessage={externalActionError}
                  onSelectAction={handleSelectExternalAction}
                  onScheduledPortDateChange={setExternalScheduledPortDate}
                  onRejectionReasonChange={setExternalRejectionReason}
                  onCommentChange={setExternalActionComment}
                  onCreateDraftChange={setExternalCreateDraft}
                  onSubmit={() => void handleSubmitExternalAction()}
                  onReset={resetExternalActionForm}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Twoja rola ma dostep tylko do podgladu sprawy.
              </div>
            )}
          </SectionCard>

          <SectionCard title="Meta" description="Informacje pomocnicze dla obslugi sprawy.">
            <dl className="grid grid-cols-1 gap-4">
              <Field label="Utworzono" value={formatDateTime(request.createdAt)} />
              <Field label="Ostatnia zmiana" value={formatDateTime(request.updatedAt)} />
              <Field
                label="Przekazano do systemu zewnetrznego"
                value={request.sentToExternalSystemAt ? formatDateTime(request.sentToExternalSystemAt) : null}
              />
              <Field label="Kod odrzucenia" value={request.rejectionCode} mono />
              <WideField label="Powod odrzucenia" value={request.rejectionReason} />
            </dl>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
