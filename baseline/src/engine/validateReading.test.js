import { describe, it, expect } from 'vitest'
import { validateReading } from './validateReading.js'
import { DOMAINS } from '../data/domains.js'

const valid = { domain: 'radiation', indicator: 'dose', timestamp: 1700000000000, value: 0.4 }

describe('validateReading', () => {
  it('accepts a valid reading for every domain', () => {
    for (const domain of DOMAINS) {
      expect(validateReading({ ...valid, domain })).toEqual({ ok: true })
    }
  })

  it('accepts a value of zero', () => {
    expect(validateReading({ ...valid, value: 0 })).toEqual({ ok: true })
  })

  it('rejects an unknown domain and names it', () => {
    const r = validateReading({ ...valid, domain: 'sleep' })
    expect(r.ok).toBe(false)
    expect(r.field).toBe('domain')
    expect(r.message).toContain('sleep')
  })

  it('rejects a missing timestamp', () => {
    const { timestamp, ...rest } = valid
    const r = validateReading(rest)
    expect(r).toMatchObject({ ok: false, field: 'timestamp' })
    expect(r.message).toContain('timestamp')
  })

  it('rejects a missing indicator', () => {
    const r = validateReading({ ...valid, indicator: '' })
    expect(r).toMatchObject({ ok: false, field: 'indicator' })
    expect(r.message).toContain('indicator')
  })

  it.each([['string', '5'], ['NaN', NaN], ['Infinity', Infinity], ['null', null], ['undefined', undefined]])(
    'rejects a %s value',
    (_, value) => {
      const r = validateReading({ ...valid, value })
      expect(r).toMatchObject({ ok: false, field: 'value' })
      expect(r.message).toContain('value')
    },
  )

  it('rejects a non-object reading', () => {
    expect(validateReading(null).ok).toBe(false)
  })
})
