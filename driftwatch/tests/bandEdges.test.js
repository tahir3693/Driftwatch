import { describe, it, expect } from 'vitest'
import { evaluate } from '../src/engine/evaluate.js'
import { loadCutoffs } from '../src/data/cutoffs.js'
import environment from '../src/modules/environment/rules.json'
import gravity from '../src/modules/gravity/rules.json'
import nutrition from '../src/modules/nutrition/rules.json'

const cutoffs = loadCutoffs()
const DAY = 86_400_000
const RULES = { environment, gravity, nutrition }

// One reading, no baseline: value_ bands are applied to the raw value.
function byValue(domain, indicator, value) {
  const rule = RULES[domain].indicators[indicator]
  return evaluate(rule, [{ timestamp: DAY, domain, indicator, value }], { now: DAY, cutoffs, domain, indicator }).status
}

// Five earlier readings with mean 10 and sample sd exactly 1, then the latest reading at z.
function byZ(domain, indicator, z) {
  const rule = RULES[domain].indicators[indicator]
  const pool = [9, 11, 9, 11, 10]
  const readings = [...pool, 10 + z].map((value, i) => ({ timestamp: (i + 1) * DAY, domain, indicator, value }))
  return evaluate(rule, readings, { now: 6 * DAY, cutoffs, domain, indicator }).status
}

describe('band edges: named limits from docs/build-plan.md', () => {
  const cases = [
    // [domain, indicator, value, expected]
    ['environment', 'cabin_co2_mmHg', 2.799, 'normal'],
    ['environment', 'cabin_co2_mmHg', 2.8, 'watch'],
    ['environment', 'cabin_co2_mmHg', 2.999, 'watch'],
    ['environment', 'cabin_co2_mmHg', 3, 'act'],
    ['environment', 'cabin_co2_7day_avg_mmHg', 2.499, 'normal'],
    ['environment', 'cabin_co2_7day_avg_mmHg', 2.5, 'watch'],
    ['environment', 'cabin_co2_7day_avg_mmHg', 50, 'watch'], // no Act band for the 7-day average
    ['environment', 'symptom_check', 0.999, 'normal'],
    ['environment', 'symptom_check', 1, 'watch'],
    ['environment', 'symptom_check', 1.999, 'watch'],
    ['environment', 'symptom_check', 2, 'act'],
    ['gravity', 'exercise_sessions_per_week', 6, 'normal'],
    ['gravity', 'exercise_sessions_per_week', 5.999, 'watch'],
    ['gravity', 'exercise_sessions_per_week', 4, 'watch'],
    ['gravity', 'exercise_sessions_per_week', 3.999, 'act'],
    ['gravity', 'standing_bp_drop', 0.999, 'normal'],
    ['gravity', 'standing_bp_drop', 1, 'watch'],
    ['gravity', 'orthostatic_symptoms', 0.999, 'normal'],
    ['gravity', 'orthostatic_symptoms', 1, 'watch'],
    ['gravity', 'orthostatic_symptoms', 1.999, 'watch'],
    ['gravity', 'orthostatic_symptoms', 2, 'act'],
    ['gravity', 'low_intake_bone_note', 0.999, 'normal'],
    ['gravity', 'low_intake_bone_note', 1, 'watch'],
    ['nutrition', 'intake_pct_of_plan', 90, 'normal'],
    ['nutrition', 'intake_pct_of_plan', 89.999, 'watch'],
    ['nutrition', 'intake_pct_of_plan', 75, 'watch'],
    ['nutrition', 'intake_pct_of_plan', 74.999, 'act'],
    ['nutrition', 'vitamin_d_ng_ml', 35, 'normal'],
    ['nutrition', 'vitamin_d_ng_ml', 34.999, 'watch'],
    ['nutrition', 'vitamin_d_ng_ml', 5, 'watch'], // no Act band for vitamin D
  ]
  for (const [domain, indicator, value, expected] of cases) {
    it(`${domain}/${indicator} at ${value} is ${expected}`, () => {
      expect(byValue(domain, indicator, value)).toBe(expected)
    })
  }
})

describe('band edges: z-score limits at 2 standard deviations', () => {
  it('body temperature (high is bad): z 1.99 is normal, z 2 and 2.01 are watch, never act', () => {
    expect(byZ('environment', 'body_temperature', 1.99)).toBe('normal')
    expect(byZ('environment', 'body_temperature', 2)).toBe('watch')
    expect(byZ('environment', 'body_temperature', 2.01)).toBe('watch')
    expect(byZ('environment', 'body_temperature', 9)).toBe('watch')
  })

  it('sleep (low is bad): z -1.99 and -2 are normal, z -2.01 is watch', () => {
    expect(byZ('environment', 'sleep_hours', -1.99)).toBe('normal')
    expect(byZ('environment', 'sleep_hours', -2)).toBe('normal')
    expect(byZ('environment', 'sleep_hours', -2.01)).toBe('watch')
  })

  it('resting heart rate (either way): |z| 1.9 is normal, |z| 2 and above is watch on both sides', () => {
    expect(byZ('gravity', 'resting_heart_rate_bpm', 1.9)).toBe('normal')
    expect(byZ('gravity', 'resting_heart_rate_bpm', -1.9)).toBe('normal')
    expect(byZ('gravity', 'resting_heart_rate_bpm', 2)).toBe('watch')
    expect(byZ('gravity', 'resting_heart_rate_bpm', -2)).toBe('watch')
    expect(byZ('gravity', 'resting_heart_rate_bpm', 2.1)).toBe('watch')
  })
})

describe('band edges: every limit in every rules.json is a real edge', () => {
  const family = (bands) => {
    for (const band of Object.values(bands)) {
      for (const key of Object.keys(band ?? {})) {
        for (const f of ['abs_z_', 'z_', 'value_']) if (key.startsWith(f)) return f
      }
    }
    return null
  }

  for (const [domain, rules] of Object.entries(RULES)) {
    for (const [indicator, rule] of Object.entries(rules.indicators)) {
      const f = family(rule.bands)
      const limits = [
        ...new Set(
          Object.values(rule.bands)
            .filter(Boolean)
            .flatMap((b) => Object.values(b)),
        ),
      ]
      for (const limit of limits) {
        it(`${domain}/${indicator}: status changes across ${f}${limit}`, () => {
          if (f === 'value_') {
            expect(byValue(domain, indicator, limit - 0.001)).not.toBe(byValue(domain, indicator, limit))
          } else if (f === 'z_') {
            // just under the limit and just over it, on either side of the edge
            const under = byZ(domain, indicator, limit - 0.01)
            const over = byZ(domain, indicator, limit + 0.01)
            expect(under).not.toBe(over)
          } else {
            const under = byZ(domain, indicator, limit - 0.01)
            const over = byZ(domain, indicator, limit + 0.01)
            expect(under).not.toBe(over)
          }
        })
      }
    }
  }
})
