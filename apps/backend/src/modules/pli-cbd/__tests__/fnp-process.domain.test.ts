import { describe, expect, it } from 'vitest'
import { deriveFnpProcessStage, getAllowedNextMessages } from '../fnp-process.domain'

describe('fnp-process domain', () => {
  describe('getAllowedNextMessages', () => {
    it('allows E12 only on awaiting E12 stage', () => {
      expect(getAllowedNextMessages('AWAITING_E12')).toContain('E12')
      expect(getAllowedNextMessages('NOT_IN_PROCESS')).not.toContain('E12')
      expect(getAllowedNextMessages('EXPORT_PENDING')).not.toContain('E12')
      expect(getAllowedNextMessages('AWAITING_DONOR_E06')).not.toContain('E12')
      expect(getAllowedNextMessages('AWAITING_E13')).not.toContain('E12')
      expect(getAllowedNextMessages('READY_TO_PORT')).not.toContain('E12')
    })

    it('allows E18 only on ready to port stage', () => {
      expect(getAllowedNextMessages('READY_TO_PORT')).toContain('E18')
      expect(getAllowedNextMessages('AWAITING_E13')).not.toContain('E18')
      expect(getAllowedNextMessages('COMPLETED')).not.toContain('E18')
    })
  })

  describe('deriveFnpProcessStage', () => {
    it('maps donor E06 on pending donor status to awaiting E12 stage', () => {
      expect(
        deriveFnpProcessStage({
          statusInternal: 'PENDING_DONOR',
          pliCbdExportStatus: 'EXPORTED',
          lastExxReceived: 'E06',
        }),
      ).toBe('AWAITING_E12')
    })

    it('keeps ported request with last donor confirmation on ready to port stage for E18', () => {
      expect(
        deriveFnpProcessStage({
          statusInternal: 'PORTED',
          pliCbdExportStatus: 'EXPORTED',
          lastExxReceived: 'E13',
        }),
      ).toBe('READY_TO_PORT')
    })

    it('maps ported request with sent E18 to completed stage', () => {
      expect(
        deriveFnpProcessStage({
          statusInternal: 'PORTED',
          pliCbdExportStatus: 'EXPORTED',
          lastExxReceived: 'E18',
        }),
      ).toBe('COMPLETED')
    })
  })
})
