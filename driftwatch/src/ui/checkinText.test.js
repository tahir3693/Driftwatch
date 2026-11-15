import { describe, it, expect } from 'vitest'
import { FORMS, RADIATION_SYMPTOMS, RESULT_TEXT, SAVED, SAVED_RERUN_FAILED, SAVE_FAILED, THANKS, HEADACHE_HINT, REACTION } from './checkinText.js'
import { RULES } from '../modules/radiation/radiation-engine.js'
import { DISCLAIMER } from './wording.js'

describe('checkinText', () => {
  it('lists the five forms in order', () => {
    expect(FORMS.map((f) => f.title)).toEqual(['Environment', 'Radiation', 'Isolation', 'Gravity', 'Nutrition'])
    expect(FORMS.map((f) => f.module)).toEqual(['environment', 'radiation', 'isolation', 'gravity', 'nutrition'])
  })
  it('has the exact fixed strings', () => {
    expect(SAVED).toBe('Saved. Alerts updated.')
    expect(SAVED_RERUN_FAILED).toBe('Saved. Alerts could not be updated yet.')
    expect(SAVE_FAILED).toBe('Could not save your check-in. Please try again.')
    expect(THANKS).toBe('Thank you for checking in.')
    expect(HEADACHE_HINT).toBe('A single day is saved to your history. Possible symptoms raise an alert when they repeat.')
    expect(RESULT_TEXT).toEqual({ saved: SAVED, saved_rerun_failed: SAVED_RERUN_FAILED, save_failed: SAVE_FAILED })
    expect(REACTION.tooEarly).toBe('Too early. Wait for the prompt.')
    expect(REACTION.prompt).toBe('Tap now')
    expect(REACTION.skip).toBe('Skip reaction check')
  })
  it('matches the radiation engine symptom keys and labels', () => {
    expect(RADIATION_SYMPTOMS.map((s) => s.key)).toEqual(Object.keys(RULES.symptoms))
    for (const s of RADIATION_SYMPTOMS) expect(s.label).toBe(RULES.symptoms[s.key].label)
  })
  it('uses no diagnostic wording and no supplement advice', () => {
    const text = JSON.stringify([FORMS, RADIATION_SYMPTOMS, RESULT_TEXT, HEADACHE_HINT, REACTION, THANKS, DISCLAIMER])
    expect(text).not.toMatch(/depress|anxiety|disorder|diagnos(?!tic)|supplement/i)
  })
})