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
    createdAt: '2026-04-09T10:00:00.000Z',
    ...overrides,
  }
}

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
            })}
            onClick={() => undefined}
            formatDate={() => '09.04.2026'}
          />
        </tbody>
      </table>,
    )

    expect(html).toContain('Anna Handlowa (sales-1@np-manager.local)')
    expect(html).toContain('Blad')
  })

  it('shows missing owner and healthy notification badge', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow request={makeRequest()} onClick={() => undefined} formatDate={() => '09.04.2026'} />
        </tbody>
      </table>,
    )

    expect(html).toContain('Brak opiekuna')
    expect(html).toContain('OK')
  })
})
