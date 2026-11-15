import { describe, it, expect } from 'vitest'
import { evaluate } from './evaluate.js'
import { validateAlert } from './validateAlert.js'

const DAY = 86_400_000
const cutoffs = { watch_from: 30, act_from: 60, source: 'design value' }
const NOW = 20 * DAY

const series = (values, endTs = NOW) =>
  values.map((value, i) => ({
    timestamp: endTs - (values.length - 1 - i) * DAY,
    domain: 'isolation',
    indicator: 'sleep',
    value,
  }))

const text = {
  label: 'Sleep',
  unit: 'h',
  why: 'Sleep is {delta} {unit} below your usual.',
  action: 'Protect a full sleep period tonight.',
  source: 'design value',
}

const zRule = {
  ...text,
  bad_direction: 'low',
  bands: {
    normal: { z_min: -1 },
    watch: { z_min: -2, z_max: -1 },
    act: { z_max: -2 },
  },
}

const opts = { now: NOW, cutoffs, domain: 'isolation', indicator: 'sleep' }
// pool mean 7, sample sd 1 (values 6,8 alternating around 7 with n=10 -> sd ~1.05)
const pool = [6, 8, 6, 8, 6, 8, 6, 8, 6, 8, 7, 7, 7, 7]

describe('evaluate', () => {
  it('returns exactly the ten alert fields and passes validateAlert', () => {
    const a = evaluate(zRule, series([...pool, 7]), opts)
    expect(Object.keys(a).sort()).toEqual(
      ['action', 'baseline', 'domain', 'escalate', 'indicator', 'source', 'status', 'urgency', 'value', 'why'].sort(),
    )
    expect(validateAlert(a)).toEqual({ ok: true })
    expect(a.status).toBe('normal')
    expect(a.baseline).toBeCloseTo(7, 5)
    expect(a.escalate).toBe(false)
  })

  it('excludes the evaluated reading from the baseline', () => {
    const a = evaluate(zRule, series([...pool, 1]), opts)
    const b = evaluate(zRule, series([...pool, 7]), opts)
    expect(a.baseline).toBe(b.baseline)
    expect(a.status).toBe('act')
    expect(a.escalate).toBe(true)
    expect(a.urgency).toBeGreaterThanOrEqual(60)
  })

  it('sorts readings and uses the latest timestamp as the evaluated one', () => {
    const shuffled = series([...pool, 1]).reverse()
    expect(evaluate(zRule, shuffled, opts).value).toBe(1)
  })

  it('fills why from the template and takes action and source from the rule', () => {
    const a = evaluate(zRule, series([...pool, 5.5]), opts)
    expect(a.why).toMatch(/^Sleep is 1\.5 h below your usual\.$/)
    expect(a.why).not.toMatch(/[{}]/)
    expect(a.action).toBe(zRule.action)
    expect(a.source).toBe('design value')
  })

  it('z family: _min inclusive, _max exclusive at the -1 boundary', () => {
    // constant pool of 5 values with sd 1: 6,8,6,8,7 -> mean 7, sd sqrt(1)=... use exact values
    const p = [5, 7, 9, 6, 8] // mean 7, sd sqrt(2.5)
    const sd = Math.sqrt(2.5)
    const atEdge = evaluate(zRule, series([...p, 7 - sd]), opts) // z = -1 -> watch (z_max exclusive)
    expect(atEdge.status).toBe('watch')
    const above = evaluate(zRule, series([...p, 7 - sd + 0.01]), opts)
    expect(above.status).toBe('normal')
    const actEdge = evaluate(zRule, series([...p, 7 - 2 * sd]), opts) // z = -2 -> watch (z_min inclusive)
    expect(actEdge.status).toBe('watch')
    expect(evaluate(zRule, series([...p, 7 - 2 * sd - 0.01]), opts).status).toBe('act')
  })

  it('abs_z family uses the absolute z-score (two-sided)', () => {
    const rule = {
      ...text,
      bad_direction: 'both',
      bands: {
        normal: { abs_z_max: 1 },
        watch: { abs_z_min: 1, abs_z_max: 2 },
        act: { abs_z_min: 2 },
      },
    }
    const p = [5, 7, 9, 6, 8]
    const sd = Math.sqrt(2.5)
    expect(evaluate(rule, series([...p, 7 + 1.5 * sd]), opts).status).toBe('watch')
    expect(evaluate(rule, series([...p, 7 - 1.5 * sd]), opts).status).toBe('watch')
    expect(evaluate(rule, series([...p, 7 - 2 * sd]), opts).status).toBe('act')
  })

  it('value family compares the raw value', () => {
    const rule = {
      ...text,
      bad_direction: 'high',
      drift: { k: 0.5, h: 1e9 }, // keep drift out of this band test
      bands: {
        normal: { value_max: 10 },
        watch: { value_min: 10, value_max: 20 },
        act: { value_min: 20 },
      },
    }
    const p = [5, 5, 5, 5, 5]
    expect(evaluate(rule, series([...p, 9.99]), opts).status).toBe('normal')
    expect(evaluate(rule, series([...p, 10]), opts).status).toBe('watch')
    expect(evaluate(rule, series([...p, 20]), opts).status).toBe('act')
  })

  it('uses fallback_bands and a null baseline when the baseline is not ready', () => {
    const rule = {
      ...zRule,
      fallback_bands: {
        normal: { value_min: 6 },
        watch: { value_min: 5, value_max: 6 },
        act: { value_max: 5 },
      },
    }
    const a = evaluate(rule, series([7, 7, 7, 5.5]), opts)
    expect(a.baseline).toBeNull()
    expect(a.status).toBe('watch')
    expect(a.why).toMatch(/0\.5 h/)
    expect(evaluate(rule, series([7, 7, 4]), opts).status).toBe('act')
    expect(evaluate(rule, series([7, 7, 7]), opts).status).toBe('normal')
  })

  it('returns normal with null baseline when not ready and no fallback exists', () => {
    const a = evaluate(zRule, series([7, 7, 1]), opts)
    expect(a.baseline).toBeNull()
    expect(a.status).toBe('normal')
    expect(validateAlert(a)).toEqual({ ok: true })
  })

  it('handles sd = 0 using fallback_spread', () => {
    const rule = { ...zRule, fallback_spread: 0.5 }
    const p = [7, 7, 7, 7, 7]
    expect(evaluate(rule, series([...p, 7]), opts).status).toBe('normal')
    // z = (5.5-7)/0.5 = -3 -> act
    expect(evaluate(rule, series([...p, 5.5]), opts).status).toBe('act')
    // z = -1.5 with spread 1 -> watch
    expect(evaluate(zRule, series([...p, 5.5]), opts).status).toBe('watch')
  })

  it('raises a slow ramp inside the normal band to watch with drift text', () => {
    // Slowly falling sleep; latest z stays above -1 but CUSUM accumulates.
    const p = [7.5, 6.5, 7.4, 6.6, 7, 7.5, 6.5, 7.4, 6.6, 7]
    const ramp = [6.9, 6.85, 6.8, 6.75, 6.7]
    const rule = { ...zRule, drift: { k: 0.1, h: 0.5 } }
    const a = evaluate(rule, series([...p, ...ramp]), opts)
    expect(a.status).toBe('watch')
    expect(a.why).toMatch(/personal baseline/)
    expect(a.why).toMatch(/\d+ days/)
    expect(a.urgency).toBeGreaterThanOrEqual(30)
    expect(a.urgency).toBeLessThan(60)
    expect(a.escalate).toBe(false)
    // no drift for flat data
    const flat = [7, 7.1, 6.9, 7, 7.1, 6.9, 7, 7.1, 6.9, 7, 7]
    expect(evaluate(zRule, series(flat), opts).status).toBe('normal')
  })

  it('escalate is true exactly when urgency reaches act_from', () => {
    const p = [5, 7, 9, 6, 8]
    const a = evaluate(zRule, series([...p, 0]), opts)
    expect(a.escalate).toBe(a.urgency >= cutoffs.act_from)
    const w = evaluate(zRule, series([...p, 7 - 1.5 * Math.sqrt(2.5)]), opts)
    expect(w.status).toBe('watch')
    expect(w.escalate).toBe(false)
  })
})
