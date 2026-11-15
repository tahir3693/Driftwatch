import { describe, it, expect } from 'vitest'
import { validateAlert } from './validateAlert.js'

const valid = () => ({
  domain: 'radiation',
  indicator: 'dose_rate',
  value: 0.5,
  baseline: { mean: 0.4, sd: 0.1, n: 14 },
  status: 'watch',
  urgency: 45,
  why: 'Dose rate is above personal baseline.',
  action: 'Review shielding plan.',
  escalate: false,
  source: 'design value',
})

describe('validateAlert', () => {
  it('accepts a valid alert', () => {
    expect(validateAlert(valid())).toEqual({ ok: true })
  })

  it('accepts null baseline and boundary urgency 0 and 100', () => {
    expect(validateAlert({ ...valid(), baseline: null, urgency: 0 })).toEqual({ ok: true })
    expect(validateAlert({ ...valid(), urgency: 100 })).toEqual({ ok: true })
  })

  it('rejects a non-object', () => {
    for (const bad of [null, undefined, 5, 'x', []]) {
      expect(validateAlert(bad)).toMatchObject({ ok: false, field: 'alert' })
    }
  })

  it.each([
    'domain', 'indicator', 'value', 'baseline', 'status',
    'urgency', 'why', 'action', 'escalate', 'source',
  ])('rejects a missing %s', (field) => {
    const a = valid()
    delete a[field]
    const r = validateAlert(a)
    expect(r.ok).toBe(false)
    expect(r.field).toBe(field)
    expect(r.message).toContain(field)
  })

  it('rejects an extra field', () => {
    const r = validateAlert({ ...valid(), extra: 1 })
    expect(r).toMatchObject({ ok: false, field: 'extra' })
  })

  it.each(['domain', 'indicator', 'why', 'action', 'source'])(
    'rejects a non-string %s',
    (field) => {
      const r = validateAlert({ ...valid(), [field]: 42 })
      expect(r).toMatchObject({ ok: false, field })
    },
  )

  it.each(['Normal', 'WATCH', 'critical', '', null, 1])(
    'rejects status %s',
    (status) => {
      expect(validateAlert({ ...valid(), status })).toMatchObject({ ok: false, field: 'status' })
    },
  )

  it.each([-1, 100.5, 101, NaN, Infinity, '50', null])(
    'rejects urgency %s',
    (urgency) => {
      expect(validateAlert({ ...valid(), urgency })).toMatchObject({ ok: false, field: 'urgency' })
    },
  )

  it.each(['true', 1, 0, null])('rejects non-boolean escalate %s', (escalate) => {
    expect(validateAlert({ ...valid(), escalate })).toMatchObject({ ok: false, field: 'escalate' })
  })
})
