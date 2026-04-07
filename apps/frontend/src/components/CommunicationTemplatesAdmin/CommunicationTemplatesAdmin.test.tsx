import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { CommunicationTemplateDto } from '@np-manager/shared'
import { buildCommunicationTemplateGroups, renderCommunicationTemplatePreview } from '@/lib/communicationTemplates'
import { CommunicationTemplateDetail } from './CommunicationTemplateDetail'
import { CommunicationTemplateEditor } from './CommunicationTemplateEditor'
import { CommunicationTemplatePublishModal } from './CommunicationTemplatePublishModal'
import { CommunicationTemplatesList } from './CommunicationTemplatesList'

const TEMPLATES: CommunicationTemplateDto[] = [
  {
    id: 'tpl-published',
    code: 'REQUEST_RECEIVED',
    name: 'Potwierdzenie przyjecia sprawy',
    description: 'Komunikat wysylany po przyjeciu wniosku.',
    channel: 'EMAIL',
    subjectTemplate: 'Sprawa {{caseNumber}} zostala przyjeta',
    bodyTemplate:
      'Dzien dobry {{clientName}},\n\npotwierdzamy przyjecie sprawy dla numeru {{portedNumber}}.',
    isActive: true,
    version: 3,
    createdAt: '2026-04-05T09:00:00.000Z',
    updatedAt: '2026-04-05T10:00:00.000Z',
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    createdByDisplayName: 'Anna Admin',
    updatedByDisplayName: 'Anna Admin',
  },
  {
    id: 'tpl-draft',
    code: 'REQUEST_RECEIVED',
    name: 'Potwierdzenie przyjecia sprawy',
    description: 'Komunikat wysylany po przyjeciu wniosku.',
    channel: 'EMAIL',
    subjectTemplate: 'Aktualizacja sprawy {{caseNumber}}',
    bodyTemplate:
      'Dzien dobry {{clientName}},\n\nTwoja sprawa dla numeru {{portedNumber}} jest w toku.',
    isActive: false,
    version: 4,
    createdAt: '2026-04-06T09:00:00.000Z',
    updatedAt: '2026-04-06T10:15:00.000Z',
    createdByUserId: 'user-2',
    updatedByUserId: 'user-2',
    createdByDisplayName: 'Piotr Publikacja',
    updatedByDisplayName: 'Piotr Publikacja',
  },
  {
    id: 'tpl-archived',
    code: 'REQUEST_RECEIVED',
    name: 'Potwierdzenie przyjecia sprawy',
    description: 'Starsza wersja komunikatu.',
    channel: 'EMAIL',
    subjectTemplate: 'Twoja sprawa {{caseNumber}}',
    bodyTemplate: 'Archiwalna wersja dla {{clientName}}.',
    isActive: false,
    version: 2,
    createdAt: '2026-04-01T09:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    createdByDisplayName: 'Anna Admin',
    updatedByDisplayName: 'Anna Admin',
  },
]

describe('Communication templates admin UX', () => {
  it('renders list view with summary cards and business rows', () => {
    const groups = buildCommunicationTemplateGroups(TEMPLATES)
    const html = renderToStaticMarkup(
      <CommunicationTemplatesList
        groups={groups}
        isLoading={false}
        error={null}
        filters={{ search: '', status: 'ALL', code: '', channel: '' }}
        onSearchChange={vi.fn()}
        onStatusChange={vi.fn()}
        onCodeChange={vi.fn()}
        onChannelChange={vi.fn()}
        onCreate={vi.fn()}
        onOpen={vi.fn()}
        onCreateDraft={vi.fn()}
        onPreviewPublished={vi.fn()}
      />,
    )

    expect(html).toContain('Szablony komunikatow')
    expect(html).toContain('Lacznie szablonow')
    expect(html).toContain('Wersje robocze')
    expect(html).toContain('Potwierdzenie przyjecia sprawy')
    expect(html).toContain('Wersja aktywna: v3')
    expect(html).toContain('Akcje')
  })

  it('renders a friendly empty state when there are no templates', () => {
    const html = renderToStaticMarkup(
      <CommunicationTemplatesList
        groups={[]}
        isLoading={false}
        error={null}
        filters={{ search: '', status: 'ALL', code: '', channel: '' }}
        onSearchChange={vi.fn()}
        onStatusChange={vi.fn()}
        onCodeChange={vi.fn()}
        onChannelChange={vi.fn()}
        onCreate={vi.fn()}
        onOpen={vi.fn()}
        onCreateDraft={vi.fn()}
        onPreviewPublished={vi.fn()}
      />,
    )

    expect(html).toContain('Brak szablonow komunikatow')
    expect(html).toContain('Dodaj pierwszy szablon')
    expect(html).toContain('Utworz pierwszy szablon')
  })

  it('renders detail sections for operational version, drafts, history and placeholders', () => {
    const group = buildCommunicationTemplateGroups(TEMPLATES)[0] ?? null
    const html = renderToStaticMarkup(
      <CommunicationTemplateDetail
        group={group}
        isLoading={false}
        error={null}
        feedbackSuccess={null}
        feedbackError={null}
        onBack={vi.fn()}
        onCreateDraft={vi.fn()}
        onEditDraft={vi.fn()}
        onPreviewVersion={vi.fn()}
        onPublishVersion={vi.fn()}
        onCloneVersion={vi.fn()}
        onDetailsVersion={vi.fn()}
      />,
    )

    expect(html).toContain('Aktualnie uzywane operacyjnie')
    expect(html).toContain('Wersje robocze')
    expect(html).toContain('Historia wersji')
    expect(html).toContain('Dostepne placeholdery')
    expect(html).toContain('{{clientName}}')
  })

  it('renders editor validation with unknown placeholders and publish modal', () => {
    const preview = renderCommunicationTemplatePreview({
      subjectTemplate: 'Temat {{caseNumber}}',
      bodyTemplate: 'Nieznane pole {{client}}',
    })

    const editorHtml = renderToStaticMarkup(
      <CommunicationTemplateEditor
        title="Edycja wersji roboczej"
        subtitle="Wersja robocza"
        form={{
          id: null,
          code: 'REQUEST_RECEIVED',
          name: 'Wersja robocza',
          description: 'Opis',
          channel: 'EMAIL',
          subjectTemplate: 'Temat {{caseNumber}}',
          bodyTemplate: 'Nieznane pole {{client}}',
          isActive: false,
          version: 5,
        }}
        statusInfo={{
          versionLabel: 'v5',
          statusLabel: 'Robocza',
          lastEditedAt: null,
          lastEditedByDisplayName: null,
        }}
        preview={preview}
        feedbackSuccess={null}
        feedbackError={null}
        isSaving={false}
        isPublishing={false}
        lockIdentityFields={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onPreview={vi.fn()}
        onPublish={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const modalHtml = renderToStaticMarkup(
      <CommunicationTemplatePublishModal
        isOpen
        versionLabel="v5"
        templateName="Wersja robocza"
        isPublishing={false}
        publishError={null}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(editorHtml).toContain('Walidacja')
    expect(editorHtml).toContain('Wykryto nieznane placeholdery')
    expect(editorHtml).toContain('Wersja nie jest gotowa do publikacji.')
    expect(modalHtml).toContain('Opublikowac te wersje?')
    expect(modalHtml).toContain('Publikuj wersje')
  })

  it('does not show required validation messages on the first render', () => {
    const preview = renderCommunicationTemplatePreview({
      subjectTemplate: '',
      bodyTemplate: '',
    })

    const html = renderToStaticMarkup(
      <CommunicationTemplateEditor
        title="Nowy szablon komunikatu"
        subtitle="Wersja robocza"
        form={{
          id: null,
          code: 'REQUEST_RECEIVED',
          name: '',
          description: '',
          channel: 'EMAIL',
          subjectTemplate: '',
          bodyTemplate: '',
          isActive: false,
          version: null,
        }}
        statusInfo={{
          versionLabel: 'v1',
          statusLabel: 'Robocza',
          lastEditedAt: null,
          lastEditedByDisplayName: null,
        }}
        preview={preview}
        feedbackSuccess={null}
        feedbackError={null}
        isSaving={false}
        isPublishing={false}
        lockIdentityFields={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onPreview={vi.fn()}
        onPublish={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(html).not.toContain('Nazwa biznesowa jest wymagana.')
    expect(html).not.toContain('Temat wiadomosci jest wymagany.')
    expect(html).not.toContain('Tresc wiadomosci jest wymagana.')
  })
})
