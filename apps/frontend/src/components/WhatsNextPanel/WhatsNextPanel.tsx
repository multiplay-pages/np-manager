import type {
  NotificationHealthDiagnosticsDto,
  PortingCaseStatus,
  PortingRequestAssigneeSummaryDto,
  PortingRequestCommunicationActionDto,
  PortingRequestStatusActionDto,
} from '@np-manager/shared'
import { cx } from '@/components/ui'
import { getPortingStatusMeta } from '@/lib/portingStatusMeta'

export interface WhatsNextPanelProps {
  status: PortingCaseStatus
  availableStatusActions: PortingRequestStatusActionDto[]
  availableCommunicationActions: PortingRequestCommunicationActionDto[]
  assignedUser: PortingRequestAssigneeSummaryDto | null
  notificationHealth: NotificationHealthDiagnosticsDto
  canManageStatus: boolean
  canManageAssignment: boolean
  onScrollToStatusActions: () => void
  onScrollToCommunication: () => void
  onScrollToAssignment: () => void
  onScrollToNotifications: () => void
}

type PanelTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral'

interface PrimaryAction {
  key: string
  label: string
  tone: 'primary' | 'secondary'
  onClick: () => void
}

const TERMINAL_STATUSES: PortingCaseStatus[] = ['REJECTED', 'CANCELLED', 'PORTED']

const TERMINAL_COPY: Partial<Record<PortingCaseStatus, { headline: string; body: string }>> = {
  PORTED: {
    headline: 'Numer został przeniesiony.',
    body: 'Sprawa zakończona pomyślnie — żadne dalsze kroki nie są wymagane.',
  },
  REJECTED: {
    headline: 'Sprawa została odrzucona.',
    body: 'Żadne akcje nie są dostępne. Jeśli potrzebujesz kontynuować, utwórz nową sprawę.',
  },
  CANCELLED: {
    headline: 'Sprawa została anulowana.',
    body: 'Żadne akcje nie są dostępne.',
  },
}

const STATUS_SUMMARY: Record<PortingCaseStatus, string> = {
  DRAFT: 'Sprawa jest w przygotowaniu — zanim ruszy dalej, trzeba ją złożyć.',
  SUBMITTED: 'Sprawa czeka na weryfikację przez obsługę.',
  PENDING_DONOR: 'Sprawa czeka na odpowiedź operatora oddającego.',
  CONFIRMED: 'Sprawa jest potwierdzona — czeka na dzień przeniesienia.',
  REJECTED: 'Sprawa odrzucona.',
  CANCELLED: 'Sprawa anulowana.',
  PORTED: 'Numer został przeniesiony.',
  ERROR: 'Sprawa jest w stanie błędu — wymaga interwencji.',
}

const NEXT_STEP_COPY: Partial<Record<PortingCaseStatus, string>> = {
  DRAFT: 'Złóż sprawę, aby przekazać ją do dalszej obsługi, lub anuluj szkic.',
  SUBMITTED: 'Zweryfikuj dane i przekaż sprawę do dawcy, potwierdź lub odrzuć.',
  PENDING_DONOR:
    'Poczekaj na odpowiedź dawcy. Gdy nadejdzie — potwierdź termin lub odrzuć sprawę.',
  CONFIRMED: 'Po realizacji portowania oznacz sprawę jako przeniesioną.',
  ERROR: 'Sprawdź przyczynę błędu i wybierz dalsze działanie lub skontaktuj się z przełożonym.',
}

const TONE_STYLES: Record<PanelTone, string> = {
  success: 'border-emerald-200 bg-emerald-50',
  danger: 'border-red-200 bg-red-50',
  warning: 'border-amber-200 bg-amber-50',
  info: 'border-brand-200 bg-brand-50',
  neutral: 'border-line bg-surface',
}

const TONE_LABEL_STYLES: Record<PanelTone, string> = {
  success: 'text-emerald-700',
  danger: 'text-red-700',
  warning: 'text-amber-700',
  info: 'text-brand-700',
  neutral: 'text-ink-500',
}

const TONE_HEADLINE_STYLES: Record<PanelTone, string> = {
  success: 'text-emerald-900',
  danger: 'text-red-900',
  warning: 'text-amber-900',
  info: 'text-ink-900',
  neutral: 'text-ink-900',
}

const TONE_BODY_STYLES: Record<PanelTone, string> = {
  success: 'text-emerald-800',
  danger: 'text-red-800',
  warning: 'text-amber-800',
  info: 'text-ink-700',
  neutral: 'text-ink-600',
}

function pickTone(status: PortingCaseStatus, hasBlocker: boolean): PanelTone {
  if (status === 'PORTED') return 'success'
  if (status === 'ERROR' || status === 'REJECTED') return 'danger'
  if (status === 'CANCELLED') return 'neutral'
  if (hasBlocker) return 'warning'
  return 'info'
}

function buildPrimaryActions({
  statusActions,
  communicationActions,
  canManageStatus,
  onScrollToStatusActions,
  onScrollToCommunication,
}: {
  statusActions: PortingRequestStatusActionDto[]
  communicationActions: PortingRequestCommunicationActionDto[]
  canManageStatus: boolean
  onScrollToStatusActions: () => void
  onScrollToCommunication: () => void
}): PrimaryAction[] {
  const actions: PrimaryAction[] = []

  if (canManageStatus) {
    for (const action of statusActions.slice(0, 2)) {
      actions.push({
        key: `status-${action.actionId}-${action.targetStatus}`,
        label: action.label,
        tone: actions.length === 0 ? 'primary' : 'secondary',
        onClick: onScrollToStatusActions,
      })
    }
  }

  const firstCommunication = communicationActions.find((action) => !action.disabled)
  if (firstCommunication && actions.length < 3) {
    actions.push({
      key: `communication-${firstCommunication.type}`,
      label: firstCommunication.label,
      tone: actions.length === 0 ? 'primary' : 'secondary',
      onClick: onScrollToCommunication,
    })
  }

  return actions.slice(0, 3)
}

function buildBlocker({
  status,
  canManageStatus,
  availableStatusActions,
  assignedUser,
  canManageAssignment,
  notificationHealth,
  onScrollToAssignment,
  onScrollToNotifications,
}: {
  status: PortingCaseStatus
  canManageStatus: boolean
  availableStatusActions: PortingRequestStatusActionDto[]
  assignedUser: PortingRequestAssigneeSummaryDto | null
  canManageAssignment: boolean
  notificationHealth: NotificationHealthDiagnosticsDto
  onScrollToAssignment: () => void
  onScrollToNotifications: () => void
}): { text: string; ctaLabel?: string; onClick?: () => void } | null {
  if (TERMINAL_STATUSES.includes(status)) {
    return null
  }

  if (notificationHealth.status !== 'OK' && notificationHealth.failureCount > 0) {
    return {
      text: `Zgłoszono ${notificationHealth.failureCount} błąd(ów) notyfikacji wewnętrznych — sprawdź zanim ruszysz dalej.`,
      ctaLabel: 'Sprawdź notyfikacje',
      onClick: onScrollToNotifications,
    }
  }

  if (!assignedUser) {
    return {
      text: 'Sprawa nie ma przypisanego operatora BOK.',
      ctaLabel: canManageAssignment ? 'Przypisz operatora' : 'Zobacz przypisanie',
      onClick: onScrollToAssignment,
    }
  }

  if (canManageStatus && availableStatusActions.length === 0 && status !== 'PENDING_DONOR') {
    return {
      text: 'Brak dostępnych akcji statusowych dla Twojej roli — sprawa czeka na uprawnionego operatora.',
    }
  }

  if (!canManageStatus) {
    return {
      text: 'Twoja rola pozwala tylko na podgląd sprawy — akcje statusowe są niedostępne.',
    }
  }

  return null
}

export function WhatsNextPanel({
  status,
  availableStatusActions,
  availableCommunicationActions,
  assignedUser,
  notificationHealth,
  canManageStatus,
  canManageAssignment,
  onScrollToStatusActions,
  onScrollToCommunication,
  onScrollToAssignment,
  onScrollToNotifications,
}: WhatsNextPanelProps) {
  const statusMeta = getPortingStatusMeta(status)
  const isTerminal = TERMINAL_STATUSES.includes(status)
  const terminalCopy = TERMINAL_COPY[status]

  const blocker = buildBlocker({
    status,
    canManageStatus,
    availableStatusActions,
    assignedUser,
    canManageAssignment,
    notificationHealth,
    onScrollToAssignment,
    onScrollToNotifications,
  })

  const tone = pickTone(status, blocker !== null)

  const actions = isTerminal
    ? []
    : buildPrimaryActions({
        statusActions: availableStatusActions,
        communicationActions: availableCommunicationActions,
        canManageStatus,
        onScrollToStatusActions,
        onScrollToCommunication,
      })

  const headline = isTerminal
    ? terminalCopy?.headline ?? `Sprawa: ${statusMeta.label}`
    : `Sprawa: ${statusMeta.label}`

  const summary = isTerminal
    ? terminalCopy?.body ?? STATUS_SUMMARY[status]
    : STATUS_SUMMARY[status]

  const nextStep = isTerminal ? null : NEXT_STEP_COPY[status] ?? null

  return (
    <section
      aria-label="Co dalej ze sprawą?"
      className={cx('rounded-panel border px-5 py-4 shadow-sm', TONE_STYLES[tone])}
    >
      <p
        className={cx(
          'text-xs font-semibold uppercase tracking-[0.1em]',
          TONE_LABEL_STYLES[tone],
        )}
      >
        Co dalej ze sprawą?
      </p>
      <p className={cx('mt-2 text-base font-semibold', TONE_HEADLINE_STYLES[tone])}>
        {headline}
      </p>
      <p className={cx('mt-1 text-sm leading-6', TONE_BODY_STYLES[tone])}>{summary}</p>

      {nextStep && (
        <div className="mt-3 rounded-ui border border-white/60 bg-white/70 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Najbliższy krok
          </p>
          <p className="mt-1 text-sm font-medium text-ink-800">{nextStep}</p>
        </div>
      )}

      {actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2" data-testid="whats-next-actions">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              className={
                action.tone === 'primary'
                  ? 'btn-primary'
                  : 'btn-secondary'
              }
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {blocker && (
        <div
          className="mt-3 rounded-ui border border-amber-200 bg-amber-50 px-3 py-2"
          data-testid="whats-next-blocker"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Blokada
          </p>
          <p className="mt-1 text-sm font-medium text-amber-900">{blocker.text}</p>
          {blocker.ctaLabel && blocker.onClick && (
            <button
              type="button"
              onClick={blocker.onClick}
              className="mt-2 rounded-ui px-2 py-1 text-xs font-semibold text-amber-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              {blocker.ctaLabel} →
            </button>
          )}
        </div>
      )}
    </section>
  )
}
