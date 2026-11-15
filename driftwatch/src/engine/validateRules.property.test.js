import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { validateRules, RulesError } from './validateRules.js'

// Feature: core, Property 12: Invalid rules are rejected at load time
// **Validates: Requirements 3.8, 3.9, 6.6**

const RUNS = { numRuns: 100 }

const FAMILY_BANDS = {
  z_: {
    normal: { z_min: -1 },
    watch: { z_min: -2, z_max: -1 },
    act: { z_max: -2 },
  },
  abs_z_: {
    normal: { abs_z_max: 1 },
    watch: { abs_z_min: 1, abs_z_max: 2 },
    act: { abs_z_min: 2 },
  },
  value_: {
    normal: { value_min: 6 },
    watch: { value_min: 5, value_max: 6 },
    act: { value_max: 5 },
  },
}

function buildIndicator(family, direction, withFallback) {
  const rule = {
    label: 'Label',
    unit: 'u',
    bad_direction: direction,
    bands: structuredClone(FAMILY_BANDS[family]),
    why: 'Value is {delta} {unit} off your usual.',
    action: 'Do something.',
    howToMeasure: 'Measure it.',
    whyItMatters: 'It matters.',
    source: 'design value',
  }
  if (withFallback) rule.fallback_bands = structuredClone(FAMILY_BANDS.value_)
  return rule
}

const validRulesArb = fc
  .record({
    moduleName: fc.stringMatching(/^[a-z]{3,10}$/),
    names: fc.uniqueArray(fc.stringMatching(/^[a-z]{2,8}$/).map((s) => `ind_${s}`), {
      minLength: 1,
      maxLength: 4,
    }),
    families: fc.array(fc.constantFrom('z_', 'abs_z_', 'value_'), { minLength: 4, maxLength: 4 }),
    directions: fc.array(fc.constantFrom('low', 'high', 'both'), { minLength: 4, maxLength: 4 }),
    fallbacks: fc.array(fc.boolean(), { minLength: 4, maxLength: 4 }),
    patternName: fc.stringMatching(/^[a-z]{2,8}$/).map((s) => `pat_${s}`),
    withPattern: fc.boolean(),
  })
  .map((g) => {
    const indicators = {}
    g.names.forEach((n, i) => {
      indicators[n] = buildIndicator(g.families[i], g.directions[i], g.fallbacks[i])
    })
    const rules = { module: g.moduleName, indicators }
    if (g.withPattern) {
      rules.patterns = {
        [g.patternName]: {
          needs: [...g.names],
          min_in_watch: 1,
          for_days: 2,
          result: 'watch',
          escalate: false,
          why: 'Several indicators are drifting.',
          action: 'Review.',
          source: 'design value',
        },
      }
    }
    return { rules, moduleName: g.moduleName, names: g.names, patternName: g.patternName }
  })

// Pairs a valid rules file with the name of one of its indicators.
const withTargetArb = validRulesArb.chain((g) =>
  fc.constantFrom(...g.names).map((target) => ({ ...g, target })),
)

function catchError(fn) {
  try {
    fn()
  } catch (e) {
    return e
  }
  return null
}

describe('Property 12: invalid rules are rejected at load time', () => {
  it('accepts every generated valid rules file (generator sanity)', () => {
    fc.assert(
      fc.property(validRulesArb, ({ rules, moduleName }) => {
        expect(validateRules(rules, moduleName)).toBe(true)
      }),
      RUNS,
    )
  })

  it('rejects an indicator with no source and names the indicator', () => {
    fc.assert(
      fc.property(withTargetArb, ({ rules, moduleName, target }) => {
        delete rules.indicators[target].source
        const err = catchError(() => validateRules(rules, moduleName))
        expect(err).toBeInstanceOf(RulesError)
        expect(err.indicator).toBe(target)
        expect(err.key).toBe('source')
        expect(err.message).toContain(target)
      }),
      RUNS,
    )
  })

  it('rejects a missing normal, watch or act band and names indicator and key', () => {
    fc.assert(
      fc.property(
        withTargetArb,
        fc.constantFrom('normal', 'watch', 'act'),
        ({ rules, moduleName, target }, band) => {
          delete rules.indicators[target].bands[band]
          const err = catchError(() => validateRules(rules, moduleName))
          expect(err).toBeInstanceOf(RulesError)
          expect(err.indicator).toBe(target)
          expect(err.key).toBe(band)
          expect(err.message).toContain(target)
          expect(err.message).toContain(band)
        },
      ),
      RUNS,
    )
  })

  it('rejects mixed key families across the three bands', () => {
    fc.assert(
      fc.property(
        withTargetArb,
        fc.constantFrom('watch', 'act'),
        ({ rules, moduleName, target }, band) => {
          const bands = rules.indicators[target].bands
          const first = Object.keys(bands.normal)[0]
          const current = ['z_', 'abs_z_', 'value_'].find((f) => first.startsWith(f) && (f !== 'z_' || !first.startsWith('abs_')))
          const other = current === 'value_' ? 'z_' : 'value_'
          const badKey = `${other}min`
          bands[band] = { [badKey]: 1 }
          const err = catchError(() => validateRules(rules, moduleName))
          expect(err).toBeInstanceOf(RulesError)
          expect(err.indicator).toBe(target)
          expect(err.key).toBe(badKey)
          expect(err.message).toContain(target)
        },
      ),
      RUNS,
    )
  })

  it('rejects an unknown band key and names indicator and key', () => {
    fc.assert(
      fc.property(
        withTargetArb,
        fc.constantFrom('normal', 'watch', 'act'),
        fc.stringMatching(/^[a-z]{3,8}$/).map((s) => `bogus_${s}`),
        ({ rules, moduleName, target }, band, unknownKey) => {
          rules.indicators[target].bands[band][unknownKey] = 1
          const err = catchError(() => validateRules(rules, moduleName))
          expect(err).toBeInstanceOf(RulesError)
          expect(err.indicator).toBe(target)
          expect(err.key).toBe(unknownKey)
          expect(err.message).toContain(target)
          expect(err.message).toContain(unknownKey)
        },
      ),
      RUNS,
    )
  })

  it('rejects a missing label, howToMeasure or whyItMatters', () => {
    fc.assert(
      fc.property(
        withTargetArb,
        fc.constantFrom('label', 'howToMeasure', 'whyItMatters'),
        ({ rules, moduleName, target }, field) => {
          delete rules.indicators[target][field]
          const err = catchError(() => validateRules(rules, moduleName))
          expect(err).toBeInstanceOf(RulesError)
          expect(err.indicator).toBe(target)
          expect(err.key).toBe(field)
          expect(err.message).toContain(target)
          expect(err.message).toContain(field)
        },
      ),
      RUNS,
    )
  })

  it('rejects a module field that differs from the module name', () => {
    fc.assert(
      fc.property(
        validRulesArb,
        fc.stringMatching(/^[A-Z]{3,10}$/),
        ({ rules, moduleName }, otherName) => {
          rules.module = otherName
          const err = catchError(() => validateRules(rules, moduleName))
          expect(err).toBeInstanceOf(RulesError)
          expect(err.key).toBe('module')
          expect(err.moduleName).toBe(moduleName)
          expect(err.message).toContain(moduleName)
        },
      ),
      RUNS,
    )
  })

  it('rejects a pattern that needs a name that is not an indicator', () => {
    fc.assert(
      fc.property(
        validRulesArb.filter((g) => g.rules.patterns !== undefined),
        fc.stringMatching(/^[a-z]{2,8}$/).map((s) => `missing_${s}`),
        ({ rules, moduleName, patternName }, unknownName) => {
          rules.patterns[patternName].needs.push(unknownName)
          const err = catchError(() => validateRules(rules, moduleName))
          expect(err).toBeInstanceOf(RulesError)
          expect(err.indicator).toBe(patternName)
          expect(err.key).toBe('needs')
          expect(err.message).toContain(patternName)
          expect(err.message).toContain(unknownName)
        },
      ),
      RUNS,
    )
  })
})
