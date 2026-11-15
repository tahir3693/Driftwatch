// Loads the check-in form ranges and config from bundled JSON (no network). Same pattern as cutoffs.js.
import rawRanges from './checkinRanges.json'
import rawConfig from './checkinConfig.json'

export const RANGE_KEYS = Object.freeze(['co2', 'temperature', 'sleep', 'mood', 'social', 'exercise', 'intake', 'reaction'])

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

export function validateRanges(raw) {
  if (raw === null || typeof raw !== 'object') throw new Error('checkinRanges: must be an object')
  const out = {}
  for (const key of RANGE_KEYS) {
    const r = raw[key]
    if (r === null || typeof r !== 'object') throw new Error(`checkinRanges: missing range ${key}`)
    if (typeof r.label !== 'string' || r.label === '') throw new Error(`checkinRanges.${key}: label is required`)
    if (typeof r.unit !== 'string') throw new Error(`checkinRanges.${key}: unit must be a string`)
    if (!isNum(r.min) || !isNum(r.max)) throw new Error(`checkinRanges.${key}: min and max must be numbers`)
    if (r.min >= r.max) throw new Error(`checkinRanges.${key}: min must be below max`)
    if (typeof r.integer !== 'boolean') throw new Error(`checkinRanges.${key}: integer must be true or false`)
    if (typeof r.source !== 'string' || r.source === '') throw new Error(`checkinRanges.${key}: source is required`)
    out[key] = Object.freeze({ ...r })
  }
  return Object.freeze(out)
}

export function validateConfig(raw) {
  if (raw === null || typeof raw !== 'object') throw new Error('checkinConfig: must be an object')
  if (!Number.isInteger(raw.minModulesPerDay) || raw.minModulesPerDay < 1) throw new Error('checkinConfig: minModulesPerDay must be a whole number of at least 1')
  if (!Number.isInteger(raw.reactionMinTaps) || raw.reactionMinTaps < 1) throw new Error('checkinConfig: reactionMinTaps must be a whole number of at least 1')
  if (typeof raw.source !== 'string' || raw.source === '') throw new Error('checkinConfig: source is required')
  return Object.freeze({ ...raw })
}

let ranges = null
let config = null

export function loadCheckinRanges() {
  if (ranges === null) ranges = validateRanges(rawRanges)
  return ranges
}

export function loadCheckinConfig() {
  if (config === null) config = validateConfig(rawConfig)
  return config
}