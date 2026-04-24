// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NotificationHealthDiagnosticsDto } from '@np-manager/shared'
import type { PortingUrgency } from '@/lib/portingUrgency'
import { RequestAttentionStrip, RequestCaseHero } from './RequestCommandCenter'

const HEALTH_OK: NotificationHealthDiagnosticsDto = {
  status: 'OK',
  failureCount: 0,
  failedCount: 0,
  misconfiguredCount: 0,
  lastFailureAt: null,
  lastFailureOutcome: null,
}

const HEALTH_FAILED: NotificationHealthDiagnosticsDto = {
  status: 'FAILED',
  failureCount: 2,
  failedCount: 2,
  misconfiguredCount: 0,
  lastFailureAt: '2026-04-24T08:00:00.000Z',
  lastFailureOutcome: 'FAILED',
}

const URGENCY: PortingUrgency = {
  level: 'TODAY',
  label: 'Dzis',
  tone: 'red',
  emphasized: true,
  daysDiff: 0,
}

const BASE_REQUEST = {
  caseNumber: 'NP-2026-0007',
  client: {
    id: 'client-1',
    clientType: 'BUSINESS' as const,
    displayName: 'Acme Sp. z o.o.',
  },
  numberDisplay: '500123456',
  subscriberDisplayName: 'Acme Sp. z o.o.',
  donorOperator: {
    id: 'op-1',
    name: 'Operator Dawca',
    shortName: 'DAW',
    routingNumber: '100',
  },
  recipientOperator: {
    id: 'op-2',
    name: 'Operator Biorca',
    shortName: 'BIO',
    routingNumber: '200',
  },
  portingMode: 'DAY' as const,
  confirmedPortDate: '2026-04-24',
  requestedPortDate: '2026-04-24',
  donorAssignedPortDate: null,
  donorAssignedPortTime: null,
  statusInternal: 'SUBMITTED' as const,
  assignedUser: {
    id: 'user-1',
    email: 'anna.bok@example.com',
    displayName: 'Anna BOK',
    role: 'BOK_CONSULTANT' as const,
  },
  commercialOwner: {
    id: 'sales-1',
    email: 'sales@example.com',
    displayName: 'Jan Sales',
    role: 'SALES' as const,
  },
  notificationHealth: HEALTH_OK,
}

describe('RequestCommandCenter', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders case hero with case number, client, number, routing and owners', () => {
    render(
      <MemoryRouter>
        <RequestCaseHero
          request={BASE_REQUEST}
          urgency={URGENCY}
          copyLinkDone={false}
          onBackToList={vi.fn()}
          onCopyLink={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('NP-2026-0007')).toBeDefined()
    expect(screen.getAllByText('Acme Sp. z o.o.').length).toBeGreaterThan(0)
    expect(screen.getByText('500123456')).toBeDefined()
    expect(screen.getByText(/Operator Dawca/)).toBeDefined()
    expect(screen.getByText('Anna BOK')).toBeDefined()
    expect(screen.getByText('Jan Sales')).toBeDefined()
  })

  it('prioritizes the first three attention signals and wires alert actions', () => {
    const onScrollToNotifications = vi.fn()

    render(
      <RequestAttentionStrip
        request={{
          ...BASE_REQUEST,
          statusInternal: 'ERROR',
          assignedUser: null,
          confirmedPortDate: null,
          notificationHealth: HEALTH_FAILED,
        }}
        canManageAssignment
        canManageStatus
        workflowErrorMessage="Sprawdz panel akcji statusu."
        onScrollToAssignment={vi.fn()}
        onScrollToNotifications={onScrollToNotifications}
        onScrollToPortingDates={vi.fn()}
        onScrollToStatusActions={vi.fn()}
      />,
    )

    expect(screen.getByText('Sprawa jest w stanie bledu')).toBeDefined()
    expect(screen.getByText('Problemy z notyfikacjami wewnetrznymi')).toBeDefined()
    expect(screen.getByText('Brak przypisania BOK')).toBeDefined()
    expect(screen.queryByText('Brak potwierdzonej daty przeniesienia')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Sprawdz notyfikacje' }))
    expect(onScrollToNotifications).toHaveBeenCalledTimes(1)
  })
})
