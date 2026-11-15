import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const UI_DIR = dirname(fileURLToPath(import.meta.url))
const SRC_DIR = join(UI_DIR, '..')
const isTest = (f) => /\.test\.jsx?$/.test(f)
const files = readdirSync(UI_DIR).filter((f) => /\.jsx?$/.test(f) && !isTest(f))
const read = (f) => readFileSync(join(UI_DIR, f), 'utf8')

const importSpecifiers = (code) => [...code.matchAll(/(?:from\s*|import\s*\(?\s*)(['"])([^'"]+)\1/g)].map((m) => m[2])

describe('ui source scan', () => {
  it('finds ui source files, including the existing offline ones', () => {
    expect(files).toEqual(expect.arrayContaining(['OfflineIndicator.jsx', 'offlineStatus.js', 'useOfflineReady.js', 'statusStyle.js', 'wording.js']))
  })

  describe.each(files)('%s', (file) => {
    const code = read(file)

    if (file !== 'statusStyle.js') {
      it('has no hex colour', () => {
        expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
      })
    }
    if (file !== 'wording.js') {
      it('has no 250 or 600 as a whole number', () => {
        expect(code).not.toMatch(/\b250\b/)
        expect(code).not.toMatch(/\b600\b/)
      })
    }
    it('has no URL, fetch or XMLHttpRequest', () => {
      expect(code).not.toMatch(/https?:\/\//)
      expect(code).not.toMatch(/\bfetch\b/)
      expect(code).not.toMatch(/\bXMLHttpRequest\b/)
    })
    it('imports no Dexie and nothing from store/', () => {
      const bad = importSpecifiers(code).filter((s) => s === 'dexie' || s.startsWith('dexie/') || /(^|\/)store(\/|$)/.test(s))
      expect(bad).toEqual([])
    })
  })

  it('does not match numbers such as 6000 or 60000 as 600', () => {
    expect('const n = 6000 + 60000').not.toMatch(/\b600\b/)
    expect('const n = 600').toMatch(/\b600\b/)
  })

  it('keeps regionStatus.js free of React and DOM imports and takes only statusRank from the engine', () => {
    const imports = importSpecifiers(read('regionStatus.js'))
    expect(imports.filter((s) => s === 'react' || s.startsWith('react/') || s.startsWith('react-'))).toEqual([])
    expect(read('regionStatus.js')).not.toMatch(/\b(document|window)\b/)
    const engine = readFileSync(join(UI_DIR, 'regionStatus.js'), 'utf8').match(/import\s*\{([^}]*)\}\s*from\s*'\.\.\/engine\/[^']*'/g) ?? []
    expect(engine).toEqual(["import { statusRank } from '../engine/urgency.js'"])
  })

  it('references no remote font, image, script or stylesheet in index.html or index.css', () => {
    for (const p of [join(SRC_DIR, 'index.css'), join(SRC_DIR, '..', 'index.html')]) {
      const text = readFileSync(p, 'utf8')
      expect(text, p).not.toMatch(/https?:\/\//)
      expect(text, p).not.toMatch(/@import\s+url\(/)
    }
  })
})
