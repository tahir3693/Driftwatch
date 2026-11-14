import { describe, it, expect } from 'vitest'
import { patterns } from './patterns.js'

const cutoffs = { watch_from: 30, act_from: 60 }
const options = { domain: 'radiation', cutoffs }
const defs = {
  combined_load: {
    needs: ['a', 'b', 'c'],
    min_in_watch: 2,
    for_days: 2,
    result: 'act',
    escalate: true,
    why: 'Several signs together.',
    action: 'Call ground.',
    source: 'design value',
  },
}
const day = (a, b, c) => [
  { indicator: 'a', status: a },
  { indicator: 'b', status: b },
  { indicator: 'c', status: c },
]

describe('patterns', () => {
  it('fires when the rule is met on each of the last for_days days', () => {
    const res = patterns(defs, [day('normal', 'normal', 'normal'), day('watch', 'act', 'normal'), day('watch', 'watch', 'normal')], options)
    expect(res).toHaveLength(1)
    expect(Object.keys(res[0]).sort()).toEqual(
      ['action', 'baseline', 'domain', 'escalate', 'indicator', 'source', 'status', 'urgency', 'value', 'why'].sort(),
    )
    expect(res[0]).toMatchObject({
      indicator: 'combined_load', domain: 'radiation', status: 'act', urgency: 60,
      escalate: true, action: 'Call ground.', source: 'design value', value: 2, baseline: null,
    })
  })

  it('does not fire below min_in_watch', () => {
    expect(patterns(defs, [day('watch', 'normal', 'normal'), day('watch', 'normal', 'normal')], options)).toEqual([])
  })

  it('does not fire when one of the for_days days fails', () => {
    expect(patterns(defs, [day('watch', 'watch', 'normal'), day('watch', 'normal', 'normal')], options)).toEqual([])
    expect(patterns(defs, [day('normal', 'normal', 'normal'), day('watch', 'watch', 'normal')], options)).toEqual([])
  })

  it('does not fire when history is shorter than for_days', () => {
    expect(patterns(defs, [day('watch', 'watch', 'watch')], options)).toEqual([])
  })

  it('names the contributing indicators in why and uses the watch floor for watch results', () => {
    const w = { p: { ...defs.combined_load, result: 'watch', escalate: false, for_days: 1 } }
    const [alert] = patterns(w, [day('watch', 'normal', 'act')], options)
    expect(alert.why).toContain('a')
    expect(alert.why).toContain('c')
    expect(alert.why).not.toContain('b,')
    expect(alert.urgency).toBe(30)
    expect(alert.escalate).toBe(false)
  })
})
