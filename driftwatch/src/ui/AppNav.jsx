import { useRef } from 'react'

export const NAV_ITEMS = [
  { view: 'dashboard', label: 'Dashboard' },
  { view: 'checkin', label: 'Check-in' },
  { view: 'report', label: 'Ground report' },
  { view: 'bmd', label: 'BMD and strength' },
  { view: 'sources', label: 'Sources' },
]
/**
 * Main navigation: one row of tabs. Props: { view, onChange(view) }. Hidden in print.
 * The current tab has aria-current="page". Left and Right arrows, Home and End move between tabs
 * (Tab reaches each one too). On a narrow phone the row scrolls inside itself.
 */
export default function AppNav({ view, onChange }) {
  const row = useRef(null)
  const onKeyDown = (e) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (!keys.includes(e.key)) return
    const tabs = [...row.current.querySelectorAll('button')]
    const at = tabs.indexOf(document.activeElement)
    if (at < 0) return
    e.preventDefault()
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (at + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    tabs[next].focus()
    tabs[next].scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }
  return (
    <nav aria-label="Main" className="no-print">
      <div ref={row} onKeyDown={onKeyDown} className="dw-tabs">
        {NAV_ITEMS.map((item) => {
          const current = item.view === view
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => onChange?.(item.view)}
              aria-current={current ? 'page' : undefined}
              className="dw-btn dw-tab min-h-11 min-w-11"
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
