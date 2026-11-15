import { useEffect } from 'react'
import { StatusIcon } from './StatusBadge.jsx'
const resultStatus = (text) => (text.startsWith('Could not') ? 'act' : text.startsWith('Saved. Alerts could') ? 'watch' : 'normal')
const EDGE = { normal: 'border-normal', watch: 'border-watch', act: 'border-act' }
export const errorFor = (errors, field) => errors?.find((e) => e.field === field)?.message
/**
 * The frame of one module form: title, fields (children), one submit button and the result text.
 * After a failed submit it moves focus to the element with id `<module>-<first error field>`.
 * While saving, the button shows a spinner; the result is a banner with an icon and the same text.
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
  const status = resultText ? resultStatus(resultText) : null
  return (
    <form noValidate onSubmit={submit} aria-labelledby={headingId} aria-busy={submitting ? 'true' : undefined} className="dw-card p-4 sm:p-5">
      <h2 id={headingId} className="text-2xl font-bold">
        {title}
      </h2>
      {children}
      <button type="submit" disabled={submitting} className="dw-btn dw-btn-primary mt-5 min-h-11 min-w-11">
        {submitting ? <span className="dw-spinner" aria-hidden="true" /> : null}
        {`Save ${title}`}
      </button>
      {resultText ? (
        <p data-testid={`${module}-result`} className={`dw-fade-in mt-3 flex items-center gap-2 rounded-lg border-2 bg-raised px-3 py-2 text-base font-semibold ${EDGE[status]}`}>
          <StatusIcon status={status} size={18} />
          <span>{resultText}</span>
        </p>
      ) : null}
    </form>
  )
}
