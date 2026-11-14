import { describe, it, expect } from 'vitest'
import { reconcileCutoffs } from './reconcileCutoffs.js'

const cutoffs = { watch_from: 30, act_from: 60, source: 'design value' }

describe('reconcileCutoffs', () => {
  it('returns no warnings when the urgency block is absent', () => {
    const r = reconcileCutoffs({ module: 'environment' }, cutoffs, 'environment')
    expect(r.warnings).toEqual([])
  })

  it('returns no warnings when the urgency block is equal', () => {
    const rules = { urgency: { watch_from: 30, act_from: 60, source: 'x' } }
    expect(reconcileCutoffs(rules, cutoffs, 'environment').warnings).toEqual([])
  })

  it('returns one warning naming the module when the block differs', () => {
    const rules = { urgency: { watch_from: 25, act_from: 60, source: 'x' } }
    const r = reconcileCutoffs(rules, cutoffs, 'nutrition')
    expect(r.warnings).toHaveLength(1)
    expect(r.warnings[0]).toContain('nutrition')
    const both = reconcileCutoffs({ urgency: { watch_from: 20, act_from: 70 } }, cutoffs, 'm')
    expect(both.warnings).toHaveLength(1)
  })

  it('always returns the same shared cutoffs object', () => {
    const differing = { urgency: { watch_from: 1, act_from: 2 } }
    expect(reconcileCutoffs({}, cutoffs, 'a').cutoffs).toBe(cutoffs)
    expect(reconcileCutoffs(differing, cutoffs, 'a').cutoffs).toBe(cutoffs)
  })
})
