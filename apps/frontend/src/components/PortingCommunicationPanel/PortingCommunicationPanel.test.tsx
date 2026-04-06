import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { PortingCommunicationPanel } from './PortingCommunicationPanel'

describe('PortingCommunicationPanel', () => {
  it('renders communication actions from backend data with disabled reason and active draft note', () => {
    const html = renderToStaticMarkup(
      <PortingCommunicationPanel
        actions={[
          {
            type: 'CLIENT_CONFIRMATION',
            label: 'Potwierdzenie dla klienta',
            description: 'Operacyjne potwierdzenie obslugi sprawy.',
            canPreview: true,
            canCreateDraft: false,
            canMarkSent: true,
            disabled: false,
            disabledReason: 'Istnieje juz aktywny draft tego typu.',
            existingDraftId: 'comm-1',
            existingDraftInfo: {
              id: 'comm-1',
              status: 'DRAFT',
              recipient: 'jan@example.com',
              subject: 'Aktualizacja sprawy',
              createdAt: '2026-04-06T10:00:00.000Z',
              createdByDisplayName: 'Anna Nowak',
            },
            allowsMultipleDrafts: false,
          },
        ]}
        summary={{
          totalCount: 1,
          draftCount: 1,
          sentCount: 0,
          errorCount: 0,
          lastCommunicationAt: '2026-04-06T10:00:00.000Z',
          lastCommunicationType: 'CLIENT_CONFIRMATION',
        }}
        items={[
          {
            id: 'comm-1',
            portingRequestId: 'req-1',
            actionType: 'CLIENT_CONFIRMATION',
            type: 'EMAIL',
            status: 'DRAFT',
            triggerType: 'CASE_RECEIVED',
            recipient: 'jan@example.com',
            subject: 'Aktualizacja sprawy',
            body: 'Tresc draftu',
            templateKey: 'client_confirmation',
            createdByUserId: 'user-1',
            createdByDisplayName: 'Anna Nowak',
            createdByRole: 'ADMIN',
            sentAt: null,
            errorMessage: null,
            metadata: null,
            createdAt: '2026-04-06T10:00:00.000Z',
            updatedAt: '2026-04-06T10:00:00.000Z',
          },
        ]}
        isLoadingHistory={false}
        preview={null}
        feedbackError={null}
        feedbackSuccess={null}
        previewingActionType={null}
        creatingDraftActionType={null}
        markingSentId={null}
        onPreviewDraft={vi.fn()}
        onCreateDraft={vi.fn()}
        onMarkAsSent={vi.fn()}
      />,
    )

    expect(html).toContain('Komunikacja operacyjna')
    expect(html).toContain('Potwierdzenie dla klienta')
    expect(html).toContain('Istnieje juz aktywny draft tego typu.')
    expect(html).toContain('Historia komunikacji')
    expect(html).toContain('Aktualizacja sprawy')
  })

  it('keeps rendering panel content when single action error is present', () => {
    const html = renderToStaticMarkup(
      <PortingCommunicationPanel
        actions={[]}
        summary={{
          totalCount: 0,
          draftCount: 0,
          sentCount: 0,
          errorCount: 0,
          lastCommunicationAt: null,
          lastCommunicationType: null,
        }}
        items={[]}
        isLoadingHistory={false}
        preview={null}
        feedbackError="Istnieje juz aktywny draft tego typu."
        feedbackSuccess={null}
        previewingActionType={null}
        creatingDraftActionType={null}
        markingSentId={null}
        onPreviewDraft={vi.fn()}
        onCreateDraft={vi.fn()}
        onMarkAsSent={vi.fn()}
      />,
    )

    expect(html).toContain('Istnieje juz aktywny draft tego typu.')
    expect(html).toContain('Dla tej roli nie ma dostepnych akcji komunikacyjnych.')
    expect(html).toContain('Brak komunikacji zapisanych dla tej sprawy.')
  })

  it('does not keep a stale success message when the panel is rendered again without feedback', () => {
    const successHtml = renderToStaticMarkup(
      <PortingCommunicationPanel
        actions={[]}
        summary={{
          totalCount: 0,
          draftCount: 0,
          sentCount: 0,
          errorCount: 0,
          lastCommunicationAt: null,
          lastCommunicationType: null,
        }}
        items={[]}
        isLoadingHistory={false}
        preview={null}
        feedbackError={null}
        feedbackSuccess="Komunikat zostal oznaczony jako wyslany."
        previewingActionType={null}
        creatingDraftActionType={null}
        markingSentId={null}
        onPreviewDraft={vi.fn()}
        onCreateDraft={vi.fn()}
        onMarkAsSent={vi.fn()}
      />,
    )

    const reloadHtml = renderToStaticMarkup(
      <PortingCommunicationPanel
        actions={[]}
        summary={{
          totalCount: 0,
          draftCount: 0,
          sentCount: 0,
          errorCount: 0,
          lastCommunicationAt: null,
          lastCommunicationType: null,
        }}
        items={[]}
        isLoadingHistory={false}
        preview={null}
        feedbackError={null}
        feedbackSuccess={null}
        previewingActionType={null}
        creatingDraftActionType={null}
        markingSentId={null}
        onPreviewDraft={vi.fn()}
        onCreateDraft={vi.fn()}
        onMarkAsSent={vi.fn()}
      />,
    )

    expect(successHtml).toContain('Komunikat zostal oznaczony jako wyslany.')
    expect(reloadHtml).not.toContain('Komunikat zostal oznaczony jako wyslany.')
  })
})
