import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SYSTEM_SETTING_KEYS } from '@np-manager/shared'

const { mockSystemSettingFindUnique } = vi.hoisted(() => ({
  mockSystemSettingFindUnique: vi.fn(),
}))

vi.mock('../../../config/database', () => ({
  prisma: {
    systemSetting: {
      findUnique: (...args: unknown[]) => mockSystemSettingFindUnique(...args),
    },
  },
}))

import {
  decideNotificationErrorFallback,
  extractFailureOutcomesFromDispatch,
  resolveNotificationFallbackPolicy,
} from '../porting-notification-fallback-policy.resolver'

describe('porting-notification-fallback-policy.resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns disabled policy defaults when settings are missing', async () => {
    mockSystemSettingFindUnique.mockResolvedValue(null)

    const policy = await resolveNotificationFallbackPolicy()

    expect(policy).toEqual({
      fallbackEnabled: false,
      fallbackRecipientEmail: '',
      fallbackRecipientName: '',
      applyToFailed: true,
      applyToMisconfigured: true,
      readiness: 'DISABLED',
    })
  })

  it('marks policy as INCOMPLETE when fallback is enabled without recipient email', async () => {
    const byKey = new Map<string, { value: string }>([
      [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_ENABLED, { value: 'true' }],
      [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_EMAIL, { value: '' }],
      [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_NAME, { value: 'BOK Fallback' }],
      [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_FAILED, { value: 'true' }],
      [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_MISCONFIGURED, { value: 'true' }],
    ])

    mockSystemSettingFindUnique.mockImplementation(async (args: { where: { key: string } }) => {
      return byKey.get(args.where.key) ?? null
    })

    const policy = await resolveNotificationFallbackPolicy()
    expect(policy.readiness).toBe('INCOMPLETE')
  })

  it('extracts unique FAILED/MISCONFIGURED outcomes from dispatch results', () => {
    const outcomes = extractFailureOutcomesFromDispatch([
      {
        channel: 'EMAIL',
        recipient: 'a@np-manager.local',
        outcome: 'FAILED',
        mode: 'REAL',
        messageId: null,
        errorMessage: 'SMTP error',
      },
      {
        channel: 'EMAIL',
        recipient: 'b@np-manager.local',
        outcome: 'FAILED',
        mode: 'REAL',
        messageId: null,
        errorMessage: 'SMTP error',
      },
      {
        channel: 'TEAMS',
        recipient: 'https://teams.example/hook',
        outcome: 'MISCONFIGURED',
        mode: 'REAL',
        errorMessage: 'Webhook missing',
      },
      {
        channel: 'EMAIL',
        recipient: 'c@np-manager.local',
        outcome: 'SENT',
        mode: 'REAL',
        messageId: 'msg-1',
        errorMessage: null,
      },
    ])

    expect(outcomes).toEqual(['FAILED', 'MISCONFIGURED'])
  })

  it('returns TRIGGERED when FAILED outcome is allowed by policy', () => {
    const decision = decideNotificationErrorFallback(
      {
        fallbackEnabled: true,
        fallbackRecipientEmail: 'fallback@np-manager.local',
        fallbackRecipientName: 'Fallback BOK',
        applyToFailed: true,
        applyToMisconfigured: false,
        readiness: 'READY',
      },
      ['FAILED'],
    )

    expect(decision).toEqual({
      shouldTrigger: true,
      reason: 'TRIGGERED',
      failureOutcomes: ['FAILED'],
      matchedOutcomes: ['FAILED'],
    })
  })

  it('returns OUTCOME_NOT_ENABLED when policy does not cover detected outcomes', () => {
    const decision = decideNotificationErrorFallback(
      {
        fallbackEnabled: true,
        fallbackRecipientEmail: 'fallback@np-manager.local',
        fallbackRecipientName: 'Fallback BOK',
        applyToFailed: false,
        applyToMisconfigured: false,
        readiness: 'READY',
      },
      ['FAILED', 'MISCONFIGURED'],
    )

    expect(decision).toEqual({
      shouldTrigger: false,
      reason: 'OUTCOME_NOT_ENABLED',
      failureOutcomes: ['FAILED', 'MISCONFIGURED'],
      matchedOutcomes: [],
    })
  })
})
