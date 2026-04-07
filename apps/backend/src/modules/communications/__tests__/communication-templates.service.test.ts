import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFindMany = vi.fn()
const mockFindUnique = vi.fn()
const mockFindFirst = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockLogAuditEvent = vi.fn()

vi.mock('../../../config/database', () => ({
  prisma: {
    communicationTemplate: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}))

vi.mock('../../../shared/audit/audit.service', () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}))

import {
  activateCommunicationTemplate,
  createCommunicationTemplate,
  deactivateCommunicationTemplate,
  listCommunicationTemplates,
  updateCommunicationTemplate,
} from '../communication-templates.service'

function makeTemplateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tpl-1',
    code: 'REQUEST_RECEIVED',
    name: 'Wniosek przyjety',
    description: 'Szablon startowy',
    channel: 'EMAIL',
    subjectTemplate: 'Sprawa {{caseNumber}}',
    bodyTemplate: 'Dzien dobry {{clientName}}',
    isActive: true,
    version: 1,
    createdAt: new Date('2026-04-06T10:00:00.000Z'),
    updatedAt: new Date('2026-04-06T10:00:00.000Z'),
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    createdBy: {
      firstName: 'System',
      lastName: 'Administrator',
    },
    updatedBy: {
      firstName: 'System',
      lastName: 'Administrator',
    },
    ...overrides,
  }
}

describe('communication-templates.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindMany.mockResolvedValue([makeTemplateRow()])
    mockFindUnique.mockResolvedValue(makeTemplateRow())
    mockFindFirst.mockResolvedValue(null)
    mockCreate.mockResolvedValue(makeTemplateRow({ version: 3 }))
    mockUpdate.mockResolvedValue(makeTemplateRow({ version: 2, isActive: false }))
    mockLogAuditEvent.mockResolvedValue(undefined)
  })

  it('lists templates for admin module', async () => {
    const result = await listCommunicationTemplates()

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.code).toBe('REQUEST_RECEIVED')
    expect(result.items[0]?.createdByDisplayName).toBe('System Administrator')
  })

  it('creates a new template and assigns the next version for code and channel', async () => {
    mockFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ version: 2 })

    const result = await createCommunicationTemplate(
      {
        code: 'REQUEST_RECEIVED',
        name: 'Wniosek przyjety',
        description: 'Nowa wersja',
        channel: 'EMAIL',
        subjectTemplate: 'Sprawa {{caseNumber}}',
        bodyTemplate: 'Dzien dobry {{clientName}}',
        isActive: true,
      },
      'user-1',
    )

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          version: 3,
        }),
      }),
    )
    expect(result.version).toBe(3)
  })

  it('blocks creating another active template for the same code and channel', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 'tpl-2',
      name: 'Aktywny szablon',
    })

    await expect(
      createCommunicationTemplate(
        {
          code: 'REQUEST_RECEIVED',
          name: 'Duplikat',
          channel: 'EMAIL',
          subjectTemplate: 'Sprawa {{caseNumber}}',
          bodyTemplate: 'Dzien dobry {{clientName}}',
          isActive: true,
        },
        'user-1',
      ),
    ).rejects.toThrow(/Aktywny szablon/)

    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('updates a template and bumps version', async () => {
    mockUpdate.mockResolvedValue(
      makeTemplateRow({
        version: 2,
        name: 'Wniosek przyjety v2',
        subjectTemplate: 'Aktualizacja {{caseNumber}}',
      }),
    )

    const result = await updateCommunicationTemplate(
      'tpl-1',
      {
        name: 'Wniosek przyjety v2',
        subjectTemplate: 'Aktualizacja {{caseNumber}}',
      },
      'user-2',
    )

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          version: 2,
          updatedByUserId: 'user-2',
        }),
      }),
    )
    expect(result.version).toBe(2)
    expect(result.name).toBe('Wniosek przyjety v2')
  })

  it('blocks activating a template when another active one already exists for the same code and channel', async () => {
    mockFindUnique.mockResolvedValue(
      makeTemplateRow({
        id: 'tpl-3',
        isActive: false,
      }),
    )
    mockFindFirst.mockResolvedValue({
      id: 'tpl-2',
      name: 'Aktywny szablon',
    })

    await expect(activateCommunicationTemplate('tpl-3', 'user-1')).rejects.toThrow(
      /Aktywny szablon/,
    )

    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('activates and deactivates a template without throwing when no conflicting active version exists', async () => {
    mockFindUnique.mockResolvedValue(
      makeTemplateRow({
        id: 'tpl-3',
        isActive: false,
      }),
    )
    mockFindFirst.mockResolvedValue(null)
    mockUpdate.mockResolvedValueOnce(
      makeTemplateRow({
        id: 'tpl-3',
        isActive: true,
        version: 2,
      }),
    )

    const activated = await activateCommunicationTemplate('tpl-3', 'user-1')

    mockFindUnique.mockResolvedValue(
      makeTemplateRow({
        id: 'tpl-3',
        isActive: true,
        version: 2,
      }),
    )
    mockUpdate.mockResolvedValueOnce(
      makeTemplateRow({
        id: 'tpl-3',
        isActive: false,
        version: 3,
      }),
    )

    const deactivated = await deactivateCommunicationTemplate('tpl-3', 'user-1')

    expect(activated.isActive).toBe(true)
    expect(deactivated.isActive).toBe(false)
    expect(mockUpdate).toHaveBeenCalledTimes(2)
  })
})
