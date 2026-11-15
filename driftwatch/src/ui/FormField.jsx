// A visible label, a text input and an error message wired with aria-invalid and aria-describedby.
export function FieldError({ id, message }) {
  if (!message) return null
  return (
    <p id={id} className="mt-1 flex items-start gap-2 text-base font-semibold text-red-300">
      <span aria-hidden="true">!</span>
      <span>{message}</span>
    </p>
  )
}

export const describedBy = (...ids) => ids.filter(Boolean).join(' ') || undefined

export default function FormField({ id, label, unit, hint, error, value, onChange, inputMode = 'decimal' }) {
  const errorId = error ? `${id}-error` : null
  const hintId = hint ? `${id}-hint` : null
  return (
    <div className="mt-3">
      <label htmlFor={id} className="block text-base font-semibold">
        {unit ? `${label} (${unit})` : label}
      </label>
      {hint ? (
        <p id={hintId} className="text-base text-slate-300">
          {hint}
        </p>
      ) : null}
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
        className="mt-1 min-h-11 w-full rounded border border-slate-500 bg-slate-800 px-3 py-2 text-base text-slate-100"
      />
      <FieldError id={errorId} message={error} />
    </div>
  )
}