import { describe, expect, it } from 'vitest'
import { updatePortingNotificationSettingsBodySchema } from '../admin-porting-notification-settings.schema'

describe('updatePortingNotificationSettingsBodySchema', () => {
  it('accepts valid payload with shared emails and Teams settings', () => {
    const parsed = updatePortingNotificationSettingsBodySchema.parse({
      sharedEmails: 'bok@multiplay.pl, sud@multiplay.pl',
      teamsEnabled: true,
      teamsWebhookUrl: 'https://teams.example/webhook',
    })

    expect(parsed.sharedEmails).toBe('bok@multiplay.pl, sud@multiplay.pl')
    expect(parsed.teamsEnabled).toBe(true)
    expect(parsed.teamsWebhookUrl).toBe('https://teams.example/webhook')
  })

  it('accepts empty email list and empty webhook URL', () => {
    const parsed = updatePortingNotificationSettingsBodySchema.parse({
      sharedEmails: '',
      teamsEnabled: false,
      teamsWebhookUrl: '',
    })

    expect(parsed.sharedEmails).toBe('')
    expect(parsed.teamsEnabled).toBe(false)
    expect(parsed.teamsWebhookUrl).toBe('')
  })

  it('rejects invalid shared email list', () => {
    expect(() =>
      updatePortingNotificationSettingsBodySchema.parse({
        sharedEmails: 'bok@multiplay.pl, nie-email',
        teamsEnabled: false,
        teamsWebhookUrl: '',
      }),
    ).toThrowError(/Podaj poprawna liste adresow e-mail/)
  })

  it('rejects invalid Teams webhook URL', () => {
    expect(() =>
      updatePortingNotificationSettingsBodySchema.parse({
        sharedEmails: 'bok@multiplay.pl',
        teamsEnabled: true,
        teamsWebhookUrl: 'nie-url',
      }),
    ).toThrowError(/Podaj poprawny URL webhooka Teams/)
  })
})
