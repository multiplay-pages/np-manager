import type { UserRole } from '@prisma/client'
import type {
  PortingCaseStatus,
  PortingRequestStatusActionDto,
  PortingRequestStatusActionId,
  UpdatePortingRequestStatusDto,
} from '@np-manager/shared'
import {
  PORTING_CASE_STATUS_LABELS,
  PORTING_REQUEST_STATUS_ACTION_IDS,
} from '@np-manager/shared'
import { AppError } from '../../shared/errors/app-error'

interface WorkflowTransitionConfig {
  actionId: PortingRequestStatusActionId
  fromStatus: PortingCaseStatus
  targetStatus: PortingCaseStatus
  label: string
  description: string
  allowedRoles: UserRole[]
  requiresReason: boolean
  requiresComment: boolean
  reasonLabel: string | null
  commentLabel: string | null
}

export interface ResolvedWorkflowTransition {
  config: WorkflowTransitionConfig
  reason: string | null
  comment: string | null
}

const WRITE_ROLES: UserRole[] = ['ADMIN', 'BOK_CONSULTANT', 'BACK_OFFICE', 'MANAGER']
export const REVIEW_ROLES: UserRole[] = ['ADMIN', 'BACK_OFFICE', 'MANAGER']

const WORKFLOW_TRANSITIONS: WorkflowTransitionConfig[] = [
  {
    actionId: PORTING_REQUEST_STATUS_ACTION_IDS.SUBMIT,
    fromStatus: 'DRAFT',
    targetStatus: 'SUBMITTED',
    label: 'Złóż sprawę',
    description: 'Przekaż sprawę do dalszej obsługi.',
    allowedRoles: WRITE_ROLES,
    requiresReason: false,
    requiresComment: false,
    reasonLabel: null,
    commentLabel: 'Komentarz operacyjny',
  },
  {
    actionId: PORTING_REQUEST_STATUS_ACTION_IDS.CANCEL,
    fromStatus: 'DRAFT',
    targetStatus: 'CANCELLED',
    label: 'Anuluj',
    description: 'Zamknij szkic bez wysyłania do procesu.',
    allowedRoles: WRITE_ROLES,
    requiresReason: true,
    requiresComment: false,
    reasonLabel: 'Powód anulowania',
    commentLabel: 'Komentarz operacyjny',
  },
  {
    actionId: PORTING_REQUEST_STATUS_ACTION_IDS.MARK_PENDING_DONOR,
    fromStatus: 'SUBMITTED',
    targetStatus: 'PENDING_DONOR',
    label: 'Oczekiwanie na dawcę',
    description: 'Zaznacz, że sprawa oczekuje na decyzję operatora oddającego.',
    allowedRoles: REVIEW_ROLES,
    requiresReason: false,
    requiresComment: false,
    reasonLabel: null,
    commentLabel: 'Komentarz operacyjny',
  },
  {
    actionId: PORTING_REQUEST_STATUS_ACTION_IDS.CONFIRM,
    fromStatus: 'SUBMITTED',
    targetStatus: 'CONFIRMED',
    label: 'Potwierdź',
    description: 'Potwierdź obsługę sprawy po stronie biznesowej.',
    allowedRoles: REVIEW_ROLES,
    requiresReason: false,
    requiresComment: false,
    reasonLabel: null,
    commentLabel: 'Komentarz operacyjny',
  },
  {
    actionId: PORTING_REQUEST_STATUS_ACTION_IDS.REJECT,
    fromStatus: 'SUBMITTED',
    targetStatus: 'REJECTED',
    label: 'Odrzuć',
    description: 'Odrzuć sprawę z czytelnym powodem dla audytu.',
    allowedRoles: REVIEW_ROLES,
    requiresReason: true,
    requiresComment: false,
    reasonLabel: 'Powód odrzucenia',
    commentLabel: 'Komentarz operacyjny',
  },
  {
    actionId: PORTING_REQUEST_STATUS_ACTION_IDS.CANCEL,
    fromStatus: 'SUBMITTED',
    targetStatus: 'CANCELLED',
    label: 'Anuluj',
    description: 'Anuluj aktywną sprawę przed finalizacją.',
    allowedRoles: WRITE_ROLES,
    requiresReason: true,
    requiresComment: false,
    reasonLabel: 'Powód anulowania',
    commentLabel: 'Komentarz operacyjny',
  },
  {
    actionId: PORTING_REQUEST_STATUS_ACTION_IDS.MARK_ERROR,
    fromStatus: 'SUBMITTED',
    targetStatus: 'ERROR',
    label: 'Oznacz błąd',
    description: 'Zablokuj dalszą obsługę i zapisz przyczynę problemu.',
    allowedRoles: REVIEW_ROLES,
    requiresReason: true,
    requiresComment: true,
    reasonLabel: 'Powód błędu',
    commentLabel: 'Szczegóły błędu',
  },
  {
    actionId: PORTING_REQUEST_STATUS_ACTION_IDS.CONFIRM,
    fromStatus: 'PENDING_DONOR',
    targetStatus: 'CONFIRMED',
    label: 'Potwierdź',
    description: 'Potwierdź sprawę po odpowiedzi dawcy.',
    allowedRoles: REVIEW_ROLES,
    requiresReason: false,
    requiresComment: false,
    reasonLabel: null,
    commentLabel: 'Komentarz operacyjny',
  },
  {
    actionId: PORTING_REQUEST_STATUS_ACTION_IDS.REJECT,
    fromStatus: 'PENDING_DONOR',
    targetStatus: 'REJECTED',
    label: 'Odrzuć',
    description: 'Zakończ sprawę negatywnie po odpowiedzi dawcy.',
    allowedRoles: REVIEW_ROLES,
    requiresReason: true,
    requiresComment: false,
    reasonLabel: 'Powód odrzucenia',
    commentLabel: 'Komentarz operacyjny',
  },
  {
    actionId: PORTING_REQUEST_STATUS_ACTION_IDS.CANCEL,
    fromStatus: 'PENDING_DONOR',
    targetStatus: 'CANCELLED',
    label: 'Anuluj',
    description: 'Anuluj sprawę podczas oczekiwania na dawcę.',
    allowedRoles: WRITE_ROLES,
    requiresReason: true,
    requiresComment: false,
    reasonLabel: 'Powód anulowania',
    commentLabel: 'Komentarz operacyjny',
  },
  {
    actionId: PORTING_REQUEST_STATUS_ACTION_IDS.MARK_ERROR,
    fromStatus: 'PENDING_DONOR',
    targetStatus: 'ERROR',
    label: 'Oznacz błąd',
    description: 'Zapisz problem procesowy podczas oczekiwania na dawcę.',
    allowedRoles: REVIEW_ROLES,
    requiresReason: true,
    requiresComment: true,
    reasonLabel: 'Powód błędu',
    commentLabel: 'Szczegóły błędu',
  },
  {
    actionId: PORTING_REQUEST_STATUS_ACTION_IDS.MARK_PORTED,
    fromStatus: 'CONFIRMED',
    targetStatus: 'PORTED',
    label: 'Oznacz jako przeniesioną',
    description: 'Zamknij sprawę jako zrealizowaną.',
    allowedRoles: REVIEW_ROLES,
    requiresReason: false,
    requiresComment: false,
    reasonLabel: null,
    commentLabel: 'Komentarz operacyjny',
  },
  {
    actionId: PORTING_REQUEST_STATUS_ACTION_IDS.CANCEL,
    fromStatus: 'CONFIRMED',
    targetStatus: 'CANCELLED',
    label: 'Anuluj',
    description: 'Anuluj sprawę po potwierdzeniu biznesowym.',
    allowedRoles: WRITE_ROLES,
    requiresReason: true,
    requiresComment: false,
    reasonLabel: 'Powód anulowania',
    commentLabel: 'Komentarz operacyjny',
  },
  {
    actionId: PORTING_REQUEST_STATUS_ACTION_IDS.MARK_ERROR,
    fromStatus: 'CONFIRMED',
    targetStatus: 'ERROR',
    label: 'Oznacz błąd',
    description: 'Oznacz problem po potwierdzeniu biznesowym.',
    allowedRoles: REVIEW_ROLES,
    requiresReason: true,
    requiresComment: true,
    reasonLabel: 'Powód błędu',
    commentLabel: 'Szczegóły błędu',
  },
  {
    actionId: PORTING_REQUEST_STATUS_ACTION_IDS.CANCEL_FROM_ERROR,
    fromStatus: 'ERROR',
    targetStatus: 'CANCELLED',
    label: 'Anuluj z błędu',
    description: 'Zamknij sprawę w stanie błędu jako anulowaną po decyzji operacyjnej.',
    allowedRoles: REVIEW_ROLES,
    requiresReason: true,
    requiresComment: false,
    reasonLabel: 'Powód anulowania z błędu',
    commentLabel: 'Komentarz operacyjny',
  },
  {
    actionId: PORTING_REQUEST_STATUS_ACTION_IDS.RESUME_FROM_ERROR,
    fromStatus: 'ERROR',
    targetStatus: 'ERROR',
    label: 'Wznów obsługę',
    description: 'Przywróć sprawę do statusu sprzed wejścia w błąd.',
    allowedRoles: REVIEW_ROLES,
    requiresReason: false,
    requiresComment: true,
    reasonLabel: null,
    commentLabel: 'Komentarz wznowienia',
  },
]

function toStatusActionDto(config: WorkflowTransitionConfig): PortingRequestStatusActionDto {
  return {
    actionId: config.actionId,
    label: config.label,
    targetStatus: config.targetStatus,
    requiresReason: config.requiresReason,
    requiresComment: config.requiresComment,
    reasonLabel: config.reasonLabel,
    commentLabel: config.commentLabel,
    description: config.description,
  }
}

function normalizeOptionalText(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function getAvailableStatusActions(
  currentStatus: PortingCaseStatus,
  role: UserRole,
): PortingRequestStatusActionDto[] {
  return WORKFLOW_TRANSITIONS
    .filter(
      (transition) =>
        transition.fromStatus === currentStatus && transition.allowedRoles.includes(role),
    )
    .map(toStatusActionDto)
}

export function resolveWorkflowTransition(
  currentStatus: PortingCaseStatus,
  body: UpdatePortingRequestStatusDto,
  role: UserRole,
): ResolvedWorkflowTransition {
  if (currentStatus === body.targetStatus) {
    throw AppError.badRequest(
      'Sprawa ma już wskazany status.',
      'PORTING_REQUEST_STATUS_UNCHANGED',
    )
  }

  const transition = WORKFLOW_TRANSITIONS.find(
    (item) => item.fromStatus === currentStatus && item.targetStatus === body.targetStatus,
  )

  if (!transition) {
    throw AppError.badRequest(
      `Nie można zmienić statusu z ${PORTING_CASE_STATUS_LABELS[currentStatus]} na ${PORTING_CASE_STATUS_LABELS[body.targetStatus]}.`,
      'PORTING_REQUEST_STATUS_TRANSITION_NOT_ALLOWED',
    )
  }

  if (!transition.allowedRoles.includes(role)) {
    throw AppError.forbidden(
      'Twoja rola nie może wykonać tej zmiany statusu.',
      'PORTING_REQUEST_STATUS_TRANSITION_ROLE_NOT_ALLOWED',
    )
  }

  const reason = normalizeOptionalText(body.reason)
  const comment = normalizeOptionalText(body.comment)

  if (transition.requiresReason && !reason) {
    throw AppError.badRequest(
      `${transition.reasonLabel ?? 'Powód'} jest wymagany dla tej zmiany statusu.`,
      'PORTING_REQUEST_STATUS_REASON_REQUIRED',
    )
  }

  if (transition.requiresComment && !comment) {
    throw AppError.badRequest(
      `${transition.commentLabel ?? 'Komentarz'} jest wymagany dla tej zmiany statusu.`,
      'PORTING_REQUEST_STATUS_COMMENT_REQUIRED',
    )
  }

  return {
    config: transition,
    reason,
    comment,
  }
}
