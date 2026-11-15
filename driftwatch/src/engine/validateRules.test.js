import { describe, it, expect } from 'vitest'
import { validateRules, RulesError } from './validateRules.js'

const make = () => ({
  module: 'isolation',
  urgency: { watch_from: 30, act_from: 60, source: 'design value' },
  indicators: {
    sleep: {
      label: 'Sleep',
      unit: 'h',
      bad_direction: 'low',
      bands: {
        normal: { z_min: -1 },
        watch: { z_min: -2, z_max: -1 },
        act: { z_max: -2 },
      },
      fallback_bands: {
        normal: { value_min: 6 },
        watch: { value_min: 5, value_max: 6 },
        act: { value_max: 5 },
      },
      why: 'Sleep is {delta} {unit} below your usual.',
      action: 'Protect a full sleep period.',
      howToMeasure: 'Log hours slept.',
      whyItMatters: 'Short sleep slows reactions.',
      source: 'design value',
    },
    mood: {
      label: 'Mood',
      unit: 'pts',
      bad_direction: 'low',
      bands: {
        normal: { z_min: -1 },
        watch: { z_min: -2, z_max: -1 },
        act: { z_max: -2 },
      },
      why: 'Mood is down.',
      action: 'Talk to the crew.',
      howToMeasure: 'Rate mood 1 to 10.',
      whyItMatters: 'Mood tracks strain.',
      source: 'Some Paper 2020',
    },
  },
  patterns: {
    low_spirits: {
      needs: ['sleep', 'mood'],
      min_in_watch: 2,
      for_days: 3,
      result: 'act',
      escalate: true,
      why: 'Sleep and mood are both off.',
      action: 'Call the flight surgeon.',
      source: 'design value',
    },
  },
})

function expectError(rules, fields) {
  let err
  try {
    validateRules(rules, 'isolation')
  } catch (e) {
    err = e
  }
  expect(err).toBeInstanceOf(RulesError)
  expect(err.moduleName).toBe('isolation')
  expect(err).toMatchObject(fields)
  expect(typeof err.message).toBe('string')
}

describe('validateRules', () => {
  it('accepts a valid template, with and without urgency and patterns', () => {
    expect(validateRules(make(), 'isolation')).toBe(true)
    const r = make()
    delete r.urgency
    delete r.patterns
    expect(validateRules(r, 'isolation')).toBe(true)
  })

  it('accepts act: null as a band with no limit', () => {
    const r = make()
    r.indicators.mood.bands.act = null
    expect(validateRules(r, 'isolation')).toBe(true)
    r.indicators.mood.bands.watch = {}
    expectError(r, { indicator: 'mood', key: 'watch' })
  })

  it('does not check the urgency block', () => {
    const r = make()
    r.urgency = { anything: 'goes' }
    expect(validateRules(r, 'isolation')).toBe(true)
  })

  it('rejects a module name that differs from moduleName', () => {
    const r = make()
    r.module = 'radiation'
    expectError(r, { indicator: null, key: 'module' })
  })

  it('rejects a missing module field', () => {
    const r = make()
    delete r.module
    expectError(r, { key: 'module' })
  })

  for (const key of ['label', 'unit', 'why', 'action', 'howToMeasure', 'whyItMatters', 'source']) {
    it(`rejects a missing ${key}`, () => {
      const r = make()
      delete r.indicators.sleep[key]
      expectError(r, { indicator: 'sleep', key })
    })
  }

  it('rejects a non-string text field', () => {
    const r = make()
    r.indicators.sleep.label = 5
    expectError(r, { indicator: 'sleep', key: 'label' })
  })

  it('rejects a bad bad_direction', () => {
    const r = make()
    r.indicators.sleep.bad_direction = 'up'
    expectError(r, { indicator: 'sleep', key: 'bad_direction' })
  })

  it.each(['low', 'high', 'both'])('accepts bad_direction %s', (d) => {
    const r = make()
    r.indicators.sleep.bad_direction = d
    expect(validateRules(r, 'isolation')).toBe(true)
  })

  for (const band of ['normal', 'watch', 'act']) {
    it(`rejects a missing ${band} band`, () => {
      const r = make()
      delete r.indicators.sleep.bands[band]
      expectError(r, { indicator: 'sleep', key: band })
    })
  }

  it('rejects missing bands', () => {
    const r = make()
    delete r.indicators.sleep.bands
    expectError(r, { indicator: 'sleep', key: 'bands' })
  })

  it('accepts one example per band family', () => {
    const abs = make()
    abs.indicators.sleep.bands = {
      normal: { abs_z_max: 1 },
      watch: { abs_z_min: 1, abs_z_max: 2 },
      act: { abs_z_min: 2 },
    }
    expect(validateRules(abs, 'isolation')).toBe(true)

    const val = make()
    val.indicators.sleep.bands = {
      normal: { value_min: 6 },
      watch: { value_min: 5, value_max: 6 },
      act: { value_max: 5 },
    }
    expect(validateRules(val, 'isolation')).toBe(true)
  })

  it('rejects mixed families across bands', () => {
    const r = make()
    r.indicators.sleep.bands.act = { value_max: 5 }
    expectError(r, { indicator: 'sleep', key: 'value_max' })
  })

  it('rejects unknown band keys', () => {
    const r = make()
    r.indicators.sleep.bands.watch.z_mid = 0
    expectError(r, { indicator: 'sleep', key: 'z_mid' })
  })

  it('rejects an unknown band name', () => {
    const r = make()
    r.indicators.sleep.bands.severe = { z_max: -3 }
    expectError(r, { indicator: 'sleep', key: 'severe' })
  })

  it('rejects fallback_bands that are not value_ family', () => {
    const r = make()
    r.indicators.sleep.fallback_bands = {
      normal: { z_min: -1 },
      watch: { z_min: -2, z_max: -1 },
      act: { z_max: -2 },
    }
    expectError(r, { indicator: 'sleep', key: 'z_min' })
  })

  it('rejects fallback_bands missing a band', () => {
    const r = make()
    delete r.indicators.sleep.fallback_bands.act
    expectError(r, { indicator: 'sleep', key: 'act' })
  })

  describe('patterns', () => {
    for (const key of ['needs', 'min_in_watch', 'for_days', 'result', 'escalate', 'why', 'action', 'source']) {
      it(`rejects a pattern missing ${key}`, () => {
        const r = make()
        delete r.patterns.low_spirits[key]
        expectError(r, { indicator: 'low_spirits', key })
      })
    }

    it('rejects a need that is not an indicator', () => {
      const r = make()
      r.patterns.low_spirits.needs = ['sleep', 'ghost']
      expectError(r, { indicator: 'low_spirits', key: 'needs' })
      try {
        validateRules(r, 'isolation')
      } catch (e) {
        expect(e.message).toContain('ghost')
      }
    })

    it('rejects a non-boolean escalate', () => {
      const r = make()
      r.patterns.low_spirits.escalate = 'yes'
      expectError(r, { indicator: 'low_spirits', key: 'escalate' })
    })

    it('rejects a bad result', () => {
      const r = make()
      r.patterns.low_spirits.result = 'normal'
      expectError(r, { indicator: 'low_spirits', key: 'result' })
    })
  })
})
