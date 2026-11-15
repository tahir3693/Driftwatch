import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { helpSections } from './helpModel.js'

const field = fc.option(fc.string(), { nil: undefined })

// Feature: dashboard, Property 10: Help text is exact or "Not available"
describe('helpModel text', () => {
  it('returns four ordered sections with exact text or "Not available"', () => {
    fc.assert(
      fc.property(
        fc.option(fc.record({ howToMeasure: field, whyItMatters: field, action: field, source: field }), { nil: undefined }),
        (rule) => {
          const { sections } = helpSections(rule)
          expect(sections.map((s) => s.heading)).toEqual(['How to measure', 'Why it matters', 'What to do', 'Source'])
          const keys = ['howToMeasure', 'whyItMatters', 'action', 'source']
          sections.forEach((s, i) => {
            const v = rule?.[keys[i]]
            expect(s.text).toBe(typeof v === 'string' && v.length > 0 ? v : 'Not available')
          })
        },
      ),
      { numRuns: 100 },
    )
  })
})