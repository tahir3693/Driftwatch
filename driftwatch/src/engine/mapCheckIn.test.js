import { describe, it, expect } from 'vitest'
import { mapCheckIn, INDICATORS } from './mapCheckIn.js'
import { validateReading } from './validateReading.js'
import { RULES } from '../modules/radiation/radiation-engine.js'
import environment from '../modules/environment/rules.json'
import isolation from '../modules/isolation/rules.json'
import gravity from '../modules/gravity/rules.json'
import nutrition from '../modules/nutrition/rules.json'

const NOW = 1_800_000_000_000
const RULES_BY_DOMAIN = { environment, isolation, gravity, nutrition }
const shape = (list) => list.map((r) => `${r.domain}/${r.indicator}=${r.value}`)

const env = { co2: 2.4, temperature: 36.8, headache: true, nauseaFatigue: false }
const iso = { sleep: 6.5, mood: 7, social: 45, reaction: 310 }
const rad = { symptoms: { nausea: true, vomiting: false, fatigue: true, skin: false, fever: false, bruising: false } }

describe('mapCheckIn', () => {
  it('maps environment to four Readings with the derived symptom code', () => {
    const out = mapCheckIn('environment', env, { now: NOW, priorHeadache: [true, false] })
    expect(shape(out)).toEqual([
      'environment/cabin_co2_mmHg=2.4',
      'environment/body_temperature=36.8',
      'environment/headache_logged=1',
      'environment/symptom_check=1',
    ])
    expect(out.every((r) => r.timestamp === NOW)).toBe(true)
  })
  it('writes headache 0 for no and symptom code 2 for nausea with fatigue', () => {
    const out = mapCheckIn('environment', { ...env, headache: false, nauseaFatigue: true }, { now: NOW, priorHeadache: [false, false] })
    expect(shape(out).slice(2)).toEqual(['environment/headache_logged=0', 'environment/symptom_check=2'])
  })
  it('maps radiation to six symptom Readings, always, with 1 or 0', () => {
    const out = mapCheckIn('radiation', rad, { now: NOW })
    expect(shape(out)).toEqual([
      'radiation/symptom_nausea=1',
      'radiation/symptom_vomiting=0',
      'radiation/symptom_fatigue=1',
      'radiation/symptom_skin=0',
      'radiation/symptom_fever=0',
      'radiation/symptom_bruising=0',
    ])
  })
  it('maps isolation, including the shared environment sleep and the optional reaction', () => {
    const out = mapCheckIn('isolation', iso, { now: NOW })
    expect(shape(out)).toEqual([
      'isolation/sleep_hours=6.5',
      'isolation/mood=7',
      'isolation/social_contact=45',
      'environment/sleep_hours=6.5',
      'isolation/reaction_ms=310',
    ])
    const noReaction = mapCheckIn('isolation', { ...iso, reaction: null }, { now: NOW })
    expect(noReaction.some((r) => r.indicator === 'reaction_ms')).toBe(false)
    expect(noReaction).toHaveLength(4)
  })
  it('maps gravity and nutrition to one Reading each', () => {
    expect(shape(mapCheckIn('gravity', { exercise: 5 }, { now: NOW }))).toEqual(['gravity/exercise_sessions_per_week=5'])
    expect(shape(mapCheckIn('nutrition', { intake: 88 }, { now: NOW }))).toEqual(['nutrition/intake_pct_of_plan=88'])
  })
  it('returns only Readings that validateReading accepts', () => {
    const all = [
      mapCheckIn('environment', env, { now: NOW, priorHeadache: [false, false] }),
      mapCheckIn('radiation', rad, { now: NOW }),
      mapCheckIn('isolation', iso, { now: NOW }),
      mapCheckIn('gravity', { exercise: 0 }, { now: NOW }),
      mapCheckIn('nutrition', { intake: 0 }, { now: NOW }),
    ].flat()
    for (const r of all) expect(validateReading(r)).toEqual({ ok: true })
  })
  it('throws on an unknown module', () => {
    expect(() => mapCheckIn('sleep', {}, { now: NOW })).toThrow()
  })
})

describe('mapCheckIn indicator names', () => {
  // Names that are not indicators in any rules.json: stored for history only (headache) or read by the radiation engine.
  const CHECKIN_ONLY = ['headache_logged']

  it('uses indicator names that exist in the matching rules.json', () => {
    const all = [
      mapCheckIn('environment', env, { now: NOW, priorHeadache: [] }),
      mapCheckIn('isolation', iso, { now: NOW }),
      mapCheckIn('gravity', { exercise: 3 }, { now: NOW }),
      mapCheckIn('nutrition', { intake: 90 }, { now: NOW }),
    ].flat()
    for (const r of all) {
      if (CHECKIN_ONLY.includes(r.indicator)) {
        for (const rules of Object.values(RULES_BY_DOMAIN)) expect(Object.keys(rules.indicators)).not.toContain(r.indicator)
        continue
      }
      expect(Object.keys(RULES_BY_DOMAIN[r.domain].indicators), `${r.domain}/${r.indicator}`).toContain(r.indicator)
    }
  })
  it('keeps sleep_hours in both the environment and the isolation rules', () => {
    expect(Object.keys(environment.indicators)).toContain(INDICATORS.sleep)
    expect(Object.keys(isolation.indicators)).toContain(INDICATORS.sleep)
    for (const k of ['sleep_hours', 'mood', 'reaction_ms', 'social_contact']) expect(Object.keys(isolation.indicators)).toContain(k)
  })
  it('writes one symptom_<key> Reading for each key of the radiation engine symptom list', () => {
    const keys = Object.keys(RULES.symptoms)
    const names = mapCheckIn('radiation', rad, { now: NOW }).map((r) => r.indicator)
    expect(names).toEqual(keys.map((k) => `symptom_${k}`))
  })
})