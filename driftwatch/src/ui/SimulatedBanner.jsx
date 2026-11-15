import { DISCLAIMER } from './wording.js'

export default function SimulatedBanner() {
  return (
    <p role="note" className="w-full rounded border border-amber-300 p-3 text-base font-semibold">
      {DISCLAIMER}
    </p>
  )
}
