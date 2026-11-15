// React hook for the check-in screen: the streak (from stored records) and a submit function.
import { useCallback, useEffect, useRef, useState } from 'react'
import { loadCheckinConfig } from '../data/checkinData.js'
import { computeStreak } from '../engine/streak.js'
import { dayKeyOf } from '../engine/dayKey.js'
import { getCheckInDays } from './checkins.js'
import { submitCheckIn } from './checkinService.js'

const EMPTY = Object.freeze({ count: 0, todayModules: 0, increased: false })

async function readStreak(now) {
  const days = await getCheckInDays()
  const today = dayKeyOf(now)
  const { minModulesPerDay } = loadCheckinConfig()
  const todayModules = new Set(days.filter((d) => d.dayKey === today).map((d) => d.module)).size
  return { count: computeStreak(days, today, minModulesPerDay), todayModules }
}

/**
 * useCheckIn(refresh) returns { streak: { count, todayModules, increased }, submit(module, raw) }.
 * submit reads the clock once and resolves with the service result ({ status, errors?, ... }).
 */
export function useCheckIn(refresh) {
  const [streak, setStreak] = useState(EMPTY)
  const alive = useRef(true)
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  useEffect(() => {
    alive.current = true
    readStreak(Date.now())
      .then((s) => {
        if (alive.current) setStreak({ ...s, increased: false })
      })
      .catch((e) => console.error('Driftwatch: could not read the check-in streak', e))
    return () => {
      alive.current = false
    }
  }, [])

  const submit = useCallback(async (module, raw) => {
    const now = Date.now()
    const result = await submitCheckIn({ module, raw, now, refresh: (t) => refreshRef.current(t) })
    if (result.status === 'saved' || result.status === 'saved_rerun_failed') {
      try {
        const s = await readStreak(now)
        if (alive.current) setStreak({ ...s, increased: result.streakAfter > result.streakBefore })
      } catch (e) {
        console.error('Driftwatch: could not read the check-in streak', e)
      }
    }
    return result
  }, [])

  return { streak, submit }
}