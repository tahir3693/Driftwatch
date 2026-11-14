import { computeBaseline } from './computeBaseline.js'
import { zScore } from './zScore.js'
import { cusum, DRIFT_DEFAULTS } from './drift.js'
import { urgency } from './urgency.js'

const DAY_MS = 86_400_000
const BAND_NAMES = ['act', 'watch', 'normal']

function familyOf(bands) {
  for (const name of BAND_NAMES) {
    const keys = Object.keys(bands?.[name] ?? {})
    if (keys.some((k) => k.startsWith('abs_z_'))) return 'abs_z_'
    if (keys.some((k) => k.startsWith('value_'))) return 'value_'
    if (keys.some((k) => k.startsWith('z_'))) return 'z_'
  }
  return 'z_'
}

function matches(band, family, x) {
  const min = band?.[`${family}min`]
  const max = band?.[`${family}max`]
  if (min !== undefined && !(x >= min)) return false
  if (max !== undefined && !(x < max)) return false
  return true
}

function lookup(bands, family, x) {
  for (const name of BAND_NAMES) {
    if (bands?.[name] && matches(bands[name], family, x)) return name
  }
  return 'normal'
}

function severityOf(band, family, x, badDirection, span) {
  const min = band?.[`${family}min`]
  const max = band?.[`${family}max`]
  const hasMin = Number.isFinite(min)
  const hasMax = Number.isFinite(max)
  const worseIsLow = badDirection === 'low' && family !== 'abs_z_'
  let depth
  let width
  if (hasMin && hasMax) {
    width = max - min
    depth = worseIsLow ? max - x : x - min
  } else if (hasMin || hasMax) {
    width = span
    const edge = worseIsLow ? (hasMax ? max : min) : hasMin ? min : max
    depth = worseIsLow ? edge - x : x - edge
  } else {
    return 0
  }
  if (!(width > 0)) return 0
  return Math.min(1, Math.max(0, depth / width))
}

function nearestEdgeDistance(bands, family, x) {
  let best = Infinity
  for (const name of BAND_NAMES) {
    for (const key of [`${family}min`, `${family}max`]) {
      const edge = bands?.[name]?.[key]
      if (Number.isFinite(edge)) best = Math.min(best, Math.abs(x - edge))
    }
  }
  return Number.isFinite(best) ? best : 0
}

const round2 = (n) => Math.round(n * 100) / 100

function fill(template, delta, unit) {
  return String(template ?? '')
    .split('{delta}')
    .join(String(delta))
    .split('{unit}')
    .join(unit ?? '')
}

/**
 * Evaluate the latest reading against a rule. Pure: "now" comes from options.
 * options: { now, cutoffs, domain, indicator }
 */
export function evaluate(rule, readings, options) {
  const { now, cutoffs, domain, indicator } = options
  const sorted = [...readings].sort((a, b) => a.timestamp - b.timestamp)
  if (sorted.length === 0) throw new Error('evaluate needs at least one reading')
  const latest = sorted[sorted.length - 1]
  const pool = sorted.slice(0, -1)
  const x = latest.value
  const windowDays = rule.baseline_days ?? 14
  const evalNow = now ?? latest.timestamp

  const baseline = computeBaseline(pool, windowDays, { now: evalNow })
  const ready = baseline.ready === true
  const family = familyOf(rule.bands)
  const spread = rule.severity_span ?? 1

  let status = 'normal'
  let severity = 0
  let delta
  let driftWhy = null

  if (ready) {
    const z = zScore(x, baseline, rule.fallback_spread)
    const basisValue = family === 'abs_z_' ? Math.abs(z) : family === 'value_' ? x : z
    status = lookup(rule.bands, family, basisValue)
    if (status !== 'normal') {
      severity = severityOf(rule.bands[status], family, basisValue, rule.bad_direction, spread)
    }
    delta = round2(Math.abs(x - baseline.mean))

    if (status === 'normal') {
      const from = evalNow - windowDays * DAY_MS
      const series = pool
        .filter((r) => r.timestamp >= from && r.timestamp <= evalNow)
        .concat(latest)
        .map((r) => {
          const zr = zScore(r.value, baseline, rule.fallback_spread)
          if (rule.bad_direction === 'low') return -zr
          if (rule.bad_direction === 'both') return Math.abs(zr)
          return zr
        })
      const { k = DRIFT_DEFAULTS.k, h = DRIFT_DEFAULTS.h } = rule.drift ?? {}
      const result = cusum(series, { k, h })
      if (result.drift) {
        status = 'watch'
        severity = Math.min(1, result.statistic / (2 * h))
        driftWhy = `Slow drift from your personal baseline: ${rule.label ?? indicator} has moved the wrong way for ${result.runLength} days, though it is still inside the normal range.`
      }
    }
  } else {
    const fb = rule.fallback_bands ?? (family === 'value_' ? rule.bands : null)
    if (fb) {
      status = lookup(fb, 'value_', x)
      if (status !== 'normal') {
        severity = severityOf(fb[status], 'value_', x, rule.bad_direction, spread)
      }
      delta = round2(nearestEdgeDistance(fb, 'value_', x))
    } else {
      delta = 0
    }
  }

  const u = urgency({ status }, { severity, cutoffs })

  return {
    domain,
    indicator,
    value: x,
    baseline: ready ? baseline.mean : null,
    status,
    urgency: u,
    why: driftWhy ?? fill(rule.why, delta, rule.unit),
    action: rule.action,
    escalate: u >= cutoffs.act_from,
    source: rule.source,
  }
}
