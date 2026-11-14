import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { runRulesModule } from './runRulesModule.js'
import { validateAlert } from './validateAlert.js'
import { statusRank } from './urgency.js'

// Feature: core, Property 9: Module output satisfies the Alert contract
// **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.10, 6.7**

const DAY = 86_400_000
const NOW = 100 * DAY
const cutoffs = { watch_from: 30, act_from: 60, source: 'design value' }
const DOMAIN = 'environment'

const BAND_FAMILIES = {
  value: {
    normal: { value_max: 10 },
    watch: { value_min: 10, value_max: 20 },
    act: { value_min: 20 },
  },
  z: {
    normal: { z_max: 1 },
    watch: { z_min: 1, z_max: 2 },
    act: { z_min: 2 },
  },
  abs_z: {
    normal: { abs_z_max: 1 },
    watch: { abs_z_min: 1, abs_z_max: 2 },
    act: { abs_z_min: 2 },
  },
}

const indicatorRule = (name, family, direction) => ({
  label: name,
  unit: 'u',
  bad_direction: direction,
  baseline_days: 14,
  bands: BAND_FAMILIES[family],
  fallback_bands: BAND_FAMILIES.value,
  severity_span: 10,
  why: `${name} is {delta} {unit} off.`,
  action: `Check ${name}.`,
  howToMeasure: 'm',
  whyItMatters: 'w',
  source: 'design value',
})

const NAMES = ['alpha', 'beta', 'gamma']

const readingsArb = fc.array(
  fc.record({
    daysAgo: fc.integer({ min: 0, max: 15 }),
    value: fc.integer({ min: -5, max: 40 }),
  }),
  { minLength: 0, maxLength: 20 },
)

const scenarioArb = fc
  .integer({ min: 1, max: 3 })
  .chain((count) => {
    const names = NAMES.slice(0, count)
    return fc.record({
      names: fc.constant(names),
      specs: fc.array(
        fc.record({
          family: fc.constantFrom('value', 'z', 'abs_z'),
          direction: fc.constantFrom('low', 'high', 'both'),
        }),
        { minLength: count, maxLength: count },
      ),
      readings: fc.array(readingsArb, { minLength: count, maxLength: count }),
      pattern: fc.option(
        fc.record({
          needs: fc.subarray(names, { minLength: 1 }),
          minFrac: fc.integer({ min: 0, max: 100 }),
          for_days: fc.integer({ min: 1, max: 3 }),
          result: fc.constantFrom('watch', 'act'),
          escalate: fc.boolean(),
        }),
        { nil: null },
      ),
    })
  })
  .map(({ names, specs, readings, pattern }) => {
    const indicators = {}
    const readingsByIndicator = {}
    names.forEach((n, i) => {
      indicators[n] = indicatorRule(n, specs[i].family, specs[i].direction)
      readingsByIndicator[n] = readings[i]
        .map((r) => ({
          timestamp: NOW - r.daysAgo * DAY,
          domain: DOMAIN,
          indicator: n,
          value: r.value,
        }))
        .sort((a, b) => a.timestamp - b.timestamp)
    })
    const patternDefs = {}
    if (pattern) {
      patternDefs.combo = {
        needs: pattern.needs,
        min_in_watch: 1 + Math.floor((pattern.minFrac / 101) * pattern.needs.length),
        for_days: pattern.for_days,
        result: pattern.result,
        escalate: pattern.escalate,
        why: 'Combined drift.',
        action: 'Review the combination.',
        source: 'design value',
      }
    }
    return {
      names,
      patternNames: Object.keys(patternDefs),
      rules: { module: 'test', indicators, patterns: patternDefs },
      readingsByIndicator,
    }
  })

describe('Property 9: Module output satisfies the Alert contract', () => {
  it('returns valid alerts: one per indicator, patterns, and a correct overall', () => {
    fc.assert(
      fc.property(scenarioArb, ({ names, patternNames, rules, readingsByIndicator }) => {
        const out = runRulesModule(
          { name: 'test', domain: DOMAIN, rules },
          readingsByIndicator,
          { cutoffs, now: NOW },
        )

        // every alert has exactly the ten contract fields and valid values
        for (const a of out) expect(validateAlert(a)).toEqual({ ok: true })
        for (const a of out) expect(a.domain).toBe(DOMAIN)

        // one alert per indicator, then patterns, then exactly one overall
        expect(out.map((a) => a.indicator)).toEqual([
          ...names,
          ...out.filter((a) => patternNames.includes(a.indicator)).map((a) => a.indicator),
          `${DOMAIN}_overall`,
        ])
        for (const n of names) {
          expect(out.filter((a) => a.indicator === n)).toHaveLength(1)
        }
        expect(out.filter((a) => a.indicator === `${DOMAIN}_overall`)).toHaveLength(1)

        // overall status is the highest among indicator and pattern alerts
        const overall = out[out.length - 1]
        const others = out.slice(0, -1)
        const maxRank = Math.max(...others.map((a) => statusRank(a.status)))
        expect(statusRank(overall.status)).toBe(maxRank)
        expect(overall.urgency).toBe(Math.max(...others.map((a) => a.urgency)))
      }),
      { numRuns: 100 },
    )
  })
})
