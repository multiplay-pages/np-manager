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
    expect(() =>
      updatePortingNotificationSettingsBodySchema.parse({
        sharedEmails: '',
        teamsEnabled: false,
        teamsWebhookUrl: '',
      }),
    ).toThrowError(/Podaj co najmniej jeden adres email/)
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

  describe('walidacja wymaganych pól', () => {
    it('rzuca błąd gdy sharedEmails jest pustym stringiem', () => {
      expect(() =>
        updatePortingNotificationSettingsBodySchema.parse({
          sharedEmails: '',
          teamsEnabled: false,
          teamsWebhookUrl: '',
        }),
      ).toThrowError(/Podaj co najmniej jeden adres email/)
    })

    it('rzuca błąd gdy sharedEmails jest undefined', () => {
      expect(() =>
        updatePortingNotificationSettingsBodySchema.parse({
          teamsEnabled: false,
          teamsWebhookUrl: '',
        }),
      ).toThrowError(/Lista e-maili fallback jest wymagana/)
    })

    it('rzuca błąd gdy teamsEnabled=true i teamsWebhookUrl jest pustym stringiem', () => {
      expect(() =>
        updatePortingNotificationSettingsBodySchema.parse({
          sharedEmails: 'bok@multiplay.pl',
          teamsEnabled: true,
          teamsWebhookUrl: '',
        }),
      ).toThrowError(/Podaj URL webhooka Teams gdy Teams jest włączony/)
    })

    it('rzuca błąd gdy teamsEnabled=true i teamsWebhookUrl jest undefined', () => {
      expect(() =>
        updatePortingNotificationSettingsBodySchema.parse({
          sharedEmails: 'bok@multiplay.pl',
          teamsEnabled: true,
        }),
      ).toThrowError(/URL webhooka Teams jest wymagany/)
    })

    it('nie rzuca błędu dla teamsWebhookUrl gdy teamsEnabled=false', () => {
      expect(() =>
        updatePortingNotificationSettingsBodySchema.parse({
          sharedEmails: 'bok@multiplay.pl',
          teamsEnabled: false,
          teamsWebhookUrl: '',
        }),
      ).not.toThrow()
    })

    it('akceptuje poprawny email i teamsEnabled=false bez webhooka', () => {
      const parsed = updatePortingNotificationSettingsBodySchema.parse({
        sharedEmails: 'bok@multiplay.pl',
        teamsEnabled: false,
        teamsWebhookUrl: '',
      })

      expect(parsed.sharedEmails).toBe('bok@multiplay.pl')
      expect(parsed.teamsEnabled).toBe(false)
    })

    it('akceptuje poprawny email i teamsEnabled=true z poprawnym webhookiem', () => {
      const parsed = updatePortingNotificationSettingsBodySchema.parse({
        sharedEmails: 'bok@multiplay.pl',
        teamsEnabled: true,
        teamsWebhookUrl: 'https://teams.example/webhook',
      })

      expect(parsed.sharedEmails).toBe('bok@multiplay.pl')
      expect(parsed.teamsEnabled).toBe(true)
      expect(parsed.teamsWebhookUrl).toBe('https://teams.example/webhook')
    })
  })
})
