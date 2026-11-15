import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const STORE = dirname(fileURLToPath(import.meta.url))
const UI = join(STORE, '..', 'ui')
const CHECKIN_STORE = ['checkins.js', 'checkinService.js', 'useCheckIn.js']
const CHECKIN_UI = [
  'CheckInScreen.jsx', 'EnvironmentForm.jsx', 'RadiationForm.jsx', 'IsolationForm.jsx', 'GravityForm.jsx',
  'NutritionForm.jsx', 'ReactionCheck.jsx', 'StreakDisplay.jsx', 'FormField.jsx', 'YesNoField.jsx', 'FormShell.jsx', 'checkinText.js',
]
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
const specifiers = (code) => [...code.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)(['"`])([^'"`]+)\1/g)].map((m) => m[2])

const targets = [...CHECKIN_STORE.map((f) => [join(STORE, f), f, false]), ...CHECKIN_UI.map((f) => [join(UI, f), `ui/${f}`, true])]

describe('check-in source scan', () => {
  it('finds the files it scans', () => {
    const present = new Set([...readdirSync(STORE), ...readdirSync(UI)])
    for (const f of [...CHECKIN_STORE, ...CHECKIN_UI]) expect(present.has(f), f).toBe(true)
  })
  describe.each(targets)('%s', (path, label, isUi) => {
    const code = stripComments(readFileSync(path, 'utf8'))
    it('makes no network request and has no remote URL', () => {
      expect(code).not.toMatch(/\bfetch\b/)
      expect(code).not.toMatch(/\bXMLHttpRequest\b/)
      expect(code).not.toMatch(/https?:\/\//)
    })
    if (isUi) {
      it('imports no Dexie and nothing from store/', () => {
        const bad = specifiers(code).filter((s) => s === 'dexie' || s.startsWith('dexie/') || /(^|\/)store(\/|$)/.test(s))
        expect(bad).toEqual([])
      })
    }
  })
})