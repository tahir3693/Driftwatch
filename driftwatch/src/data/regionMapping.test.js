import { describe, it, expect } from 'vitest'
import mapping from './regionMapping.json'
import { DOMAINS } from './domains.js'

describe('regionMapping', () => {
  it('has three regions in Tab order', () => {
    expect(mapping.regions.map((r) => r.id)).toEqual(['head_and_lungs', 'bones_and_muscles', 'whole_body'])
    expect(mapping.regions.map((r) => r.name)).toEqual(['Head and lungs', 'Bones and muscles', 'Whole body'])
  })

  it('places every domain in exactly one region', () => {
    for (const d of DOMAINS) {
      const hits = mapping.regions.filter((r) => r.domains.includes(d))
      expect(hits, d).toHaveLength(1)
    }
  })

  it('lists no domain that does not exist', () => {
    for (const r of mapping.regions) for (const d of r.domains) expect(DOMAINS).toContain(d)
  })
})
