const ITEMS = [
  { view: 'dashboard', label: 'Dashboard' },
  { view: 'checkin', label: 'Check-in' },
  { view: 'report', label: 'Ground report' },
]

/** Main navigation. Props: { view, onChange(view) }. Hidden in print. */
export default function AppNav({ view, onChange }) {
  return (
    <nav aria-label="Main" className="no-print mb-4 flex flex-wrap gap-2">
      {ITEMS.map((item) => {
        const current = item.view === view
        return (
          <button
            key={item.view}
            type="button"
            onClick={() => onChange?.(item.view)}
            aria-current={current ? 'page' : undefined}
            className={`min-h-11 min-w-11 rounded border px-4 py-2 text-base font-semibold ${
              current ? 'border-slate-100 bg-slate-100 text-slate-900' : 'border-slate-400'
            }`}
          >
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
