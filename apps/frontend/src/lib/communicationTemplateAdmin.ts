import axios from 'axios'
import { CONTACT_CHANNEL_LABELS, type ContactChannel } from '@np-manager/shared'

export const ADMIN_COMMUNICATION_TEMPLATES_API_PATH = '/admin/communication-templates'
export const SUPPORTED_COMMUNICATION_TEMPLATE_CHANNELS = ['EMAIL'] as const

const TEMPLATE_ERROR_MESSAGES: Record<string, string> = {
  COMMUNICATION_TEMPLATE_ACTIVE_ALREADY_EXISTS:
    'Dla tego kodu i kanalu istnieje juz inny aktywny szablon.',
  COMMUNICATION_TEMPLATE_UNKNOWN_PLACEHOLDERS: 'Wykryto nieznane placeholdery.',
  COMMUNICATION_TEMPLATE_NOT_FOUND: 'Wybrany szablon nie istnieje.',
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

export async function publishCommunicationTemplateVersion(params: {
  code: string
  versionId: string | null
  activeVersionId?: string | null
  persistDraft: () => Promise<{ id: string; code: string }>
  activateTemplate: (id: string) => Promise<unknown>
  deactivateTemplate: (id: string) => Promise<unknown>
}) {
  let resolvedVersionId = params.versionId
  let resolvedCode = params.code

  if (!resolvedVersionId) {
    const savedDraft = await params.persistDraft()
    resolvedVersionId = savedDraft.id
    resolvedCode = savedDraft.code
  }

  if (params.activeVersionId && params.activeVersionId !== resolvedVersionId) {
    await params.deactivateTemplate(params.activeVersionId)
  }

  await params.activateTemplate(resolvedVersionId)

  return {
    code: resolvedCode,
    versionId: resolvedVersionId,
  }
}
