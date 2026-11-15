import { describe, it, expect } from 'vitest'
import { computeStreak } from './streak.js'

const rec = (dayKey, module = 'environment') => ({ dayKey, module })

describe('computeStreak', () => {
  it('is 0 for an empty list', () => {
    expect(computeStreak([], '2025-03-10', 1)).toBe(0)
  })
  it('counts today only', () => {
    expect(computeStreak([rec('2025-03-10')], '2025-03-10', 1)).toBe(1)
  })
  it('keeps the streak alive through yesterday when today has no check-in', () => {
    expect(computeStreak([rec('2025-03-09'), rec('2025-03-08')], '2025-03-10', 1)).toBe(2)
  })
  it('is 0 when the last check-in was two days ago', () => {
    expect(computeStreak([rec('2025-03-08')], '2025-03-10', 1)).toBe(0)
  })
  it('ends at a gap', () => {
    const r = [rec('2025-03-10'), rec('2025-03-09'), rec('2025-03-07'), rec('2025-03-06')]
    expect(computeStreak(r, '2025-03-10', 1)).toBe(2)
  })
  it('counts duplicates once', () => {
    expect(computeStreak([rec('2025-03-10'), rec('2025-03-10'), rec('2025-03-10', 'gravity')], '2025-03-10', 1)).toBe(1)
  })
  it('needs minModules distinct modules per day', () => {
    const r = [rec('2025-03-10'), rec('2025-03-10', 'gravity'), rec('2025-03-09'), rec('2025-03-09')]
    expect(computeStreak(r, '2025-03-10', 2)).toBe(1)
    expect(computeStreak(r, '2025-03-10', 1)).toBe(2)
  })
  it('ignores a record after today', () => {
    expect(computeStreak([rec('2025-03-11'), rec('2025-03-10')], '2025-03-10', 1)).toBe(1)
    expect(computeStreak([rec('2025-03-11')], '2025-03-10', 1)).toBe(0)
  })
  it('does not depend on input order', () => {
    const r = [rec('2025-03-08'), rec('2025-03-10'), rec('2025-03-09')]
    expect(computeStreak(r, '2025-03-10', 1)).toBe(3)
    expect(computeStreak([...r].reverse(), '2025-03-10', 1)).toBe(3)
  })
  it('crosses a month boundary', () => {
    expect(computeStreak([rec('2025-03-01'), rec('2025-02-28')], '2025-03-01', 1)).toBe(2)
  })
})