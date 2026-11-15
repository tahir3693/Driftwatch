import { describe, it, expect } from 'vitest'
import { dayKeyOf, dayBounds, shiftDayKey } from './dayKey.js'

const localTs = (y, m, d, h = 0, mi = 0, s = 0, ms = 0) => new Date(y, m - 1, d, h, mi, s, ms).getTime()

describe('dayKeyOf', () => {
  it('formats the local date of a known timestamp', () => {
    expect(dayKeyOf(localTs(2025, 3, 7, 13, 30))).toBe('2025-03-07')
  })
  it('switches day at local midnight', () => {
    expect(dayKeyOf(localTs(2025, 3, 7, 23, 59, 59, 999))).toBe('2025-03-07')
    expect(dayKeyOf(localTs(2025, 3, 8, 0, 0, 0, 0))).toBe('2025-03-08')
  })
})

describe('dayBounds', () => {
  it('has the start inclusive and the end exclusive', () => {
    const { start, end } = dayBounds('2025-03-07')
    expect(start).toBe(localTs(2025, 3, 7))
    expect(end).toBe(localTs(2025, 3, 8))
    expect(dayKeyOf(start)).toBe('2025-03-07')
    expect(dayKeyOf(end - 1)).toBe('2025-03-07')
    expect(dayKeyOf(end)).toBe('2025-03-08')
  })
  it('makes consecutive days contiguous and each 23 to 25 hours long, whatever the time zone', () => {
    let key = '2025-01-01'
    for (let i = 0; i < 400; i++) {
      const b = dayBounds(key)
      const next = dayBounds(shiftDayKey(key, 1))
      expect(b.end).toBe(next.start)
      const hours = (b.end - b.start) / 3_600_000
      expect(hours).toBeGreaterThanOrEqual(23)
      expect(hours).toBeLessThanOrEqual(25)
      key = shiftDayKey(key, 1)
    }
  })
  it('throws on a malformed day key', () => {
    expect(() => dayBounds('2025-3-7')).toThrow()
    expect(() => shiftDayKey('nope', 1)).toThrow()
  })
})

describe('shiftDayKey', () => {
  it('rolls over months and years', () => {
    expect(shiftDayKey('2025-01-31', 1)).toBe('2025-02-01')
    expect(shiftDayKey('2025-12-31', 1)).toBe('2026-01-01')
    expect(shiftDayKey('2024-02-28', 1)).toBe('2024-02-29')
    expect(shiftDayKey('2025-02-28', 1)).toBe('2025-03-01')
  })
  it('accepts negative shifts and zero', () => {
    expect(shiftDayKey('2025-01-01', -1)).toBe('2024-12-31')
    expect(shiftDayKey('2025-03-01', -1)).toBe('2025-02-28')
    expect(shiftDayKey('2025-03-07', 0)).toBe('2025-03-07')
  })
  it('counts a daylight-saving day as one day', () => {
    // 2025-03-09 and 2025-11-02 are the US changeover days; the key arithmetic is calendar-based.
    expect(shiftDayKey('2025-03-08', 1)).toBe('2025-03-09')
    expect(shiftDayKey('2025-03-09', 1)).toBe('2025-03-10')
    expect(shiftDayKey('2025-11-01', 2)).toBe('2025-11-03')
  })
})