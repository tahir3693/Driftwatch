import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const FILES = ['dayKey', 'validateCheckIn', 'symptomCheck', 'mapCheckIn', 'radiationInputs', 'reaction', 'streak']

const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
const specifiers = (code) => [...code.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)(['"`])([^'"`]+)\1/g)].map((m) => m[2])

describe.each(FILES)('check-in engine file %s.js', (name) => {
  const code = stripComments(readFileSync(join(DIR, `${name}.js`), 'utf8'))
  it('imports nothing from ui/, React, Dexie or a JSON file', () => {
    const bad = specifiers(code).filter((s) => /\.json$/i.test(s) || s === 'react' || s.startsWith('react/') || s === 'dexie' || s.startsWith('dexie/') || /(^|\/)ui(\/|$)/.test(s) || /(^|\/)store(\/|$)/.test(s))
    expect(bad).toEqual([])
  })
  it('reads no clock, no randomness and no console', () => {
    expect(code).not.toMatch(/\bconsole\b/)
    expect(code).not.toMatch(/\bDate\s*\.\s*now\b/)
    expect(code).not.toMatch(/\bnew\s+Date\s*\(\s*\)/)
    expect(code).not.toMatch(/\bMath\s*\.\s*random\b/)
    expect(code).not.toMatch(/\bperformance\b/)
  })
})

describe('validateCheckIn.js', () => {
  it('holds no numeric range literal in its body (7.2)', () => {
    const code = stripComments(readFileSync(join(DIR, 'validateCheckIn.js'), 'utf8'))
      .split('\n')
      .filter((line) => !/NUMBER_PATTERN\s*=/.test(line))
      .join('\n')
      .replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, '""') // drop string and template contents
    expect(code.match(/(?<![\w.])\d+(?:\.\d+)?(?![\w])/g) ?? []).toEqual([])
  })
})