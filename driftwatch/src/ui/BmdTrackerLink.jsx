import { BMD_TRACKER_PATH } from '../modules/bmd-strength/bmdAdapter.js'
export const BMD_TRACKER_URL = `${import.meta.env.BASE_URL}${BMD_TRACKER_PATH}`
const CLASSES = 'mt-2 inline-flex min-h-11 min-w-11 items-center py-2 text-base font-semibold text-accent underline underline-offset-4'
/**
 * Entry to the BMD and strength tracker. With `onOpen` it is a button that opens the in-app screen.
 * Without it, it is a plain link to the bundled page (public/bmd-strength/).
 */
export default function BmdTrackerLink({ onOpen }) {
  if (typeof onOpen === 'function') {
    return (
      <button type="button" onClick={onOpen} className={CLASSES}>
        Open BMD and strength tracker
      </button>
    )
  }
  return (
    <a href={BMD_TRACKER_URL} className={CLASSES}>
      Open BMD and strength tracker
    </a>
  )
}
