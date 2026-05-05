import { describe, expect, it } from 'vitest'
import { QA_SEED_USERS } from '../seed'

describe('QA seed users', () => {
  it('contains all four required QA roles', () => {
    const roles = QA_SEED_USERS.map((u) => u.role)
    expect(roles).toContain('ADMIN')
    expect(roles).toContain('BOK_CONSULTANT')
    expect(roles).toContain('BACK_OFFICE')
    expect(roles).toContain('MANAGER')
  })

  it('contains expected email addresses', () => {
    const emails = QA_SEED_USERS.map((u) => u.email)
    expect(emails).toContain('admin@np-manager.local')
    expect(emails).toContain('bok@np-manager.local')
    expect(emails).toContain('back-office@np-manager.local')
    expect(emails).toContain('manager@np-manager.local')
  })

  it('has unique emails', () => {
    const emails = QA_SEED_USERS.map((u) => u.email)
    expect(new Set(emails).size).toBe(emails.length)
  })

  it('each user has firstName and lastName', () => {
    for (const user of QA_SEED_USERS) {
      expect(user.firstName.length).toBeGreaterThan(0)
      expect(user.lastName.length).toBeGreaterThan(0)
    }
  })
})
