import { describe, it, expect } from 'vitest'
import { validateCheckIn } from './validateCheckIn.js'
import { loadCheckinRanges } from '../data/checkinData.js'

const ranges = loadCheckinRanges()
const okEnv = { co2: '1.2', headache: false, nauseaFatigue: false, temperature: '36.6' }
const errs = (module, raw) => validateCheckIn(module, raw, ranges).errors

describe('validateCheckIn messages', () => {
  it('asks for a value when a field is empty (7.3)', () => {
    expect(errs('gravity', { exercise: '' })).toEqual([{ field: 'exercise', message: 'Enter a value for Exercise sessions.' }])
    expect(errs('gravity', { exercise: '   ' })[0].message).toBe('Enter a value for Exercise sessions.')
    expect(errs('gravity', {})[0].message).toBe('Enter a value for Exercise sessions.')
  })
  it('rejects text that is not a finite number (7.4)', () => {
    for (const bad of ['abc', '0x10', '1e3', 'Infinity', 'NaN', '1,5', '--1', '.', '1 2']) {
      expect(errs('nutrition', { intake: bad })[0].message, bad).toBe('Food intake must be a number.')
    }
  })
  it('states the accepted range and unit (7.5)', () => {
    expect(errs('isolation', { sleep: '17', mood: '3', social: '10', reaction: '' })[0]).toEqual({
      field: 'sleep',
      message: 'Sleep must be from 0 to 16 h.',
    })
  })
  it('omits the unit and its space when the unit is empty', () => {
    expect(errs('isolation', { sleep: '7', mood: '11', social: '10' })[0].message).toBe('Mood and stress must be from 0 to 10.')
  })
  it('asks for a whole number (7.6)', () => {
    expect(errs('gravity', { exercise: '3.5' })[0].message).toBe('Exercise sessions must be a whole number.')
    expect(errs('isolation', { sleep: '7', mood: '2.5', social: '10' })[0].message).toBe('Mood and stress must be a whole number.')
    expect(errs('isolation', { sleep: '7', mood: '2', social: '10.5' })[0].message).toBe('Social contact must be a whole number.')
  })
  it('asks to choose yes or no when unanswered (7.8)', () => {
    const e = errs('environment', { co2: '1', headache: null, nauseaFatigue: undefined, temperature: '36' })
    expect(e).toEqual([
      { field: 'headache', message: 'Choose yes or no.' },
      { field: 'nauseaFatigue', message: 'Choose yes or no.' },
    ])
  })
  it('never calls a value normal or abnormal (7.9)', () => {
    const all = [
      ...errs('environment', {}),
      ...errs('isolation', { sleep: '99', mood: 'x', social: '' }),
      ...errs('gravity', { exercise: '-1' }),
      ...errs('nutrition', { intake: '999' }),
    ]
    for (const e of all) expect(e.message).not.toMatch(/normal|abnormal/i)
  })
})

describe('validateCheckIn ranges', () => {
  const cases = [
    ['environment', 'co2', 'co2', (v) => ({ ...okEnv, co2: v })],
    ['environment', 'temperature', 'temperature', (v) => ({ ...okEnv, temperature: v })],
    ['isolation', 'sleep', 'sleep', (v) => ({ sleep: v, mood: '3', social: '30' })],
    ['isolation', 'mood', 'mood', (v) => ({ sleep: '7', mood: v, social: '30' })],
    ['isolation', 'social', 'social', (v) => ({ sleep: '7', mood: '3', social: v })],
    ['isolation', 'reaction', 'reaction', (v) => ({ sleep: '7', mood: '3', social: '30', reaction: v })],
    ['gravity', 'exercise', 'exercise', (v) => ({ exercise: v })],
    ['nutrition', 'intake', 'intake', (v) => ({ intake: v })],
  ]
  describe.each(cases)('%s %s', (module, field, key, build) => {
    const { min, max, integer } = ranges[key]
    const step = integer ? 1 : 0.1
    it('accepts the minimum and the maximum', () => {
      expect(validateCheckIn(module, build(String(min)), ranges).ok).toBe(true)
      expect(validateCheckIn(module, build(String(max)), ranges).ok).toBe(true)
    })
    it('rejects just outside both', () => {
      for (const v of [min - step, max + step]) {
        const r = validateCheckIn(module, build(String(Number(v.toFixed(1)))), ranges)
        expect(r.ok).toBe(false)
        expect(r.errors.find((e) => e.field === field).message).toContain(`from ${min} to ${max}`)
      }
    })
  })
})

describe('validateCheckIn values and structure', () => {
  it('parses values, accepts numbers and padded text, and keeps yes or no as booleans', () => {
    const r = validateCheckIn('environment', { co2: ' 2.5 ', headache: true, nauseaFatigue: false, temperature: 37 }, ranges)
    expect(r).toEqual({ ok: true, values: { co2: 2.5, headache: true, nauseaFatigue: false, temperature: 37 } })
  })
  it('accepts signs and leading or trailing decimal points', () => {
    expect(validateCheckIn('nutrition', { intake: '+5.' }, ranges).values.intake).toBe(5)
    expect(validateCheckIn('nutrition', { intake: '.5' }, ranges).values.intake).toBe(0.5)
  })
  it('treats the reaction as optional and gives null when empty', () => {
    const r = validateCheckIn('isolation', { sleep: '7', mood: '4', social: '60', reaction: '' }, ranges)
    expect(r.values).toEqual({ sleep: 7, mood: 4, social: 60, reaction: null })
    expect(validateCheckIn('isolation', { sleep: '7', mood: '4', social: '60', reaction: null }, ranges).values.reaction).toBeNull()
    expect(validateCheckIn('isolation', { sleep: '7', mood: '4', social: '60', reaction: '312' }, ranges).values.reaction).toBe(312)
  })
  it('still checks a non-empty reaction', () => {
    expect(errs('isolation', { sleep: '7', mood: '4', social: '60', reaction: '50' })[0].field).toBe('reaction')
    expect(errs('isolation', { sleep: '7', mood: '4', social: '60', reaction: 'fast' })[0].message).toBe('Reaction time must be a number.')
  })
  it('lists errors in form order', () => {
    const e = errs('isolation', { sleep: '', mood: '', social: '', reaction: 'x' })
    expect(e.map((x) => x.field)).toEqual(['sleep', 'mood', 'social', 'reaction'])
    expect(errs('environment', {}).map((x) => x.field)).toEqual(['co2', 'headache', 'nauseaFatigue', 'temperature'])
  })
  it('accepts a Radiation submit with nothing ticked', () => {
    const none = { nausea: false, vomiting: false, fatigue: false, skin: false, fever: false, bruising: false }
    expect(validateCheckIn('radiation', { symptoms: {} }, ranges)).toEqual({ ok: true, values: { symptoms: none } })
    expect(validateCheckIn('radiation', undefined, ranges).ok).toBe(true)
    expect(validateCheckIn('radiation', { symptoms: { nausea: true } }, ranges).values.symptoms.nausea).toBe(true)
  })
  it('throws on an unknown module', () => {
    expect(() => validateCheckIn('sleep', {}, ranges)).toThrow()
  })
  it('takes the range from its argument', () => {
    const custom = { ...ranges, intake: { ...ranges.intake, label: 'Eaten', min: 10, max: 20, unit: 'x' } }
    expect(validateCheckIn('nutrition', { intake: '25' }, custom).errors[0].message).toBe('Eaten must be from 10 to 20 x.')
  })
})