import { statusRank } from '../engine/urgency.js'
import { statusLabel } from './statusStyle.js'

/** { [regionId]: Alert[] }. Every region id is present. Alerts whose domain is unmapped are dropped. */
export function groupByRegion(alerts, mapping) {
  const out = {}
  for (const region of mapping.regions) out[region.id] = []
  for (const alert of alerts ?? []) {
    const region = mapping.regions.find((r) => r.domains.includes(alert.domain))
    if (region) out[region.id].push(alert)
  }
  return out
}

/** { status, escalate }. status is the highest-ranked Alert status, or null for no Alerts. */
export function computeRegionStatus(alerts) {
  let status = null
  let escalate = false
  for (const a of alerts ?? []) {
    if (status === null || statusRank(a.status) > statusRank(status)) status = a.status
    if (a.escalate === true) escalate = true
  }
  return { status, escalate }
}

/** New array, urgency descending, stable for ties. */
export function sortByUrgency(alerts) {
  return (alerts ?? [])
    .map((alert, index) => ({ alert, index }))
    .sort((a, b) => b.alert.urgency - a.alert.urgency || a.index - b.index)
    .map((x) => x.alert)
}

/** "Head and lungs: Watch", "Head and lungs: No data". */
export function regionAccessibleName(regionName, status) {
  return `${regionName}: ${statusLabel(status)}`
}
