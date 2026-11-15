import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { evaluate } from './evaluate.js'
import { runRulesModule } from './runRulesModule.js'

const DAY = 86_400_000
const NOW = 1_700_000_000_000

const cutoffsArb = fc
  .tuple(fc.integer({ min: 1, max: 60 }), fc.integer({ min: 1, max: 40 }))
  .map(([w, gap]) => ({ watch_from: w, act_from: Math.min(100, w + gap), source: 'design value' }))
  .filter((c) => c.watch_from < c.act_from)

const bandsArb = fc
  .tuple(fc.integer({ min: -30, max: 30 }), fc.integer({ min: 1, max: 30 }))
  .map(([a, gap]) => ({
    normal: { value_max: a },
    watch: { value_min: a, value_max: a + gap },
    act: { value_min: a + gap },
  }))

const ruleArb = fc
  .tuple(bandsArb, fc.constantFrom('low', 'high', 'both'), fc.integer({ min: 1, max: 20 }))
  .map(([bands, bad_direction, severity_span]) => ({
    label: 'Test indicator',
    unit: 'u',
    bad_direction,
    bands,
    why: 'Moved {delta} {unit} from reference.',
    action: 'Do something.',
    source: 'design value',
    severity_span,
  }))

const readingsArb = fc
  .uniqueArray(fc.integer({ min: 0, max: 14 }), { minLength: 1, maxLength: 15 })
  .chain((days) =>
    fc
      .array(fc.integer({ min: -80, max: 80 }), { minLength: days.length, maxLength: days.length })
      .map((vals) => days.map((d, i) => ({ timestamp: NOW - d * DAY, value: vals[i] }))),
  )

describe('escalate follows the act cut-off', () => {
  // Feature: core, Property 10: Escalate follows the act cut-off
  // **Validates: Requirements 3.6**
  it('evaluate: escalate is true iff urgency >= act_from', () => {
    fc.assert(
      fc.property(ruleArb, readingsArb, cutoffsArb, (rule, readings, cutoffs) => {
        const alert = evaluate(rule, readings, { now: NOW, cutoffs, domain: 'nutrition', indicator: 'test' })
        expect(alert.escalate).toBe(alert.urgency >= cutoffs.act_from)
      }),
      { numRuns: 200 },
    )
  })

  it('runRulesModule: indicator and overall alerts escalate iff urgency >= act_from (pattern alerts excluded)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(ruleArb, fc.option(readingsArb, { nil: undefined })), { minLength: 1, maxLength: 3 }),
        cutoffsArb,
        (entries, cutoffs) => {
          const indicators = {}
          const readingsByIndicator = {}
          entries.forEach(([rule, readings], i) => {
            indicators[`ind${i}`] = rule
            if (readings) readingsByIndicator[`ind${i}`] = readings
          })
          const rules = { module: 'nutrition', indicators, patterns: {} }
          const alerts = runRulesModule({ name: 'nutrition', domain: 'nutrition', rules }, readingsByIndicator, {
            cutoffs,
            now: NOW,
          })
          const checked = alerts.filter((a) => a.indicator in indicators || a.indicator === 'nutrition_overall')
          expect(checked).toHaveLength(entries.length + 1)
          for (const a of checked) {
            expect(a.escalate).toBe(a.urgency >= cutoffs.act_from)
          }
        },
      ),
      { numRuns: 150 },
    )
  })
})
