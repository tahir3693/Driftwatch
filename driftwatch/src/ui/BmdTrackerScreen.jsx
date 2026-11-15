import { useCallback, useEffect, useRef } from 'react'
import SimulatedBanner from './SimulatedBanner.jsx'
import { BMD_TRACKER_URL } from './BmdTrackerLink.jsx'
import { attachFrame } from './trackerFrame.js'

/**
 * The BMD and strength tracker (public/bmd-strength/index.html) in a same-origin iframe.
 * Its height follows its content (see trackerFrame.js). It works offline: the page is in the
 * service worker precache.
 */
export function TrackerFrame() {
  const ref = useRef(null)
  const detach = useRef(() => {})
  // The page loads once per mount, and again if it reloads itself: start the sync after each load.
  const attach = useCallback(() => {
    detach.current()
    detach.current = ref.current ? attachFrame(ref.current) : () => {}
  }, [])
  useEffect(() => () => detach.current(), [])
  return (
    <iframe
      ref={ref}
      title="BMD and strength tracker"
      src={BMD_TRACKER_URL}
      onLoad={attach}
      className="mt-4 block h-96 w-full border-0"
    />
  )
}

/** The BMD and strength screen. Props: { onBack }. */
export default function BmdTrackerScreen({ onBack }) {
  return (
    <div className="text-base">
      <SimulatedBanner />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onBack?.()}
          className="min-h-11 min-w-11 rounded border border-slate-400 px-4 py-2 text-base font-semibold"
        >
          Back to dashboard
        </button>
        <h2 className="text-2xl font-semibold">BMD and strength</h2>
      </div>
      <p className="mt-2 max-w-3xl text-slate-300">
        Record your bone mineral density, your strength and your weekly training. Everything is saved on this device. The
        Gravity alerts on the dashboard use these records.
      </p>
      <TrackerFrame />
    </div>
  )
}
