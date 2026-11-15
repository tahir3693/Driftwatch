// A visible label above the input, the input, helper text under it, and an error message wired with
// aria-invalid and aria-describedby. `hint` is linked to the input (aria-describedby); `helper` is plain text
// under the field (for example the allowed range).
export function FieldError({ id, message }) {
  if (!message) return null
  return (
    <p id={id} className="mt-1 flex items-start gap-2 text-base font-semibold text-act">
      <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="mt-1 shrink-0">
        <rect x="2" y="2" width="12" height="12" fill="currentColor" />
      </svg>
      <span>{message}</span>
    </p>
  )
}
export const describedBy = (...ids) => ids.filter(Boolean).join(' ') || undefined
export default function FormField({ id, label, unit, hint, helper, error, value, onChange, inputMode = 'decimal' }) {
  const errorId = error ? `${id}-error` : null
  const hintId = hint ? `${id}-hint` : null
  return (
    <div className="mt-4">
      <label htmlFor={id} className="block text-base font-semibold">
        {unit ? `${label} (${unit})` : label}
      </label>
      <input
        id={id}
        name={id}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(hintId, errorId)}
        className="dw-input mt-1"
      />
      {hint ? (
        <p id={hintId} className="mt-1 text-base text-ink-2">
          {hint}
        </p>
      ) : null}
      {helper ? <p className="mt-1 text-base text-ink-2">{helper}</p> : null}
      <FieldError id={errorId} message={error} />
    </div>
  )
}
