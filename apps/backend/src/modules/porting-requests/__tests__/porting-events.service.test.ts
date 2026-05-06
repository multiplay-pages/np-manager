import { describe, expect, it } from 'vitest'
import { mapEventToTimelineItem, mapStatusHistoryToTimelineItem } from '../porting-events.service'

describe('porting-events timeline mapping', () => {
  describe('mapEventToTimelineItem', () => {
    const baseEvent = {
      id: 'evt-1',
      requestId: 'req-1',
      eventSource: 'INTERNAL' as const,
      eventType: 'REQUEST_CREATED' as const,
      exxType: null,
      title: 'Utworzono sprawe FNP-20260401-ABC123',
      description: 'Sprawa portowania zostala utworzona w systemie.',
      statusBefore: null,
      statusAfter: null,
      statusCode: null,
      technicalCode: null,
      payloadSummary: null,
      createdByUserId: 'user-1',
      occurredAt: new Date('2026-04-01T10:00:00.000Z'),
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
      createdBy: { firstName: 'Jan', lastName: 'Kowalski' },
    }

    it('maps INTERNAL event to SYSTEM_EVENT kind', () => {
      const result = mapEventToTimelineItem(baseEvent)
      expect(result.kind).toBe('SYSTEM_EVENT')
      expect(result.badge).toBe('REQUEST_CREATED')
    })

    it('maps PLI_CBD event to PLI_EVENT kind', () => {
      const result = mapEventToTimelineItem({
        ...baseEvent,
        eventSource: 'PLI_CBD',
        eventType: 'PLI_MESSAGE_RECEIVED',
      })

      expect(result.kind).toBe('PLI_EVENT')
      expect(result.badge).toBe('PLI_MESSAGE_RECEIVED')
    })

    it('maps status labels for statusBefore/statusAfter', () => {
      const result = mapEventToTimelineItem({
        ...baseEvent,
        statusBefore: 'DRAFT',
        statusAfter: 'SUBMITTED',
      })

      expect(result.statusBefore).toBe('Szkic')
      expect(result.statusAfter).toBe('Złożona')
    })
  })

  describe('mapStatusHistoryToTimelineItem', () => {
    const baseStatusEntry = {
      id: 'hist-1',
      eventType: 'STATUS_CHANGED' as const,
      occurredAt: new Date('2026-04-01T11:00:00.000Z'),
      reason: 'Brak odpowiedzi dawcy',
      comment: 'Escalacja do back office',
      statusBefore: 'SUBMITTED',
      statusAfter: 'PENDING_DONOR',
      actor: { firstName: 'Anna', lastName: 'Nowak' },
    }

    it('maps status history to STATUS kind', () => {
      const result = mapStatusHistoryToTimelineItem(baseStatusEntry)
      expect(result.kind).toBe('STATUS')
      expect(result.badge).toBe('PENDING_DONOR')
      expect(result.statusBefore).toBe('Złożona')
      expect(result.statusAfter).toBe('Oczekuje na dawcę')
    })

    it('joins reason and comment in description', () => {
      const result = mapStatusHistoryToTimelineItem(baseStatusEntry)
      expect(result.description).toBe('Brak odpowiedzi dawcy\nEscalacja do back office')
    })

    it('maps request-created entry to generic title', () => {
      const result = mapStatusHistoryToTimelineItem({
        ...baseStatusEntry,
        eventType: 'REQUEST_CREATED',
        reason: null,
        comment: null,
        statusBefore: null,
        statusAfter: 'DRAFT',
      })

      expect(result.title).toBe('Utworzono sprawe')
      expect(result.statusAfter).toBe('Szkic')
    })
  })
})
