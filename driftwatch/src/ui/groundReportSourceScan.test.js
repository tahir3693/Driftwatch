import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const UI_DIR = dirname(fileURLToPath(import.meta.url))
const FILES = ['GroundReport.jsx', 'AppNav.jsx', 'groundReportText.js', 'groundReport.css']
const read = (f) => readFileSync(join(UI_DIR, f), 'utf8')
const importSpecifiers = (code) => [...code.matchAll(/(?:from\s*|import\s*\(?\s*)(['"])([^'"]+)\1/g)].map((m) => m[2])

describe('ground report UI source scan', () => {
  describe.each(FILES)('%s', (file) => {
    const code = read(file)

    it('has no URL, fetch or XMLHttpRequest', () => {
      expect(code).not.toMatch(/https?:\/\//)
      expect(code).not.toMatch(/\bfetch\b/)
      expect(code).not.toMatch(/\bXMLHttpRequest\b/)
    })

    it('has no img tag, no 250 and no NASA text', () => {
      expect(code).not.toMatch(/<img/)
      expect(code).not.toMatch(/\b250\b/)
      expect(code).not.toMatch(/NASA/)
    })

    if (file.endsWith('.jsx') || file.endsWith('.css')) {
      it('has no hex colour', () => {
        expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
      })
    }

    if (file.endsWith('.jsx') || file.endsWith('.js')) {
      it('imports no Dexie and nothing from store/', () => {
        const bad = importSpecifiers(code).filter((s) => s === 'dexie' || s.startsWith('dexie/') || /(^|\/)store(\/|$)/.test(s))
        expect(bad).toEqual([])
      })
    }
  })

  it('keeps GroundReport.jsx free of clock reads', () => {
    const code = read('GroundReport.jsx')
    expect(code).not.toMatch(/Date\.now/)
    expect(code).not.toMatch(/new Date\(\s*\)/)
  })

  it('has no remote font, script or stylesheet in groundReport.css', () => {
    const css = read('groundReport.css')
    expect(css).not.toMatch(/url\(/)
    expect(css).not.toMatch(/@import/)
  })

  it('has no remote reference in index.html and index.css, and index.html loads only its own script and local icons', () => {
    for (const p of [join(UI_DIR, '..', 'index.css'), join(UI_DIR, '..', '..', 'index.html')]) {
      const text = readFileSync(p, 'utf8')
      expect(text, p).not.toMatch(/https?:\/\//)
      expect(text, p).not.toMatch(/@import\s+url\(/)
    }
  })
})
