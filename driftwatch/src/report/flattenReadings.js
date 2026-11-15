/** { key: Reading[] } -> Reading[]. Concatenates in key order, skips non-arrays, no sorting or copying. */
export function flattenReadings(readingsByKey) {
  if (readingsByKey === null || typeof readingsByKey !== 'object' || Array.isArray(readingsByKey)) return []
  const out = []
  for (const list of Object.values(readingsByKey)) {
    if (Array.isArray(list)) out.push(...list)
  }
  return out
}
