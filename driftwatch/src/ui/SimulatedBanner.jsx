import { DISCLAIMER } from './wording.js'
/** Shown on every screen. Amber border, always visible. */
export default function SimulatedBanner() {
  return (
    <p role="note" className="dw-banner w-full p-3 text-base font-semibold text-ink">
      {DISCLAIMER}
    </p>
  )
}
