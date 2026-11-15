import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'groundReport.css'), 'utf8')
const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '')

/** The text inside the first `@media print { ... }` block. */
function printBlock(text) {
  const start = text.indexOf('@media print')
  if (start < 0) return ''
  let depth = 0
  for (let i = text.indexOf('{', start); i < text.length; i++) {
    if (text[i] === '{') depth++
    if (text[i] === '}' && --depth === 0) return text.slice(text.indexOf('{', start) + 1, i)
  }
  return ''
}

describe('groundReport.css', () => {
  const block = printBlock(noComments)

  it('has an @media print block with no-print, white, black and 9pt', () => {
    expect(block).not.toBe('')
    expect(block).toMatch(/\.no-print\s*\{[^}]*display:\s*none\s*!important/)
    expect(block).toMatch(/white/)
    expect(block).toMatch(/black/)
    expect(block).toMatch(/9pt/)
  })

  it('makes html, body, #root and main white with black text in print', () => {
    const rule = block.match(/html,\s*body,\s*#root,\s*main\s*\{([^}]*)\}/)
    expect(rule).not.toBeNull()
    expect(rule[1]).toMatch(/background:\s*white\s*!important/)
    expect(rule[1]).toMatch(/color:\s*black\s*!important/)
  })

  it('sets the page margin and leaves the size to the user', () => {
    expect(noComments).toMatch(/@page\s*\{[^}]*size:\s*auto/)
    expect(noComments).toMatch(/@page\s*\{[^}]*margin:\s*10mm/)
  })

  it('has no hex colour, url(), @import or http', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(noComments).not.toMatch(/url\(/)
    expect(css).not.toMatch(/@import/)
    expect(css).not.toMatch(/http/)
  })

  it('uses no hidden overflow, no fixed sheet height and no font size under 9pt', () => {
    expect(noComments).not.toMatch(/overflow(-[xy])?:\s*hidden/)
    expect(noComments).not.toMatch(/\.report-sheet\s*\{[^}]*\bheight:/)
    for (const m of noComments.matchAll(/font-size:\s*([\d.]+)(pt|px|rem|em)/g)) {
      const n = Number(m[1])
      const pt = m[2] === 'pt' ? n : m[2] === 'px' ? n * 0.75 : n * 12
      expect(pt, m[0]).toBeGreaterThanOrEqual(9)
    }
  })

  it('prints the report in black on white and keeps entries together', () => {
    expect(block).toMatch(/\.report-sheet svg[\s\S]*fill:\s*black/)
    expect(block).toMatch(/\.alert-entry\s*\{[^}]*break-inside:\s*avoid/)
    expect(block).toMatch(/column-count:\s*2/)
    expect(block).toMatch(/border-collapse:\s*collapse/)
  })
})
