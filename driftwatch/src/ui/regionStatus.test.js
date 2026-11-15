import { describe, it, expect } from 'vitest'
import { groupByRegion, computeRegionStatus, sortByUrgency, regionAccessibleName } from './regionStatus.js'
import mapping from '../data/regionMapping.json'

const a = (domain, status, urgency = 0, escalate = false) => ({ domain, indicator: `${domain}_x`, status, urgency, escalate })

describe('groupByRegion', () => {
  it('returns every region id and groups by domain', () => {
    const out = groupByRegion([a('radiation', 'watch'), a('gravity', 'act'), a('nutrition', 'normal')], mapping)
    expect(Object.keys(out)).toEqual(['head_and_lungs', 'bones_and_muscles', 'whole_body'])
    expect(out.head_and_lungs).toHaveLength(1)
    expect(out.bones_and_muscles).toHaveLength(1)
    expect(out.whole_body).toHaveLength(1)
  })
  it('returns empty arrays for no alerts and drops an unmapped domain', () => {
    expect(groupByRegion([], mapping)).toEqual({ head_and_lungs: [], bones_and_muscles: [], whole_body: [] })
    const out = groupByRegion([a('mystery', 'act')], mapping)
    expect(Object.values(out).flat()).toEqual([])
  })
})

describe('computeRegionStatus', () => {
  it('gives null status for an empty array', () => {
    expect(computeRegionStatus([])).toEqual({ status: null, escalate: false })
  })
  it('takes the highest status and reports escalation', () => {
    expect(computeRegionStatus([a('gravity', 'normal'), a('gravity', 'act', 70, true), a('gravity', 'watch')])).toEqual({
      status: 'act',
      escalate: true,
    })
    expect(computeRegionStatus([a('gravity', 'normal'), a('gravity', 'watch')])).toEqual({ status: 'watch', escalate: false })
  })
})

describe('sortByUrgency', () => {
  it('sorts descending, keeps ties in input order and does not mutate', () => {
    const input = [{ ...a('x', 'watch', 10), id: 1 }, { ...a('x', 'act', 80), id: 2 }, { ...a('x', 'watch', 10), id: 3 }]
    const out = sortByUrgency(input)
    expect(out.map((x) => x.id)).toEqual([2, 1, 3])
    expect(input.map((x) => x.id)).toEqual([1, 2, 3])
    expect(out).not.toBe(input)
  })
})

describe('regionAccessibleName', () => {
  it('joins the name and the label', () => {
    expect(regionAccessibleName('Head and lungs', 'watch')).toBe('Head and lungs: Watch')
    expect(regionAccessibleName('Head and lungs', null)).toBe('Head and lungs: No data')
  })
})
