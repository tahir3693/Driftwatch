import { evaluate } from './evaluate.js'
import { patterns } from './patterns.js'
import { statusRank } from './urgency.js'

const DAY_MS = 86_400_000

// Choice for an indicator with no readings (up to the evaluation time): return a
// normal alert with urgency 0, value null and baseline null. The module still
// returns one alert per indicator and nothing is raised from missing data.
function noDataAlert(domain, indicator, rule) {
  return {
    domain,
    indicator,
    value: null,
    baseline: null,
    status: 'normal',
    urgency: 0,
    why: `No readings logged yet for ${rule.label ?? indicator}.`,
    action: rule.action,
    escalate: false,
    source: rule.source,
  }
}

function evaluateAll(domain, indicators, readingsByIndicator, now, cutoffs) {
  return Object.entries(indicators).map(([indicator, rule]) => {
    const upTo = (readingsByIndicator?.[indicator] ?? []).filter((r) => r.timestamp <= now)
    if (upTo.length === 0) return noDataAlert(domain, indicator, rule)
    return evaluate(rule, upTo, { now, cutoffs, domain, indicator })
  })
}

/**
 * Run a rules module. Pure and stateless.
 * ctx: { cutoffs, now }. Returns indicator alerts, pattern alerts, then the overall alert.
 */
export function runRulesModule({ domain, rules }, readingsByIndicator, ctx) {
  const { cutoffs, now } = ctx
  const indicators = rules.indicators ?? {}
  const patternDefs = rules.patterns ?? {}

  const days = Math.max(1, ...Object.values(patternDefs).map((p) => p.for_days ?? 1))
  const history = []
  for (let i = days - 1; i >= 0; i--) {
    history.push(evaluateAll(domain, indicators, readingsByIndicator, now - i * DAY_MS, cutoffs))
  }

  const indicatorAlerts = history[history.length - 1]
  const patternAlerts = patterns(patternDefs, history, { domain, cutoffs })
  const all = [...indicatorAlerts, ...patternAlerts]

  let top = all[0]
  for (const a of all) {
    if (a.urgency > top.urgency) top = a
  }
  const maxUrgency = all.reduce((m, a) => Math.max(m, a.urgency), 0)
  const status = all.reduce((s, a) => (statusRank(a.status) > statusRank(s) ? a.status : s), 'normal')

  const overall = {
    domain,
    indicator: `${domain}_overall`,
    value: all.filter((a) => a.status !== 'normal').length,
    baseline: null,
    status,
    urgency: maxUrgency,
    why: top ? top.why : 'No indicators defined.',
    action: top ? top.action : '',
    escalate: maxUrgency >= cutoffs.act_from,
    source: 'design value',
  }

  return [...indicatorAlerts, ...patternAlerts, overall]
}
