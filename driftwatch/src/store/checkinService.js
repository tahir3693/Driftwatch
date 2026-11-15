// Orchestrates one check-in submit: validate, map, save in one transaction, re-run the engine, report the streak.
// Reads no clock and makes no network request: `now` and `refresh` are arguments.
import { loadCheckinRanges, loadCheckinConfig } from '../data/checkinData.js'
import { validateCheckIn } from '../engine/validateCheckIn.js'
import { mapCheckIn } from '../engine/mapCheckIn.js'
import { computeStreak } from '../engine/streak.js'
import { dayKeyOf } from '../engine/dayKey.js'
import { saveCheckIn, getCheckInDays, getHeadacheHistory } from './checkins.js'

/**
 * Resolves with { status, errors?, streakBefore?, streakAfter? }.
 * status: 'saved' | 'invalid' | 'save_failed' | 'saved_rerun_failed'.
 */
export async function submitCheckIn({ module, raw, now, refresh }) {
  const ranges = loadCheckinRanges()
  const { minModulesPerDay } = loadCheckinConfig()
  const dayKey = dayKeyOf(now)

  const checked = validateCheckIn(module, raw, ranges)
  if (!checked.ok) return { status: 'invalid', errors: checked.errors }

  let streakBefore
  try {
    streakBefore = computeStreak(await getCheckInDays(), dayKey, minModulesPerDay)
    const priorHeadache = module === 'environment' ? await getHeadacheHistory(dayKey) : undefined
    const readings = mapCheckIn(module, checked.values, { now, priorHeadache })
    await saveCheckIn({ module, dayKey, now, readings })
  } catch (e) {
    console.error('Driftwatch: could not save the check-in', e)
    return { status: 'save_failed' }
  }

  let status = 'saved'
  try {
    await refresh(now)
  } catch (e) {
    console.error('Driftwatch: alerts could not be updated after the check-in', e)
    status = 'saved_rerun_failed'
  }

  let streakAfter = streakBefore
  try {
    streakAfter = computeStreak(await getCheckInDays(), dayKey, minModulesPerDay)
  } catch (e) {
    console.error('Driftwatch: could not read the streak', e)
  }
  return { status, streakBefore, streakAfter }
}