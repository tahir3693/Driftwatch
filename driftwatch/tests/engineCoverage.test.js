// Requirements 9.2-9.5: every engine file has a sibling unit test that imports it.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ENGINE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'engine')

// Engine files defined by the core spec. Any other .js file in engine/ is reported, not skipped.
const CORE_ENGINE = [
  'adapter', 'computeBaseline', 'drift', 'evaluate', 'patterns', 'reconcileCutoffs',
  'runRulesModule', 'stats', 'urgency', 'validateAlert', 'validateCutoffs',
  'validateReading', 'validateRules', 'zScore',
]

// Engine files added by the check-in spec (radiation input builder; more come with that spec).
const CHECKIN_ENGINE = ['radiationInputs', 'dayKey', 'validateCheckIn', 'symptomCheck', 'mapCheckIn', 'reaction', 'streak']
const ALLOWED = [...CORE_ENGINE, ...CHECKIN_ENGINE]

const engineFiles = readdirSync(ENGINE_DIR)
  .filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'))
  .map((f) => f.slice(0, -3))
  .sort()

describe('engine test coverage', () => {
  it('finds engine files', () => {
    expect(engineFiles.length).toBeGreaterThan(0)
  })

  it('contains only engine files defined by the core or check-in spec (report anything else)', () => {
    const unexpected = engineFiles.filter((n) => !ALLOWED.includes(n))
    expect(unexpected, `Unexpected files in src/engine: ${unexpected.join(', ')}`).toEqual([])
  })

  it('has every core engine file present', () => {
    expect(engineFiles).toEqual(expect.arrayContaining(CORE_ENGINE))
  })

  describe.each(engineFiles)('%s.js', (name) => {
    const testPath = join(ENGINE_DIR, `${name}.test.js`)

    it('has a sibling unit test', () => {
      expect(existsSync(testPath)).toBe(true)
    })

    it('unit test imports the module', () => {
      const src = readFileSync(testPath, 'utf8')
      const importRe = new RegExp(`from\\s+['"]\\./${name}(\\.js)?['"]`)
      expect(importRe.test(src)).toBe(true)
    })
  })
})

