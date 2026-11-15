import FormField, { FieldError, describedBy } from './FormField.jsx'
import FormShell, { errorFor } from './FormShell.jsx'
import ReactionCheck from './ReactionCheck.jsx'
import { MOOD_LOW_LABEL, MOOD_HIGH_LABEL } from './checkinText.js'

const MOOD_VALUES = Array.from({ length: 11 }, (_, i) => String(i))

export default function IsolationForm({ value, onChange, onSubmit, errors, resultText, submitting }) {
  const set = (field) => (v) => onChange({ ...value, [field]: v })
  const moodError = errorFor(errors, 'mood')
  const moodErrorId = moodError ? 'isolation-mood-error' : null
  return (
    <FormShell module="isolation" title="Isolation" onSubmit={onSubmit} submitting={submitting} resultText={resultText} errors={errors}>
      <FormField id="isolation-sleep" label="Sleep" unit="h" hint="Hours you slept last night." value={value.sleep} onChange={set('sleep')} error={errorFor(errors, 'sleep')} />
      <fieldset className="mt-3" aria-describedby="isolation-mood-ends">
        <legend className="text-base font-semibold">Mood and stress</legend>
        <div className="flex flex-wrap">
          {MOOD_VALUES.map((n) => (
            <label key={n} htmlFor={n === '0' ? 'isolation-mood' : `isolation-mood-${n}`} className="flex min-h-11 min-w-11 items-center justify-center gap-1 pr-2 text-base">
              <input
                id={n === '0' ? 'isolation-mood' : `isolation-mood-${n}`}
                type="radio"
                name="isolation-mood"
                checked={value.mood === n}
                onChange={() => set('mood')(n)}
                aria-invalid={moodError ? 'true' : undefined}
                aria-describedby={describedBy(moodErrorId)}
                className="h-5 w-5"
              />
              {n}
            </label>
          ))}
        </div>
        <p id="isolation-mood-ends" className="flex justify-between gap-3 text-base text-slate-300">
          <span>{MOOD_LOW_LABEL}</span>
          <span>{MOOD_HIGH_LABEL}</span>
        </p>
        <FieldError id={moodErrorId} message={moodError} />
      </fieldset>
      <FormField
        id="isolation-social"
        label="Social contact"
        unit="min"
        hint="Minutes spent talking with crew, ground or family today."
        inputMode="numeric"
        value={value.social}
        onChange={set('social')}
        error={errorFor(errors, 'social')}
      />
      <ReactionCheck onResult={(ms) => onChange({ ...value, reaction: ms === null ? '' : ms })} />
      {errorFor(errors, 'reaction') ? <FieldError id="isolation-reaction-error" message={errorFor(errors, 'reaction')} /> : null}
    </FormShell>
  )
}