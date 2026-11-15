import { describe, it, expect } from 'vitest'
import { loadCheckinRanges, loadCheckinConfig, validateRanges, validateConfig, RANGE_KEYS } from './checkinData.js'
import environment from '../modules/environment/rules.json'
import isolation from '../modules/isolation/rules.json'
import gravity from '../modules/gravity/rules.json'
import nutrition from '../modules/nutrition/rules.json'

describe('checkin ranges', () => {
  const ranges = loadCheckinRanges()
  it('has every field with its number, unit and design value source (7.1)', () => {
    const expected = {
      co2: [0, 10, 'mmHg'],
      temperature: [34, 42, 'deg C'],
      sleep: [0, 16, 'h'],
      mood: [0, 10, ''],
      social: [0, 1440, 'min'],
      exercise: [0, 21, 'sessions'],
      intake: [0, 150, '%'],
      reaction: [100, 2000, 'ms'],
    }
    expect(Object.keys(ranges).sort()).toEqual(Object.keys(expected).sort())
    for (const [key, [min, max, unit]] of Object.entries(expected)) {
      expect(ranges[key].min).toBe(min)
      expect(ranges[key].max).toBe(max)
      expect(ranges[key].unit).toBe(unit)
      expect(ranges[key].source).toBe('design value')
    }
    expect(ranges.mood.label).toBe('Mood and stress')
    expect(ranges.mood.integer).toBe(true)
    expect(ranges.social.integer).toBe(true)
    expect(ranges.exercise.integer).toBe(true)
  })
  it('is frozen and cached', () => {
    expect(Object.isFrozen(ranges)).toBe(true)
    expect(Object.isFrozen(ranges.co2)).toBe(true)
    expect(loadCheckinRanges()).toBe(ranges)
  })
  it('throws on a malformed range object', () => {
    const good = JSON.parse(JSON.stringify(ranges))
    expect(() => validateRanges(null)).toThrow()
    expect(() => validateRanges({ ...good, co2: undefined })).toThrow()
    expect(() => validateRanges({ ...good, co2: { ...good.co2, min: 10, max: 10 } })).toThrow()
    expect(() => validateRanges({ ...good, co2: { ...good.co2, min: 11 } })).toThrow()
    expect(() => validateRanges({ ...good, co2: { ...good.co2, source: '' } })).toThrow()
    expect(() => validateRanges({ ...good, co2: { ...good.co2, integer: 'no' } })).toThrow()
    expect(() => validateRanges({ ...good, co2: { ...good.co2, label: undefined } })).toThrow()
    expect(() => validateRanges({ ...good, co2: { ...good.co2, max: Infinity } })).toThrow()
    expect(() => validateRanges(good)).not.toThrow()
  })
  it('differs from the band limits in the rules.json files (7.9)', () => {
    const owner = {
      co2: environment.indicators.cabin_co2_mmHg,
      temperature: environment.indicators.body_temperature,
      sleep: isolation.indicators.sleep_hours,
      mood: isolation.indicators.mood,
      social: isolation.indicators.social_contact,
      reaction: isolation.indicators.reaction_ms,
      exercise: gravity.indicators.exercise_sessions_per_week,
      intake: nutrition.indicators.intake_pct_of_plan,
    }
    expect(Object.keys(owner).sort()).toEqual([...RANGE_KEYS].sort())
    for (const [key, ind] of Object.entries(owner)) {
      const { min, max } = ranges[key]
      const edges = Object.values(ind.bands)
        .filter(Boolean)
        .flatMap((b) => Object.values(b))
      expect(edges.includes(min) && edges.includes(max), key).toBe(false)
    }
  })
})

describe('checkin config', () => {
  it('loads the design values', () => {
    const c = loadCheckinConfig()
    expect(c.minModulesPerDay).toBe(1)
    expect(c.reactionMinTaps).toBe(5)
    expect(c.source).toBe('design value')
    expect(Object.isFrozen(c)).toBe(true)
  })
  it('throws on a malformed config', () => {
    expect(() => validateConfig(null)).toThrow()
    expect(() => validateConfig({ minModulesPerDay: 0, reactionMinTaps: 5, source: 'x' })).toThrow()
    expect(() => validateConfig({ minModulesPerDay: 1, reactionMinTaps: 2.5, source: 'x' })).toThrow()
    expect(() => validateConfig({ minModulesPerDay: 1, reactionMinTaps: 5 })).toThrow()
  })
})