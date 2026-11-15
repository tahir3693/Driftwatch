import { useEffect } from 'react'
import { styleFor } from './statusStyle.js'

const resultStatus = (text) => (text.startsWith('Could not') ? 'act' : text.startsWith('Saved. Alerts could') ? 'watch' : 'normal')

export const errorFor = (errors, field) => errors?.find((e) => e.field === field)?.message

/**
 * The frame of one module form: title, fields (children), one submit button and the result text.
 * After a failed submit it moves focus to the element with id `<module>-<first error field>`.
 */
export default function FormShell({ module, title, onSubmit, submitting = false, resultText, errors, children }) {
  useEffect(() => {
    if (errors && errors.length > 0) document.getElementById(`${module}-${errors[0].field}`)?.focus()
  }, [errors, module])

  const submit = (e) => {
    e.preventDefault()
    if (!submitting) onSubmit()
  }
  const headingId = `${module}-title`
  return (
    <form noValidate onSubmit={submit} aria-labelledby={headingId} className="rounded border border-slate-500 p-4">
      <h2 id={headingId} className="text-2xl font-semibold">
        {title}
      </h2>
      {children}
      <button
        type="submit"
        disabled={submitting}
        className="mt-4 min-h-11 min-w-11 rounded bg-teal-400 px-4 py-2 text-base font-semibold text-slate-900 disabled:opacity-50"
      >
        {`Save ${title}`}
      </button>
      {resultText ? (
        <p data-testid={`${module}-result`} className={`mt-3 rounded border-l-4 px-2 text-base font-semibold ${styleFor(resultStatus(resultText)).classes}`}>
          {resultText}
        </p>
      ) : null}
    </form>
  )
}