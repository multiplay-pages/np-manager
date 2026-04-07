import type { CommunicationTemplateCode, ContactChannel } from '@np-manager/shared'
import type { CommunicationTemplateVersionStatus } from '@np-manager/shared'

export interface CommunicationTemplateEditorFormState {
  id: string | null
  templateId: string | null
  code: CommunicationTemplateCode
  name: string
  description: string
  channel: ContactChannel
  subjectTemplate: string
  bodyTemplate: string
  status: CommunicationTemplateVersionStatus | null
  versionNumber: number | null
}

export interface CommunicationTemplateEditorStatusInfo {
  versionLabel: string
  statusLabel: string
  lastEditedAt: string | null
  lastEditedByDisplayName: string | null
}
