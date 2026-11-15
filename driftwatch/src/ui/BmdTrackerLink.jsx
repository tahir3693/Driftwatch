import { BMD_TRACKER_PATH } from '../modules/bmd-strength/bmdAdapter.js'

export const BMD_TRACKER_URL = `${import.meta.env.BASE_URL}${BMD_TRACKER_PATH}`

/** Link to the BMD and strength tracker (bundled in public/bmd-strength/). */
export default function BmdTrackerLink() {
  return (
    <a
      href={BMD_TRACKER_URL}
      className="mt-2 inline-flex min-h-11 min-w-11 items-center py-2 text-base font-semibold text-teal-300 underline"
    >
      Open BMD and strength tracker
    </a>
  )
}
