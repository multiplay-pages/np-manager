import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockTemplateFindMany = vi.fn()
const mockTemplateFindUnique = vi.fn()
const mockTemplateFindUniqueOrThrow = vi.fn()
const mockTemplateCreate = vi.fn()
const mockTemplateUpdate = vi.fn()
const mockVersionFindUnique = vi.fn()
const mockVersionFindFirst = vi.fn()
const mockVersionCreate = vi.fn()
const mockVersionUpdate = vi.fn()
const mockVersionUpdateMany = vi.fn()
const mockPortingRequestFindFirst = vi.fn()
const mockLogAuditEvent = vi.fn()

const tx = {
  communicationTemplate: {
    findUniqueOrThrow: (...args: unknown[]) => mockTemplateFindUniqueOrThrow(...args),
    update: (...args: unknown[]) => mockTemplateUpdate(...args),
    create: (...args: unknown[]) => mockTemplateCreate(...args),
  },
  communicationTemplateVersion: {
    findFirst: (...args: unknown[]) => mockVersionFindFirst(...args),
    create: (...args: unknown[]) => mockVersionCreate(...args),
    update: (...args: unknown[]) => mockVersionUpdate(...args),
    updateMany: (...args: unknown[]) => mockVersionUpdateMany(...args),
  },
}

vi.mock('../../../config/database', () => ({
  prisma: {
    communicationTemplate: {
      findMany: (...args: unknown[]) => mockTemplateFindMany(...args),
      findUnique: (...args: unknown[]) => mockTemplateFindUnique(...args),
      create: (...args: unknown[]) => mockTemplateCreate(...args),
      update: (...args: unknown[]) => mockTemplateUpdate(...args),
    },
    communicationTemplateVersion: {
      findUnique: (...args: unknown[]) => mockVersionFindUnique(...args),
      findFirst: (...args: unknown[]) => mockVersionFindFirst(...args),
      create: (...args: unknown[]) => mockVersionCreate(...args),
      update: (...args: unknown[]) => mockVersionUpdate(...args),
      updateMany: (...args: unknown[]) => mockVersionUpdateMany(...args),
    },
    portingRequest: {
      findFirst: (...args: unknown[]) => mockPortingRequestFindFirst(...args),
    },
    $transaction: async (callback: (value: typeof tx) => unknown) => callback(tx),
  },
}))

vi.mock('../../../shared/audit/audit.service', () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}))

import {
  archiveCommunicationTemplateVersion,
  cloneCommunicationTemplateVersion,
  createCommunicationTemplate,
  createCommunicationTemplateVersion,
  listCommunicationTemplates,
  previewCommunicationTemplateVersionForRealCase,
  publishCommunicationTemplateVersion,
} from '../communication-templates.service'

function makeVersionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tpl-version-1',
    templateId: 'tpl-family-1',
    versionNumber: 1,
    status: 'PUBLISHED',
    subjectTemplate: 'Sprawa {{caseNumber}}',
    bodyTemplate: 'Dzien dobry {{clientName}}',
    createdAt: new Date('2026-04-06T10:00:00.000Z'),
    updatedAt: new Date('2026-04-06T10:00:00.000Z'),
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    publishedAt: new Date('2026-04-06T10:00:00.000Z'),
    publishedByUserId: 'user-1',
    createdBy: { firstName: 'Anna', lastName: 'Admin' },
    updatedBy: { firstName: 'Anna', lastName: 'Admin' },
    publishedBy: { firstName: 'Anna', lastName: 'Admin' },
    template: {
      id: 'tpl-family-1',
      code: 'REQUEST_RECEIVED',
      name: 'Wniosek przyjety',
      description: 'Opis',
      channel: 'EMAIL',
    },
    ...overrides,
  }
}

function makeTemplateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tpl-family-1',
    code: 'REQUEST_RECEIVED',
    name: 'Wniosek przyjety',
    description: 'Opis',
    channel: 'EMAIL',
    createdAt: new Date('2026-04-06T10:00:00.000Z'),
    updatedAt: new Date('2026-04-06T10:00:00.000Z'),
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    createdBy: { firstName: 'Anna', lastName: 'Admin' },
    updatedBy: { firstName: 'Anna', lastName: 'Admin' },
    versions: [makeVersionRow()],
    ...overrides,
  }
}

describe('communication-templates.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTemplateFindMany.mockResolvedValue([makeTemplateRow()])
    mockTemplateFindUnique.mockResolvedValue(makeTemplateRow())
    mockTemplateFindUniqueOrThrow.mockResolvedValue(makeTemplateRow())
    mockTemplateCreate.mockResolvedValue({ id: 'tpl-family-1' })
    mockTemplateUpdate.mockResolvedValue(makeTemplateRow())
    mockVersionFindUnique.mockResolvedValue(makeVersionRow())
    mockVersionFindFirst.mockResolvedValue({ versionNumber: 1 })
    mockVersionCreate.mockResolvedValue(makeVersionRow({ id: 'tpl-version-2', versionNumber: 2, status: 'DRAFT', publishedAt: null, publishedByUserId: null, publishedBy: null }))
    mockVersionUpdate.mockResolvedValue(makeVersionRow({ id: 'tpl-version-2', versionNumber: 2, status: 'PUBLISHED' }))
    mockVersionUpdateMany.mockResolvedValue({ count: 1 })
    mockPortingRequestFindFirst.mockResolvedValue({
      id: 'req-1',
      caseNumber: 'FNP-001',
      statusInternal: 'SUBMITTED',
      primaryNumber: '221234567',
      rangeStart: null,
      rangeEnd: null,
      numberRangeKind: 'SINGLE',
      requestedPortDate: new Date('2026-04-15T00:00:00.000Z'),
      confirmedPortDate: null,
      donorAssignedPortDate: null,
      rejectionReason: null,
      client: {
        clientType: 'INDIVIDUAL',
        firstName: 'Jan',
        lastName: 'Kowalski',
        companyName: null,
        email: 'jan@example.com',
        phoneContact: '600700800',
      },
      donorOperator: { name: 'Orange Polska' },
      recipientOperator: { name: 'G-NET' },
    })
    mockLogAuditEvent.mockResolvedValue(undefined)
  })

  it('lists template families with version counts from backend data', async () => {
    const result = await listCommunicationTemplates()

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.versionCounts.published).toBe(1)
    expect(result.items[0]?.publishedVersionNumber).toBe(1)
  })

  it('creates a template family with the first draft version', async () => {
    mockTemplateFindUnique.mockResolvedValueOnce(null)
    mockTemplateFindUniqueOrThrow.mockResolvedValue(
      makeTemplateRow({
        versions: [makeVersionRow({ id: 'tpl-version-1', versionNumber: 1, status: 'DRAFT', publishedAt: null, publishedByUserId: null, publishedBy: null })],
      }),
    )

    const result = await createCommunicationTemplate(
      {
        code: 'REQUEST_RECEIVED',
        name: 'Wniosek przyjety',
        description: 'Opis',
        channel: 'EMAIL',
        subjectTemplate: 'Sprawa {{caseNumber}}',
        bodyTemplate: 'Dzien dobry {{clientName}}',
      },
      'user-1',
    )

    expect(mockTemplateCreate).toHaveBeenCalledOnce()
    expect(mockVersionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'DRAFT',
          versionNumber: 1,
        }),
      }),
    )
    expect(result.versions[0]?.status).toBe('DRAFT')
  })

  it('creates a new draft version for an existing template family', async () => {
    const result = await createCommunicationTemplateVersion(
      'REQUEST_RECEIVED',
      {
        subjectTemplate: 'Aktualizacja {{caseNumber}}',
        bodyTemplate: 'Body {{clientName}}',
      },
      'user-1',
    )

    expect(mockVersionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          templateId: 'tpl-family-1',
          versionNumber: 2,
          status: 'DRAFT',
        }),
      }),
    )
    expect(result.status).toBe('DRAFT')
    expect(result.versionNumber).toBe(2)
  })

  it('publishes a draft version and archives the previous published one atomically', async () => {
    mockVersionFindUnique.mockResolvedValue(
      makeVersionRow({
        id: 'tpl-version-2',
        versionNumber: 2,
        status: 'DRAFT',
        publishedAt: null,
        publishedByUserId: null,
        publishedBy: null,
      }),
    )
    mockVersionUpdate.mockResolvedValue(
      makeVersionRow({
        id: 'tpl-version-2',
        versionNumber: 2,
        status: 'PUBLISHED',
      }),
    )

    const result = await publishCommunicationTemplateVersion('tpl-version-2', 'user-1')

    expect(mockVersionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          templateId: 'tpl-family-1',
          status: 'PUBLISHED',
        }),
        data: expect.objectContaining({
          status: 'ARCHIVED',
        }),
      }),
    )
    expect(mockVersionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tpl-version-2' },
        data: expect.objectContaining({
          status: 'PUBLISHED',
        }),
      }),
    )
    expect(result.status).toBe('PUBLISHED')
  })

  it('archives a draft version correctly', async () => {
    mockVersionFindUnique.mockResolvedValue(
      makeVersionRow({
        id: 'tpl-version-2',
        versionNumber: 2,
        status: 'DRAFT',
        publishedAt: null,
        publishedByUserId: null,
        publishedBy: null,
      }),
    )
    mockVersionUpdate.mockResolvedValue(
      makeVersionRow({
        id: 'tpl-version-2',
        versionNumber: 2,
        status: 'ARCHIVED',
        publishedAt: null,
        publishedByUserId: null,
        publishedBy: null,
      }),
    )

    const result = await archiveCommunicationTemplateVersion('tpl-version-2', 'user-1')

    expect(mockVersionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tpl-version-2' },
        data: expect.objectContaining({
          status: 'ARCHIVED',
        }),
      }),
    )
    expect(result.status).toBe('ARCHIVED')
  })

  it('clones an existing version into a new draft', async () => {
    const result = await cloneCommunicationTemplateVersion('tpl-version-1', 'user-1')

    expect(mockVersionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          templateId: 'tpl-family-1',
          status: 'DRAFT',
          versionNumber: 2,
        }),
      }),
    )
    expect(result.status).toBe('DRAFT')
  })

  it('renders preview for a real case without side effects', async () => {
    const result = await previewCommunicationTemplateVersionForRealCase('tpl-version-1', {
      caseNumber: 'FNP-001',
    })

    expect(result.isRenderable).toBe(true)
    expect(result.previewContextSummary.caseNumber).toBe('FNP-001')
    expect(result.renderedSubject).toContain('FNP-001')
    expect(result.warnings).toEqual([])
  })

  it('returns missing placeholders for incomplete real case data instead of crashing', async () => {
    mockPortingRequestFindFirst.mockResolvedValue({
      id: 'req-1',
      caseNumber: 'FNP-001',
      statusInternal: 'SUBMITTED',
      primaryNumber: '221234567',
      rangeStart: null,
      rangeEnd: null,
      numberRangeKind: 'SINGLE',
      requestedPortDate: null,
      confirmedPortDate: null,
      donorAssignedPortDate: null,
      rejectionReason: null,
      client: {
        clientType: 'INDIVIDUAL',
        firstName: 'Jan',
        lastName: 'Kowalski',
        companyName: null,
        email: 'jan@example.com',
        phoneContact: '600700800',
      },
      donorOperator: { name: 'Orange Polska' },
      recipientOperator: { name: 'G-NET' },
    })
    mockVersionFindUnique.mockResolvedValue(
      makeVersionRow({
        subjectTemplate: 'Termin {{plannedPortDate}}',
        bodyTemplate: 'Problem {{issueDescription}}',
      }),
    )

    const result = await previewCommunicationTemplateVersionForRealCase('tpl-version-1', {
      caseNumber: 'FNP-001',
    })

    expect(result.isRenderable).toBe(false)
    expect(result.missingPlaceholders).toEqual(['issueDescription', 'plannedPortDate'])
    expect(result.warnings[0]).toContain('Brakuje danych sprawy')
  })
})
