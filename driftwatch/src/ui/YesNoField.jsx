import { FieldError, describedBy } from './FormField.jsx'
// Two radio buttons in a fieldset. value is true, false or null (unanswered). The first radio carries the field id.
export default function YesNoField({ id, legend, value, onChange, error }) {
  const errorId = error ? `${id}-error` : null
  const radio = (inputId, checked, label, next) => (
    <label
      htmlFor={inputId}
      className={`flex min-h-11 min-w-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-base font-semibold ${checked ? 'border-accent bg-raised' : 'border-line-strong'}`}
    >
      <input
        id={inputId}
        type="radio"
        name={id}
        checked={checked}
        onChange={() => onChange(next)}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(errorId)}
        className="h-5 w-5 accent-accent"
      />
      {label}
    </label>
  )
  return (
    <fieldset className="mt-4">
      <legend className="text-base font-semibold">{legend}</legend>
      <div className="mt-1 flex flex-wrap gap-2">
        {radio(id, value === true, 'Yes', true)}
        {radio(`${id}-no`, value === false, 'No', false)}
      </div>
      <FieldError id={errorId} message={error} />
    </fieldset>
  )
}
