import { describe, it } from 'vitest'
import fc from 'fast-check'
import { validateCheckIn } from './validateCheckIn.js'
import { loadCheckinRanges } from '../data/checkinData.js'

const ranges = loadCheckinRanges()
const num = (key) => {
  const r = ranges[key]
  return r.integer ? fc.integer({ min: r.min, max: r.max }) : fc.integer({ min: r.min * 10, max: r.max * 10 }).map((n) => n / 10)
}
const text = (n) => String(n)

// Feature: checkin, Property 3: Format, validate and parse round trip
describe('validate round trip', () => {
  it('environment', () => {
    fc.assert(
      fc.property(num('co2'), num('temperature'), fc.boolean(), fc.boolean(), (co2, temperature, headache, nauseaFatigue) => {
        const r = validateCheckIn('environment', { co2: text(co2), temperature: text(temperature), headache, nauseaFatigue }, ranges)
        return r.ok && r.values.co2 === co2 && r.values.temperature === temperature && r.values.headache === headache && r.values.nauseaFatigue === nauseaFatigue
      }),
      { numRuns: 200 },
    )
  })
  it('isolation, with and without a reaction', () => {
    fc.assert(
      fc.property(num('sleep'), num('mood'), num('social'), fc.option(num('reaction'), { nil: null }), (sleep, mood, social, reaction) => {
        const raw = { sleep: text(sleep), mood: text(mood), social: text(social), reaction: reaction === null ? '' : text(reaction) }
        const r = validateCheckIn('isolation', raw, ranges)
        return r.ok && r.values.sleep === sleep && r.values.mood === mood && r.values.social === social && r.values.reaction === reaction
      }),
      { numRuns: 200 },
    )
  })
  it('gravity, nutrition and radiation', () => {
    fc.assert(
      fc.property(num('exercise'), num('intake'), fc.record({ nausea: fc.boolean(), vomiting: fc.boolean(), fatigue: fc.boolean(), skin: fc.boolean(), fever: fc.boolean(), bruising: fc.boolean() }), (exercise, intake, symptoms) => {
        const g = validateCheckIn('gravity', { exercise: text(exercise) }, ranges)
        const n = validateCheckIn('nutrition', { intake: text(intake) }, ranges)
        const rad = validateCheckIn('radiation', { symptoms }, ranges)
        return g.values.exercise === exercise && n.values.intake === intake && JSON.stringify(rad.values.symptoms) === JSON.stringify(symptoms)
      }),
      { numRuns: 200 },
    )
  })
})