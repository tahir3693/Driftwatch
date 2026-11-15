import FormField from './FormField.jsx'
import YesNoField from './YesNoField.jsx'
import FormShell, { errorFor } from './FormShell.jsx'
import { HEADACHE_HINT } from './checkinText.js'
import { rangeHelper } from './fieldHints.js'

export default function EnvironmentForm({ value, onChange, onSubmit, errors, resultText, submitting }) {
  const set = (field) => (v) => onChange({ ...value, [field]: v })
  return (
    <FormShell module="environment" title="Environment" onSubmit={onSubmit} submitting={submitting} resultText={resultText} errors={errors}>
      <FormField id="environment-co2" label="Cabin CO2, 1-hour average" unit="mmHg" helper={rangeHelper('co2')} value={value.co2} onChange={set('co2')} error={errorFor(errors, 'co2')} />
      <YesNoField id="environment-headache" legend="Headache or vision change today" value={value.headache} onChange={set('headache')} error={errorFor(errors, 'headache')} />
      {value.headache === true ? <p className="mt-2 text-base text-ink-2">{HEADACHE_HINT}</p> : null}
      <YesNoField id="environment-nauseaFatigue" legend="Nausea with fatigue today" value={value.nauseaFatigue} onChange={set('nauseaFatigue')} error={errorFor(errors, 'nauseaFatigue')} />
      <FormField id="environment-temperature" label="Body temperature" unit="deg C" helper={rangeHelper('temperature')} value={value.temperature} onChange={set('temperature')} error={errorFor(errors, 'temperature')} />
    </FormShell>
  )
}