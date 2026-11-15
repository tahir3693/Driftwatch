// Local calendar day helpers. Pure: no clock read. Day arithmetic uses Date.UTC so daylight saving cannot skip a day.
const pad = (n, width = 2) => String(n).padStart(width, '0')

function parse(dayKey) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dayKey))
  if (!m) throw new TypeError(`Invalid day key: ${String(dayKey)}`)
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) }
}

/** Local 'YYYY-MM-DD' of an epoch-ms timestamp. */
export function dayKeyOf(timestamp) {
  const dt = new Date(timestamp)
  return `${pad(dt.getFullYear(), 4)}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

/** { start, end }: local midnight to the next local midnight, end exclusive. */
export function dayBounds(dayKey) {
  const { y, mo, d } = parse(dayKey)
  return { start: new Date(y, mo - 1, d).getTime(), end: new Date(y, mo - 1, d + 1).getTime() }
}

/** Calendar arithmetic on a day key. Negative days allowed. */
export function shiftDayKey(dayKey, days) {
  const { y, mo, d } = parse(dayKey)
  const dt = new Date(Date.UTC(y, mo - 1, d + days))
  return `${pad(dt.getUTCFullYear(), 4)}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}