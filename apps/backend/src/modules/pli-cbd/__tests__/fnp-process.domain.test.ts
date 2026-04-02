import { describe, expect, it } from 'vitest'
import { deriveFnpProcessStage, getAllowedNextMessages } from '../fnp-process.domain'

describe('fnp-process domain', () => {
  describe('getAllowedNextMessages', () => {
    it('allows E23 on active stages after process start', () => {
      expect(getAllowedNextMessages('EXPORT_PENDING')).toContain('E23')
      expect(getAllowedNextMessages('AWAITING_DONOR_E06')).toContain('E23')
      expect(getAllowedNextMessages('AWAITING_E12')).toContain('E23')
      expect(getAllowedNextMessages('AWAITING_E13')).toContain('E23')
      expect(getAllowedNextMessages('READY_TO_PORT')).toContain('E23')
    })

    it('does not allow E23 before process start or on terminal stages', () => {
      expect(getAllowedNextMessages('NOT_IN_PROCESS')).not.toContain('E23')
      expect(getAllowedNextMessages('COMPLETED')).toEqual([])
      expect(getAllowedNextMessages('REJECTED')).toEqual([])
      expect(getAllowedNextMessages('CANCELLED')).toEqual([])
      expect(getAllowedNextMessages('PROCESS_ERROR')).toEqual([])
    })
  })

  describe('deriveFnpProcessStage', () => {
    it('maps last received E23 to cancelled stage', () => {
      expect(
        deriveFnpProcessStage({
          statusInternal: 'CONFIRMED',
          pliCbdExportStatus: 'EXPORTED',
          lastExxReceived: 'E23',
        }),
      ).toBe('CANCELLED')
    })
  })
})
