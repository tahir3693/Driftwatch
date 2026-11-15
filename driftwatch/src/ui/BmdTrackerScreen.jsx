import { useCallback, useEffect, useRef, useState } from 'react'
import SimulatedBanner from './SimulatedBanner.jsx'
import BackButton from './BackButton.jsx'
import { BMD_TRACKER_URL } from './BmdTrackerLink.jsx'
import { attachFrame } from './trackerFrame.js'

/**
 * The BMD and strength tracker (public/bmd-strength/index.html) in a same-origin iframe.
 * Its height follows its content (see trackerFrame.js). It works offline: the page is in the
 * service worker precache. While the page opens, a small loading message shows.
 */
export function TrackerFrame() {
  const ref = useRef(null)
  const detach = useRef(() => {})
  const [loaded, setLoaded] = useState(false)
  // The page loads once per mount, and again if it reloads itself: start the sync after each load.
  const attach = useCallback(() => {
    detach.current()
    detach.current = ref.current ? attachFrame(ref.current) : () => {}
    setLoaded(true)
  }, [])
  useEffect(() => () => detach.current(), [])
  return (
    <div className="relative mt-4">
      {loaded ? null : (
        <p role="status" className="dw-card flex items-center gap-3 p-4 text-ink-2">
          <span className="dw-spinner" aria-hidden="true" />
          Opening the tracker
        </p>
      )}
      <iframe
        ref={ref}
        title="BMD and strength tracker"
        src={BMD_TRACKER_URL}
        onLoad={attach}
        className={`block h-96 w-full rounded-xl border-0 ${loaded ? 'dw-fade-in' : 'h-0 min-h-0 opacity-0'}`}
      />
    </div>
  )
}

/** The BMD and strength screen. Props: { onBack }. */
export default function BmdTrackerScreen({ onBack }) {
  return (
    <div className="text-base">
      <SimulatedBanner />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <BackButton onClick={onBack} />
        <h2 className="text-2xl font-bold">BMD and strength</h2>
      </div>
      <p className="mt-2 max-w-3xl text-ink-2">
        Record your bone mineral density, your strength and your weekly training. Everything is saved on this device. The
        Gravity alerts on the dashboard use these records.
      </p>
      <TrackerFrame />
    </div>
  )
}
