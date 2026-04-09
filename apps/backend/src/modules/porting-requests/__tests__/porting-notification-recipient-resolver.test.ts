import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockUserFindUnique,
  mockSystemSettingFindUnique,
} = vi.hoisted(() => ({
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

// ============================================================
// Tests
// ============================================================

describe('resolvePortingNotificationRecipients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when commercialOwnerUserId is provided', () => {
    it('returns USER recipient when owner exists and is active', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: 'sales-1',
        email: 'adam.sprzedaz@np-manager.local',
        firstName: 'Adam',
        lastName: 'Sprzedaz',
        isActive: true,
      })

      const recipients = await resolvePortingNotificationRecipients('sales-1')

      expect(recipients).toHaveLength(1)
      expect(recipients[0]).toEqual({
        kind: 'USER',
        userId: 'sales-1',
        email: 'adam.sprzedaz@np-manager.local',
        displayName: 'Adam Sprzedaz',
      })
      // Should NOT query system settings when owner found
      expect(mockSystemSettingFindUnique).not.toHaveBeenCalled()
    })

    it('falls back to team email when owner user is not found', async () => {
      mockUserFindUnique.mockResolvedValueOnce(null)
      mockSystemSettingFindUnique.mockResolvedValueOnce({
        value: 'team@np-manager.local,backup@np-manager.local',
      })

      const recipients = await resolvePortingNotificationRecipients('nonexistent-sales')

      expect(recipients).toHaveLength(1)
      expect(recipients[0]).toEqual({
        kind: 'TEAM_EMAIL',
        emails: ['team@np-manager.local', 'backup@np-manager.local'],
      })
    })

    it('falls back to team email when owner user is inactive', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: 'sales-1',
        email: 'adam.sprzedaz@np-manager.local',
        firstName: 'Adam',
        lastName: 'Sprzedaz',
        isActive: false,
      })
      mockSystemSettingFindUnique.mockResolvedValueOnce({
        value: 'team@np-manager.local',
      })

      const recipients = await resolvePortingNotificationRecipients('sales-1')

      expect(recipients).toHaveLength(1)
      expect(recipients[0]).toMatchObject({
        kind: 'TEAM_EMAIL',
        emails: ['team@np-manager.local'],
      })
    })
  })

  describe('when commercialOwnerUserId is null or undefined', () => {
    it('returns TEAM_EMAIL recipient when shared emails are configured (null)', async () => {
      mockSystemSettingFindUnique.mockResolvedValueOnce({
        value: 'bok@np-manager.local',
      })

      const recipients = await resolvePortingNotificationRecipients(null)

      expect(recipients).toHaveLength(1)
      expect(recipients[0]).toEqual({
        kind: 'TEAM_EMAIL',
        emails: ['bok@np-manager.local'],
      })
      expect(mockUserFindUnique).not.toHaveBeenCalled()
    })

    it('returns TEAM_EMAIL recipient when shared emails are configured (undefined)', async () => {
      mockSystemSettingFindUnique.mockResolvedValueOnce({
        value: 'bok@np-manager.local,manager@np-manager.local',
      })

      const recipients = await resolvePortingNotificationRecipients(undefined)

      expect(recipients[0]).toMatchObject({
        kind: 'TEAM_EMAIL',
        emails: ['bok@np-manager.local', 'manager@np-manager.local'],
      })
    })

    it('returns empty array when system setting not configured', async () => {
      mockSystemSettingFindUnique.mockResolvedValueOnce(null)

      const recipients = await resolvePortingNotificationRecipients(null)

      expect(recipients).toHaveLength(0)
    })

    it('returns empty array when system setting value is empty string', async () => {
      mockSystemSettingFindUnique.mockResolvedValueOnce({ value: '' })

      const recipients = await resolvePortingNotificationRecipients(null)

      expect(recipients).toHaveLength(0)
    })

    it('filters out whitespace-only entries from shared emails', async () => {
      mockSystemSettingFindUnique.mockResolvedValueOnce({
        value: 'valid@np-manager.local,,  ,another@np-manager.local',
      })

      const recipients = await resolvePortingNotificationRecipients(null)

      expect(recipients).toHaveLength(1)
      expect(recipients[0]).toMatchObject({
        kind: 'TEAM_EMAIL',
        emails: ['valid@np-manager.local', 'another@np-manager.local'],
      })
    })
  })
})
