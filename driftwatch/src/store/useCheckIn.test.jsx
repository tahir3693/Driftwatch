// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor, act, cleanup } from '@testing-library/react'
import { db } from './db.js'
import { saveCheckIn } from './checkins.js'
import { useCheckIn } from './useCheckIn.js'
import { dayKeyOf, shiftDayKey } from '../engine/dayKey.js'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})
beforeEach(async () => {
  await db.readings.clear()
  await db.checkins.clear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('useCheckIn', () => {
  it('computes the streak from stored records on mount', async () => {
    const today = dayKeyOf(Date.now())
    for (const [k, module] of [[0, 'gravity'], [0, 'nutrition'], [-1, 'gravity'], [-2, 'gravity']]) {
      await saveCheckIn({ module, dayKey: shiftDayKey(today, k), now: 1, readings: [] })
    }
    const { result } = renderHook(() => useCheckIn(async () => {}))
    await waitFor(() => expect(result.current.streak.count).toBe(3))
    expect(result.current.streak.todayModules).toBe(2)
    expect(result.current.streak.increased).toBe(false)
  })

  it('starts at zero with no records', async () => {
    const { result } = renderHook(() => useCheckIn(async () => {}))
    await act(async () => {})
    expect(result.current.streak).toMatchObject({ count: 0, todayModules: 0, increased: false })
  })

  it('updates todayModules and the streak after a submit and passes the submit time to refresh', async () => {
    const refresh = vi.fn(async () => {})
    const { result } = renderHook(() => useCheckIn(refresh))
    await act(async () => {})
    const at = Date.now()
    let res
    await act(async () => {
      res = await result.current.submit('nutrition', { intake: '90' })
    })
    expect(res.status).toBe('saved')
    expect(refresh).toHaveBeenCalledTimes(1)
    const used = refresh.mock.calls[0][0]
    expect(used).toBeGreaterThanOrEqual(at)
    expect((await db.checkins.toCollection().first()).submittedAt).toBe(used)
    expect(result.current.streak).toEqual({ count: 1, todayModules: 1, increased: true })
    await act(async () => {
      await result.current.submit('gravity', { exercise: '4' })
    })
    expect(result.current.streak).toEqual({ count: 1, todayModules: 2, increased: false })
  })

  it('reports invalid input and leaves the streak alone', async () => {
    const { result } = renderHook(() => useCheckIn(async () => {}))
    await act(async () => {})
    let res
    await act(async () => {
      res = await result.current.submit('nutrition', { intake: '' })
    })
    expect(res.status).toBe('invalid')
    expect(result.current.streak.count).toBe(0)
  })

  it('reports saved_rerun_failed when refresh rejects, and still counts the check-in', async () => {
    const { result } = renderHook(() => useCheckIn(async () => { throw new Error('x') }))
    await act(async () => {})
    let res
    await act(async () => {
      res = await result.current.submit('gravity', { exercise: '2' })
    })
    expect(res.status).toBe('saved_rerun_failed')
    expect(result.current.streak.count).toBe(1)
  })
})