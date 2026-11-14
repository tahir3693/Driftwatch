// Pattern detection. Pure: no clock, no I/O.

function contributorsOnDay(needs, dayAlerts) {
  const byName = new Map()
  for (const a of dayAlerts || []) byName.set(a.indicator, a)
  return needs.filter((name) => {
    const a = byName.get(name)
    return a && (a.status === 'watch' || a.status === 'act')
  })
}

export function patterns(patternDefs, history, options) {
  const { domain, cutoffs } = options
  const out = []
  for (const [name, p] of Object.entries(patternDefs || {})) {
    const days = history.length >= p.for_days ? history.slice(history.length - p.for_days) : null
    if (!days || days.length === 0) continue
    const perDay = days.map((d) => contributorsOnDay(p.needs, d))
    if (!perDay.every((c) => c.length >= p.min_in_watch)) continue
    const contributors = perDay[perDay.length - 1]
    out.push({
      domain,
      indicator: name,
      value: contributors.length,
      baseline: null,
      status: p.result,
      urgency: p.result === 'act' ? cutoffs.act_from : p.result === 'watch' ? cutoffs.watch_from : 0,
      why: `${p.why} Contributing indicators: ${contributors.join(', ')}.`,
      action: p.action,
      escalate: p.escalate,
      source: p.source,
    })
  }
  return out
}
