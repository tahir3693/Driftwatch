import { describe, it } from 'vitest'
import fc from 'fast-check'
import { mapCheckIn } from './mapCheckIn.js'

const NOW = 1_800_000_000_000
const get = (list, domain, indicator) => list.filter((r) => r.domain === domain && r.indicator === indicator)

// Feature: checkin, Property 6: Each module writes its documented indicators and values
describe('mapCheckIn indicators', () => {
  it('environment', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 10, noNaN: true }), fc.double({ min: 34, max: 42, noNaN: true }), fc.boolean(), fc.boolean(), fc.tuple(fc.boolean(), fc.boolean()), (co2, temperature, headache, nauseaFatigue, prior) => {
        const out = mapCheckIn('environment', { co2, temperature, headache, nauseaFatigue }, { now: NOW, priorHeadache: prior })
        const names = out.map((r) => r.indicator).sort()
        return (
          JSON.stringify(names) === JSON.stringify(['body_temperature', 'cabin_co2_mmHg', 'headache_logged', 'symptom_check']) &&
          get(out, 'environment', 'cabin_co2_mmHg')[0].value === co2 &&
          get(out, 'environment', 'body_temperature')[0].value === temperature &&
          get(out, 'environment', 'headache_logged')[0].value === (headache ? 1 : 0)
        )
      }),
      { numRuns: 200 },
    )
  })
  it('radiation writes six readings, 1 iff ticked', () => {
    const keys = ['nausea', 'vomiting', 'fatigue', 'skin', 'fever', 'bruising']
    fc.assert(
      fc.property(fc.record(Object.fromEntries(keys.map((k) => [k, fc.boolean()]))), (symptoms) => {
        const out = mapCheckIn('radiation', { symptoms }, { now: NOW })
        return out.length === 6 && keys.every((k) => get(out, 'radiation', `symptom_${k}`).length === 1 && get(out, 'radiation', `symptom_${k}`)[0].value === (symptoms[k] ? 1 : 0))
      }),
      { numRuns: 100 },
    )
  })
  it('isolation writes the shared sleep and reaction_ms only when given', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 16, noNaN: true }), fc.integer({ min: 0, max: 10 }), fc.integer({ min: 0, max: 1440 }), fc.option(fc.integer({ min: 100, max: 2000 }), { nil: null }), (sleep, mood, social, reaction) => {
        const out = mapCheckIn('isolation', { sleep, mood, social, reaction }, { now: NOW })
        const react = get(out, 'isolation', 'reaction_ms')
        return (
          get(out, 'isolation', 'sleep_hours')[0].value === sleep &&
          get(out, 'environment', 'sleep_hours')[0].value === sleep &&
          get(out, 'isolation', 'mood')[0].value === mood &&
          get(out, 'isolation', 'social_contact')[0].value === social &&
          (reaction === null ? react.length === 0 : react.length === 1 && react[0].value === reaction)
        )
      }),
      { numRuns: 200 },
    )
  })
  it('gravity and nutrition write the entered value', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 21 }), fc.double({ min: 0, max: 150, noNaN: true }), (exercise, intake) => {
        const g = mapCheckIn('gravity', { exercise }, { now: NOW })
        const n = mapCheckIn('nutrition', { intake }, { now: NOW })
        return g.length === 1 && g[0].indicator === 'exercise_sessions_per_week' && g[0].value === exercise && n.length === 1 && n[0].indicator === 'intake_pct_of_plan' && n[0].value === intake
      }),
      { numRuns: 100 },
    )
  })
})