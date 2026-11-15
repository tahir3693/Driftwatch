import { useEffect, useRef } from 'react'
import { helpSections } from './helpModel.js'

/** Non-modal help for one indicator. Props: { rule, fallbackTitle, onClose }. */
export default function HelpPanel({ rule, fallbackTitle = 'Help', onClose }) {
  const headingRef = useRef(null)
  const { label, sections } = helpSections(rule)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <aside role="dialog" aria-labelledby="help-heading" className="dw-card mt-4 border-2 border-accent p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 id="help-heading" ref={headingRef} tabIndex={-1} className="text-xl font-semibold">
          Help: {label ?? fallbackTitle}
        </h2>
        <button type="button" onClick={onClose} className="dw-btn min-h-11 min-w-11">
          Close
        </button>
      </div>
      {sections.map((s) => (
        <section key={s.heading} className="mt-3">
          <h3 className="text-lg font-semibold text-ink-2">{s.heading}</h3>
          <p className="text-base">{s.text}</p>
        </section>
      ))}
    </aside>
  )
}
