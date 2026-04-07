import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockListCommunicationTemplates,
  mockGetCommunicationTemplateByCode,
  mockGetCommunicationTemplateVersions,
  mockCreateCommunicationTemplate,
  mockCreateCommunicationTemplateVersion,
  mockUpdateCommunicationTemplateVersion,
  mockPublishCommunicationTemplateVersion,
  mockArchiveCommunicationTemplateVersion,
  mockCloneCommunicationTemplateVersion,
  mockPreviewCommunicationTemplateVersionForRealCase,
} = vi.hoisted(() => ({
  mockListCommunicationTemplates: vi.fn(),
  mockGetCommunicationTemplateByCode: vi.fn(),
  mockGetCommunicationTemplateVersions: vi.fn(),
  mockCreateCommunicationTemplate: vi.fn(),
  mockCreateCommunicationTemplateVersion: vi.fn(),
  mockUpdateCommunicationTemplateVersion: vi.fn(),
  mockPublishCommunicationTemplateVersion: vi.fn(),
  mockArchiveCommunicationTemplateVersion: vi.fn(),
  mockCloneCommunicationTemplateVersion: vi.fn(),
  mockPreviewCommunicationTemplateVersionForRealCase: vi.fn(),
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
  getCommunicationTemplateByCode: (...args: unknown[]) => mockGetCommunicationTemplateByCode(...args),
  getCommunicationTemplateVersions: (...args: unknown[]) => mockGetCommunicationTemplateVersions(...args),
  createCommunicationTemplate: (...args: unknown[]) => mockCreateCommunicationTemplate(...args),
  createCommunicationTemplateVersion: (...args: unknown[]) => mockCreateCommunicationTemplateVersion(...args),
  updateCommunicationTemplateVersion: (...args: unknown[]) =>
    mockUpdateCommunicationTemplateVersion(...args),
  publishCommunicationTemplateVersion: (...args: unknown[]) =>
    mockPublishCommunicationTemplateVersion(...args),
  archiveCommunicationTemplateVersion: (...args: unknown[]) =>
    mockArchiveCommunicationTemplateVersion(...args),
  cloneCommunicationTemplateVersion: (...args: unknown[]) => mockCloneCommunicationTemplateVersion(...args),
  previewCommunicationTemplateVersionForRealCase: (...args: unknown[]) =>
    mockPreviewCommunicationTemplateVersionForRealCase(...args),
  getPublishedCommunicationTemplateVersionOrThrow: vi.fn(),
  resolveCommunicationTemplateCodeForAction: vi.fn(),
}))

import { buildApp } from '../app'

function makeVersionDto(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tpl-version-1',
    templateId: 'tpl-family-1',
    versionNumber: 1,
    status: 'PUBLISHED',
    subjectTemplate: 'Sprawa {{caseNumber}}',
    bodyTemplate: 'Dzien dobry {{clientName}}',
    createdAt: '2026-04-06T10:00:00.000Z',
    updatedAt: '2026-04-06T10:00:00.000Z',
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    createdByDisplayName: 'System Administrator',
    updatedByDisplayName: 'System Administrator',
    publishedAt: '2026-04-06T10:00:00.000Z',
    publishedByUserId: 'user-1',
    publishedByDisplayName: 'System Administrator',
    ...overrides,
  }
}

function makeTemplateDto(overrides: Record<string, unknown> = {}) {
  const publishedVersion = makeVersionDto()

  return {
    id: 'tpl-family-1',
    code: 'REQUEST_RECEIVED',
    name: 'Wniosek przyjety',
    description: 'Opis',
    channel: 'EMAIL',
    createdAt: '2026-04-06T10:00:00.000Z',
    updatedAt: '2026-04-06T10:00:00.000Z',
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    createdByDisplayName: 'System Administrator',
    updatedByDisplayName: 'System Administrator',
    publishedVersionId: publishedVersion.id,
    publishedVersionNumber: publishedVersion.versionNumber,
    publishedAt: publishedVersion.publishedAt,
    publishedByDisplayName: publishedVersion.publishedByDisplayName,
    versions: [publishedVersion],
    ...overrides,
  }
}

function makeTemplateSummaryDto(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tpl-family-1',
    code: 'REQUEST_RECEIVED',
    name: 'Wniosek przyjety',
    description: 'Opis',
    channel: 'EMAIL',
    createdAt: '2026-04-06T10:00:00.000Z',
    updatedAt: '2026-04-06T10:00:00.000Z',
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    createdByDisplayName: 'System Administrator',
    updatedByDisplayName: 'System Administrator',
    publishedVersionId: 'tpl-version-1',
    publishedVersionNumber: 1,
    publishedAt: '2026-04-06T10:00:00.000Z',
    publishedByDisplayName: 'System Administrator',
    lastVersionUpdatedAt: '2026-04-06T10:00:00.000Z',
    lastVersionUpdatedByDisplayName: 'System Administrator',
    versionCounts: {
      total: 2,
      draft: 1,
      published: 1,
      archived: 0,
    },
    ...overrides,
  }
}

describe('admin communication template routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListCommunicationTemplates.mockResolvedValue({ items: [makeTemplateSummaryDto()] })
    mockGetCommunicationTemplateByCode.mockResolvedValue(makeTemplateDto())
    mockGetCommunicationTemplateVersions.mockResolvedValue({
      items: [makeVersionDto(), makeVersionDto({ id: 'tpl-version-2', versionNumber: 2, status: 'DRAFT' })],
    })
    mockCreateCommunicationTemplate.mockResolvedValue(makeTemplateDto())
    mockCreateCommunicationTemplateVersion.mockResolvedValue(makeVersionDto({ id: 'tpl-version-2', versionNumber: 2, status: 'DRAFT' }))
    mockUpdateCommunicationTemplateVersion.mockResolvedValue(makeVersionDto({ id: 'tpl-version-2', versionNumber: 2, status: 'DRAFT' }))
    mockPublishCommunicationTemplateVersion.mockResolvedValue(makeVersionDto({ id: 'tpl-version-2', versionNumber: 2, status: 'PUBLISHED' }))
    mockArchiveCommunicationTemplateVersion.mockResolvedValue(makeVersionDto({ id: 'tpl-version-2', versionNumber: 2, status: 'ARCHIVED', publishedAt: null, publishedByUserId: null, publishedByDisplayName: null }))
    mockCloneCommunicationTemplateVersion.mockResolvedValue(makeVersionDto({ id: 'tpl-version-3', versionNumber: 3, status: 'DRAFT', publishedAt: null, publishedByUserId: null, publishedByDisplayName: null }))
    mockPreviewCommunicationTemplateVersionForRealCase.mockResolvedValue({
      renderedSubject: 'Sprawa FNP-001',
      renderedBody: 'Dzien dobry Jan Kowalski',
      usedPlaceholders: ['caseNumber', 'clientName'],
      missingPlaceholders: [],
      unknownPlaceholders: [],
      isRenderable: true,
      previewContextSummary: {
        portingRequestId: 'req-1',
        caseNumber: 'FNP-001',
        clientName: 'Jan Kowalski',
        donorOperatorName: 'Orange Polska',
        recipientOperatorName: 'G-NET',
        plannedPortDate: '14.04.2026',
        statusInternal: 'SUBMITTED',
      },
      warnings: [],
    })
  })

  it('registers list and detail routes under /api/admin', async () => {
    const app = await buildApp()

    try {
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/admin/communication-templates',
      })

      const detailResponse = await app.inject({
        method: 'GET',
        url: '/api/admin/communication-templates/REQUEST_RECEIVED',
      })

      expect(listResponse.statusCode).toBe(200)
      expect(detailResponse.statusCode).toBe(200)
      expect(mockListCommunicationTemplates).toHaveBeenCalledOnce()
      expect(mockGetCommunicationTemplateByCode).toHaveBeenCalledWith('REQUEST_RECEIVED')
    } finally {
      await app.close()
    }
  })

  it('registers versions, create family and create version routes', async () => {
    const app = await buildApp()

    try {
      const versionsResponse = await app.inject({
        method: 'GET',
        url: '/api/admin/communication-templates/REQUEST_RECEIVED/versions',
      })

      const createTemplateResponse = await app.inject({
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

      const createVersionResponse = await app.inject({
        method: 'POST',
        url: '/api/admin/communication-templates/REQUEST_RECEIVED/versions',
        payload: {
          subjectTemplate: 'Aktualizacja {{caseNumber}}',
          bodyTemplate: 'Body {{clientName}}',
        },
      })

      expect(versionsResponse.statusCode).toBe(200)
      expect(createTemplateResponse.statusCode).toBe(201)
      expect(createVersionResponse.statusCode).toBe(201)
      expect(mockGetCommunicationTemplateVersions).toHaveBeenCalledWith('REQUEST_RECEIVED')
      expect(mockCreateCommunicationTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'REQUEST_RECEIVED',
          channel: 'EMAIL',
        }),
        'user-1',
        expect.any(String),
        expect.any(String),
      )
      expect(mockCreateCommunicationTemplateVersion).toHaveBeenCalledWith(
        'REQUEST_RECEIVED',
        {
          subjectTemplate: 'Aktualizacja {{caseNumber}}',
          bodyTemplate: 'Body {{clientName}}',
        },
        'user-1',
        expect.any(String),
        expect.any(String),
      )
    } finally {
      await app.close()
    }
  })

  it('registers version mutation routes for publish, archive, clone and preview-real-case', async () => {
    const app = await buildApp()

    try {
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: '/api/admin/communication-template-versions/tpl-version-2',
        payload: {
          subjectTemplate: 'Zmiana {{caseNumber}}',
        },
      })

      const publishResponse = await app.inject({
        method: 'POST',
        url: '/api/admin/communication-template-versions/tpl-version-2/publish',
      })

      const archiveResponse = await app.inject({
        method: 'POST',
        url: '/api/admin/communication-template-versions/tpl-version-2/archive',
      })

      const cloneResponse = await app.inject({
        method: 'POST',
        url: '/api/admin/communication-template-versions/tpl-version-1/clone',
      })

      const previewResponse = await app.inject({
        method: 'POST',
        url: '/api/admin/communication-template-versions/tpl-version-1/preview-real-case',
        payload: {
          caseNumber: 'FNP-001',
        },
      })

      expect(updateResponse.statusCode).toBe(200)
      expect(publishResponse.statusCode).toBe(200)
      expect(archiveResponse.statusCode).toBe(200)
      expect(cloneResponse.statusCode).toBe(201)
      expect(previewResponse.statusCode).toBe(200)
      expect(mockUpdateCommunicationTemplateVersion).toHaveBeenCalledWith(
        'tpl-version-2',
        { subjectTemplate: 'Zmiana {{caseNumber}}' },
        'user-1',
        expect.any(String),
        expect.any(String),
      )
      expect(mockPublishCommunicationTemplateVersion).toHaveBeenCalledWith(
        'tpl-version-2',
        'user-1',
        expect.any(String),
        expect.any(String),
      )
      expect(mockArchiveCommunicationTemplateVersion).toHaveBeenCalledWith(
        'tpl-version-2',
        'user-1',
        expect.any(String),
        expect.any(String),
      )
      expect(mockCloneCommunicationTemplateVersion).toHaveBeenCalledWith(
        'tpl-version-1',
        'user-1',
        expect.any(String),
        expect.any(String),
      )
      expect(mockPreviewCommunicationTemplateVersionForRealCase).toHaveBeenCalledWith(
        'tpl-version-1',
        { caseNumber: 'FNP-001' },
      )
    } finally {
      await app.close()
    }
  })
})
