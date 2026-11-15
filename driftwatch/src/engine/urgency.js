const RANKS = { normal: 0, watch: 1, act: 2 }

export function statusFromUrgency(u, cutoffs) {
  if (u >= cutoffs.act_from) return 'act'
  if (u >= cutoffs.watch_from) return 'watch'
  return 'normal'
}

export function statusRank(status) {
  return Object.prototype.hasOwnProperty.call(RANKS, status) ? RANKS[status] : -1
}

function statusRange(status, cutoffs) {
  if (status === 'normal') return [0, cutoffs.watch_from - 1]
  if (status === 'watch') return [cutoffs.watch_from, cutoffs.act_from - 1]
  if (status === 'act') return [cutoffs.act_from, 100]
  throw new Error(`Unknown status: ${status}`)
}

export function urgency(alert, { severity = 0, cutoffs } = {}) {
  const [floor, ceil] = statusRange(alert.status, cutoffs)
  const s = Number.isFinite(severity) ? Math.min(1, Math.max(0, severity)) : 0
  const u = Math.round(floor + s * (ceil - floor))
  return Math.min(100, Math.max(0, u))
}
