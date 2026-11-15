import { describe, it, expect } from 'vitest'
import { statusFromUrgency, statusRank, urgency } from './urgency.js'

const cutoffs = { watch_from: 30, act_from: 60, source: 'design value' }

describe('statusFromUrgency', () => {
  it('maps boundaries', () => {
    expect(statusFromUrgency(0, cutoffs)).toBe('normal')
    expect(statusFromUrgency(29, cutoffs)).toBe('normal')
    expect(statusFromUrgency(30, cutoffs)).toBe('watch')
    expect(statusFromUrgency(59, cutoffs)).toBe('watch')
    expect(statusFromUrgency(60, cutoffs)).toBe('act')
    expect(statusFromUrgency(100, cutoffs)).toBe('act')
  })
})

describe('statusRank', () => {
  it('ranks statuses', () => {
    expect(statusRank('normal')).toBe(0)
    expect(statusRank('watch')).toBe(1)
    expect(statusRank('act')).toBe(2)
  })
})

describe('urgency', () => {
  const a = (status) => ({ status })

  it('hits the floor and ceiling of each status', () => {
    expect(urgency(a('normal'), { severity: 0, cutoffs })).toBe(0)
    expect(urgency(a('normal'), { severity: 1, cutoffs })).toBe(29)
    expect(urgency(a('watch'), { severity: 0, cutoffs })).toBe(30)
    expect(urgency(a('watch'), { severity: 1, cutoffs })).toBe(59)
    expect(urgency(a('act'), { severity: 0, cutoffs })).toBe(60)
    expect(urgency(a('act'), { severity: 1, cutoffs })).toBe(100)
  })

  it('defaults severity to 0 and clamps it', () => {
    expect(urgency(a('watch'), { cutoffs })).toBe(30)
    expect(urgency(a('watch'), { severity: -5, cutoffs })).toBe(30)
    expect(urgency(a('watch'), { severity: 5, cutoffs })).toBe(59)
  })

  it('treats non-finite severity as 0', () => {
    for (const s of [NaN, Infinity, -Infinity, undefined]) {
      expect(urgency(a('act'), { severity: s, cutoffs })).toBe(60)
    }
  })

  it('rounds', () => {
    expect(urgency(a('act'), { severity: 0.5, cutoffs })).toBe(80)
    expect(urgency(a('watch'), { severity: 0.5, cutoffs })).toBe(45)
  })

  it('round-trips status for many severities', () => {
    for (const status of ['normal', 'watch', 'act']) {
      for (let i = 0; i <= 100; i++) {
        const alert = { status }
        const u = urgency(alert, { severity: i / 100, cutoffs })
        expect(u).toBeGreaterThanOrEqual(0)
        expect(u).toBeLessThanOrEqual(100)
        expect(statusFromUrgency(u, cutoffs)).toBe(alert.status)
      }
    }
  })
})
