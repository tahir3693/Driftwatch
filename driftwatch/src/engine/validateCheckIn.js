// Validates raw check-in form values against ranges passed in by the caller. Pure.
// Ranges (label, unit, min, max, integer) come from the `ranges` argument, never from this file.
import { SYMPTOM_KEYS } from './radiationInputs.js'

const NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)$/

// Fields per module in form order. kind: 'number' | 'yesno' | 'optional'.
const FIELDS = {
  environment: [
    { field: 'co2', kind: 'number', range: 'co2' },
    { field: 'headache', kind: 'yesno' },
    { field: 'nauseaFatigue', kind: 'yesno' },
    { field: 'temperature', kind: 'number', range: 'temperature' },
  ],
  radiation: [],
  isolation: [
    { field: 'sleep', kind: 'number', range: 'sleep' },
    { field: 'mood', kind: 'number', range: 'mood' },
    { field: 'social', kind: 'number', range: 'social' },
    { field: 'reaction', kind: 'optional', range: 'reaction' },
  ],
  gravity: [{ field: 'exercise', kind: 'number', range: 'exercise' }],
  nutrition: [{ field: 'intake', kind: 'number', range: 'intake' }],
}

const asText = (v) => (v === undefined || v === null ? '' : String(v).trim())

// Returns { value } or { message }.
function checkNumber(text, range, optional) {
  if (text === '') return optional ? { value: null } : { message: `Enter a value for ${range.label}.` }
  if (!NUMBER_PATTERN.test(text)) return { message: `${range.label} must be a number.` }
  const n = Number(text)
  if (!Number.isFinite(n)) return { message: `${range.label} must be a number.` }
  if (range.integer && !Number.isInteger(n)) return { message: `${range.label} must be a whole number.` }
  if (n < range.min || n > range.max) {
    const unit = range.unit ? ` ${range.unit}` : ''
    return { message: `${range.label} must be from ${range.min} to ${range.max}${unit}.` }
  }
  return { value: n }
}

/**
 * module: 'environment' | 'radiation' | 'isolation' | 'gravity' | 'nutrition'
 * Returns { ok: true, values } or { ok: false, errors: [{ field, message }] } with errors in form order.
 */
export function validateCheckIn(module, raw, ranges) {
  const fields = FIELDS[module]
  if (!fields) throw new Error(`Unknown module: ${String(module)}`)
  const input = raw ?? {}
  if (module === 'radiation') {
    const given = input.symptoms ?? {}
    const symptoms = {}
    for (const k of SYMPTOM_KEYS) symptoms[k] = given[k] === true
    return { ok: true, values: { symptoms } }
  }
  const values = {}
  const errors = []
  for (const f of fields) {
    if (f.kind === 'yesno') {
      if (input[f.field] === true || input[f.field] === false) values[f.field] = input[f.field]
      else errors.push({ field: f.field, message: 'Choose yes or no.' })
      continue
    }
    const res = checkNumber(asText(input[f.field]), ranges[f.range], f.kind === 'optional')
    if (res.message) errors.push({ field: f.field, message: res.message })
    else values[f.field] = res.value
  }
  return errors.length ? { ok: false, errors } : { ok: true, values }
}