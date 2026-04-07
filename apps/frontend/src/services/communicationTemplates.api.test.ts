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
  activateCommunicationTemplate,
  createCommunicationTemplate,
  deactivateCommunicationTemplate,
  getCommunicationTemplateById,
  getCommunicationTemplates,
  updateCommunicationTemplate,
} from './communicationTemplates.api'

describe('communicationTemplates.api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMock.mockResolvedValue({ data: { data: { items: [] } } })
    postMock.mockResolvedValue({ data: { data: { template: { id: 'tpl-1' } } } })
    patchMock.mockResolvedValue({ data: { data: { template: { id: 'tpl-1' } } } })
  })

  it('uses the admin create endpoint with the expected payload', async () => {
    const payload = {
      code: 'REQUEST_RECEIVED' as const,
      name: 'Potwierdzenie przyjecia sprawy',
      description: 'Opis dla administratora',
      channel: 'EMAIL' as const,
      subjectTemplate: 'Sprawa {{caseNumber}}',
      bodyTemplate: 'Dzien dobry {{clientName}}',
      isActive: false,
    }

    await createCommunicationTemplate(payload)

    expect(postMock).toHaveBeenCalledWith('/admin/communication-templates', payload)
  })

  it('uses admin list and detail endpoints', async () => {
    await getCommunicationTemplates()
    await getCommunicationTemplateById('tpl-1')

    expect(getMock).toHaveBeenNthCalledWith(1, '/admin/communication-templates')
    expect(getMock).toHaveBeenNthCalledWith(2, '/admin/communication-templates/tpl-1')
  })

  it('uses the admin update endpoint with the expected payload', async () => {
    const payload = {
      name: 'Potwierdzenie przyjecia sprawy v2',
      bodyTemplate: 'Nowa tresc dla {{clientName}}',
    }

    await updateCommunicationTemplate('tpl-1', payload)

    expect(patchMock).toHaveBeenCalledWith('/admin/communication-templates/tpl-1', payload)
  })

  it('uses admin activation endpoints for publish flow', async () => {
    await deactivateCommunicationTemplate('tpl-active')
    await activateCommunicationTemplate('tpl-draft')

    expect(postMock).toHaveBeenNthCalledWith(
      1,
      '/admin/communication-templates/tpl-active/deactivate',
    )
    expect(postMock).toHaveBeenNthCalledWith(
      2,
      '/admin/communication-templates/tpl-draft/activate',
    )
  })
})
