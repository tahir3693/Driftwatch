// Reads the BMD and strength tracker's saved state from this browser. The tracker lives in
// public/bmd-strength/ on the same origin, so it shares localStorage with the app.
import { BMD_STORAGE_KEY } from '../modules/bmd-strength/bmdAdapter.js'

/** Parsed tracker state, or null when nothing is saved or storage is unavailable. */
export function loadBmdState(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(BMD_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** Today's local date as YYYY-MM-DD, the same format the tracker uses. */
export function localToday(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}
