import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { PortingRequestListItemDto } from '@np-manager/shared'
import { RequestRow } from './RequestsPage'

function makeRequest(overrides: Partial<PortingRequestListItemDto> = {}): PortingRequestListItemDto {
  return {
    id: 'request-1',
    caseNumber: 'FNP-20260409-ABC123',
    clientId: 'client-1',
    clientDisplayName: 'Jan Kowalski',
    numberDisplay: '221234567',
    donorOperatorId: 'operator-1',
    donorOperatorName: 'Orange Polska',
    portingMode: 'DAY',
    statusInternal: 'SUBMITTED',
    assignedUserSummary: null,
    commercialOwnerSummary: null,
    hasNotificationFailures: false,
    notificationHealthStatus: 'OK',
    notificationFailureCount: 0,
    notificationLastFailureAt: null,
    notificationLastFailureOutcome: null,
    createdAt: '2026-04-09T10:00:00.000Z',
    ...overrides,
  }
}

const noop = async () => {}

describe('RequestRow', () => {
  it('shows commercial owner and failure signal badge', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest({
              commercialOwnerSummary: {
                id: 'sales-1',
                email: 'sales-1@np-manager.local',
                displayName: 'Anna Handlowa',
                role: 'SALES',
              },
              hasNotificationFailures: true,
              notificationHealthStatus: 'FAILED',
              notificationFailureCount: 3,
              notificationLastFailureAt: '2026-04-09T10:00:00.000Z',
              notificationLastFailureOutcome: 'FAILED',
            })}
            onClick={() => undefined}
            formatDate={() => '09.04.2026'}
            currentUserId={null}
            canAssign={false}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).toContain('Anna Handlowa (sales-1@np-manager.local)')
    expect(html).toContain('Blad wysylki')
    expect(html).toContain('3 bledow')
  })

  it('shows missing owner and healthy notification badge', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest()}
            onClick={() => undefined}
            formatDate={() => '09.04.2026'}
            currentUserId={null}
            canAssign={false}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).toContain('Brak opiekuna')
    expect(html).toContain('OK')
  })

  it('renders Kopiuj numer button for all users', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest()}
            onClick={() => undefined}
            formatDate={() => '09.04.2026'}
            currentUserId={null}
            canAssign={false}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).toContain('Kopiuj numer')
  })

  it('renders Przypisz do mnie for eligible user when not yet assigned', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest({ assignedUserSummary: null })}
            onClick={() => undefined}
            formatDate={() => '09.04.2026'}
            currentUserId="bok-1"
            canAssign={true}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).toContain('Przypisz do mnie')
  })

  it('hides Przypisz do mnie when already assigned to current user', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest({
              assignedUserSummary: {
                id: 'bok-1',
                email: 'bok@np-manager.local',
                displayName: 'BOK Uzytkownik',
                role: 'BOK_CONSULTANT',
              },
            })}
            onClick={() => undefined}
            formatDate={() => '09.04.2026'}
            currentUserId="bok-1"
            canAssign={true}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).not.toContain('Przypisz do mnie')
  })

  it('hides Przypisz do mnie for user without assignment rights', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest({ assignedUserSummary: null })}
            onClick={() => undefined}
            formatDate={() => '09.04.2026'}
            currentUserId="sales-1"
            canAssign={false}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).not.toContain('Przypisz do mnie')
  })

  it('shows Przypisz do mnie for different user assigned (not mine)', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest({
              assignedUserSummary: {
                id: 'other-bok',
                email: 'other@np-manager.local',
                displayName: 'Inny BOK',
                role: 'BOK_CONSULTANT',
              },
            })}
            onClick={() => undefined}
            formatDate={() => '09.04.2026'}
            currentUserId="bok-1"
            canAssign={true}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).toContain('Przypisz do mnie')
  })

  it('shows amber styling for unassigned BOK', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest({ assignedUserSummary: null })}
            onClick={() => undefined}
            formatDate={() => '09.04.2026'}
            currentUserId={null}
            canAssign={false}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).toContain('text-amber-700')
    expect(html).toContain('Nieprzypisana')
  })

  it('shows normal ink styling for assigned BOK', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest({
              assignedUserSummary: {
                id: 'bok-1',
                email: 'bok@np-manager.local',
                displayName: 'BOK Uzytkownik',
                role: 'BOK_CONSULTANT',
              },
            })}
            onClick={() => undefined}
            formatDate={() => '09.04.2026'}
            currentUserId={null}
            canAssign={false}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).toContain('text-ink-700')
    expect(html).not.toContain('text-amber-700')
  })
})
