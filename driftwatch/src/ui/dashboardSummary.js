import { statusRank } from '../engine/urgency.js'
import { statusLabel } from './statusStyle.js'
import { alertCardModel } from './alertModel.js'

const isOverall = (a) => typeof a?.indicator === 'string' && a.indicator.endsWith('_overall')
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

/**
 * Most urgent first: higher status, then an alert that asks to escalate, then higher urgency;
 * the earlier alert wins a tie. Overall alerts count here, because their action is the one to follow.
 */
function mostUrgent(list) {
  const key = (a) => [statusRank(a.status), a.escalate === true ? 1 : 0, Number.isFinite(a.urgency) ? a.urgency : 0]
  let best = null
  for (const a of list) {
    if (best === null) {
      best = a
      continue
    }
    const [s1, e1, u1] = key(a)
    const [s2, e2, u2] = key(best)
    if (s1 > s2 || (s1 === s2 && (e1 > e2 || (e1 === e2 && u1 > u2)))) best = a
  }
  return best
}

/**
 * The status summary at the top of the dashboard, built only from the alerts already computed.
 * Returns { empty, status, label, alertCount, attentionCount, escalations, top, headline }.
 * - alerts are the indicator alerts (the "<domain>_overall" ones are not counted twice);
 * - "need attention" means status Act or an escalate flag.
 */
export function summarizeAlerts(alerts, rules = {}) {
  const all = Array.isArray(alerts) ? alerts : []
  if (all.length === 0) {
    return { empty: true, status: null, label: 'No alerts yet', alertCount: 0, attentionCount: 0, escalations: [], top: null, headline: 'No alerts yet' }
  }
  const indicators = all.filter((a) => !isOverall(a))
  const counted = indicators.length > 0 ? indicators : all
  let status = 'normal'
  for (const a of all) if (statusRank(a.status) > statusRank(status)) status = a.status
  const flagged = counted.filter((a) => a.status === 'watch' || a.status === 'act')
  const attention = counted.filter((a) => a.status === 'act' || a.escalate === true)
  const top = mostUrgent(all.filter((a) => a.status === 'watch' || a.status === 'act'))
  const escalating = all.filter((a) => a.escalate === true)
  const label = statusLabel(status)
  const alertText = flagged.length === 0 ? 'no alerts' : plural(flagged.length, 'alert', 'alerts')
  const attentionText = attention.length === 0 ? 'nothing needs attention' : `${attention.length} ${attention.length === 1 ? 'needs' : 'need'} attention`
  return {
    empty: false,
    status,
    label,
    alertCount: flagged.length,
    attentionCount: attention.length,
    escalations: escalating.map((a) => alertCardModel(a, rules[`${a.domain}/${a.indicator}`]).title),
    top,
    headline: `Overall: ${label}, ${alertText}, ${attentionText}`,
  }
}

/** Alerts of one region in display groups: act first, then watch, then normal (each by urgency, stable). */
export function groupByStatus(sortedAlerts) {
  const groups = { act: [], watch: [], normal: [], other: [] }
  for (const a of sortedAlerts ?? []) (groups[a.status] ?? groups.other).push(a)
  return groups
}
