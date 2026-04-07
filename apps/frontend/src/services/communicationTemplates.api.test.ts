import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getMock, postMock, patchMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  patchMock: vi.fn(),
}))

vi.mock('./api.client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
  },
}))

import {
  archiveCommunicationTemplateVersion,
  cloneCommunicationTemplateVersion,
  createCommunicationTemplate,
  createCommunicationTemplateVersion,
  getCommunicationTemplateByCode,
  getCommunicationTemplateVersions,
  getCommunicationTemplates,
  previewCommunicationTemplateVersionRealCase,
  publishCommunicationTemplateVersion,
  updateCommunicationTemplateVersion,
} from './communicationTemplates.api'

describe('communicationTemplates.api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMock.mockResolvedValue({ data: { data: { items: [] } } })
    postMock.mockResolvedValue({ data: { data: { template: { id: 'tpl-1' }, version: { id: 'ver-1' }, preview: { renderedSubject: '', renderedBody: '' } } } })
    patchMock.mockResolvedValue({ data: { data: { version: { id: 'ver-1' } } } })
  })

  it('uses admin list and detail endpoints for template families and versions', async () => {
    await getCommunicationTemplates()
    await getCommunicationTemplateByCode('REQUEST_RECEIVED')
    await getCommunicationTemplateVersions('REQUEST_RECEIVED')

    expect(getMock).toHaveBeenNthCalledWith(1, '/admin/communication-templates')
    expect(getMock).toHaveBeenNthCalledWith(2, '/admin/communication-templates/REQUEST_RECEIVED')
    expect(getMock).toHaveBeenNthCalledWith(3, '/admin/communication-templates/REQUEST_RECEIVED/versions')
  })

  it('uses the admin create family and create version endpoints with the expected payload', async () => {
    const createTemplatePayload = {
      code: 'REQUEST_RECEIVED' as const,
      name: 'Potwierdzenie przyjecia sprawy',
      description: 'Opis dla administratora',
      channel: 'EMAIL' as const,
      subjectTemplate: 'Sprawa {{caseNumber}}',
      bodyTemplate: 'Dzien dobry {{clientName}}',
    }
    const createVersionPayload = {
      name: 'Potwierdzenie przyjecia sprawy',
      description: 'Opis draftu',
      subjectTemplate: 'Aktualizacja {{caseNumber}}',
      bodyTemplate: 'Dzien dobry {{clientName}}',
    }

    await createCommunicationTemplate(createTemplatePayload)
    await createCommunicationTemplateVersion('REQUEST_RECEIVED', createVersionPayload)

    expect(postMock).toHaveBeenNthCalledWith(1, '/admin/communication-templates', createTemplatePayload)
    expect(postMock).toHaveBeenNthCalledWith(
      2,
      '/admin/communication-templates/REQUEST_RECEIVED/versions',
      createVersionPayload,
    )
  })

  it('uses version mutation endpoints for update, publish, archive and clone', async () => {
    const payload = {
      name: 'Potwierdzenie przyjecia sprawy v2',
      bodyTemplate: 'Nowa tresc dla {{clientName}}',
    }

    await updateCommunicationTemplateVersion('ver-1', payload)
    await publishCommunicationTemplateVersion('ver-1')
    await archiveCommunicationTemplateVersion('ver-1')
    await cloneCommunicationTemplateVersion('ver-1')

    expect(patchMock).toHaveBeenCalledWith('/admin/communication-template-versions/ver-1', payload)
    expect(postMock).toHaveBeenNthCalledWith(1, '/admin/communication-template-versions/ver-1/publish')
    expect(postMock).toHaveBeenNthCalledWith(2, '/admin/communication-template-versions/ver-1/archive')
    expect(postMock).toHaveBeenNthCalledWith(3, '/admin/communication-template-versions/ver-1/clone')
  })

  it('uses preview-real-case endpoint for real request preview', async () => {
    const payload = {
      caseNumber: 'FNP-SEED-COMM-DRAFT-001',
    }

    await previewCommunicationTemplateVersionRealCase('ver-1', payload)

    expect(postMock).toHaveBeenCalledWith(
      '/admin/communication-template-versions/ver-1/preview-real-case',
      payload,
    )
  })
})
