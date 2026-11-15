// Reaction check maths. Pure: randomness is passed in as a number in [0, 1).
export const NOT_ENOUGH_TAPS = 'Not enough taps. Please run the reaction check again.'
const MIN_WAIT_MS = 2000
const WAIT_SPAN_MS = 4000

/** Median of a non-empty list. Sorts a copy; even length gives the mean of the two middle values. */
export function medianReaction(times) {
  const sorted = [...times].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** { ok: true, median } or { ok: false, message } when there are fewer than minTaps times. */
export function summarizeReaction(times, minTaps) {
  if (!Array.isArray(times) || times.length === 0 || times.length < minTaps) {
    return { ok: false, message: NOT_ENOUGH_TAPS }
  }
  return { ok: true, median: medianReaction(times) }
}

/** Wait before the prompt: 2000 + random * 4000, so a value in [2000, 6000). */
export function nextWaitMs(random) {
  // The clamp keeps the result below 6000 when the sum rounds up for a random value just under 1.
  return Math.min(MIN_WAIT_MS + random * WAIT_SPAN_MS, MIN_WAIT_MS + WAIT_SPAN_MS - 0.001)
}