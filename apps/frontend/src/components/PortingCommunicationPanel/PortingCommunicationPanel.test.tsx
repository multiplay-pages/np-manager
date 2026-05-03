import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { CommunicationDeliveryAttemptsResultDto } from '@np-manager/shared'
import { PortingCommunicationPanel } from './PortingCommunicationPanel'

// Pomocnicze props, ktore sa zawsze wymagane przez panel
const NEW_DELIVERY_PROPS = {
  sendingId: null,
  retryingId: null,
  cancellingId: null,
  deliveryAttemptsByCommId: {} as Record<string, CommunicationDeliveryAttemptsResultDto>,
  loadingDeliveryAttemptsId: null,
  onSend: vi.fn(),
  onRetry: vi.fn(),
  onCancel: vi.fn(),
  onLoadDeliveryAttempts: vi.fn(),
}

const EMPTY_SUMMARY = {
  totalCount: 0,
  draftCount: 0,
  sentCount: 0,
  errorCount: 0,
  lastCommunicationAt: null,
  lastCommunicationType: null,
}

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
        {...NEW_DELIVERY_PROPS}
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
        summary={EMPTY_SUMMARY}
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
        {...NEW_DELIVERY_PROPS}
      />,
    )

    expect(html).toContain('Istnieje juz aktywny draft tego typu.')
    expect(html).toContain('Dla tej roli nie ma dostepnych akcji komunikacyjnych.')
    expect(html).toContain('Brak komunikacji zapisanych dla tej sprawy.')
  })

  it('renders status-blocked draft action for non-terminal status with future availability reason', () => {
    const html = renderToStaticMarkup(
      <PortingCommunicationPanel
        actions={[
          {
            type: 'COMPLETION_NOTICE',
            label: 'Informacja o zakonczeniu portowania',
            description: 'Finalna komunikacja po zakonczeniu przeniesienia numeru.',
            canPreview: false,
            canCreateDraft: false,
            canMarkSent: false,
            disabled: true,
            disabledReason:
              'Akcja jest dostepna dopiero dla spraw w statusie zgodnym z polityka komunikacji.',
            existingDraftId: null,
            existingDraftInfo: null,
            allowsMultipleDrafts: false,
          },
        ]}
        summary={EMPTY_SUMMARY}
        items={[]}
        isLoadingHistory={false}
        preview={null}
        feedbackError={null}
        feedbackSuccess={null}
        previewingActionType={null}
        creatingDraftActionType={null}
        markingSentId={null}
        currentStatus="SUBMITTED"
        onPreviewDraft={vi.fn()}
        onCreateDraft={vi.fn()}
        onMarkAsSent={vi.fn()}
        {...NEW_DELIVERY_PROPS}
      />,
    )

    expect(html).toContain('Niedostepne teraz')
    expect(html).toContain('Akcja bedzie dostepna dla statusow:')
    expect(html).toContain('Aktualny status:')
    expect(html).toContain('bg-ink-50 text-ink-400')
    expect(html).not.toContain('bg-brand-600')
  })

  it('renders status-blocked draft action for terminal status without future availability promise', () => {
    const html = renderToStaticMarkup(
      <PortingCommunicationPanel
        actions={[
          {
            type: 'MISSING_DOCUMENTS',
            label: 'Brakujace dokumenty',
            description: 'Prosba do klienta o doslanie brakujacych dokumentow lub korekte danych.',
            canPreview: false,
            canCreateDraft: false,
            canMarkSent: false,
            disabled: true,
            disabledReason:
              'Akcja jest dostepna dopiero dla spraw w statusie zgodnym z polityka komunikacji.',
            existingDraftId: null,
            existingDraftInfo: null,
            allowsMultipleDrafts: false,
          },
        ]}
        summary={EMPTY_SUMMARY}
        items={[]}
        isLoadingHistory={false}
        preview={null}
        feedbackError={null}
        feedbackSuccess={null}
        previewingActionType={null}
        creatingDraftActionType={null}
        markingSentId={null}
        currentStatus="PORTED"
        onPreviewDraft={vi.fn()}
        onCreateDraft={vi.fn()}
        onMarkAsSent={vi.fn()}
        {...NEW_DELIVERY_PROPS}
      />,
    )

    expect(html).toContain('Niedostepne teraz')
    expect(html).not.toContain('Akcja bedzie dostepna')
    expect(html).toContain('Ta akcja nie jest dostepna dla zakonczonej sprawy.')
    expect(html).toContain('Przewidziana jest dla statusow:')
    expect(html).toContain('Szkic')
    expect(html).toContain('Zlozona')
    expect(html).toContain('Oczekuje na dawce')
  })

  it('does not keep a stale success message when the panel is rendered again without feedback', () => {
    const successHtml = renderToStaticMarkup(
      <PortingCommunicationPanel
        actions={[]}
        summary={EMPTY_SUMMARY}
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
        {...NEW_DELIVERY_PROPS}
      />,
    )

    const reloadHtml = renderToStaticMarkup(
      <PortingCommunicationPanel
        actions={[]}
        summary={EMPTY_SUMMARY}
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
        {...NEW_DELIVERY_PROPS}
      />,
    )

    expect(successHtml).toContain('Komunikat zostal oznaczony jako wyslany.')
    expect(reloadHtml).not.toContain('Komunikat zostal oznaczony jako wyslany.')
  })

  it('pokazuje przycisk Wyslij dla komunikatu DRAFT', () => {
    const html = renderToStaticMarkup(
      <PortingCommunicationPanel
        actions={[]}
        summary={EMPTY_SUMMARY}
        items={[
          {
            id: 'comm-draft',
            portingRequestId: 'req-1',
            actionType: 'CLIENT_CONFIRMATION',
            type: 'EMAIL',
            status: 'DRAFT',
            triggerType: 'CASE_RECEIVED',
            recipient: 'jan@example.com',
            subject: 'Draft komunikatu',
            body: 'Tresc',
            templateKey: 'client_confirmation',
            createdByUserId: 'user-1',
            createdByDisplayName: null,
            createdByRole: 'ADMIN',
            sentAt: null,
            errorMessage: null,
            metadata: null,
            createdAt: '2026-04-07T10:00:00.000Z',
            updatedAt: '2026-04-07T10:00:00.000Z',
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
        {...NEW_DELIVERY_PROPS}
      />,
    )

    expect(html).toContain('Wyslij')
    expect(html).toContain('Anuluj')
    // Nie powinno byc "Ponow wysylke" dla DRAFT
    expect(html).not.toContain('Ponow wysylke')
  })

  it('pokazuje przycisk Ponow wysylke dla komunikatu FAILED', () => {
    const html = renderToStaticMarkup(
      <PortingCommunicationPanel
        actions={[]}
        summary={EMPTY_SUMMARY}
        items={[
          {
            id: 'comm-failed',
            portingRequestId: 'req-1',
            actionType: 'CLIENT_CONFIRMATION',
            type: 'EMAIL',
            status: 'FAILED',
            triggerType: 'CASE_RECEIVED',
            recipient: 'jan@example.com',
            subject: 'Nieudany komunikat',
            body: 'Tresc',
            templateKey: 'client_confirmation',
            createdByUserId: 'user-1',
            createdByDisplayName: null,
            createdByRole: 'ADMIN',
            sentAt: null,
            errorMessage: 'Blad serwera SMTP: connection refused',
            metadata: null,
            createdAt: '2026-04-07T10:00:00.000Z',
            updatedAt: '2026-04-07T10:00:00.000Z',
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
        {...NEW_DELIVERY_PROPS}
      />,
    )

    expect(html).toContain('Ponow wysylke')
    expect(html).toContain('Blad wysylki:')
    expect(html).toContain('Blad serwera SMTP: connection refused')
    // Nie powinno byc "Wyslij" dla FAILED
    expect(html).not.toContain('>Wyslij<')
  })

  it('pokazuje poprawny status SENT bez przyciskow wysylki', () => {
    const html = renderToStaticMarkup(
      <PortingCommunicationPanel
        actions={[]}
        summary={EMPTY_SUMMARY}
        items={[
          {
            id: 'comm-sent',
            portingRequestId: 'req-1',
            actionType: 'CLIENT_CONFIRMATION',
            type: 'EMAIL',
            status: 'SENT',
            triggerType: 'CASE_RECEIVED',
            recipient: 'jan@example.com',
            subject: 'Wyslany komunikat',
            body: 'Tresc',
            templateKey: 'client_confirmation',
            createdByUserId: 'user-1',
            createdByDisplayName: null,
            createdByRole: 'ADMIN',
            sentAt: '2026-04-07T10:01:00.000Z',
            errorMessage: null,
            metadata: null,
            createdAt: '2026-04-07T10:00:00.000Z',
            updatedAt: '2026-04-07T10:01:00.000Z',
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
        {...NEW_DELIVERY_PROPS}
      />,
    )

    expect(html).toContain('Wyslane')
    // Brak przyciskow akcji dla SENT
    expect(html).not.toContain('>Wyslij<')
    expect(html).not.toContain('Ponow wysylke')
    expect(html).not.toContain('>Anuluj<')
  })

  it('pokazuje poprawny status CANCELLED bez przyciskow akcji', () => {
    const html = renderToStaticMarkup(
      <PortingCommunicationPanel
        actions={[]}
        summary={EMPTY_SUMMARY}
        items={[
          {
            id: 'comm-cancelled',
            portingRequestId: 'req-1',
            actionType: 'CLIENT_CONFIRMATION',
            type: 'EMAIL',
            status: 'CANCELLED',
            triggerType: 'CASE_RECEIVED',
            recipient: 'jan@example.com',
            subject: 'Anulowany komunikat',
            body: 'Tresc',
            templateKey: 'client_confirmation',
            createdByUserId: 'user-1',
            createdByDisplayName: null,
            createdByRole: 'ADMIN',
            sentAt: null,
            errorMessage: null,
            metadata: null,
            createdAt: '2026-04-07T10:00:00.000Z',
            updatedAt: '2026-04-07T10:01:00.000Z',
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
        {...NEW_DELIVERY_PROPS}
      />,
    )

    expect(html).toContain('Anulowane')
    expect(html).not.toContain('>Wyslij<')
    expect(html).not.toContain('Ponow wysylke')
    expect(html).not.toContain('>Anuluj<')
  })

  it('pokazuje historie prob doreczenia gdy sa dostepne', () => {
    const deliveryResult: CommunicationDeliveryAttemptsResultDto = {
      communicationId: 'comm-1',
      attempts: [
        {
          id: 'attempt-1',
          communicationId: 'comm-1',
          attemptedAt: '2026-04-07T10:01:00.000Z',
          attemptedByUserId: 'user-1',
          attemptedByDisplayName: 'Jan Kowalski',
          channel: 'EMAIL',
          recipient: 'jan@example.com',
          subjectSnapshot: 'Testowy komunikat',
          bodySnapshot: 'Tresc',
          outcome: 'STUBBED',
          transportMessageId: 'stub-msg-123',
          transportReference: null,
          errorCode: null,
          errorMessage: null,
          responsePayloadJson: { mode: 'STUB' },
          adapterName: 'COMMUNICATION_DELIVERY_STUB',
        },
      ],
    }

    const html = renderToStaticMarkup(
      <PortingCommunicationPanel
        actions={[]}
        summary={EMPTY_SUMMARY}
        items={[
          {
            id: 'comm-1',
            portingRequestId: 'req-1',
            actionType: 'CLIENT_CONFIRMATION',
            type: 'EMAIL',
            status: 'SENT',
            triggerType: 'CASE_RECEIVED',
            recipient: 'jan@example.com',
            subject: 'Testowy komunikat',
            body: 'Tresc',
            templateKey: 'client_confirmation',
            createdByUserId: 'user-1',
            createdByDisplayName: 'Jan Kowalski',
            createdByRole: 'ADMIN',
            sentAt: '2026-04-07T10:01:00.000Z',
            errorMessage: null,
            metadata: null,
            createdAt: '2026-04-07T10:00:00.000Z',
            updatedAt: '2026-04-07T10:01:00.000Z',
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
        {...NEW_DELIVERY_PROPS}
        deliveryAttemptsByCommId={{ 'comm-1': deliveryResult }}
      />,
    )

    expect(html).toContain('Historia prob doreczenia')
    expect(html).toContain('STUB (symulowany)')
    expect(html).toContain('COMMUNICATION_DELIVERY_STUB')
    expect(html).toContain('stub-msg-123')
    expect(html).toContain('Jan Kowalski')
  })

  it('pokazuje czytelny blad wysylki z kodem bledu', () => {
    const deliveryResult: CommunicationDeliveryAttemptsResultDto = {
      communicationId: 'comm-failed',
      attempts: [
        {
          id: 'attempt-fail-1',
          communicationId: 'comm-failed',
          attemptedAt: '2026-04-07T10:01:00.000Z',
          attemptedByUserId: 'user-1',
          attemptedByDisplayName: null,
          channel: 'EMAIL',
          recipient: 'jan@example.com',
          subjectSnapshot: 'Komunikat',
          bodySnapshot: 'Tresc',
          outcome: 'FAILED',
          transportMessageId: null,
          transportReference: null,
          errorCode: 'SMTP_CONNECTION_ERROR',
          errorMessage: 'Polaczenie z serwerem SMTP zostalo odrzucone.',
          responsePayloadJson: null,
          adapterName: 'REAL_EMAIL',
        },
      ],
    }

    const html = renderToStaticMarkup(
      <PortingCommunicationPanel
        actions={[]}
        summary={EMPTY_SUMMARY}
        items={[
          {
            id: 'comm-failed',
            portingRequestId: 'req-1',
            actionType: 'CLIENT_CONFIRMATION',
            type: 'EMAIL',
            status: 'FAILED',
            triggerType: 'CASE_RECEIVED',
            recipient: 'jan@example.com',
            subject: 'Komunikat',
            body: 'Tresc',
            templateKey: 'client_confirmation',
            createdByUserId: 'user-1',
            createdByDisplayName: null,
            createdByRole: 'ADMIN',
            sentAt: null,
            errorMessage: 'Polaczenie z serwerem SMTP zostalo odrzucone.',
            metadata: null,
            createdAt: '2026-04-07T10:00:00.000Z',
            updatedAt: '2026-04-07T10:01:00.000Z',
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
        {...NEW_DELIVERY_PROPS}
        deliveryAttemptsByCommId={{ 'comm-failed': deliveryResult }}
      />,
    )

    expect(html).toContain('Blad wysylki:')
    expect(html).toContain('Polaczenie z serwerem SMTP zostalo odrzucone.')
    expect(html).toContain('SMTP_CONNECTION_ERROR')
    expect(html).toContain('Blad')
    expect(html).toContain('REAL_EMAIL')
  })
})
