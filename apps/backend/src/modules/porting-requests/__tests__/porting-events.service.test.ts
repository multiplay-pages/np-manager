import { describe, it, expect } from 'vitest'
import {
  mapEventToTimelineItem,
  mapStatusHistoryToTimelineItem,
} from '../porting-events.service'

describe('porting-events timeline mapping', () => {
  // ============================================================
  // mapEventToTimelineItem
  // ============================================================

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
      expect(result.id).toBe('evt-1')
      expect(result.title).toBe('Utworzono sprawe FNP-20260401-ABC123')
      expect(result.badge).toBe('REQUEST_CREATED')
      expect(result.authorDisplayName).toBe('Jan Kowalski')
      expect(result.timestamp).toBe('2026-04-01T10:00:00.000Z')
    })

    it('maps PLI_CBD event to PLI_EVENT kind', () => {
      const pliEvent = { ...baseEvent, eventSource: 'PLI_CBD' as const, eventType: 'PLI_MESSAGE_RECEIVED' as const }
      const result = mapEventToTimelineItem(pliEvent)
      expect(result.kind).toBe('PLI_EVENT')
      expect(result.badge).toBe('PLI_MESSAGE_RECEIVED')
    })

    it('maps SYSTEM event to SYSTEM_EVENT kind', () => {
      const sysEvent = { ...baseEvent, eventSource: 'SYSTEM' as const, eventType: 'PLI_EXPORT_STATE_UPDATED' as const }
      const result = mapEventToTimelineItem(sysEvent)
      expect(result.kind).toBe('SYSTEM_EVENT')
    })

    it('returns null authorDisplayName when createdBy is null', () => {
      const noAuthor = { ...baseEvent, createdBy: null }
      const result = mapEventToTimelineItem(noAuthor)
      expect(result.authorDisplayName).toBeNull()
    })

    it('passes exxType and statusCode through', () => {
      const withExx = { ...baseEvent, exxType: 'E03', statusCode: '200' }
      const result = mapEventToTimelineItem(withExx)
      expect(result.exxType).toBe('E03')
      expect(result.statusCode).toBe('200')
    })

    it('passes statusBefore and statusAfter through', () => {
      const withStatus = { ...baseEvent, statusBefore: 'DRAFT', statusAfter: 'SUBMITTED' }
      const result = mapEventToTimelineItem(withStatus)
      expect(result.statusBefore).toBe('DRAFT')
      expect(result.statusAfter).toBe('SUBMITTED')
    })
  })

  // ============================================================
  // mapStatusHistoryToTimelineItem
  // ============================================================

  describe('mapStatusHistoryToTimelineItem', () => {
    const baseStatusEntry = {
      id: 'sh-1',
      changedAt: new Date('2026-04-01T11:00:00.000Z'),
      comment: 'Zmiana automatyczna',
      status: { code: 'SUBMITTED', name: 'Zlozona' },
      changedBy: { firstName: 'Anna', lastName: 'Nowak' },
    }

    it('maps to STATUS kind', () => {
      const result = mapStatusHistoryToTimelineItem(baseStatusEntry, null)
      expect(result.kind).toBe('STATUS')
      expect(result.id).toBe('sh-1')
      expect(result.timestamp).toBe('2026-04-01T11:00:00.000Z')
    })

    it('creates readable title with status label', () => {
      const result = mapStatusHistoryToTimelineItem(baseStatusEntry, null)
      expect(result.title).toBe('Zmiana statusu na: Zlozona')
    })

    it('uses PORTING_CASE_STATUS_LABELS when available', () => {
      const draft = {
        ...baseStatusEntry,
        status: { code: 'DRAFT', name: 'Draft' },
      }
      const result = mapStatusHistoryToTimelineItem(draft, null)
      expect(result.title).toBe('Zmiana statusu na: Szkic')
      expect(result.statusAfter).toBe('Szkic')
    })

    it('sets badge to status code', () => {
      const result = mapStatusHistoryToTimelineItem(baseStatusEntry, null)
      expect(result.badge).toBe('SUBMITTED')
    })

    it('sets statusBefore from previousStatusCode', () => {
      const result = mapStatusHistoryToTimelineItem(baseStatusEntry, 'DRAFT')
      expect(result.statusBefore).toBe('Szkic')
      expect(result.statusAfter).toBe('Zlozona')
    })

    it('sets statusBefore to null when no previous', () => {
      const result = mapStatusHistoryToTimelineItem(baseStatusEntry, null)
      expect(result.statusBefore).toBeNull()
    })

    it('maps authorDisplayName from changedBy', () => {
      const result = mapStatusHistoryToTimelineItem(baseStatusEntry, null)
      expect(result.authorDisplayName).toBe('Anna Nowak')
    })

    it('passes comment as description', () => {
      const result = mapStatusHistoryToTimelineItem(baseStatusEntry, null)
      expect(result.description).toBe('Zmiana automatyczna')
    })

    it('sets exxType and statusCode to null', () => {
      const result = mapStatusHistoryToTimelineItem(baseStatusEntry, null)
      expect(result.exxType).toBeNull()
      expect(result.statusCode).toBeNull()
    })

    it('uses raw code when label not found in PORTING_CASE_STATUS_LABELS', () => {
      const unknownStatus = {
        ...baseStatusEntry,
        status: { code: 'CUSTOM_STATUS', name: 'Custom' },
      }
      const result = mapStatusHistoryToTimelineItem(unknownStatus, 'UNKNOWN_PREV')
      expect(result.statusAfter).toBe('Custom')
      expect(result.statusBefore).toBe('UNKNOWN_PREV')
    })
  })

  // ============================================================
  // Sorting (simulated)
  // ============================================================

  describe('timeline sorting', () => {
    it('items sort descending by timestamp', () => {
      const items = [
        { timestamp: '2026-04-01T10:00:00.000Z', title: 'first' },
        { timestamp: '2026-04-01T12:00:00.000Z', title: 'third' },
        { timestamp: '2026-04-01T11:00:00.000Z', title: 'second' },
      ]

      const sorted = [...items].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )

      expect(sorted[0].title).toBe('third')
      expect(sorted[1].title).toBe('second')
      expect(sorted[2].title).toBe('first')
    })
  })
})
