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
  contactChannel: 'EMAIL' as const,
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

    // Primary hero: number as h1, client as prominent subtitle
    const heroNumber = screen.getByTestId('hero-number')
    expect(heroNumber.tagName).toBe('H1')
    expect(heroNumber.textContent).toBe('500123456')

    const heroClient = screen.getByTestId('hero-client')
    expect(heroClient.textContent).toBe('Acme Sp. z o.o.')

    // Meta line: caseNumber + operator route still visible
    const heroMeta = screen.getByTestId('hero-meta')
    expect(heroMeta.textContent).toContain('NP-2026-0007')
    expect(heroMeta.textContent).toContain('Operator Dawca')

    // Mode badge visible (DAY label appears in badges and in Portowanie group)
    expect(screen.getAllByText(/DAY/).length).toBeGreaterThan(0)

    // Owners in groups below
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

  it('DRAFT without confirmedPortDate does not show missing-port-date attention banner', () => {
    render(
      <RequestAttentionStrip
        request={{
          ...BASE_REQUEST,
          statusInternal: 'DRAFT' as const,
          confirmedPortDate: null,
          assignedUser: null,
        }}
        canManageAssignment
        canManageStatus
        workflowErrorMessage=""
        onScrollToAssignment={vi.fn()}
        onScrollToNotifications={vi.fn()}
        onScrollToPortingDates={vi.fn()}
        onScrollToStatusActions={vi.fn()}
      />,
    )

    expect(screen.queryByText('Brak potwierdzonej daty przeniesienia')).toBeNull()
  })

  it('SUBMITTED without confirmedPortDate shows missing-port-date attention banner', () => {
    render(
      <RequestAttentionStrip
        request={{
          ...BASE_REQUEST,
          statusInternal: 'SUBMITTED' as const,
          confirmedPortDate: null,
        }}
        canManageAssignment={false}
        canManageStatus
        workflowErrorMessage=""
        onScrollToAssignment={vi.fn()}
        onScrollToNotifications={vi.fn()}
        onScrollToPortingDates={vi.fn()}
        onScrollToStatusActions={vi.fn()}
      />,
    )

    expect(screen.getByText('Brak potwierdzonej daty przeniesienia')).toBeDefined()
  })

  it('hero-number has large font and mode chip shows "Tryb: DAY"', () => {
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

    const heroNumber = screen.getByTestId('hero-number')
    expect(heroNumber.className).toContain('text-4xl')

    expect(screen.getByText('Tryb: DAY')).toBeDefined()
  })

  it('keeps New request CTA available from the case detail hero', () => {
    render(
      <MemoryRouter>
        <RequestCaseHero
          request={{ ...BASE_REQUEST, statusInternal: 'CANCELLED' as const }}
          urgency={URGENCY}
          copyLinkDone={false}
          onBackToList={vi.fn()}
          onCopyLink={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /\+ Nowa sprawa/ }).getAttribute('href')).toBe(
      '/requests/new',
    )
  })

  it('PORTED with past date: urgency shows emerald not red Po terminie', () => {
    const portedUrgency: PortingUrgency = {
      level: 'LATER',
      label: 'Zakonczona',
      tone: 'emerald',
      emphasized: false,
      daysDiff: -5,
    }

    render(
      <MemoryRouter>
        <RequestCaseHero
          request={{ ...BASE_REQUEST, statusInternal: 'PORTED' as const }}
          urgency={portedUrgency}
          copyLinkDone={false}
          onBackToList={vi.fn()}
          onCopyLink={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.queryByText(/Po terminie/)).toBeNull()
    expect(screen.getByText(/Zakonczona/)).toBeDefined()
  })
})
