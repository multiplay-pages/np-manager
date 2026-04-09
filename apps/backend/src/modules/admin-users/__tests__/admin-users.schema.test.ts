import { describe, expect, it } from 'vitest'

import {
  adminUsersListQuerySchema,
  createAdminUserBodySchema,
  updateUserRoleBodySchema,
} from '../admin-users.schema'

describe('admin-users schemas', () => {
  it('accepts SALES role in createAdminUserBodySchema', () => {
    const parsed = createAdminUserBodySchema.parse({
      email: 'sales@np-manager.local',
      firstName: 'Jan',
      lastName: 'Sprzedaz',
      role: 'SALES',
      temporaryPassword: 'Temp@1234',
    })

    expect(parsed.role).toBe('SALES')
  })

  it('accepts SALES role in updateUserRoleBodySchema', () => {
    const parsed = updateUserRoleBodySchema.parse({ role: 'SALES' })
    expect(parsed.role).toBe('SALES')
  })

  it('accepts SALES role in adminUsersListQuerySchema', () => {
    const parsed = adminUsersListQuerySchema.parse({ role: 'SALES' })
    expect(parsed.role).toBe('SALES')
  })
})
