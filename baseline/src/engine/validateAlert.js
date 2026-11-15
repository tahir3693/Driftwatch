const FIELDS = [
  'domain',
  'indicator',
  'value',
  'baseline',
  'status',
  'urgency',
  'why',
  'action',
  'escalate',
  'source',
]

const STRING_FIELDS = ['domain', 'indicator', 'why', 'action', 'source']
const STATUS_VALUES = ['normal', 'watch', 'act']

const fail = (field, message) => ({ ok: false, field, message })

export function validateAlert(alert) {
  if (alert === null || typeof alert !== 'object' || Array.isArray(alert)) {
    return fail('alert', 'alert must be an object')
  }

  for (const field of FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(alert, field)) {
      return fail(field, `missing field: ${field}`)
    }
  }

  for (const field of Object.keys(alert)) {
    if (!FIELDS.includes(field)) {
      return fail(field, `unexpected field: ${field}`)
    }
  }

  for (const field of STRING_FIELDS) {
    if (typeof alert[field] !== 'string') {
      return fail(field, `${field} must be a string`)
    }
  }

  if (!STATUS_VALUES.includes(alert.status)) {
    return fail('status', 'status must be one of normal, watch, act (lower case)')
  }

  const u = alert.urgency
  if (typeof u !== 'number' || !Number.isFinite(u) || u < 0 || u > 100) {
    return fail('urgency', 'urgency must be a number from 0 to 100')
  }

  if (typeof alert.escalate !== 'boolean') {
    return fail('escalate', 'escalate must be a boolean')
  }

  return { ok: true }
}
