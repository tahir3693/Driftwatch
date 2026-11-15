// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useScenarioPlayer } from './scenarioPlayer.js'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useScenarioPlayer', () => {
  it('starts at day 0 with no data, so the screens show the stored data', () => {
    const { result } = renderHook(() => useScenarioPlayer())
    expect(result.current.day).toBe(0)
    expect(result.current.data).toBeNull()
    expect(result.current.now).toBeNull()
  })

  it('Next day steps one day and gives that day\'s data and time', () => {
    const { result } = renderHook(() => useScenarioPlayer())
    act(() => result.current.next())
    expect(result.current.day).toBe(1)
    expect(result.current.data.scenario.day).toBe(1)
    expect(result.current.now).toBe(result.current.data.scenario.now)
  })

  it('Play advances one day per step, stops at day 14, and Play again restarts', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useScenarioPlayer(100))
    act(() => result.current.play())
    expect(result.current.playing).toBe(true)
    act(() => vi.advanceTimersByTime(300))
    expect(result.current.day).toBe(3)
    act(() => vi.advanceTimersByTime(100 * 20))
    expect(result.current.day).toBe(14)
    expect(result.current.finished).toBe(true)
    expect(result.current.playing).toBe(false)
    act(() => result.current.play())
    expect(result.current.day).toBe(0)
    act(() => vi.advanceTimersByTime(100))
    expect(result.current.day).toBe(1)
  })

  it('Pause stops and Reset returns to day 0', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useScenarioPlayer(100))
    act(() => result.current.play())
    act(() => vi.advanceTimersByTime(200))
    act(() => result.current.pause())
    act(() => vi.advanceTimersByTime(500))
    expect(result.current.day).toBe(2)
    act(() => result.current.reset())
    expect(result.current.day).toBe(0)
    expect(result.current.data).toBeNull()
  })
})
