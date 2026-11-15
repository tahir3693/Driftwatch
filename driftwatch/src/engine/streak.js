// Streak of consecutive check-in days. Takes only day keys and module names. Pure.
import { shiftDayKey } from './dayKey.js'

/**
 * records: [{ dayKey, module }]. A day counts when it has at least minModules distinct modules.
 * The streak ends today when today counts, otherwise yesterday. Days after todayKey are ignored.
 */
export function computeStreak(records, todayKey, minModules) {
  const byDay = new Map()
  for (const r of records ?? []) {
    if (!byDay.has(r.dayKey)) byDay.set(r.dayKey, new Set())
    byDay.get(r.dayKey).add(r.module)
  }
  const counted = (key) => (byDay.get(key)?.size ?? 0) >= minModules
  let day = counted(todayKey) ? todayKey : shiftDayKey(todayKey, -1)
  let n = 0
  while (counted(day)) {
    n += 1
    day = shiftDayKey(day, -1)
  }
  return n
}