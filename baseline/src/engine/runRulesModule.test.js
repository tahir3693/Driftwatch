import { describe, it, expect } from 'vitest'
import { runRulesModule } from './runRulesModule.js'
import { validateAlert } from './validateAlert.js'

const DAY = 86_400_000
const NOW = 100 * DAY
const cutoffs = { watch_from: 30, act_from: 60, source: 'design value' }

const ind = (label) => ({
  label,
  unit: 'u',
  bad_direction: 'high',
  baseline_days: 14,
  bands: {
    normal: { value_max: 10 },
    watch: { value_min: 10, value_max: 20 },
    act: { value_min: 20 },
  },
  why: `${label} is {delta} {unit} off.`,
  action: `Check ${label}.`,
  howToMeasure: 'm',
  whyItMatters: 'w',
  source: 'design value',
})

const rules = {
  module: 'test',
  indicators: { a: ind('A'), b: ind('B') },
  patterns: {
    combo: {
      needs: ['a', 'b'],
      min_in_watch: 2,
      for_days: 2,
      result: 'act',
      escalate: true,
      why: 'Both are off.',
      action: 'Escalate.',
      source: 'design value',
    },
  },
}

const series = (value, days = 6) =>
  Array.from({ length: days }, (_, i) => ({
    timestamp: NOW - (days - 1 - i) * DAY,
    domain: 'environment',
    indicator: 'x',
    value,
  }))

const mod = { name: 'test', domain: 'environment', rules }

describe('runRulesModule', () => {
  it('returns one alert per indicator plus the overall alert, all valid', () => {
    const out = runRulesModule(mod, { a: series(1), b: series(1) }, { cutoffs, now: NOW })
    expect(out.map((a) => a.indicator)).toEqual(['a', 'b', 'environment_overall'])
    for (const a of out) expect(validateAlert(a)).toEqual({ ok: true })
    const overall = out[2]
    expect(overall).toMatchObject({
      domain: 'environment',
      status: 'normal',
      urgency: 0,
      escalate: false,
      value: 0,
      baseline: null,
      source: 'design value',
    })
  })

  it('handles an indicator with no readings as a normal alert', () => {
    const out = runRulesModule(mod, { a: series(1) }, { cutoffs, now: NOW })
    const b = out.find((x) => x.indicator === 'b')
    expect(b).toMatchObject({ status: 'normal', urgency: 0, value: null, baseline: null })
    expect(validateAlert(b)).toEqual({ ok: true })
  })

  it('raises overall status when a pattern is higher than every indicator', () => {
    // 6 baseline days, then two watch-level days (today and yesterday)
    const base = Array.from({ length: 6 }, (_, i) => ({
      timestamp: NOW - (7 - i) * DAY,
      domain: 'environment',
      indicator: 'x',
      value: 1,
    }))
    const recent = [1, 0].map((i) => ({
      timestamp: NOW - i * DAY,
      domain: 'environment',
      indicator: 'x',
      value: 12,
    }))
    const readings = [...base, ...recent]
    const out = runRulesModule(mod, { a: readings, b: readings }, { cutoffs, now: NOW })
    const [a, b, pattern, overall] = out
    expect(a.status).toBe('watch')
    expect(b.status).toBe('watch')
    expect(pattern.indicator).toBe('combo')
    expect(pattern.status).toBe('act')
    expect(overall.indicator).toBe('environment_overall')
    expect(overall.status).toBe('act')
    expect(overall.urgency).toBe(Math.max(a.urgency, b.urgency, pattern.urgency))
    expect(overall.escalate).toBe(true)
    expect(overall.value).toBe(3)
    expect(overall.why).toBe(pattern.why)
    expect(overall.action).toBe(pattern.action)
    for (const x of out) expect(validateAlert(x)).toEqual({ ok: true })
  })
})
