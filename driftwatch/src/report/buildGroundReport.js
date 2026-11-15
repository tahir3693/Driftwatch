// Pure report builder. No clock, no storage, no DOM. The caller passes `now` and `config`.
import { statusRank } from '../engine/urgency.js'
import { DOMAINS } from '../data/domains.js'
import { validateReportConfig } from './validateReportConfig.js'

const DAY_MS = 86_400_000

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v)
const urgencyOf = (alert) => (isFiniteNumber(alert.urgency) ? alert.urgency : 0)
const isActive = (alert) => alert.status === 'watch' || alert.status === 'act'

/** Alerts that belong in the report, as copies, sorted by urgency (high first), then input order. */
function keepAlerts(alerts) {
  if (!Array.isArray(alerts)) return []
  const kept = []
  alerts.forEach((alert, index) => {
    if (!isPlainObject(alert)) return
    if (!DOMAINS.includes(alert.domain)) return
    if (statusRank(alert.status) < 0) return
    kept.push({ alert: { ...alert }, index })
  })
  kept.sort((a, b) => urgencyOf(b.alert) - urgencyOf(a.alert) || a.index - b.index)
  return kept.map((k) => k.alert)
}

/** The in-window Reading with the greatest timestamp per domain and indicator. */
function lastReadingsPerIndicator(readings, windowStart, windowEnd) {
  if (!Array.isArray(readings)) return []
  const best = new Map()
  for (const r of readings) {
    if (!isPlainObject(r)) continue
    if (!DOMAINS.includes(r.domain)) continue
    if (typeof r.indicator !== 'string' || r.indicator === '') continue
    if (!isFiniteNumber(r.timestamp) || !isFiniteNumber(r.value)) continue
    if (r.timestamp < windowStart || r.timestamp > windowEnd) continue
    const key = `${r.domain}/${r.indicator}`
    const current = best.get(key)
    if (!current || r.timestamp >= current.timestamp) best.set(key, r)
  }
  return [...best.values()]
}

/**
 * Builds the Ground report model.
 * buildGroundReport({ alerts, readings, rules, now, config }) -> ReportModel (plain JSON data).
 * Throws TypeError for an invalid config or a non-finite now. Any other bad input is treated as data.
 */
export function buildGroundReport({ alerts, readings, rules, now, config } = {}) {
  validateReportConfig(config)
  if (!isFiniteNumber(now)) throw new TypeError('now must be a finite number')
  const ruleMap = isPlainObject(rules) ? rules : {}
  const windowStart = now - config.windowDays * DAY_MS
  const windowEnd = now
  const labelOf = (domain) => config.moduleLabels[domain]

  // Alerts, per module.
  const kept = keepAlerts(alerts) // sorted: urgency desc, input order
  const modules = DOMAINS.map((domain) => {
    const own = kept.filter((a) => a.domain === domain)
    let status = null
    let urgency = null
    for (const a of own) {
      if (status === null || statusRank(a.status) > statusRank(status)) status = a.status
      const u = urgencyOf(a)
      if (urgency === null || u > urgency) urgency = u
    }
    const active = own.filter(isActive)
    const activeAlerts = active.slice(0, config.maxActiveAlertsPerModule)
    return {
      domain,
      label: labelOf(domain),
      status,
      urgency,
      activeAlerts,
      activeTotal: active.length,
      moreAlerts: active.length - activeAlerts.length,
    }
  })

  // Escalations come from all active alerts, before any cap. `kept` is already ordered by urgency
  // (then input order); equal urgency across modules is ordered by module, so input order cannot matter.
  const escalations = kept
    .filter((a) => isActive(a) && a.escalate === true)
    .map((a, i) => ({ a, i }))
    .sort((x, y) => urgencyOf(y.a) - urgencyOf(x.a) || DOMAINS.indexOf(x.a.domain) - DOMAINS.indexOf(y.a.domain) || x.i - y.i)
    .map(({ a }) => a)
    .map((a) => ({
      domain: a.domain,
      label: labelOf(a.domain),
      indicator: a.indicator,
      urgency: urgencyOf(a),
      status: a.status,
      action: a.action,
    }))

  // Last readings.
  const rows = lastReadingsPerIndicator(readings, windowStart, windowEnd).map((r) => {
    const rule = ruleMap[`${r.domain}/${r.indicator}`]
    const ruleLabel = isPlainObject(rule) ? rule.label : undefined
    const ruleUnit = isPlainObject(rule) ? rule.unit : undefined
    return {
      domain: r.domain,
      label: labelOf(r.domain),
      indicator: r.indicator,
      indicatorLabel: typeof ruleLabel === 'string' && ruleLabel !== '' ? ruleLabel : r.indicator,
      unit: typeof ruleUnit === 'string' ? ruleUnit : '',
      value: r.value,
      timestamp: r.timestamp,
    }
  })
  rows.sort(
    (a, b) =>
      b.timestamp - a.timestamp ||
      DOMAINS.indexOf(a.domain) - DOMAINS.indexOf(b.domain) ||
      (a.indicator < b.indicator ? -1 : a.indicator > b.indicator ? 1 : 0),
  )
  const lastReadings = rows.slice(0, config.maxLastReadings)

  const activeTotal = modules.reduce((n, m) => n + m.activeTotal, 0)
  const activeListed = modules.reduce((n, m) => n + m.activeAlerts.length, 0)
  const counts = {
    activeTotal,
    activeListed,
    readingsTotal: rows.length,
    readingsListed: lastReadings.length,
    moreReadings: rows.length - lastReadings.length,
    capped: activeListed < activeTotal || lastReadings.length < rows.length,
  }

  return { now, windowStart, windowEnd, modules, escalations, lastReadings, counts }
}
