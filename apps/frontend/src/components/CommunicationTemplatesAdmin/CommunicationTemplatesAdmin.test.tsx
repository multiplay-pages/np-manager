// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CommunicationTemplateDto, CommunicationTemplateListItemDto } from '@np-manager/shared'
import {
  buildCommunicationTemplateDetailView,
  buildCommunicationTemplateListView,
  mapRealCasePreviewToPreviewResult,
  renderCommunicationTemplatePreview,
} from '@/lib/communicationTemplates'
import { CommunicationTemplateDetail } from './CommunicationTemplateDetail'
import { CommunicationTemplateEditor } from './CommunicationTemplateEditor'
import { CommunicationTemplatePreviewModal } from './CommunicationTemplatePreviewModal'
import { CommunicationTemplatePublishModal } from './CommunicationTemplatePublishModal'
import { CommunicationTemplatesList } from './CommunicationTemplatesList'

const TEMPLATE_DETAIL: CommunicationTemplateDto = {
  id: 'tpl-family-1',
  code: 'REQUEST_RECEIVED',
  name: 'Potwierdzenie przyjecia sprawy',
  description: 'Komunikat wysylany po przyjeciu wniosku.',
  channel: 'EMAIL',
  createdAt: '2026-04-05T09:00:00.000Z',
  updatedAt: '2026-04-06T10:15:00.000Z',
  createdByUserId: 'user-1',
  updatedByUserId: 'user-2',
  createdByDisplayName: 'Anna Admin',
  updatedByDisplayName: 'Piotr Publikacja',
  publishedVersionId: 'tpl-version-3',
  publishedVersionNumber: 3,
  publishedAt: '2026-04-05T10:00:00.000Z',
  publishedByDisplayName: 'Anna Admin',
  versions: [
    {
      id: 'tpl-version-4',
      templateId: 'tpl-family-1',
      versionNumber: 4,
      status: 'DRAFT',
      subjectTemplate: 'Aktualizacja sprawy {{caseNumber}}',
      bodyTemplate: 'Dzien dobry {{clientName}},\n\nTwoja sprawa jest w toku.',
      createdAt: '2026-04-06T09:00:00.000Z',
      updatedAt: '2026-04-06T10:15:00.000Z',
      createdByUserId: 'user-2',
      updatedByUserId: 'user-2',
      createdByDisplayName: 'Piotr Publikacja',
      updatedByDisplayName: 'Piotr Publikacja',
      publishedAt: null,
      publishedByUserId: null,
      publishedByDisplayName: null,
    },
    {
      id: 'tpl-version-3',
      templateId: 'tpl-family-1',
      versionNumber: 3,
      status: 'PUBLISHED',
      subjectTemplate: 'Sprawa {{caseNumber}} zostala przyjeta',
      bodyTemplate: 'Dzien dobry {{clientName}},\n\npotwierdzamy przyjecie sprawy.',
      createdAt: '2026-04-05T09:00:00.000Z',
      updatedAt: '2026-04-05T10:00:00.000Z',
      createdByUserId: 'user-1',
      updatedByUserId: 'user-1',
      createdByDisplayName: 'Anna Admin',
      updatedByDisplayName: 'Anna Admin',
      publishedAt: '2026-04-05T10:00:00.000Z',
      publishedByUserId: 'user-1',
      publishedByDisplayName: 'Anna Admin',
    },
    {
      id: 'tpl-version-2',
      templateId: 'tpl-family-1',
      versionNumber: 2,
      status: 'ARCHIVED',
      subjectTemplate: 'Twoja sprawa {{caseNumber}}',
      bodyTemplate: 'Archiwalna wersja dla {{clientName}}.',
      createdAt: '2026-04-01T09:00:00.000Z',
      updatedAt: '2026-04-01T10:00:00.000Z',
      createdByUserId: 'user-1',
      updatedByUserId: 'user-1',
      createdByDisplayName: 'Anna Admin',
      updatedByDisplayName: 'Anna Admin',
      publishedAt: null,
      publishedByUserId: null,
      publishedByDisplayName: null,
    },
  ],
}

const TEMPLATE_LIST_ITEMS: CommunicationTemplateListItemDto[] = [
  {
    id: 'tpl-family-1',
    code: 'REQUEST_RECEIVED',
    name: 'Potwierdzenie przyjecia sprawy',
    description: 'Komunikat wysylany po przyjeciu wniosku.',
    channel: 'EMAIL',
    createdAt: '2026-04-05T09:00:00.000Z',
    updatedAt: '2026-04-06T10:15:00.000Z',
    createdByUserId: 'user-1',
    updatedByUserId: 'user-2',
    createdByDisplayName: 'Anna Admin',
    updatedByDisplayName: 'Piotr Publikacja',
    publishedVersionId: 'tpl-version-3',
    publishedVersionNumber: 3,
    publishedAt: '2026-04-05T10:00:00.000Z',
    publishedByDisplayName: 'Anna Admin',
    lastVersionUpdatedAt: '2026-04-06T10:15:00.000Z',
    lastVersionUpdatedByDisplayName: 'Piotr Publikacja',
    versionCounts: {
      total: 3,
      draft: 1,
      published: 1,
      archived: 1,
    },
  },
]

afterEach(() => {
  cleanup()
})

describe('Communication templates admin UX', () => {
  it('renders list view with summary cards and backend-driven statuses', () => {
    const html = renderToStaticMarkup(
      <CommunicationTemplatesList
        items={buildCommunicationTemplateListView(TEMPLATE_LIST_ITEMS)}
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

    expect(html).toContain('Szablony komunikatów')
    expect(html).toContain('Łącznie szablonów')
    expect(html).toContain('Filtry')
    expect(html).toContain('Wersja aktywna: v3')
    expect(html).toContain('Opublikowana v3 i 1 robocza')
    expect(html).toContain('Otwórz')
  })

  it('renders a friendly empty state when there are no templates', () => {
    const html = renderToStaticMarkup(
      <CommunicationTemplatesList
        items={[]}
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

    expect(html).toContain('Brak szablonów komunikatów')
    expect(html).toContain('Utwórz pierwszy szablon')
  })

  it('renders detail sections for operational version, drafts, history and placeholders', () => {
    const group = buildCommunicationTemplateDetailView(TEMPLATE_DETAIL)
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
        onArchiveVersion={vi.fn()}
        onCloneVersion={vi.fn()}
        onDetailsVersion={vi.fn()}
      />,
    )

    expect(html).toContain('Aktualnie opublikowana wersja')
    expect(html).toContain('Wersje robocze')
    expect(html).toContain('Wersje archiwalne')
    expect(html).toContain('Metadane szablonu')
    expect(html).toContain('Dostępne placeholdery')
    expect(html).toContain('Archiwizuj')
  })

  it('renders editor validation and publish modal without showing required errors on first render', () => {
    const preview = renderCommunicationTemplatePreview({
      subjectTemplate: '',
      bodyTemplate: 'Nieznane pole {{client}}',
    })

    const editorHtml = renderToStaticMarkup(
      <CommunicationTemplateEditor
        title="Edycja wersji roboczej"
        subtitle="Wersja robocza"
        form={{
          id: null,
          templateId: null,
          code: 'REQUEST_RECEIVED',
          name: '',
          description: 'Opis',
          channel: 'EMAIL',
          subjectTemplate: '',
          bodyTemplate: 'Nieznane pole {{client}}',
          status: 'DRAFT',
          versionNumber: 5,
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
    expect(editorHtml).not.toContain('Nazwa biznesowa jest wymagana.')
    expect(modalHtml).toContain('Opublikować tę wersję?')
  })

  it('renders preview modal with real-case context and keeps test preview flow intact', () => {
    const testPreview = renderCommunicationTemplatePreview({
      subjectTemplate: 'Temat {{caseNumber}}',
      bodyTemplate: 'Dzien dobry {{clientName}}',
    })
    const realPreview = mapRealCasePreviewToPreviewResult({
      renderedSubject: 'Temat FNP-SEED-COMM-DRAFT-001',
      renderedBody: 'Dzien dobry Jan Testowy',
      usedPlaceholders: ['caseNumber', 'clientName'],
      missingPlaceholders: [],
      unknownPlaceholders: [],
      isRenderable: true,
      previewContextSummary: {
        portingRequestId: 'req-1',
        caseNumber: 'FNP-SEED-COMM-DRAFT-001',
        clientName: 'Jan Testowy',
        donorOperatorName: 'Orange Polska',
        recipientOperatorName: 'G-NET',
        plannedPortDate: '14.04.2026',
        statusInternal: 'SUBMITTED',
      },
      warnings: [],
    })

    const testHtml = renderToStaticMarkup(
      <CommunicationTemplatePreviewModal
        isOpen
        title="Podgląd testowy"
        subtitle="Dane testowe"
        preview={testPreview}
        mode="TEST"
        realCaseReference=""
        realCaseLabel=""
        isRealCaseAvailable={false}
        isRealCaseLoading={false}
        realCaseError={null}
        realCaseHelpText="Zapisz wersję roboczą, aby uruchomić podgląd na realnej sprawie."
        onModeChange={vi.fn()}
        onRealCaseReferenceChange={vi.fn()}
        onRunRealCasePreview={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    const realHtml = renderToStaticMarkup(
      <CommunicationTemplatePreviewModal
        isOpen
        title="Podgląd na realnej sprawie"
        subtitle="Realna sprawa"
        preview={realPreview}
        mode="REAL"
        realCaseReference="FNP-SEED-COMM-DRAFT-001"
        realCaseLabel="FNP-SEED-COMM-DRAFT-001"
        isRealCaseAvailable
        isRealCaseLoading={false}
        realCaseError="Nie znaleziono wskazanej sprawy do podglądu szablonu."
        realCaseHelpText="Podgląd na realnej sprawie nie zapisuje komunikacji."
        onModeChange={vi.fn()}
        onRealCaseReferenceChange={vi.fn()}
        onRunRealCasePreview={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(testHtml).toContain('Dane testowe')
    expect(testHtml).toContain('Temat FNP-ADMIN-001')
    expect(realHtml).toContain('Podgląd na realnej sprawie')
    expect(realHtml).toContain('FNP-SEED-COMM-DRAFT-001')
    expect(realHtml).toContain('Nie znaleziono wskazanej sprawy do podglądu szablonu.')
  })
})

describe('CommunicationTemplatePublishModal — risky UX confirmation', () => {
  const BASE_PROPS = {
    isOpen: true,
    versionLabel: 'v4',
    templateName: 'Potwierdzenie przyjecia sprawy',
    isPublishing: false,
    publishError: null,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  it('shows template name and version in summary', () => {
    const html = renderToStaticMarkup(<CommunicationTemplatePublishModal {...BASE_PROPS} />)
    expect(html).toContain('Potwierdzenie przyjecia sprawy')
    expect(html).toContain('v4')
    expect(html).toContain('Szablon:')
    expect(html).toContain('Wersja:')
  })

  it('shows warning about publish consequences', () => {
    const html = renderToStaticMarkup(<CommunicationTemplatePublishModal {...BASE_PROPS} />)
    expect(html).toContain('Publikacja wpływa na przyszłe komunikaty')
    expect(html).toContain('Ta wersja stanie się aktywna dla kolejnych komunikatów tego typu.')
  })

  it('shows confirm checkbox and confirmation label', () => {
    const html = renderToStaticMarkup(<CommunicationTemplatePublishModal {...BASE_PROPS} />)
    expect(html).toContain('Rozumiem, że ta wersja będzie używana w kolejnych komunikatach.')
    expect(html).toContain('type="checkbox"')
  })

  it('renders publish button as disabled when checkbox is unchecked (initial state)', () => {
    render(<CommunicationTemplatePublishModal {...BASE_PROPS} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect((screen.getByTestId('publish-confirm-button') as HTMLButtonElement).disabled).toBe(true)
  })

  it('checking the checkbox enables the publish button', () => {
    render(<CommunicationTemplatePublishModal {...BASE_PROPS} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    const button = screen.getByTestId('publish-confirm-button') as HTMLButtonElement
    expect(button.disabled).toBe(true)

    fireEvent.click(screen.getByTestId('publish-confirm-checkbox'))
    expect(button.disabled).toBe(false)
  })

  it('clicking publish button after confirmation calls onConfirm', () => {
    const onConfirm = vi.fn()
    render(<CommunicationTemplatePublishModal {...BASE_PROPS} onConfirm={onConfirm} onCancel={vi.fn()} />)

    fireEvent.click(screen.getByTestId('publish-confirm-checkbox'))
    fireEvent.click(screen.getByTestId('publish-confirm-button'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('clicking cancel calls onCancel', () => {
    const onCancel = vi.fn()
    render(<CommunicationTemplatePublishModal {...BASE_PROPS} onConfirm={vi.fn()} onCancel={onCancel} />)

    fireEvent.click(screen.getByTestId('publish-cancel-button'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('reopening modal resets checkbox to unchecked', () => {
    const { rerender } = render(
      <CommunicationTemplatePublishModal {...BASE_PROPS} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    )
    fireEvent.click(screen.getByTestId('publish-confirm-checkbox'))
    expect((screen.getByTestId('publish-confirm-checkbox') as HTMLInputElement).checked).toBe(true)

    rerender(
      <CommunicationTemplatePublishModal
        {...BASE_PROPS}
        isOpen={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    rerender(
      <CommunicationTemplatePublishModal {...BASE_PROPS} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    )
    expect((screen.getByTestId('publish-confirm-checkbox') as HTMLInputElement).checked).toBe(false)
  })

  it('shows publishError via AlertBanner when provided', () => {
    const html = renderToStaticMarkup(
      <CommunicationTemplatePublishModal
        {...BASE_PROPS}
        publishError="Błąd serwera. Spróbuj ponownie."
      />,
    )
    expect(html).toContain('Nie udało się opublikować wersji')
    expect(html).toContain('Błąd serwera. Spróbuj ponownie.')
  })

  it('disables both buttons and shows loading label while publishing', () => {
    render(
      <CommunicationTemplatePublishModal
        {...BASE_PROPS}
        isPublishing
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect((screen.getByTestId('publish-confirm-button') as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByTestId('publish-cancel-button') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByTestId('publish-confirm-button').textContent).toContain('Publikowanie...')
  })
})
