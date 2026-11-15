import FormField from './FormField.jsx'
import FormShell, { errorFor } from './FormShell.jsx'
import { rangeHelper } from './fieldHints.js'

export default function NutritionForm({ value, onChange, onSubmit, errors, resultText, submitting }) {
  return (
    <FormShell module="nutrition" title="Nutrition" onSubmit={onSubmit} submitting={submitting} resultText={resultText} errors={errors}>
      <FormField
        id="nutrition-intake"
        label="Share of the planned menu eaten today"
        unit="%"
        helper={rangeHelper('intake')}
        value={value.intake}
        onChange={(v) => onChange({ ...value, intake: v })}
        error={errorFor(errors, 'intake')}
      />
    </FormShell>
  )
}