// Fixed check-in wording. "possible" is used for symptoms and risks; nothing here diagnoses.
export const FORMS = Object.freeze([
  { module: 'environment', title: 'Environment' },
  { module: 'radiation', title: 'Radiation' },
  { module: 'isolation', title: 'Isolation' },
  { module: 'gravity', title: 'Gravity' },
  { module: 'nutrition', title: 'Nutrition' },
])

export const SAVED = 'Saved. Alerts updated.'
export const SAVED_RERUN_FAILED = 'Saved. Alerts could not be updated yet.'
export const SAVE_FAILED = 'Could not save your check-in. Please try again.'
export const THANKS = 'Thank you for checking in.'
export const HEADACHE_HINT = 'A single day is saved to your history. Possible symptoms raise an alert when they repeat.'

export const RESULT_TEXT = Object.freeze({
  saved: SAVED,
  saved_rerun_failed: SAVED_RERUN_FAILED,
  save_failed: SAVE_FAILED,
})

// Same keys and labels as RULES.symptoms in the radiation engine (a test checks this).
export const RADIATION_SYMPTOMS = Object.freeze([
  { key: 'nausea', label: 'Nausea' },
  { key: 'vomiting', label: 'Vomiting' },
  { key: 'fatigue', label: 'Unusual fatigue' },
  { key: 'skin', label: 'Skin redness or irritation' },
  { key: 'fever', label: 'Fever or chills' },
  { key: 'bruising', label: 'Easy bruising or bleeding' },
])

export const RADIATION_HINT = 'Tick any possible symptoms you have today. Leave all unticked if you have none.'

export const MOOD_LOW_LABEL = '0 Calm and happy'
export const MOOD_HIGH_LABEL = '10 Very stressed'

export const REACTION = Object.freeze({
  intro: 'Reaction check: about 60 seconds. Tap when the prompt appears. It is optional.',
  start: 'Start reaction check',
  again: 'Run reaction check again',
  tap: 'Tap here',
  prompt: 'Tap now',
  tooEarly: 'Too early. Wait for the prompt.',
  skip: 'Skip reaction check',
  skipped: 'Reaction check skipped. You can still save the form.',
  waiting: 'Wait for the prompt, then tap.',
})