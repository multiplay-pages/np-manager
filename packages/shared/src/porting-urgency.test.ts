import { describe, expect, it } from 'vitest'
import {
  getPortingWorkPriorityBucket,
  getPortingWorkPriorityRank,
  PORTING_WORK_PRIORITY_ORDER,
} from './porting-urgency'

const NOW = new Date('2026-04-22T09:00:00.000Z')

describe('getPortingWorkPriorityBucket', () => {
  it('maps urgency levels to buckets, treating NONE as NO_DATE', () => {
    expect(getPortingWorkPriorityBucket(null, NOW)).toBe('NO_DATE')
    expect(getPortingWorkPriorityBucket(undefined, NOW)).toBe('NO_DATE')
    expect(getPortingWorkPriorityBucket('2026-04-20', NOW)).toBe('OVERDUE')
    expect(getPortingWorkPriorityBucket('2026-04-22', NOW)).toBe('TODAY')
    expect(getPortingWorkPriorityBucket('2026-04-23', NOW)).toBe('TOMORROW')
    expect(getPortingWorkPriorityBucket('2026-04-26', NOW)).toBe('THIS_WEEK')
    expect(getPortingWorkPriorityBucket('2026-05-04', NOW)).toBe('LATER')
  })

  it('orders buckets so that NO_DATE sits between THIS_WEEK and LATER', () => {
    const order = PORTING_WORK_PRIORITY_ORDER
    expect(order.ERROR).toBeLessThan(order.OVERDUE)
    expect(order.OVERDUE).toBeLessThan(order.TODAY)
    expect(order.TODAY).toBeLessThan(order.TOMORROW)
    expect(order.TOMORROW).toBeLessThan(order.THIS_WEEK)
    expect(order.THIS_WEEK).toBeLessThan(order.NO_DATE)
    expect(order.NO_DATE).toBeLessThan(order.LATER)
  })

  it('getPortingWorkPriorityRank returns the numeric priority key', () => {
    expect(getPortingWorkPriorityRank('2026-04-20', NOW)).toBe(2)
    expect(getPortingWorkPriorityRank('2026-04-22', NOW)).toBe(3)
    expect(getPortingWorkPriorityRank(null, NOW)).toBe(6)
    expect(getPortingWorkPriorityRank('2026-06-01', NOW)).toBe(7)
  })

  it('treats process ERROR as the top work-priority bucket regardless of date', () => {
    expect(getPortingWorkPriorityBucket(null, NOW, 'ERROR')).toBe('ERROR')
    expect(getPortingWorkPriorityBucket('2026-04-20', NOW, 'ERROR')).toBe('ERROR')
    expect(getPortingWorkPriorityRank(null, NOW, 'ERROR')).toBe(1)
    expect(getPortingWorkPriorityRank('2026-04-20', NOW, 'PORTED')).toBe(2)
  })
})
