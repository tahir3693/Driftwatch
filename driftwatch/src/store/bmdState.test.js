import { describe, it, expect } from 'vitest'
import { loadBmdState, localToday } from './bmdState.js'

const storageWith = (value) => ({ getItem: (k) => (k === 'orbit-journal-v1' ? value : null) })

describe('loadBmdState', () => {
  it('parses the saved tracker state', () => {
    const state = { measurements: [], weeklyWorkouts: {}, unit: 'kg' }
    expect(loadBmdState(storageWith(JSON.stringify(state)))).toEqual(state)
  })

  it('returns null when nothing is saved, the JSON is broken or storage is missing', () => {
    expect(loadBmdState(storageWith(null))).toBeNull()
    expect(loadBmdState(storageWith('{broken'))).toBeNull()
    expect(loadBmdState(undefined)).toBeNull()
    expect(loadBmdState({ getItem: () => { throw new Error('blocked') } })).toBeNull()
  })
})

describe('localToday', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(localToday(new Date(2025, 0, 5, 23, 30))).toBe('2025-01-05')
  })
})
