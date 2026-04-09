import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUserFindUnique, mockSystemSettingFindUnique } = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockSystemSettingFindUnique: vi.fn(),
}))

vi.mock('../../../config/database', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    systemSetting: {
      findUnique: (...args: unknown[]) => mockSystemSettingFindUnique(...args),
    },
  },
}))

import { resolvePortingNotificationRecipients } from '../porting-notification-recipient-resolver'

describe('resolvePortingNotificationRecipients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns USER recipient when owner exists and is active', async () => {
    mockUserFindUnique.mockResolvedValueOnce({
      id: 'sales-1',
      email: 'adam.sprzedaz@np-manager.local',
      firstName: 'Adam',
      lastName: 'Sprzedaz',
      isActive: true,
    })

    const recipients = await resolvePortingNotificationRecipients('sales-1')

    expect(recipients).toEqual([
      {
        kind: 'USER',
        userId: 'sales-1',
        email: 'adam.sprzedaz@np-manager.local',
        displayName: 'Adam Sprzedaz',
      },
    ])
    expect(mockSystemSettingFindUnique).not.toHaveBeenCalled()
  })

  it('falls back to shared recipients when owner does not exist', async () => {
    mockUserFindUnique.mockResolvedValueOnce(null)
    mockSystemSettingFindUnique
      .mockResolvedValueOnce({ value: 'bok@np-manager.local,sud@np-manager.local' })
      .mockResolvedValueOnce({ value: 'false' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)

    const recipients = await resolvePortingNotificationRecipients('missing-owner')

    expect(recipients).toEqual([
      {
        kind: 'TEAM_EMAIL',
        emails: ['bok@np-manager.local', 'sud@np-manager.local'],
      },
    ])
  })

  it('falls back to team email and teams webhook when owner is inactive', async () => {
    mockUserFindUnique.mockResolvedValueOnce({
      id: 'sales-1',
      email: 'adam.sprzedaz@np-manager.local',
      firstName: 'Adam',
      lastName: 'Sprzedaz',
      isActive: false,
    })

    mockSystemSettingFindUnique
      .mockResolvedValueOnce({ value: 'bok@np-manager.local' })
      .mockResolvedValueOnce({ value: 'true' })
      .mockResolvedValueOnce({ value: 'https://teams.example/webhook' })

    const recipients = await resolvePortingNotificationRecipients('sales-1')

    expect(recipients).toEqual([
      { kind: 'TEAM_EMAIL', emails: ['bok@np-manager.local'] },
      { kind: 'TEAM_WEBHOOK', webhookUrl: 'https://teams.example/webhook' },
    ])
  })

  it('uses legacy key aliases when preferred settings are missing', async () => {
    mockSystemSettingFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ value: 'legacy@np-manager.local' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ value: '1' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ value: 'https://legacy.example/hook' })

    const recipients = await resolvePortingNotificationRecipients(null)

    expect(recipients).toEqual([
      { kind: 'TEAM_EMAIL', emails: ['legacy@np-manager.local'] },
      { kind: 'TEAM_WEBHOOK', webhookUrl: 'https://legacy.example/hook' },
    ])
  })

  it('returns empty array when neither owner nor fallback settings are configured', async () => {
    mockSystemSettingFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)

    const recipients = await resolvePortingNotificationRecipients(undefined)

    expect(recipients).toEqual([])
  })
})
