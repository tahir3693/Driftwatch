import { offlineStatus } from './offlineStatus.js'
import { useOfflineReady } from './useOfflineReady.js'

const DOT = {
  ready: 'bg-emerald-400',
  preparing: 'bg-amber-400',
  unsupported: 'bg-slate-400',
}

export default function OfflineIndicator() {
  const state = useOfflineReady()
  const s = offlineStatus(state)
  return (
    <p
      role="status"
      aria-live="polite"
      data-testid="offline-indicator"
      title={s.detail}
      className="inline-flex items-center gap-2 rounded border border-slate-500 px-3 py-2 text-base text-slate-100"
    >
      <span aria-hidden="true" className={`inline-block h-3 w-3 rounded-full ${DOT[s.key]}`} />
      <span className="font-semibold">{s.label}</span>
      <span className="sr-only">{s.detail}</span>
    </p>
  )
}
