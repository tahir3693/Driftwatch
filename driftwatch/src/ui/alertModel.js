import { statusLabel } from './statusStyle.js'
import { NOT_AVAILABLE } from './wording.js'

const text = (v) => (typeof v === 'string' && v.length > 0 ? v : NOT_AVAILABLE)

function show(value, unit) {
  if (value === null || value === undefined) return 'No data'
  const n = typeof value === 'number' && Number.isFinite(value) ? String(Math.round(value * 100) / 100) : String(value)
  return unit ? `${n} ${unit}` : n
}

/**
 * Text for one alert card. `why`, `action` and `source` are the Alert strings unchanged.
 * `howToMeasure` and `whyItMatters` come from the indicator rule ("Not available" when absent).
 */
export function alertCardModel(alert, rule) {
  const unit = typeof rule?.unit === 'string' && rule.unit ? rule.unit : ''
  const isOverall = typeof alert.indicator === 'string' && alert.indicator.endsWith('_overall')
  const title = isOverall ? `Overall: ${alert.domain}` : rule?.label || alert.indicator
  return {
    title,
    statusLabel: statusLabel(alert.status),
    urgency: alert.urgency,
    valueText: show(alert.value, unit),
    baselineText: alert.baseline === null || alert.baseline === undefined ? 'Baseline not ready' : show(alert.baseline, unit),
    why: alert.why,
    action: alert.action,
    source: alert.source,
    escalate: alert.escalate === true,
    howToMeasure: text(rule?.howToMeasure),
    whyItMatters: text(rule?.whyItMatters),
  }
}
