import FormField from './FormField.jsx'
import FormShell, { errorFor } from './FormShell.jsx'
import { rangeHelper } from './fieldHints.js'

export default function GravityForm({ value, onChange, onSubmit, errors, resultText, submitting }) {
  return (
    <FormShell module="gravity" title="Gravity" onSubmit={onSubmit} submitting={submitting} resultText={resultText} errors={errors}>
      <FormField
        id="gravity-exercise"
        label="Exercise sessions in the last 7 days"
        hint="Whole number of sessions you completed."
        helper={rangeHelper('exercise')}
        inputMode="numeric"
        value={value.exercise}
        onChange={(v) => onChange({ ...value, exercise: v })}
        error={errorFor(errors, 'exercise')}
      />
    </FormShell>
  )
}