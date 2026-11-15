import { describe, it, expect } from 'vitest'
import { helpSections } from './helpModel.js'

const HEADINGS = ['How to measure', 'Why it matters', 'What to do', 'Source']

describe('helpSections', () => {
  it('returns the rule text unchanged for a full rule', () => {
    const out = helpSections({ label: 'Sleep', howToMeasure: 'h', whyItMatters: 'w', action: 'a', source: 's' })
    expect(out.label).toBe('Sleep')
    expect(out.sections.map((s) => s.heading)).toEqual(HEADINGS)
    expect(out.sections.map((s) => s.text)).toEqual(['h', 'w', 'a', 's'])
  })
  it('uses "Not available" for missing and empty fields', () => {
    const out = helpSections({ howToMeasure: '', action: 'a' })
    expect(out.sections.map((s) => s.text)).toEqual(['Not available', 'Not available', 'a', 'Not available'])
  })
  it('handles no rule', () => {
    const out = helpSections(undefined)
    expect(out.label).toBeNull()
    expect(out.sections.every((s) => s.text === 'Not available')).toBe(true)
  })
})
