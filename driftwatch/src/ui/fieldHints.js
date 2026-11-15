import ranges from '../data/checkinRanges.json'
/**
 * Helper text under a check-in field: the allowed range from the same table the validation uses.
 * Example: "Allowed range: 0 to 10 mmHg." Whole-number fields add "Whole number."
 */
export function rangeHelper(key) {
  const r = ranges[key]
  if (!r) return undefined
  const unit = r.unit ? ` ${r.unit}` : ''
  return `Allowed range: ${r.min} to ${r.max}${unit}.${r.integer ? ' Whole number.' : ''}`
}
