import FormShell from './FormShell.jsx'
import { RADIATION_SYMPTOMS, RADIATION_HINT } from './checkinText.js'

export default function RadiationForm({ value, onChange, onSubmit, errors, resultText, submitting }) {
  const symptoms = value.symptoms ?? {}
  const toggle = (key) => onChange({ ...value, symptoms: { ...symptoms, [key]: !symptoms[key] } })
  return (
    <FormShell module="radiation" title="Radiation" onSubmit={onSubmit} submitting={submitting} resultText={resultText} errors={errors}>
      <fieldset className="mt-4">
        <legend className="text-base font-semibold">Symptoms today</legend>
        <p className="mt-1 text-base text-ink-2">{RADIATION_HINT}</p>
        {RADIATION_SYMPTOMS.map(({ key, label }) => (
          <label key={key} htmlFor={`radiation-${key}`} className="flex min-h-11 min-w-11 cursor-pointer items-center gap-2 text-base">
            <input id={`radiation-${key}`} type="checkbox" checked={symptoms[key] === true} onChange={() => toggle(key)} className="h-5 w-5 accent-accent" />
            {label}
          </label>
        ))}
      </fieldset>
    </FormShell>
  )
}