import { DOMAINS } from '../data/domains.js'

const isMissing = (v) => v === undefined || v === null || v === ''

const fail = (field, message) => ({ ok: false, field, message })

export function validateReading(reading) {
  if (reading === null || typeof reading !== 'object') {
    return fail('reading', 'reading must be an object')
  }
  const { domain, timestamp, indicator, value } = reading

  if (!DOMAINS.includes(domain)) {
    return fail('domain', `unknown domain: ${String(domain)}`)
  }
  if (isMissing(timestamp)) {
    return fail('timestamp', 'timestamp is required')
  }
  if (isMissing(indicator)) {
    return fail('indicator', 'indicator is required')
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fail('value', 'value must be a finite number')
  }
  return { ok: true }
}
