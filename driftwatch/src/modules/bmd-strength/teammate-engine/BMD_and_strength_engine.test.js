// Tests for the teammate's scoring engine after the three Driftwatch edits:
// (a) the baseline is an input, (b) the second alert escalates on its own score,
// (c) the old self-running main() call is a test here.
import { describe, it, expect } from 'vitest'
import { evaluate, RULES } from './BMD_and_strength_engine.js'

const input = (over = {}) => ({
  module: 'BMD_and_strength',
  indicator: 'input from astronaut',
  registered_week_workouts: 5,
  registered_value: 200,
  baseline_value: 200,
  baseline_indicator: 'Benchpress',
  unit: 'density',
  ts: '2026-11-14T08:00:00Z',
  source: 'sim',
  ...over,
})

describe('evaluate (the teammate main() cases, moved here)', () => {
  it('reading equal to the baseline: no loss', () => {
    const [workouts, loss] = evaluate(input())
    expect(workouts).toMatchObject({ indicator: 'Workouts', value: 5, urgency: 50 })
    expect(loss).toMatchObject({ baseline: 200, status: 'normal', urgency: 0, escalate: false })
    expect(loss.value).toEqual({ parameter: 'Benchpress', value: 0 })
  })

  it('25% strength drop: Act, urgency 100, escalates', () => {
    const [, loss] = evaluate(input({ registered_value: 150 }))
    expect(loss).toMatchObject({ baseline: 200, status: 'act', urgency: 100, escalate: true })
    expect(loss.value).toEqual({ parameter: 'Benchpress', value: 0.25 })
  })
})

describe('Driftwatch edit (a): the baseline is an input, not module state', () => {
  it('the first reading does not become the baseline', () => {
    // Old behaviour: the first call stored 200 as the baseline, so a later 150 looked like a drop
    // against 200 even if the real baseline was 150.
    const [, first] = evaluate(input({ registered_value: 200, baseline_value: 200 }))
    const [, second] = evaluate(input({ registered_value: 150, baseline_value: 150 }))
    expect(first.baseline).toBe(200)
    expect(second.baseline).toBe(150)
    expect(second).toMatchObject({ status: 'normal', urgency: 0, escalate: false })
  })

  it('gives the same answer for the same input, whatever was evaluated before', () => {
    const probe = input({ registered_value: 190, baseline_value: 200 })
    const before = evaluate(probe)
    evaluate(input({ registered_value: 10, baseline_value: 10, baseline_indicator: 'Hip' }))
    evaluate(input({ registered_value: 1, baseline_value: 500 }))
    expect(evaluate(probe)).toEqual(before)
  })

  it('does not change its input', () => {
    const probe = Object.freeze(input({ registered_value: 150 }))
    expect(() => evaluate(probe)).not.toThrow()
  })
})

describe('Driftwatch edit (b): the second alert escalates on its own score', () => {
  it('does not escalate for a missed-workouts score alone', () => {
    const [workouts, loss] = evaluate(input({ registered_week_workouts: 0 }))
    expect(workouts.urgency).toBe(100)
    expect(loss).toMatchObject({ urgency: 0, escalate: false })
  })

  it('escalates when the baseline score is at its maximum, even with all workouts done', () => {
    const [, loss] = evaluate(input({ registered_week_workouts: 7, registered_value: 100 }))
    expect(loss).toMatchObject({ urgency: 100, escalate: true })
  })

  it('does not escalate in the Watch band (score 40 of 80)', () => {
    const [, loss] = evaluate(input({ registered_value: 170 })) // 85%: between 0.8 and 0.9
    expect(loss).toMatchObject({ urgency: 50, escalate: false })
  })
})

describe('limits', () => {
  it('keeps the teammate limits unchanged', () => {
    expect(RULES.low_strength_limit).toBe(0.8)
    expect(RULES.low_BMD_limit).toBe(0.95)
    expect(RULES.Hip).toEqual([0.98, 0.95])
    expect(RULES.Spine).toEqual([0.98, 0.95])
    expect(RULES.Benchpress).toEqual([0.9, 0.8])
    expect(RULES.Deadlift).toEqual([0.9, 0.8])
  })
})
