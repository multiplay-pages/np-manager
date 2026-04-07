import axios from 'axios'
import { CONTACT_CHANNEL_LABELS, type ContactChannel } from '@np-manager/shared'

export const ADMIN_COMMUNICATION_TEMPLATES_API_PATH = '/admin/communication-templates'
export const SUPPORTED_COMMUNICATION_TEMPLATE_CHANNELS = ['EMAIL'] as const

const TEMPLATE_ERROR_MESSAGES: Record<string, string> = {
  COMMUNICATION_TEMPLATE_ALREADY_EXISTS: 'Dla tego kodu i kanalu istnieje juz szablon komunikatu.',
  COMMUNICATION_TEMPLATE_UNKNOWN_PLACEHOLDERS: 'Wykryto nieznane placeholdery.',
  COMMUNICATION_TEMPLATE_NOT_FOUND: 'Wybrany szablon nie istnieje.',
  COMMUNICATION_TEMPLATE_VERSION_NOT_FOUND: 'Wybrana wersja szablonu nie istnieje.',
  COMMUNICATION_TEMPLATE_VERSION_NOT_EDITABLE:
    'Mozna edytowac tylko wersje robocze szablonow komunikatow.',
  COMMUNICATION_TEMPLATE_VERSION_NOT_DRAFT: 'Publikowac mozna tylko wersje robocze.',
  COMMUNICATION_TEMPLATE_VERSION_NOT_RENDERABLE:
    'Nie mozna opublikowac wersji, ktora nie przechodzi walidacji renderowania.',
  COMMUNICATION_TEMPLATE_PUBLISHED_NOT_FOUND:
    'Brak opublikowanej wersji tego szablonu do uzycia operacyjnego.',
  COMMUNICATION_TEMPLATE_PREVIEW_CASE_REQUIRED:
    'Podaj identyfikator sprawy albo numer sprawy do preview.',
  COMMUNICATION_TEMPLATE_PREVIEW_CASE_NOT_FOUND:
    'Nie znaleziono wskazanej sprawy do preview szablonu.',
  COMMUNICATION_TEMPLATE_VERSION_PUBLISHED_ARCHIVE_BLOCKED:
    'Nie mozna archiwizowac opublikowanej wersji bez publikacji innej wersji.',
  VALIDATION_ERROR: 'Nieprawidlowe dane wejsciowe. Sprawdz zaznaczone pola.',
  NOT_FOUND: 'Nie znaleziono zasobu.',
}

export function getCommunicationTemplateAdminErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (!axios.isAxiosError(error)) {
    return fallback
  }

  const apiError = error.response?.data as { error?: { code?: string; message?: string } } | undefined
  const code = apiError?.error?.code
  const message = apiError?.error?.message

  if (message) {
    return message
  }

  if (code && TEMPLATE_ERROR_MESSAGES[code]) {
    return TEMPLATE_ERROR_MESSAGES[code]
  }

  return fallback
}

export function normalizeCommunicationTemplateChannel(
  channel: ContactChannel | string | undefined,
): typeof SUPPORTED_COMMUNICATION_TEMPLATE_CHANNELS[number] {
  if (channel === 'EMAIL') {
    return 'EMAIL'
  }

  return 'EMAIL'
}

export function getSupportedCommunicationTemplateChannelOptions() {
  return SUPPORTED_COMMUNICATION_TEMPLATE_CHANNELS.map((channel) => ({
    value: channel,
    label: CONTACT_CHANNEL_LABELS[channel],
  }))
}

export function createPreviewModalKeydownHandler(onClose: () => void) {
  return (event: Pick<KeyboardEvent, 'key'>) => {
    if (event.key === 'Escape') {
      onClose()
    }
  }
}
