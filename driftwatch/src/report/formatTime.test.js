import { describe, it, expect } from 'vitest'
import { formatDateTime, formatDayKey } from './formatTime.js'

const at = (y, m, d, h = 0, mi = 0) => new Date(y, m, d, h, mi).getTime()

describe('formatDateTime', () => {
  it('formats a normal time', () => {
    expect(formatDateTime(at(2026, 4, 14, 15, 7))).toBe('14 May 2026, 15:07')
  })
  it('formats midnight and noon on a 24-hour clock', () => {
    expect(formatDateTime(at(2026, 0, 20, 0, 0))).toBe('20 Jan 2026, 00:00')
    expect(formatDateTime(at(2026, 0, 20, 12, 0))).toBe('20 Jan 2026, 12:00')
  })
  it('pads a single-digit day', () => {
    expect(formatDateTime(at(2026, 2, 3, 9, 5))).toBe('03 Mar 2026, 09:05')
  })
  it('handles the 31 December to 1 January edge', () => {
    expect(formatDateTime(at(2025, 11, 31, 23, 59))).toBe('31 Dec 2025, 23:59')
    expect(formatDateTime(at(2026, 0, 1, 0, 0))).toBe('01 Jan 2026, 00:00')
  })
  it('gives Unknown time for non-finite values', () => {
    for (const bad of [NaN, Infinity, -Infinity, undefined, null, '5']) expect(formatDateTime(bad)).toBe('Unknown time')
  })
})

describe('formatDayKey', () => {
  it('gives the local YYYY-MM-DD', () => {
    expect(formatDayKey(at(2026, 4, 14, 15, 7))).toBe('2026-05-14')
    expect(formatDayKey(at(2026, 0, 1, 0, 0))).toBe('2026-01-01')
    expect(formatDayKey(at(2025, 11, 31, 23, 59))).toBe('2025-12-31')
  })
  it('gives Unknown time for non-finite values', () => {
    for (const bad of [NaN, Infinity, undefined]) expect(formatDayKey(bad)).toBe('Unknown time')
  })
})
