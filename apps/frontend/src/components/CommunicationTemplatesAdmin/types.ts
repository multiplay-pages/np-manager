import type { CommunicationTemplateCode, ContactChannel } from '@np-manager/shared'

export interface CommunicationTemplateEditorFormState {
  id: string | null
  code: CommunicationTemplateCode
  name: string
  description: string
  channel: ContactChannel
  subjectTemplate: string
  bodyTemplate: string
  isActive: boolean
  version: number | null
}

export interface CommunicationTemplateEditorStatusInfo {
  versionLabel: string
  statusLabel: string
  lastEditedAt: string | null
  lastEditedByDisplayName: string | null
}
