import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { buildPath, ROUTES } from '@/constants/routes'
import { useAuthStore } from '@/stores/auth.store'
import { useSystemCapabilities } from '@/hooks/useSystemCapabilities'
import { Badge, Button, ButtonLink, type BadgeTone, cx } from '@/components/ui'
import {
  assignPortingRequestToMe,
  cancelPortingCommunication,
  createPortingCommunicationDraft,
  executePortingRequestExternalAction,
  exportPortingRequest,
  getPortingRequestAssignmentHistory,
  getPortingCommunicationDeliveryAttempts,
  getPortingRequestById,
  getPortingRequestByCaseNumber,
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
  retryInternalNotificationAttempt,
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
  type PortingCaseStatus,
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
  getInternalNotificationRetryErrorMessage,
  getInternalNotificationRetrySuccessMessage,
} from '@/lib/internalNotificationRetryMessages'
import {
  canManagePortingOwnership,
  canSelectAnyAssignee,
} from '@/lib/portingOwnership'
import {
  getWorkflowErrorEmptyStateMessage,
  shouldShowPliCbdOperationalMeta,
} from './requestDetailCapabilities'

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
  id,
  title,
  description,
  children,
  compact = false,
}: {
  id?: string
  title: string
  description?: string
  children: React.ReactNode
  compact?: boolean
}) {
  return (
    <section id={id} className={cx('panel scroll-mt-6', compact ? 'p-4' : 'p-5')}>
      <div className={compact ? 'mb-3' : 'mb-4'}>
        <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
        {description && <p className="mt-1 text-sm leading-6 text-ink-500">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function DisclosureCard({
  id,
  title,
  description,
  children,
}: {
  id?: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <details id={id} className="panel group scroll-mt-6 overflow-hidden">
      <summary
        onClick={(event) => event.currentTarget.focus()}
        className="flex w-full cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset group-open:bg-ink-50/50 [&::-webkit-details-marker]:hidden"
      >
        <div className="min-w-0 pr-4">
          <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-ink-500">{description}</p>
        </div>
        <span
          aria-hidden="true"
          className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-ui border border-line bg-surface text-sm font-semibold text-ink-500 transition-transform group-open:rotate-180"
        >
          v
        </span>
      </summary>
      <div className="border-t border-line px-5 py-5">{children}</div>
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
      <dt className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-400">{label}</dt>
      <dd className={cx('text-sm font-medium text-ink-800', mono && 'font-mono')}>
        {value ?? <span className="font-normal text-ink-400">-</span>}
      </dd>
    </div>
  )
}

function WideField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="sm:col-span-2">
      <dt className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-400">{label}</dt>
      <dd className="whitespace-pre-wrap text-sm font-medium leading-6 text-ink-800">
        {value ?? <span className="font-normal text-ink-400">-</span>}
      </dd>
    </div>
  )
}

function DetailMetric({
  label,
  value,
  tone = 'neutral',
  actionLabel,
  onAction,
}: {
  label: string
  value: string
  tone?: BadgeTone
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="rounded-panel border border-line bg-surface px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-400">{label}</div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Badge tone={tone}>{value}</Badge>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="rounded-ui bg-brand-50/70 px-2 py-1 text-xs font-semibold text-brand-800 underline-offset-4 transition-colors hover:bg-brand-100 hover:text-brand-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {actionLabel} {'>'}
          </button>
        )}
      </div>
    </div>
  )
}

function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const TERMINAL_CLOSED_STATUSES: PortingCaseStatus[] = ['REJECTED', 'CANCELLED', 'PORTED']

const TERMINAL_CLOSED_LABELS: Partial<Record<PortingCaseStatus, string>> = {
  PORTED: 'Numer przeniesiony pomyślnie.',
  REJECTED: 'Sprawa odrzucona.',
  CANCELLED: 'Sprawa anulowana.',
}

const STATUS_NEXT_STEP_DESCRIPTION: Partial<Record<PortingCaseStatus, string>> = {
  DRAFT: 'Złóż sprawę do dalszej obsługi lub anuluj szkic.',
  SUBMITTED: 'Sprawa oczekuje na weryfikację — potwierdź, odeślij do dawcy lub odrzuć.',
  PENDING_DONOR: 'Oczekiwanie na odpowiedź operatora oddającego — po odpowiedzi potwierdź lub odrzuć.',
  CONFIRMED: 'Sprawa potwierdzona — po realizacji portowania oznacz jako przeniesioną.',
  ERROR: 'Zidentyfikuj przyczynę błędu i podjej działanie — anuluj lub skontaktuj się z przełożonym.',
}

function NextStepBanner({
  status,
  availableStatusActions,
  canManageStatus,
  onScrollToActions,
}: {
  status: PortingCaseStatus
  availableStatusActions: PortingRequestStatusActionDto[]
  canManageStatus: boolean
  onScrollToActions: () => void
}) {
  const isTerminal = TERMINAL_CLOSED_STATUSES.includes(status)
  const isError = status === 'ERROR'
  const hasActions = availableStatusActions.length > 0

  if (isTerminal) {
    const tone = status === 'PORTED' ? 'emerald' : status === 'REJECTED' ? 'red' : 'neutral'
    const colorClass =
      tone === 'emerald'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : tone === 'red'
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-line bg-ink-50 text-ink-600'

    return (
      <div className={cx('rounded-panel border px-4 py-3', colorClass)}>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Stan sprawy</p>
        <p className="mt-1 text-sm font-semibold">
          {TERMINAL_CLOSED_LABELS[status] ?? 'Sprawa zakończona — brak dalszych kroków.'}
        </p>
        <p className="mt-0.5 text-xs opacity-70">Żadne akcje statusowe nie są dostępne.</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-panel border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Wymaga interwencji</p>
        <p className="mt-1 text-sm font-semibold text-red-800">Sprawa ma status Błąd.</p>
        <p className="mt-0.5 text-xs text-red-700">
          {STATUS_NEXT_STEP_DESCRIPTION.ERROR}
        </p>
        {canManageStatus && hasActions && (
          <button
            type="button"
            onClick={onScrollToActions}
            className="mt-2 rounded-ui px-2 py-1 text-xs font-semibold text-red-800 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Przejdź do akcji →
          </button>
        )}
      </div>
    )
  }

  if (!canManageStatus) {
    return (
      <div className="rounded-panel border border-line bg-surface px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Tryb podglądu</p>
        <p className="mt-1 text-sm text-ink-600">
          Twoja rola pozwala tylko na podgląd sprawy. Akcje statusowe są niedostępne.
        </p>
      </div>
    )
  }

  if (hasActions) {
    return (
      <div className="rounded-panel border border-brand-200 bg-brand-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Następny krok</p>
        <p className="mt-1 text-sm font-medium text-ink-800">
          {STATUS_NEXT_STEP_DESCRIPTION[status] ?? 'Wykonaj dostępną akcję, aby kontynuować obsługę sprawy.'}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
          {availableStatusActions.slice(0, 3).map((action) => (
            <span key={`${action.actionId}-${action.targetStatus}`} className="text-xs text-brand-700">
              • {action.label}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={onScrollToActions}
          className="mt-2 rounded-ui px-2 py-1 text-xs font-semibold text-brand-800 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          Przejdź do akcji →
        </button>
      </div>
    )
  }

  // Active status, no actions available for this role
  return (
    <div className="rounded-panel border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Oczekuje na działanie</p>
      <p className="mt-1 text-sm font-medium text-amber-800">
        Sprawa aktywna — żadna akcja nie jest dostępna dla Twojej roli w tym statusie.
      </p>
      <p className="mt-0.5 text-xs text-amber-700">
        Sprawa oczekuje na działanie uprawnionego operatora.
      </p>
    </div>
  )
}

function getStatusTone(status: ReturnType<typeof getPortingStatusMeta>['tone']): BadgeTone {
  const toneByStatus: Record<ReturnType<typeof getPortingStatusMeta>['tone'], BadgeTone> = {
    gray: 'neutral',
    blue: 'brand',
    amber: 'amber',
    green: 'green',
    red: 'red',
    emerald: 'emerald',
  }

  return toneByStatus[status]
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
        ? 'Operacja zapisana w trybie testowym.'
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
    { label: string; tone: BadgeTone; panelClass: string }
  > = {
    OK: {
      label: 'OK — brak bledow notyfikacji',
      tone: 'emerald',
      panelClass: 'border-emerald-200 bg-emerald-50/70',
    },
    FAILED: {
      label: 'Blad wysylki',
      tone: 'red',
      panelClass: 'border-red-200 bg-red-50/80',
    },
    MISCONFIGURED: {
      label: 'Blad konfiguracji',
      tone: 'amber',
      panelClass: 'border-amber-200 bg-amber-50/80',
    },
    MIXED: {
      label: 'Bledy mieszane',
      tone: 'orange',
      panelClass: 'border-orange-200 bg-orange-50/80',
    },
  }

  const config = statusConfig[health.status]

  return (
    <div className={`rounded-panel border p-4 ${config.panelClass}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink-800">Zdrowie powiadomien wewnetrznych</h3>
        <Badge tone={config.tone}>{config.label}</Badge>
      </div>
      {health.status !== 'OK' && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-ink-500">Wszystkich bledow</dt>
            <dd className="font-semibold text-ink-800">{health.failureCount}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Blad wysylki</dt>
            <dd className="font-semibold text-ink-800">{health.failedCount}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Blad konfiguracji</dt>
            <dd className="font-semibold text-ink-800">{health.misconfiguredCount}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Ostatni blad</dt>
            <dd className="font-semibold text-ink-800">
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function RequestDetailPage() {
  const { caseNumber } = useParams<{ caseNumber: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()

  // UUID of the loaded request — used by all secondary API calls and mutations.
  // Populated by loadRequest after the first successful fetch.
  const [internalId, setInternalId] = useState<string>('')
  // Alias so all existing mutations and secondary callbacks keep working unchanged.
  const id = internalId

  const [request, setRequest] = useState<PortingRequestDetailDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copyLinkDone, setCopyLinkDone] = useState(false)

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
  const [internalNotificationAttemptsRetrySuccess, setInternalNotificationAttemptsRetrySuccess] =
    useState<string | null>(null)
  const [internalNotificationAttemptsRetryError, setInternalNotificationAttemptsRetryError] =
    useState<string | null>(null)
  const [retryingInternalNotificationAttemptId, setRetryingInternalNotificationAttemptId] =
    useState<string | null>(null)
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
  const canUseInternalNotificationDiagnostics = isAdmin
  const canRetryInternalNotificationAttempts = isAdmin
  const { capabilities: systemCapabilities } = useSystemCapabilities()
  const canUsePliCbdExport = systemCapabilities.pliCbd.capabilities.export
  const canUsePliCbdSync = systemCapabilities.pliCbd.capabilities.sync
  const canUsePliCbdDiagnostics = systemCapabilities.pliCbd.capabilities.diagnostics
  const canUsePliCbdExternalActions = systemCapabilities.pliCbd.capabilities.externalActions
  const canShowPliCbdSection =
    isAdmin && (canUsePliCbdDiagnostics || canUsePliCbdExport || canUsePliCbdSync)
  const canShowPliCbdDiagnostics = isAdmin && canUsePliCbdDiagnostics
  const canShowPliCbdOperationalMeta = shouldShowPliCbdOperationalMeta(systemCapabilities)
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
    if (!caseNumber) return

    setIsLoading(true)
    setError(null)
    setNotFound(false)

    try {
      let nextRequest: PortingRequestDetailDto

      if (UUID_REGEX.test(caseNumber)) {
        // Legacy UUID in URL — fetch by ID, then redirect to canonical caseNumber URL.
        nextRequest = await getPortingRequestById(caseNumber)
        navigate(buildPath(ROUTES.REQUEST_DETAIL, nextRequest.caseNumber), { replace: true })
        return
      } else {
        nextRequest = await getPortingRequestByCaseNumber(caseNumber)
      }

      setInternalId(nextRequest.id)
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
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setNotFound(true)
      } else {
        const detail = axios.isAxiosError(err) && err.response ? ` (HTTP ${err.response.status})` : ''
        setError(`Nie udało się załadować szczegółów sprawy portowania.${detail}`)
      }
      if (import.meta.env.DEV) {
        console.error('[RequestDetailPage] loadRequest failed:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }, [caseNumber, navigate])

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
    if (!id || !canUseInternalNotificationDiagnostics) {
      setInternalNotificationAttemptItems([])
      setInternalNotificationAttemptsError(null)
      setIsInternalNotificationAttemptsLoading(false)
      return
    }

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
  }, [canUseInternalNotificationDiagnostics, id])

  const handleRetryInternalNotificationAttempt = useCallback(
    async (attemptId: string) => {
      if (!id || !canRetryInternalNotificationAttempts || retryingInternalNotificationAttemptId) {
        return
      }

      setRetryingInternalNotificationAttemptId(attemptId)
      setInternalNotificationAttemptsRetrySuccess(null)
      setInternalNotificationAttemptsRetryError(null)

      try {
        const result = await retryInternalNotificationAttempt(id, attemptId)
        setInternalNotificationAttemptsRetrySuccess(
          getInternalNotificationRetrySuccessMessage(result.retryAttempt.outcome),
        )
        await loadInternalNotificationAttempts()
      } catch (errorValue) {
        setInternalNotificationAttemptsRetryError(
          getInternalNotificationRetryErrorMessage(errorValue),
        )
      } finally {
        setRetryingInternalNotificationAttemptId(null)
      }
    },
    [
      canRetryInternalNotificationAttempts,
      id,
      loadInternalNotificationAttempts,
      retryingInternalNotificationAttemptId,
    ],
  )

  const loadNotificationFailures = useCallback(async () => {
    if (!id || !canUseInternalNotificationDiagnostics) {
      setNotificationFailureItems([])
      setNotificationFailuresError(null)
      setIsNotificationFailuresLoading(false)
      return
    }

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
  }, [canUseInternalNotificationDiagnostics, id])

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
    if (!id || !canShowPliCbdDiagnostics) {
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
  }, [canShowPliCbdDiagnostics, id])

  const loadE03Draft = useCallback(async () => {
    if (!id || !canShowPliCbdDiagnostics) {
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
  }, [canShowPliCbdDiagnostics, id])

  const loadE12Draft = useCallback(async () => {
    if (!id || !canShowPliCbdDiagnostics) {
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
  }, [canShowPliCbdDiagnostics, id])

  const loadE18Draft = useCallback(async () => {
    if (!id || !canShowPliCbdDiagnostics) {
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
  }, [canShowPliCbdDiagnostics, id])

  const refreshDraftPreviews = useCallback(() => {
    if (!canShowPliCbdDiagnostics) return
    void loadE03Draft()
    void loadE12Draft()
    void loadE18Draft()
  }, [canShowPliCbdDiagnostics, loadE03Draft, loadE12Draft, loadE18Draft])

  const loadTechnicalPayloads = useCallback(async () => {
    if (!id || !canShowPliCbdDiagnostics) {
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
  }, [canShowPliCbdDiagnostics, id])

  const loadXmlPreviews = useCallback(async () => {
    if (!id || !canShowPliCbdDiagnostics) {
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
  }, [canShowPliCbdDiagnostics, id])

  const loadIntegrationEvents = useCallback(async () => {
    if (!id || !canShowPliCbdDiagnostics) {
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
  }, [canShowPliCbdDiagnostics, id])

  // Effect 1: fires on URL change — resets UI state and triggers primary load.
  useEffect(() => {
    setInternalId('')
    setRequest(null)
    setNotFound(false)
    setError(null)
    resetCommunicationFeedback()
    setCommunicationPreview(null)
    setAssignmentFeedbackError(null)
    setAssignmentFeedbackSuccess(null)
    setInternalNotificationAttemptsRetrySuccess(null)
    setInternalNotificationAttemptsRetryError(null)
    setRetryingInternalNotificationAttemptId(null)

    if (!caseNumber) return
    void loadRequest()
  }, [caseNumber, loadRequest, resetCommunicationFeedback])

  // Effect 2: fires once internalId is known — triggers all secondary data loads.
  useEffect(() => {
    if (!internalId) return

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
    internalId,
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
    loadTechnicalPayloads,
    loadXmlPreviews,
    refreshDraftPreviews,
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
      if (canShowPliCbdDiagnostics) {
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
    if (!id || !selectedExternalAction || !canUsePliCbdExternalActions || isSubmittingExternalAction) return

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

      if (canShowPliCbdDiagnostics) {
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
    if (!id || !isAdmin || !canUsePliCbdExport || manualExportLoading[messageType]) return

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
      if (canShowPliCbdDiagnostics) {
        void loadIntegrationEvents()
      }
    }
  }

  const handleExport = async () => {
    if (!id || !isAdmin || !canUsePliCbdExport || isExporting) return

    setIsExporting(true)
    setActionError(null)
    setActionSuccess(null)

    try {
      setRequest(await exportPortingRequest(id))
      void loadCaseHistory()
      if (canShowPliCbdDiagnostics) {
        void loadIntegrationEvents()
        void loadProcessSnapshot()
        refreshDraftPreviews()
        void loadTechnicalPayloads()
        void loadXmlPreviews()
      }
      setActionSuccess('Eksport do PLI CBD zostal wyzwolony pomyslnie.')
    } catch {
      if (canShowPliCbdDiagnostics) {
        void loadIntegrationEvents()
        void loadProcessSnapshot()
        refreshDraftPreviews()
        void loadTechnicalPayloads()
        void loadXmlPreviews()
      }
      setActionError('Nie udalo sie uruchomic eksportu do PLI CBD.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleSync = async () => {
    if (!id || !isAdmin || !canUsePliCbdSync || isSyncing) return

    setIsSyncing(true)
    setActionError(null)
    setActionSuccess(null)

    try {
      setRequest(await syncPortingRequest(id))
      void loadCaseHistory()
      if (canShowPliCbdDiagnostics) {
        void loadIntegrationEvents()
        void loadProcessSnapshot()
        refreshDraftPreviews()
        void loadTechnicalPayloads()
        void loadXmlPreviews()
      }
      setActionSuccess('Synchronizacja z PLI CBD zakonczona pomyslnie.')
    } catch {
      if (canShowPliCbdDiagnostics) {
        void loadIntegrationEvents()
        void loadProcessSnapshot()
        refreshDraftPreviews()
        void loadTechnicalPayloads()
        void loadXmlPreviews()
      }
      setActionError('Nie udalo sie uruchomic synchronizacji z PLI CBD.')
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm font-medium text-ink-500">
        Ładowanie szczegółów sprawy...
      </div>
    )
  }

  const backToList = () => {
    if (location.state?.fromList) {
      void navigate(ROUTES.REQUESTS + (location.state.listSearch ?? ''))
    } else {
      void navigate(ROUTES.REQUESTS)
    }
  }

  const handleCopyLink = () => {
    const canonical = window.location.origin + buildPath(ROUTES.REQUEST_DETAIL, caseNumber ?? '')
    void navigator.clipboard.writeText(canonical).then(() => {
      setCopyLinkDone(true)
      setTimeout(() => setCopyLinkDone(false), 2000)
    })
  }

  if (notFound) {
    return (
      <div className="panel p-10 text-center">
        <p className="mb-1 text-base font-semibold text-ink-900">Nie znaleziono sprawy</p>
        <p className="mb-6 text-sm text-ink-500">
          Sprawa o numerze <span className="font-mono font-medium text-ink-700">{caseNumber}</span> nie istnieje lub została usunięta.
        </p>
        <Button onClick={backToList} variant="secondary">
          Wróć do listy spraw
        </Button>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="panel p-8 text-center">
        <p className="mb-1 text-base font-semibold text-ink-900">Nie udało się załadować sprawy</p>
        <p className="mb-6 text-sm text-ink-500">
          {error ?? 'Wystąpił nieoczekiwany błąd. Odśwież stronę lub wróć do listy.'}
        </p>
        <Button onClick={backToList} variant="secondary">
          Wróć do listy spraw
        </Button>
      </div>
    )
  }

  const statusMeta = getPortingStatusMeta(request.statusInternal)
  const assignedUserLabel = request.assignedUser
    ? `${request.assignedUser.displayName} (${request.assignedUser.email})`
    : 'Nieprzypisana'
  const commercialOwnerLabel = request.commercialOwner
    ? `${request.commercialOwner.displayName} (${request.commercialOwner.email})`
    : 'Brak opiekuna'
  const quickStatusActions = canManageStatus ? availableStatusActions.slice(0, 3) : []
  const hasQuickActions =
    quickStatusActions.length > 0 || canManageAssignment || availableCommunicationActions.length > 0

  return (
    <div className="space-y-6">
      <section className="panel overflow-hidden">
        <div className="border-b border-line px-5 py-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <Button
                onClick={backToList}
                variant="ghost"
                size="sm"
                className="mb-3 -ml-2"
              >
                ← Sprawy portowania
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{request.caseNumber}</Badge>
                <Badge tone={getStatusTone(statusMeta.tone)}>{statusMeta.label}</Badge>
                <Badge tone="brand">{PORTING_MODE_LABELS[request.portingMode]}</Badge>
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink-900">
                {request.client.displayName}
              </h1>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-ink-500">
                <span className="font-mono text-ink-700">{request.numberDisplay}</span>
                <span>{request.subscriberDisplayName}</span>
                <span>
                  {request.donorOperator.name} {'->'} {request.recipientOperator.name}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleCopyLink} variant="ghost" size="sm">
                {copyLinkDone ? '✓ Skopiowano' : 'Kopiuj link'}
              </Button>
              <ButtonLink to={ROUTES.REQUEST_NEW} variant="secondary">
                + Nowa sprawa
              </ButtonLink>
            </div>
          </div>
        </div>

        <div className="grid gap-3 bg-ink-50/70 px-5 py-4 md:grid-cols-2 xl:grid-cols-4">
          <DetailMetric
            label="Status"
            value={statusMeta.label}
            tone={getStatusTone(statusMeta.tone)}
            actionLabel={canManageStatus ? 'Akcje' : undefined}
            onAction={canManageStatus ? () => scrollToSection('workflow-actions') : undefined}
          />
          <DetailMetric
            label="Przypisanie BOK"
            value={request.assignedUser ? request.assignedUser.displayName : 'Nieprzypisana'}
            tone={request.assignedUser ? 'brand' : 'amber'}
            actionLabel={canManageAssignment ? 'Zmien' : 'Szczegoly'}
            onAction={() => scrollToSection('assignment-panel')}
          />
          <DetailMetric
            label="Opiekun handlowy"
            value={request.commercialOwner ? request.commercialOwner.displayName : 'Brak opiekuna'}
            tone={request.commercialOwner ? 'emerald' : 'amber'}
            actionLabel={canManageCommercialOwner ? 'Zmien' : 'Szczegoly'}
            onAction={() => scrollToSection('commercial-owner-panel')}
          />
          <DetailMetric
            label="Notyfikacje"
            value={request.notificationHealth.status === 'OK' ? 'OK' : `${request.notificationHealth.failureCount} bledow`}
            tone={request.notificationHealth.status === 'OK' ? 'emerald' : 'red'}
            actionLabel={request.notificationHealth.failureCount > 0 ? 'Sprawdz' : 'Historia'}
            onAction={() => scrollToSection('notification-panel')}
          />
        </div>
      </section>

      {hasQuickActions && (
        <section className="panel p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink-900">Szybkie akcje</h2>
              <p className="mt-1 text-sm text-ink-500">
                Najczestsze przejscia operacyjne bez szukania panelu w prawej kolumnie.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickStatusActions.map((action) => (
                <Button
                  key={`${action.actionId}-${action.targetStatus}`}
                  onClick={() => {
                    handleSelectStatusAction(action)
                    scrollToSection('workflow-actions')
                  }}
                  variant="primary"
                  size="sm"
                >
                  {action.label}
                </Button>
              ))}
              {canManageAssignment && (
                <Button
                  onClick={() => scrollToSection('assignment-panel')}
                  variant="secondary"
                  size="sm"
                >
                  Przypisanie BOK
                </Button>
              )}
              {availableCommunicationActions.length > 0 && (
                <Button
                  onClick={() => scrollToSection('communication-panel')}
                  variant="secondary"
                  size="sm"
                >
                  Komunikacja
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,0.9fr)]">
        <div className="space-y-5">
          <SectionCard title="Najwazniejsze informacje" description="Dane potrzebne od razu po wejsciu w sprawe.">
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

          <SectionCard title="Porting i terminy" description="Daty oraz parametry potrzebne do operacyjnej obslugi portowania.">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Wnioskowany dzien przeniesienia" value={request.requestedPortDate} mono />
              <Field label="Najwczesniejsza akceptowalna data" value={request.earliestAcceptablePortDate} mono />
              <Field label="Data potwierdzona" value={request.confirmedPortDate} mono />
              <Field label="Data od dawcy" value={request.donorAssignedPortDate} mono />
              <Field label="Godzina od dawcy" value={request.donorAssignedPortTime} mono />
              <Field label="Pelnomocnictwo" value={request.hasPowerOfAttorney ? 'Tak' : 'Nie'} />
            </dl>
          </SectionCard>

          <SectionCard title="Dane klienta i kontakt" description="Tozsamosc abonenta, kontakt i notatki operacyjne.">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Typ identyfikatora" value={SUBSCRIBER_IDENTITY_TYPE_LABELS[request.identityType]} />
              <Field label="Wartosc identyfikatora" value={request.identityValue} mono />
              <Field label="Usluga hurtowa po stronie biorcy" value={request.linkedWholesaleServiceOnRecipientSide ? 'Tak' : 'Nie'} />
              <Field label="Operator infrastrukturalny" value={request.infrastructureOperator?.name} />
              <WideField label="Adres korespondencyjny" value={request.correspondenceAddress} />
              <WideField label="Notatki wewnetrzne" value={request.internalNotes} />
            </dl>
          </SectionCard>

          <div id="communication-panel" className="scroll-mt-6">
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
              currentStatus={request.statusInternal}
              onCreateDraft={(actionType) => void handleCreateCommunicationDraft(actionType)}
              onPreviewDraft={(actionType) => void handlePreviewCommunicationDraft(actionType)}
              onMarkAsSent={(communicationId) => void handleMarkCommunicationAsSent(communicationId)}
              onSend={(communicationId) => void handleSendCommunication(communicationId)}
              onRetry={(communicationId) => void handleRetryCommunication(communicationId)}
              onCancel={(communicationId) => void handleCancelCommunication(communicationId)}
              onLoadDeliveryAttempts={(communicationId) => void handleLoadDeliveryAttempts(communicationId)}
            />
          </div>

          <SectionCard
            id="notification-panel"
            title="Stan notyfikacji"
            description="Widok problemow transportu i historii wewnetrznych powiadomien."
          >
            <div className="space-y-4">
              <NotificationHealthPanel health={request.notificationHealth} />

              {canUseInternalNotificationDiagnostics &&
                (request.notificationHealth.failureCount > 0 ||
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

              {canUseInternalNotificationDiagnostics && (
                <InternalNotificationAttemptsPanel
                  items={internalNotificationAttemptItems}
                  isLoading={isInternalNotificationAttemptsLoading}
                  error={internalNotificationAttemptsError}
                  canRetryAttempts={canRetryInternalNotificationAttempts}
                  retryingAttemptId={retryingInternalNotificationAttemptId}
                  retrySuccessMessage={internalNotificationAttemptsRetrySuccess}
                  retryErrorMessage={internalNotificationAttemptsRetryError}
                  onRetryAttempt={(attemptId) => void handleRetryInternalNotificationAttempt(attemptId)}
                />
              )}
            </div>
          </SectionCard>

          <SectionCard title="Historia operacyjna" description="Chronologia zmian statusu i zdarzen sprawy.">
            <PortingCaseHistory
              items={caseHistoryItems}
              isLoading={isCaseHistoryLoading}
              showHeader={false}
            />
          </SectionCard>

          {canShowPliCbdSection && (
            <DisclosureCard
              id="pli-cbd-panel"
              title="PLI CBD"
              description="Sekcja administracyjna z eksportem, synchronizacja i statusem procesu PLI CBD."
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

                {(canUsePliCbdExport || canUsePliCbdSync) && (
                  <div className="flex flex-wrap gap-2">
                    {canUsePliCbdExport && (
                      <button
                        type="button"
                        onClick={() => void handleExport()}
                        className="btn-secondary"
                        disabled={isExporting || isSyncing}
                      >
                        {isExporting ? 'Eksportowanie...' : 'Manualny eksport'}
                      </button>
                    )}
                    {canUsePliCbdSync && (
                      <button
                        type="button"
                        onClick={() => void handleSync()}
                        className="btn-secondary"
                        disabled={isSyncing || isExporting || request.pliCbdExportStatus === 'NOT_EXPORTED'}
                      >
                        {isSyncing ? 'Synchronizowanie...' : 'Manualna synchronizacja'}
                      </button>
                    )}
                  </div>
                )}

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

                {canUsePliCbdDiagnostics && (
                  <PliCbdProcessSnapshot snapshot={processSnapshot} isLoading={isProcessSnapshotLoading} />
                )}
              </div>
            </DisclosureCard>
          )}

          {canShowPliCbdDiagnostics && (
            <DisclosureCard
              id="diagnostics-panel"
              title="Diagnostyka"
              description="Podglady techniczne, XML i historia integracji. Schowane domyslnie."
            >
              <div className="space-y-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Diagnostyka jest widoczna tylko dla administratora i sluzy do weryfikacji danych technicznych przed operacjami PLI CBD.
                </div>

                {canUsePliCbdExport && (
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">Manualny eksport komunikatow PLI CBD</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Przygotowuje dane komunikatu, zapisuje historie integracji i pokazuje wynik operacji.
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
                                <details className="group mt-1">
                                  <summary
                                    onClick={(event) => event.currentTarget.focus()}
                                    className="flex cursor-pointer list-none items-center gap-2 text-xs opacity-75 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 [&::-webkit-details-marker]:hidden"
                                  >
                                    <span
                                      aria-hidden="true"
                                      className="inline-flex h-5 w-5 items-center justify-center rounded border border-current text-[10px] font-semibold transition-transform group-open:rotate-180"
                                    >
                                      v
                                    </span>
                                    <span>Ostrzezenia techniczne ({result.technicalWarnings.length})</span>
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
                )}

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
          <NextStepBanner
            status={request.statusInternal}
            availableStatusActions={availableStatusActions}
            canManageStatus={canManageStatus}
            onScrollToActions={() => scrollToSection('workflow-actions')}
          />

          <div id="assignment-panel" className="scroll-mt-6">
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
          </div>

          <SectionCard
            id="commercial-owner-panel"
            title="Opiekun handlowy"
            description="Opcjonalny opiekun handlowy odpowiedzialny za relacje z klientem."
            compact
          >
            <div className="space-y-3">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-ink-400">
                  Aktualny opiekun
                </span>
                <span
                  className={cx(
                    'mt-1 block text-sm font-semibold',
                    request.commercialOwner ? 'text-ink-900' : 'text-amber-800',
                  )}
                >
                  {commercialOwnerLabel}
                </span>
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
                      className="input-field"
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
                      {isUpdatingCommercialOwner ? 'Zapis opiekuna' : 'Zapisz'}
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
            id="workflow-actions"
            title="Zmień status"
            description="Dostępne przejścia wynikają z aktualnego statusu sprawy i uprawnień operatora."
            compact
          >
            {canManageStatus ? (
              <div className="space-y-4">
                {availableStatusActions.length > 0 ? (
                  <div className="space-y-3">
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
                  </div>
                ) : TERMINAL_CLOSED_STATUSES.includes(request.statusInternal) ? (
                  <div className="rounded-panel border border-line bg-ink-50 px-4 py-3 text-sm text-ink-500">
                    Sprawa zakończona — brak dostępnych akcji statusowych.
                  </div>
                ) : request.statusInternal === 'ERROR' ? (
                  <div className="rounded-panel border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {getWorkflowErrorEmptyStateMessage(canUsePliCbdExternalActions)}
                  </div>
                ) : (
                  <div className="rounded-panel border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Brak akcji dostępnych dla Twojej roli w tym statusie sprawy.
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
                          className="input-field"
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
                        className="input-field"
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
                        {isUpdatingStatus ? 'Zapis statusu' : selectedStatusAction.label}
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

                {canUsePliCbdExternalActions && (
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
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Twoja rola ma dostep tylko do podgladu sprawy.
              </div>
            )}
          </SectionCard>

          <SectionCard title="Meta" description="Informacje pomocnicze dla obslugi sprawy." compact>
            <dl className="grid grid-cols-1 gap-4">
              <Field label="Przypisanie BOK" value={assignedUserLabel} />
              <Field label="Utworzono" value={formatDateTime(request.createdAt)} />
              <Field label="Ostatnia zmiana" value={formatDateTime(request.updatedAt)} />
              {canShowPliCbdOperationalMeta && (
                <Field
                  label="Przekazano do systemu zewnetrznego"
                  value={request.sentToExternalSystemAt ? formatDateTime(request.sentToExternalSystemAt) : null}
                />
              )}
              <Field label="Kod odrzucenia" value={request.rejectionCode} mono />
              <WideField label="Powod odrzucenia" value={request.rejectionReason} />
            </dl>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
