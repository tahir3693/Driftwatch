import { offlineStatus } from './offlineStatus.js'
import { useOfflineReady } from './useOfflineReady.js'
const DOT = {
  ready: 'bg-normal',
  preparing: 'bg-watch',
  unsupported: 'bg-ink-2',
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
      className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-base text-ink"
    >
      <span aria-hidden="true" className={`inline-block h-3 w-3 rounded-full ${DOT[s.key]}`} />
      <span className="font-semibold">{s.label}</span>
      <span className="sr-only">{s.detail}</span>
    </p>
  )
}
