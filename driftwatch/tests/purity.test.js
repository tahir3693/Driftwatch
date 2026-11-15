import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const engineDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'engine')

const isEngineSource = (name) =>
  name.endsWith('.js') && !name.endsWith('.test.js') && !name.endsWith('.property.test.js')

// Remove comments so words inside comments are not flagged. String contents are kept,
// so import specifiers are still visible.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
}

const files = readdirSync(engineDir).filter(isEngineSource)

// Matches `import ... from 'x'`, `import 'x'`, `export ... from 'x'`, `import('x')`, `require('x')`.
const specifiers = (code) => {
  const out = []
  const re = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)(['"`])([^'"`]+)\1/g
  let m
  while ((m = re.exec(code))) out.push(m[2])
  return out
}

const forbiddenImport = (spec) =>
  /\.json$/i.test(spec) ||
  spec === 'react' || spec.startsWith('react/') || spec.startsWith('react-') ||
  spec === 'dexie' || spec.startsWith('dexie/') ||
  /(^|\/)ui(\/|$)/.test(spec)

const forbiddenApis = [
  ['console', /\bconsole\b/],
  ['fetch', /\bfetch\b/],
  ['XMLHttpRequest', /\bXMLHttpRequest\b/],
  ['Date.now', /\bDate\s*\.\s*now\b/],
]

describe('engine purity', () => {
  it('finds engine source files to check', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  describe.each(files)('%s', (file) => {
    const code = stripComments(readFileSync(join(engineDir, file), 'utf8'))

    it('has no import from ui/, react, dexie or a .json file', () => {
      const bad = specifiers(code).filter(forbiddenImport)
      expect(bad).toEqual([])
    })

    it.each(forbiddenApis)('does not use %s', (_name, re) => {
      expect(code).not.toMatch(re)
    })
  })
})
