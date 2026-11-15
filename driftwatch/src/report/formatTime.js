const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n) => String(n).padStart(2, '0')
const UNKNOWN = 'Unknown time'

const toDate = (timestamp) => {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return null
  const d = new Date(timestamp)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Local 'dd Mon yyyy, HH:mm' (English month, 24-hour clock). 'Unknown time' for a non-finite value. */
export function formatDateTime(timestamp) {
  const d = toDate(timestamp)
  if (!d) return UNKNOWN
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Local 'YYYY-MM-DD'. 'Unknown time' for a non-finite value. */
export function formatDayKey(timestamp) {
  const d = toDate(timestamp)
  if (!d) return UNKNOWN
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
