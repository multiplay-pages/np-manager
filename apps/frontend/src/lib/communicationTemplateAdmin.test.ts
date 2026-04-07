import { describe, expect, it, vi } from 'vitest'
import {
  createPreviewModalKeydownHandler,
  getCommunicationTemplateAdminErrorMessage,
  normalizeCommunicationTemplateChannel,
  publishCommunicationTemplateVersion,
} from './communicationTemplateAdmin'

describe('communicationTemplateAdmin helpers', () => {
  it('returns backend 4xx messages instead of generic server fallback', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Nieprawidlowe dane wejsciowe. Sprawdz zaznaczone pola.',
          },
        },
      },
    }

    expect(
      getCommunicationTemplateAdminErrorMessage(
        error,
        'Wystapil blad serwera. Sprobuj ponownie lub skontaktuj sie z administratorem.',
      ),
    ).toBe('Nieprawidlowe dane wejsciowe. Sprawdz zaznaczone pola.')
  })

  it('normalizes unsupported channels to EMAIL before save', () => {
    expect(normalizeCommunicationTemplateChannel('SMS')).toBe('EMAIL')
    expect(normalizeCommunicationTemplateChannel('LETTER')).toBe('EMAIL')
    expect(normalizeCommunicationTemplateChannel('EMAIL')).toBe('EMAIL')
  })

  it('closes preview modal on Escape only', () => {
    const onClose = vi.fn()
    const handler = createPreviewModalKeydownHandler(onClose)

    handler({ key: 'Enter' })
    handler({ key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('publishes by deactivating the current version and activating the draft', async () => {
    const persistDraft = vi.fn().mockResolvedValue({
      id: 'tpl-draft',
      code: 'REQUEST_RECEIVED',
    })
    const activateTemplate = vi.fn().mockResolvedValue(undefined)
    const deactivateTemplate = vi.fn().mockResolvedValue(undefined)

    const result = await publishCommunicationTemplateVersion({
      code: 'REQUEST_RECEIVED',
      versionId: null,
      activeVersionId: 'tpl-active',
      persistDraft,
      activateTemplate,
      deactivateTemplate,
    })

    expect(persistDraft).toHaveBeenCalledOnce()
    expect(deactivateTemplate).toHaveBeenCalledWith('tpl-active')
    expect(activateTemplate).toHaveBeenCalledWith('tpl-draft')
    expect(result).toEqual({
      code: 'REQUEST_RECEIVED',
      versionId: 'tpl-draft',
    })
  })
})
