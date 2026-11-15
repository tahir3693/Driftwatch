import { FieldError, describedBy } from './FormField.jsx'

// Two radio buttons in a fieldset. value is true, false or null (unanswered). The first radio carries the field id.
export default function YesNoField({ id, legend, value, onChange, error }) {
  const errorId = error ? `${id}-error` : null
  const radio = (inputId, checked, label, next) => (
    <label htmlFor={inputId} className="flex min-h-11 min-w-11 items-center gap-2 pr-4 text-base">
      <input
        id={inputId}
        type="radio"
        name={id}
        checked={checked}
        onChange={() => onChange(next)}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(errorId)}
        className="h-5 w-5"
      />
      {label}
    </label>
  )
  return (
    <fieldset className="mt-3">
      <legend className="text-base font-semibold">{legend}</legend>
      <div className="flex flex-wrap">
        {radio(id, value === true, 'Yes', true)}
        {radio(`${id}-no`, value === false, 'No', false)}
      </div>
      <FieldError id={errorId} message={error} />
    </fieldset>
  )
}