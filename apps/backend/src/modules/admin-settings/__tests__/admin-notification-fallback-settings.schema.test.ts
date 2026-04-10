import { describe, expect, it } from 'vitest'
import { updateNotificationFallbackSettingsBodySchema } from '../admin-notification-fallback-settings.schema'

describe('updateNotificationFallbackSettingsBodySchema', () => {
  it('accepts valid payload with enabled fallback and valid email', () => {
    const parsed = updateNotificationFallbackSettingsBodySchema.parse({
      fallbackEnabled: true,
      fallbackRecipientEmail: 'fallback@multiplay.pl',
      fallbackRecipientName: 'Fallback BOK',
      applyToFailed: true,
      applyToMisconfigured: false,
    })

    expect(parsed.fallbackEnabled).toBe(true)
    expect(parsed.fallbackRecipientEmail).toBe('fallback@multiplay.pl')
    expect(parsed.fallbackRecipientName).toBe('Fallback BOK')
    expect(parsed.applyToFailed).toBe(true)
    expect(parsed.applyToMisconfigured).toBe(false)
  })

  it('accepts disabled fallback with empty email', () => {
    const parsed = updateNotificationFallbackSettingsBodySchema.parse({
      fallbackEnabled: false,
      fallbackRecipientEmail: '',
      fallbackRecipientName: '',
      applyToFailed: true,
      applyToMisconfigured: true,
    })

    expect(parsed.fallbackEnabled).toBe(false)
    expect(parsed.fallbackRecipientEmail).toBe('')
  })

  it('accepts disabled fallback with invalid email format (BUG #1 fix)', () => {
    const parsed = updateNotificationFallbackSettingsBodySchema.parse({
      fallbackEnabled: false,
      fallbackRecipientEmail: 'abc',
      fallbackRecipientName: '',
      applyToFailed: true,
      applyToMisconfigured: true,
    })

    expect(parsed.fallbackEnabled).toBe(false)
    expect(parsed.fallbackRecipientEmail).toBe('abc')
  })

  it('rejects enabled fallback with empty email', () => {
    expect(() =>
      updateNotificationFallbackSettingsBodySchema.parse({
        fallbackEnabled: true,
        fallbackRecipientEmail: '',
        fallbackRecipientName: '',
        applyToFailed: true,
        applyToMisconfigured: true,
      }),
    ).toThrowError(/Adres email odbiorcy fallback jest wymagany gdy fallback jest wlaczony/)
  })

  it('rejects enabled fallback with invalid email', () => {
    expect(() =>
      updateNotificationFallbackSettingsBodySchema.parse({
        fallbackEnabled: true,
        fallbackRecipientEmail: 'nie-email',
        fallbackRecipientName: '',
        applyToFailed: true,
        applyToMisconfigured: true,
      }),
    ).toThrowError(/Podaj poprawny adres e-mail/)
  })

  it('rejects email exceeding 320 characters', () => {
    expect(() =>
      updateNotificationFallbackSettingsBodySchema.parse({
        fallbackEnabled: false,
        fallbackRecipientEmail: 'a'.repeat(321),
        fallbackRecipientName: '',
        applyToFailed: true,
        applyToMisconfigured: true,
      }),
    ).toThrowError(/Adres email nie moze przekraczac 320 znakow/)
  })

  it('rejects payload missing applyToFailed', () => {
    expect(() =>
      updateNotificationFallbackSettingsBodySchema.parse({
        fallbackEnabled: false,
        fallbackRecipientEmail: '',
        fallbackRecipientName: '',
        applyToMisconfigured: true,
      }),
    ).toThrowError(/applyToFailed/)
  })

  it('rejects payload missing applyToMisconfigured', () => {
    expect(() =>
      updateNotificationFallbackSettingsBodySchema.parse({
        fallbackEnabled: false,
        fallbackRecipientEmail: '',
        fallbackRecipientName: '',
        applyToFailed: true,
      }),
    ).toThrowError(/applyToMisconfigured/)
  })
})
