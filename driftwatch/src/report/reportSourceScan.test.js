import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const isTest = (f) => /\.test\.jsx?$/.test(f)
const files = readdirSync(DIR).filter((f) => /\.jsx?$/.test(f) && !isTest(f))
const read = (f) => readFileSync(join(DIR, f), 'utf8')
const importSpecifiers = (code) => [...code.matchAll(/(?:from\s*|import\s*\(?\s*)(['"])([^'"]+)\1/g)].map((m) => m[2])
const ALLOWED_IMPORTS = new Set(['../engine/urgency.js', '../data/domains.js', './validateReportConfig.js'])

describe('report source scan', () => {
  it('finds the report source files', () => {
    expect(files).toEqual(
      expect.arrayContaining(['buildGroundReport.js', 'flattenReadings.js', 'formatTime.js', 'validateReportConfig.js']),
    )
  })

  describe.each(files)('%s', (file) => {
    const code = read(file)

    it('imports no React, Dexie, store/, ui/ or JSON, and only allowed engine and data files', () => {
      for (const spec of importSpecifiers(code)) {
        expect(spec, spec).not.toMatch(/^react($|[-/])/)
        expect(spec, spec).not.toMatch(/dexie/)
        expect(spec, spec).not.toMatch(/(^|\/)store(\/|$)/)
        expect(spec, spec).not.toMatch(/(^|\/)ui(\/|$)/)
        expect(spec, spec).not.toMatch(/\.json$/)
        expect(ALLOWED_IMPORTS.has(spec), spec).toBe(true)
      }
    })

    it('reads no clock, console, network or randomness', () => {
      expect(code).not.toMatch(/Date\.now/)
      expect(code).not.toMatch(/new Date\(\s*\)/)
      expect(code).not.toMatch(/\bconsole\b/)
      expect(code).not.toMatch(/\bfetch\b/)
      expect(code).not.toMatch(/\bXMLHttpRequest\b/)
      expect(code).not.toMatch(/Math\.random/)
    })

    it('has no 250 and no NASA text', () => {
      expect(code).not.toMatch(/\b250\b/)
      expect(code).not.toMatch(/NASA/)
    })
  })

  it('lets only formatTime.js build a Date, and only from an argument', () => {
    for (const f of files) {
      if (f !== 'formatTime.js') expect(read(f), f).not.toMatch(/new Date\(/)
    }
    expect(read('formatTime.js')).toMatch(/new Date\(timestamp\)/)
  })

  it('only the engine and data imports named in the spec are used by buildGroundReport.js', () => {
    expect(importSpecifiers(read('buildGroundReport.js')).sort()).toEqual(['../data/domains.js', '../engine/urgency.js', './validateReportConfig.js'])
  })
})
