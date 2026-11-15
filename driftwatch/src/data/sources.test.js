import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sources from './sources.json'

const MODULES = join(dirname(fileURLToPath(import.meta.url)), '..', 'modules')
const items = sources.groups.flatMap((g) => g.items.map((i) => ({ ...i, publisher: g.publisher })))
const listed = items.map((i) => i.id).join(' | ')

// Every rules.json and the radiation engine, as text: the places that cite a source.
const cited = readdirSync(MODULES)
  .flatMap((m) => [join(MODULES, m, 'rules.json'), join(MODULES, m, `${m}-engine.js`)])
  .filter(existsSync)
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n')

describe('sources list', () => {
  it('has a NASA group and a NOAA group, each item with an id, title, kind and use', () => {
    expect(sources.groups.map((g) => g.publisher)).toEqual(['NASA', 'NOAA'])
    for (const i of items) {
      for (const k of ['id', 'title', 'kind', 'usedFor']) expect(i[k], `${i.id} ${k}`).toEqual(expect.any(String))
      expect(['Document', 'Dataset']).toContain(i.kind)
    }
  })

  it('lists every NASA technical brief cited in the modules', () => {
    const briefs = [...new Set(cited.match(/OCHMO-TB-\d+/g))]
    expect(briefs.length).toBeGreaterThan(0)
    for (const b of briefs) expect(listed).toContain(b)
  })

  it('lists NASA-STD-3001 and the NTRS paper when the modules cite them', () => {
    if (cited.includes('NASA-STD-3001')) expect(listed).toContain('NASA-STD-3001')
    if (cited.includes('Behavioral Challenges of a Mars Mission')) expect(listed).toContain('Behavioral Challenges of a Mars Mission')
  })

  it('labels the NOAA S-scale and GOES flux as NOAA, never NASA', () => {
    expect(cited).toMatch(/NOAA/)
    const noaa = items.filter((i) => /NOAA|S-scale|GOES/.test(i.id))
    expect(noaa.map((i) => i.id)).toEqual(expect.arrayContaining(['NOAA SWPC Space Weather Scales (S-scale)', 'NOAA SWPC GOES proton flux']))
    for (const i of noaa) expect(i.publisher).toBe('NOAA')
    for (const i of items.filter((x) => x.publisher === 'NASA')) expect(i.id).not.toMatch(/NOAA|S-scale|GOES/)
  })

  it('describes the reference event without a number and never as a limit', () => {
    const text = JSON.stringify(sources)
    expect(text).not.toMatch(/\b250\b/)
    expect(text).toContain('design requirement for a reference solar particle event')
    expect(text).not.toMatch(/reference solar particle event (dose )?limit/i)
  })
})
