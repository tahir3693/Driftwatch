import FormShell from './FormShell.jsx'
import { RADIATION_SYMPTOMS, RADIATION_HINT } from './checkinText.js'

export default function RadiationForm({ value, onChange, onSubmit, errors, resultText, submitting }) {
  const symptoms = value.symptoms ?? {}
  const toggle = (key) => onChange({ ...value, symptoms: { ...symptoms, [key]: !symptoms[key] } })
  return (
    <FormShell module="radiation" title="Radiation" onSubmit={onSubmit} submitting={submitting} resultText={resultText} errors={errors}>
      <fieldset className="mt-3">
        <legend className="text-base font-semibold">Symptoms today</legend>
        <p className="text-base text-slate-300">{RADIATION_HINT}</p>
        {RADIATION_SYMPTOMS.map(({ key, label }) => (
          <label key={key} htmlFor={`radiation-${key}`} className="flex min-h-11 min-w-11 items-center gap-2 text-base">
            <input id={`radiation-${key}`} type="checkbox" checked={symptoms[key] === true} onChange={() => toggle(key)} className="h-5 w-5" />
            {label}
          </label>
        ))}
      </fieldset>
    </FormShell>
  )
}