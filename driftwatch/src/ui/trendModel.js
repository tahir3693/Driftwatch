import { statusLabel } from './statusStyle.js'

const hasNumber = (v) => typeof v === 'number' && Number.isFinite(v)

/**
 * Chart data for one indicator. Pure: no chart library.
 * band is baseline +/- stats.sd (0 when stats are missing), or null with baselineNotReady when the baseline is null.
 */
export function buildTrendModel({ alert, rule, readings, stats }) {
  const list = Array.isArray(readings) ? readings : []
  const title = rule?.label || alert.indicator
  const unit = typeof rule?.unit === 'string' ? rule.unit : ''
  const label = statusLabel(alert.status)
  const baselineReady = hasNumber(alert.baseline)
  const sd = hasNumber(stats?.sd) ? stats.sd : 0
  const values = list.map((r) => r.value)
  const latest = list.length ? list[list.length - 1].value : null
  const baselineText = baselineReady ? `baseline ${alert.baseline}` : 'baseline not ready'
  return {
    empty: list.length === 0,
    title,
    statusLabel: label,
    unit,
    labels: list.map((r) => new Date(r.timestamp).toLocaleString()),
    values,
    pointStyles: list.map((_, i) => (i === list.length - 1 ? 'rectRot' : 'circle')),
    band: baselineReady
      ? { lower: list.map(() => alert.baseline - sd), upper: list.map(() => alert.baseline + sd) }
      : null,
    baselineNotReady: !baselineReady,
    altText: `${title}: latest value ${latest === null ? 'none' : latest}${unit ? ` ${unit}` : ''}, ${baselineText}, status ${label}.`,
  }
}
