import { describe, expect, it } from 'vitest'
import {
  getInternalNotificationRetryBlockedReasonLabel,
  getInternalNotificationRetryErrorMessage,
  getInternalNotificationRetrySuccessMessage,
} from './internalNotificationRetryMessages'

describe('internalNotificationRetryMessages', () => {
  it('maps retry blocked reason code to readable message', () => {
    expect(getInternalNotificationRetryBlockedReasonLabel('RETRY_LIMIT_REACHED')).toBe(
      'Limit ponowien osiagniety.',
    )
  })

  it('returns fallback blocked message for missing reason code', () => {
    expect(getInternalNotificationRetryBlockedReasonLabel(null)).toBe(
      'Ponowienie jest niedostepne.',
    )
  })

  it('maps retry 409 error with reason code', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          error: {
            retryBlockedReasonCode: 'NOT_LATEST_IN_CHAIN',
          },
        },
      },
    }

    expect(getInternalNotificationRetryErrorMessage(error)).toBe(
      'Dostepna jest juz nowsza proba.',
    )
  })

  it('maps retry 403 error to permission message', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 403,
      },
    }

    expect(getInternalNotificationRetryErrorMessage(error)).toBe(
      'Nie masz uprawnien do ponowienia tej proby.',
    )
  })

  it('returns generic retry error for non-axios error', () => {
    expect(getInternalNotificationRetryErrorMessage(new Error('boom'))).toBe(
      'Nie udalo sie ponowic proby dostarczenia.',
    )
  })

  it('builds success message from retry attempt outcome', () => {
    expect(getInternalNotificationRetrySuccessMessage('SENT')).toBe(
      'Ponowienie wykonane: dostarczono.',
    )
  })
})
