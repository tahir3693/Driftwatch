// The alerts are built in engineAdapter.js (see engineAdapter.test.js). This file tests the helpers
// that bmdAdapter.js keeps for them and for the rest of the app.
import { describe, it, expect } from 'vitest'
import {
  weekDates,
  missedTrainingDays,
  gravityOverall,
  sortedMeasurements,
  trackerInUse,
  BMD_STORAGE_KEY,
  BMD_TRACKER_PATH,
} from './bmdAdapter.js'
import * as adapter from './bmdAdapter.js'
import { validateAlert } from '../../engine/validateAlert.js'
import cutoffs from '../../data/cutoffs.json'

// 2025-01-15 is a Wednesday. Its week runs from Monday 13 to Sunday 19 January.
const TODAY = '2025-01-15'
const trainedWeek = {
  '2025-01-13': { strength: true, endurance: true },
  '2025-01-14': { strength: true, endurance: true },
  '2025-01-15': { strength: true, endurance: true },
}

describe('bmdAdapter: what it keeps', () => {
  it('exports the storage key and tracker path', () => {
    expect(BMD_STORAGE_KEY).toBe('orbit-journal-v1')
    expect(BMD_TRACKER_PATH).toBe('bmd-strength/index.html')
  })

  it('no longer builds alerts: those come from the engine adapter', () => {
    expect(adapter.bmdAlerts).toBeUndefined()
  })

  it('sorts measurements by date, then creation time, and drops broken entries', () => {
    const list = [
      { id: 'c', date: '2025-01-03', created: 1 },
      { id: 'a2', date: '2025-01-01', created: 2 },
      { id: 'a1', date: '2025-01-01', created: 1 },
      null,
      { id: 'x' },
    ]
    expect(sortedMeasurements({ measurements: list }).map((m) => m.id)).toEqual(['a1', 'a2', 'c'])
    expect(sortedMeasurements(null)).toEqual([])
    expect(sortedMeasurements({ measurements: 'x' })).toEqual([])
  })

  it('treats the tracker as in use once anything is saved', () => {
    expect(trackerInUse(null)).toBe(false)
    expect(trackerInUse({ measurements: [], weeklyWorkouts: {} })).toBe(false)
    expect(trackerInUse({ measurements: [{ date: '2025-01-01' }] })).toBe(true)
    expect(trackerInUse({ weeklyWorkouts: trainedWeek })).toBe(true)
  })
})

describe('training count only includes days up to today (future-day bug fix)', () => {
  it('lists Monday to Sunday of the current week', () => {
    expect(weekDates(TODAY)).toEqual([
      '2025-01-13', '2025-01-14', '2025-01-15', '2025-01-16', '2025-01-17', '2025-01-18', '2025-01-19',
    ])
    expect(weekDates('2025-01-13')[0]).toBe('2025-01-13')
    expect(weekDates('2025-01-19')[0]).toBe('2025-01-13')
  })

  it('does not count the unchecked future days of the week', () => {
    // Mon to Wed are all checked; Thu to Sun are still in the future and unchecked.
    // The old rule counted 4 unchecked days and raised a red alarm on Wednesday.
    expect(missedTrainingDays({ measurements: [], weeklyWorkouts: trainedWeek }, 'strength', TODAY)).toBe(0)
  })

  it('counts today when it is unchecked', () => {
    const state = { measurements: [], weeklyWorkouts: { '2025-01-13': { strength: true } } }
    expect(missedTrainingDays(state, 'strength', TODAY)).toBe(2) // Tue and Wed
    expect(missedTrainingDays(state, 'strength', '2025-01-13')).toBe(0) // Monday: only Monday counts
    expect(missedTrainingDays(state, 'strength', '2025-01-19')).toBe(6) // Sunday: the whole week counts
  })

  it('the tracker app applies the same rule', async () => {
    const { readFileSync } = await import('node:fs')
    const { join, dirname } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const here = dirname(fileURLToPath(import.meta.url))
    const app = readFileSync(join(here, '..', '..', '..', 'public', 'bmd-strength', 'app.js'), 'utf8')
    expect(app).toContain('dates.filter(date=>date<=today()&&!state.weeklyWorkouts[date]?.[type])')
    expect(app).not.toContain('resetVersion')
    const css = readFileSync(join(here, '..', '..', '..', 'public', 'bmd-strength', 'style.css'), 'utf8')
    expect(css).not.toMatch(/fonts\.googleapis|@import/)
  })
})

describe('gravityOverall', () => {
  it('is Normal with urgency 0 for no alerts', () => {
    const o = gravityOverall([], cutoffs)
    expect(validateAlert(o)).toEqual({ ok: true })
    expect(o).toMatchObject({ indicator: 'gravity_overall', status: 'normal', urgency: 0, escalate: false })
  })

  it('takes the highest status and the text of the most urgent alert', () => {
    const a = (status, urgency, why) => ({ domain: 'gravity', indicator: why, value: 1, baseline: null, status, urgency, why, action: `do ${why}`, escalate: false, source: 'design value' })
    const o = gravityOverall([a('watch', 40, 'w'), a('act', 80, 'a'), a('normal', 0, 'n'), { ...a('act', 99, 'x'), indicator: 'gravity_overall' }], cutoffs)
    expect(o).toMatchObject({ status: 'act', urgency: 80, why: 'a', action: 'do a', escalate: true, value: 2 })
  })
})
