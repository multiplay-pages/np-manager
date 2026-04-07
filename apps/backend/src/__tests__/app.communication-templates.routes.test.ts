import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockListCommunicationTemplates,
  mockGetCommunicationTemplateById,
  mockCreateCommunicationTemplate,
  mockUpdateCommunicationTemplate,
  mockActivateCommunicationTemplate,
  mockDeactivateCommunicationTemplate,
} = vi.hoisted(() => ({
  mockListCommunicationTemplates: vi.fn(),
  mockGetCommunicationTemplateById: vi.fn(),
  mockCreateCommunicationTemplate: vi.fn(),
  mockUpdateCommunicationTemplate: vi.fn(),
  mockActivateCommunicationTemplate: vi.fn(),
  mockDeactivateCommunicationTemplate: vi.fn(),
}))

vi.mock('../modules/auth/auth.router', () => ({
  authRouter: async () => {},
}))

vi.mock('../modules/users/users.router', () => ({
  usersRouter: async () => {},
}))

vi.mock('../modules/clients/clients.router', () => ({
  clientsRouter: async () => {},
}))

vi.mock('../modules/operators/operators.router', () => ({
  operatorsRouter: async () => {},
}))

vi.mock('../modules/porting-requests/porting-requests.router', () => ({
  portingRequestsRouter: async () => {},
}))

vi.mock('../shared/middleware/authenticate', () => ({
  authenticate: async (request: { user?: unknown }) => {
    request.user = {
      id: 'user-1',
      role: 'ADMIN',
    }
  },
}))

vi.mock('../shared/middleware/authorize', () => ({
  authorize: () => async () => {},
}))

vi.mock('../modules/communications/communication-templates.service', () => ({
  listCommunicationTemplates: (...args: unknown[]) => mockListCommunicationTemplates(...args),
  getCommunicationTemplateById: (...args: unknown[]) => mockGetCommunicationTemplateById(...args),
  createCommunicationTemplate: (...args: unknown[]) => mockCreateCommunicationTemplate(...args),
  updateCommunicationTemplate: (...args: unknown[]) => mockUpdateCommunicationTemplate(...args),
  activateCommunicationTemplate: (...args: unknown[]) =>
    mockActivateCommunicationTemplate(...args),
  deactivateCommunicationTemplate: (...args: unknown[]) =>
    mockDeactivateCommunicationTemplate(...args),
  getActiveCommunicationTemplateOrThrow: vi.fn(),
  resolveCommunicationTemplateCodeForAction: vi.fn(),
}))

import { buildApp } from '../app'

function makeTemplateDto(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tpl-1',
    code: 'REQUEST_RECEIVED',
    name: 'Wniosek przyjety',
    description: 'Opis',
    channel: 'EMAIL',
    subjectTemplate: 'Sprawa {{caseNumber}}',
    bodyTemplate: 'Dzien dobry {{clientName}}',
    isActive: true,
    version: 1,
    createdAt: '2026-04-06T10:00:00.000Z',
    updatedAt: '2026-04-06T10:00:00.000Z',
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    createdByDisplayName: 'System Administrator',
    updatedByDisplayName: 'System Administrator',
    ...overrides,
  }
}

describe('admin communication template routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListCommunicationTemplates.mockResolvedValue({ items: [makeTemplateDto()] })
    mockGetCommunicationTemplateById.mockResolvedValue(makeTemplateDto())
    mockCreateCommunicationTemplate.mockResolvedValue(makeTemplateDto())
    mockUpdateCommunicationTemplate.mockResolvedValue(makeTemplateDto({ version: 2 }))
    mockActivateCommunicationTemplate.mockResolvedValue(makeTemplateDto({ version: 2 }))
    mockDeactivateCommunicationTemplate.mockResolvedValue(
      makeTemplateDto({ version: 2, isActive: false }),
    )
  })

  it('registers list route under /api/admin/communication-templates', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/communication-templates',
      })

      expect(response.statusCode).toBe(200)
      expect(mockListCommunicationTemplates).toHaveBeenCalledOnce()
    } finally {
      await app.close()
    }
  })

  it('registers detail route for single admin template', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/communication-templates/tpl-1',
      })

      expect(response.statusCode).toBe(200)
      expect(mockGetCommunicationTemplateById).toHaveBeenCalledWith('tpl-1')
    } finally {
      await app.close()
    }
  })

  it('registers create and update routes for admin templates', async () => {
    const app = await buildApp()

    try {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/admin/communication-templates',
        payload: {
          code: 'REQUEST_RECEIVED',
          name: 'Wniosek przyjety',
          channel: 'EMAIL',
          subjectTemplate: 'Sprawa {{caseNumber}}',
          bodyTemplate: 'Dzien dobry {{clientName}}',
        },
      })

      const updateResponse = await app.inject({
        method: 'PATCH',
        url: '/api/admin/communication-templates/tpl-1',
        payload: {
          name: 'Wniosek przyjety v2',
        },
      })

      expect(createResponse.statusCode).toBe(201)
      expect(updateResponse.statusCode).toBe(200)
      expect(mockCreateCommunicationTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'REQUEST_RECEIVED',
          channel: 'EMAIL',
        }),
        'user-1',
        expect.any(String),
        expect.any(String),
      )
      expect(mockUpdateCommunicationTemplate).toHaveBeenCalledWith(
        'tpl-1',
        { name: 'Wniosek przyjety v2' },
        'user-1',
        expect.any(String),
        expect.any(String),
      )
    } finally {
      await app.close()
    }
  })

  it('registers activate and deactivate routes', async () => {
    const app = await buildApp()

    try {
      const activateResponse = await app.inject({
        method: 'POST',
        url: '/api/admin/communication-templates/tpl-1/activate',
      })

      const deactivateResponse = await app.inject({
        method: 'POST',
        url: '/api/admin/communication-templates/tpl-1/deactivate',
      })

      expect(activateResponse.statusCode).toBe(200)
      expect(deactivateResponse.statusCode).toBe(200)
      expect(mockActivateCommunicationTemplate).toHaveBeenCalledWith(
        'tpl-1',
        'user-1',
        expect.any(String),
        expect.any(String),
      )
      expect(mockDeactivateCommunicationTemplate).toHaveBeenCalledWith(
        'tpl-1',
        'user-1',
        expect.any(String),
        expect.any(String),
      )
    } finally {
      await app.close()
    }
  })
})
