import { describe, expect, it, vi } from 'vitest'
import {
  createPreviewModalKeydownHandler,
  getCommunicationTemplateAdminErrorMessage,
  normalizeCommunicationTemplateChannel,
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

  it('maps known backend communication template errors to business messages', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          error: {
            code: 'COMMUNICATION_TEMPLATE_VERSION_PUBLISHED_ARCHIVE_BLOCKED',
          },
        },
      },
    }

    expect(
      getCommunicationTemplateAdminErrorMessage(
        error,
        'Wystapil blad serwera. Sprobuj ponownie lub skontaktuj sie z administratorem.',
      ),
    ).toBe('Nie mozna archiwizowac opublikowanej wersji bez publikacji innej wersji.')
  })
})
