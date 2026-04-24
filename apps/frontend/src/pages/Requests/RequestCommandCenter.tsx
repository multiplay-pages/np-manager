import { AlertBanner, Badge, Button, ButtonLink, DataField, SectionCard, type BadgeTone, cx } from '@/components/ui'
import { ROUTES } from '@/constants/routes'
import { getPortingStatusMeta } from '@/lib/portingStatusMeta'
import type { PortingUrgency } from '@/lib/portingUrgency'
import {
  PORTING_MODE_LABELS,
  type NotificationHealthDiagnosticsDto,
  type PortingRequestDetailDto,
} from '@np-manager/shared'

type CommandCenterRequest = Pick<
  PortingRequestDetailDto,
  | 'caseNumber'
  | 'client'
  | 'numberDisplay'
  | 'subscriberDisplayName'
  | 'donorOperator'
  | 'recipientOperator'
  | 'portingMode'
  | 'confirmedPortDate'
  | 'requestedPortDate'
  | 'donorAssignedPortDate'
  | 'donorAssignedPortTime'
  | 'statusInternal'
  | 'assignedUser'
  | 'commercialOwner'
  | 'notificationHealth'
>

interface RequestCaseHeroProps {
  request: CommandCenterRequest
  urgency: PortingUrgency
  copyLinkDone: boolean
  onBackToList: () => void
  onCopyLink: () => void
}

interface RequestAttentionStripProps {
  request: Pick<
    CommandCenterRequest,
    'assignedUser' | 'confirmedPortDate' | 'notificationHealth' | 'statusInternal'
  >
  canManageAssignment: boolean
  canManageStatus: boolean
  workflowErrorMessage: string
  onScrollToAssignment: () => void
  onScrollToNotifications: () => void
  onScrollToPortingDates: () => void
  onScrollToStatusActions: () => void
}

interface RequestMetaGridProps {
  request: CommandCenterRequest
  urgency: PortingUrgency
}

type AttentionTone = 'warning' | 'danger' | 'neutral'

interface AttentionItem {
  key: string
  tone: AttentionTone
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

const MAX_ATTENTION_ITEMS = 3

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

function getNotificationHealthBadge(health: NotificationHealthDiagnosticsDto): {
  label: string
  tone: BadgeTone
} {
  if (health.status === 'OK') {
    return { label: 'OK', tone: 'emerald' }
  }

  const labelByStatus: Record<Exclude<NotificationHealthDiagnosticsDto['status'], 'OK'>, string> = {
    FAILED: 'Blad wysylki',
    MISCONFIGURED: 'Blad konfiguracji',
    MIXED: 'Bledy mieszane',
  }

  return {
    label: `${labelByStatus[health.status]} (${health.failureCount})`,
    tone: health.status === 'MISCONFIGURED' ? 'amber' : 'red',
  }
}

function buildAttentionItems({
  canManageAssignment,
  canManageStatus,
  request,
  workflowErrorMessage,
  onScrollToAssignment,
  onScrollToNotifications,
  onScrollToPortingDates,
  onScrollToStatusActions,
}: RequestAttentionStripProps): AttentionItem[] {
  const items: AttentionItem[] = []

  if (request.statusInternal === 'ERROR') {
    items.push({
      key: 'status-error',
      tone: 'danger',
      title: 'Sprawa jest w stanie bledu',
      description: workflowErrorMessage,
      actionLabel: canManageStatus ? 'Przejdz do akcji' : undefined,
      onAction: canManageStatus ? onScrollToStatusActions : undefined,
    })
  }

  if (request.notificationHealth.status !== 'OK' && request.notificationHealth.failureCount > 0) {
    items.push({
      key: 'notification-health',
      tone: request.notificationHealth.status === 'MISCONFIGURED' ? 'warning' : 'danger',
      title: 'Problemy z notyfikacjami wewnetrznymi',
      description: `Wykryto ${request.notificationHealth.failureCount} problemow transportu notyfikacji dla tej sprawy.`,
      actionLabel: 'Sprawdz notyfikacje',
      onAction: onScrollToNotifications,
    })
  }

  if (!request.assignedUser) {
    items.push({
      key: 'unassigned',
      tone: 'warning',
      title: 'Brak przypisania BOK',
      description: 'Sprawa nie ma aktualnie przypisanego operatora odpowiedzialnego za obsluge.',
      actionLabel: canManageAssignment ? 'Przypisz operatora' : 'Zobacz przypisanie',
      onAction: onScrollToAssignment,
    })
  }

  if (!request.confirmedPortDate) {
    items.push({
      key: 'missing-port-date',
      tone: 'warning',
      title: 'Brak potwierdzonej daty przeniesienia',
      description: 'Termin przeniesienia nie zostal jeszcze potwierdzony w danych sprawy.',
      actionLabel: 'Zobacz terminy',
      onAction: onScrollToPortingDates,
    })
  }

  if (!canManageStatus) {
    items.push({
      key: 'read-only',
      tone: 'neutral',
      title: 'Tryb podgladu dla tej roli',
      description: 'Akcje statusowe sa niedostepne dla Twoich aktualnych uprawnien.',
    })
  }

  return items.slice(0, MAX_ATTENTION_ITEMS)
}

function OwnerValue({
  email,
  name,
  fallback,
  warning = false,
}: {
  email?: string
  name: string | null | undefined
  fallback: string
  warning?: boolean
}) {
  if (!name) {
    return <span className={warning ? 'text-amber-800' : 'text-ink-400'}>{fallback}</span>
  }

  return (
    <span className="block min-w-0 space-y-0.5">
      <span className="block break-words font-semibold text-ink-900">{name}</span>
      {email && <span className="block break-all text-xs font-normal text-ink-500">{email}</span>}
    </span>
  )
}

export function RequestCaseHero({
  copyLinkDone,
  request,
  urgency,
  onBackToList,
  onCopyLink,
}: RequestCaseHeroProps) {
  const statusMeta = getPortingStatusMeta(request.statusInternal)
  const healthBadge = getNotificationHealthBadge(request.notificationHealth)

  return (
    <section className="min-w-0 overflow-hidden rounded-panel border border-line bg-surface shadow-sm">
      <div className="border-b border-line px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button onClick={onBackToList} variant="ghost" size="sm" className="-ml-2 self-start">
            {'<-'} Sprawy portowania
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={onCopyLink} variant="ghost" size="sm">
              {copyLinkDone ? 'Skopiowano' : 'Kopiuj link'}
            </Button>
            <ButtonLink to={ROUTES.REQUEST_NEW} variant="secondary" size="sm">
              + Nowa sprawa
            </ButtonLink>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-0 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]">
        <div className="min-w-0 px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={getStatusTone(statusMeta.tone)} leadingDot>
              {statusMeta.label}
            </Badge>
            <Badge tone="brand">{PORTING_MODE_LABELS[request.portingMode]}</Badge>
            <Badge
              tone={urgency.tone}
              className={urgency.emphasized ? 'ring-2' : undefined}
              aria-label={`Pilnosc sprawy: ${urgency.label}`}
            >
              Pilnosc: {urgency.label}
            </Badge>
            <Badge tone={healthBadge.tone}>Notyfikacje: {healthBadge.label}</Badge>
          </div>

          <div className="mt-4 max-w-4xl min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-400">
              Sprawa
            </p>
            <h1 className="mt-1 break-words font-mono text-3xl font-semibold tracking-tight text-ink-950 md:text-4xl">
              {request.caseNumber}
            </h1>
            <p className="mt-3 break-words text-2xl font-semibold tracking-tight text-ink-900">
              {request.client.displayName}
            </p>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-ink-500">
              <span className="min-w-0 break-all font-mono text-ink-800">{request.numberDisplay}</span>
              <span className="min-w-0 break-words">{request.subscriberDisplayName}</span>
              <span className="min-w-0 break-words">
                {request.donorOperator.name} {'->'} {request.recipientOperator.name}
              </span>
            </p>
          </div>
        </div>

        <div className="border-t border-line bg-ink-50/70 px-5 py-5 xl:border-l xl:border-t-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-400">
            Sygnały operacyjne
          </p>
          <dl className="mt-4 divide-y divide-line">
            <DataField
              className="pb-3"
              label="Data przeniesienia"
              value={request.confirmedPortDate ?? request.donorAssignedPortDate}
              emptyText="Brak daty"
              mono
              variant="compact"
            />
            <DataField
              className="py-3"
              label="Przypisanie BOK"
              value={
                <OwnerValue
                  name={request.assignedUser?.displayName}
                  email={request.assignedUser?.email}
                  fallback="Nieprzypisana"
                  warning
                />
              }
              variant="compact"
            />
            <DataField
              className="py-3"
              label="Opiekun handlowy"
              value={
                <OwnerValue
                  name={request.commercialOwner?.displayName}
                  email={request.commercialOwner?.email}
                  fallback="Brak opiekuna"
                  warning
                />
              }
              variant="compact"
            />
            <DataField
              className="pt-3"
              label="Status procesu"
              value={statusMeta.label}
              variant="compact"
            />
          </dl>
        </div>
      </div>
    </section>
  )
}

export function RequestAttentionStrip(props: RequestAttentionStripProps) {
  const items = buildAttentionItems(props)

  if (items.length === 0) {
    return null
  }

  return (
    <div
      className={cx(
        'grid gap-3',
        items.length === 2 && 'xl:grid-cols-2',
        items.length >= 3 && 'xl:grid-cols-3',
      )}
    >
      {items.map((item) => (
        <AlertBanner
          key={item.key}
          tone={item.tone}
          title={item.title}
          description={item.description}
          action={
            item.actionLabel && item.onAction ? (
              <Button onClick={item.onAction} variant="secondary" size="sm">
                {item.actionLabel}
              </Button>
            ) : undefined
          }
        />
      ))}
    </div>
  )
}

export function RequestMetaGrid({ request, urgency }: RequestMetaGridProps) {
  const statusMeta = getPortingStatusMeta(request.statusInternal)
  const healthBadge = getNotificationHealthBadge(request.notificationHealth)

  return (
    <SectionCard
      title="Operacyjny skrót"
      description="Najważniejsze dane do szybkiej oceny sprawy."
      padding="md"
    >
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DataField
          label="Status"
          value={statusMeta.label}
          variant="compact"
        />
        <DataField
          label="Pilność"
          value={
            <Badge tone={urgency.tone} className={urgency.emphasized ? 'ring-2' : undefined}>
              {urgency.label}
            </Badge>
          }
          variant="compact"
        />
        <DataField
          label="Potwierdzona data"
          value={request.confirmedPortDate}
          emptyText="Brak daty"
          mono
          variant="compact"
        />
        <DataField
          label="Data od dawcy"
          value={
            request.donorAssignedPortDate
              ? `${request.donorAssignedPortDate}${request.donorAssignedPortTime ? ` ${request.donorAssignedPortTime}` : ''}`
              : null
          }
          emptyText="Brak"
          mono
          variant="compact"
        />
        <DataField
          label="BOK"
          value={request.assignedUser?.displayName ?? null}
          emptyText="Nieprzypisana"
          variant="compact"
        />
        <DataField
          label="Handlowy"
          value={request.commercialOwner?.displayName ?? null}
          emptyText="Brak opiekuna"
          variant="compact"
        />
        <DataField
          label="Notyfikacje"
          value={<Badge tone={healthBadge.tone}>{healthBadge.label}</Badge>}
          variant="compact"
        />
        <DataField
          label="Operatorzy"
          value={`${request.donorOperator.shortName || request.donorOperator.name} -> ${
            request.recipientOperator.shortName || request.recipientOperator.name
          }`}
          variant="compact"
        />
      </dl>
    </SectionCard>
  )
}
