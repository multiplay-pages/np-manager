import axios from 'axios'
import type {
  InternalNotificationAttemptOutcomeDto,
  InternalNotificationRetryBlockedReasonCodeDto,
} from '@np-manager/shared'

const RETRY_BLOCKED_REASON_MESSAGES: Record<InternalNotificationRetryBlockedReasonCodeDto, string> =
  {
    RETRY_LIMIT_REACHED: 'Limit ponowien osiagniety.',
    NOT_LATEST_IN_CHAIN: 'Dostepna jest juz nowsza proba.',
    ORIGIN_NOT_RETRYABLE: 'Tego typu proby nie mozna ponowic.',
    OUTCOME_NOT_RETRYABLE: 'Ten wynik nie kwalifikuje sie do ponowienia.',
  }

const RETRY_OUTCOME_LABELS: Record<InternalNotificationAttemptOutcomeDto, string> = {
  SENT: 'dostarczono',
  STUBBED: 'wysylka testowa',
  DISABLED: 'wysylka wylaczona',
  MISCONFIGURED: 'blad konfiguracji',
  FAILED: 'blad wysylki',
  SKIPPED: 'pominieto',
}

export function getInternalNotificationRetryBlockedReasonLabel(
  reasonCode: InternalNotificationRetryBlockedReasonCodeDto | null,
): string {
  if (!reasonCode) {
    return 'Ponowienie jest niedostepne.'
  }

  return RETRY_BLOCKED_REASON_MESSAGES[reasonCode]
}

export function getInternalNotificationRetryErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'Nie udalo sie ponowic proby dostarczenia.'
  }

  const responseData = error.response?.data as
    | { error?: { retryBlockedReasonCode?: InternalNotificationRetryBlockedReasonCodeDto } }
    | undefined
  const reasonCode = responseData?.error?.retryBlockedReasonCode

  if (error.response?.status === 409 && reasonCode) {
    return getInternalNotificationRetryBlockedReasonLabel(reasonCode)
  }

  if (error.response?.status === 403) {
    return 'Nie masz uprawnien do ponowienia tej proby.'
  }

  return 'Nie udalo sie ponowic proby dostarczenia.'
}

export function getInternalNotificationRetrySuccessMessage(
  outcome: InternalNotificationAttemptOutcomeDto,
): string {
  return `Ponowienie wykonane: ${RETRY_OUTCOME_LABELS[outcome]}.`
}
