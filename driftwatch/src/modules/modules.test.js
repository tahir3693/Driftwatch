import { describe, it, expect } from 'vitest'
import { DOMAINS } from '../data/domains.js'
import { validateRules } from '../engine/validateRules.js'

const descriptors = import.meta.glob('./*/index.js', { eager: true })
const rulesFiles = import.meta.glob('./*/rules.json', { eager: true })

const folderOf = (path) => path.split('/')[1]
// Folders whose alerts are merged into another module (bmd-strength into gravity).
const SUBMODULES = ['bmd-strength']

describe('module descriptors', () => {
  it('finds at least one descriptor', () => {
    expect(Object.keys(descriptors).length).toBeGreaterThan(0)
  })

  for (const [path, mod] of Object.entries(descriptors)) {
    const folder = folderOf(path)
    if (SUBMODULES.includes(folder)) {
      // A sub-module is merged into its parent module and must not be runnable on its own.
      it(`${folder}/index.js is a sub-module with no default descriptor`, () => {
        expect(mod.default).toBeUndefined()
      })
      continue
    }
    it(`${folder}/index.js default export is a frozen descriptor with a valid domain`, () => {
      const d = mod.default
      expect(d).toBeTypeOf('object')
      expect(Object.isFrozen(d)).toBe(true)
      expect(d.name).toBeTypeOf('string')
      expect(DOMAINS).toContain(d.domain)
      expect(['rules', 'function']).toContain(d.kind)
      if (d.kind === 'function') expect(d.run).toBeTypeOf('function')
      if (d.kind === 'rules') expect(d.rules).toBeTypeOf('object')
    })
  }
})

describe('bundled rules.json files', () => {
  for (const [path, mod] of Object.entries(rulesFiles)) {
    const folder = folderOf(path)
    it(`${folder}/rules.json passes validateRules`, () => {
      expect(() => validateRules(mod.default ?? mod, folder)).not.toThrow()
    })
  }
})
