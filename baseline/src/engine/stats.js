/** Arithmetic mean (two-pass callers should pass this to stdDev). Empty input returns 0. */
export function mean(values) {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

/**
 * Two-pass sample standard deviation (n - 1 divisor).
 * Fewer than two values returns 0.
 */
export function stdDev(values) {
  const n = values.length;
  if (n < 2) return 0;
  const m = mean(values);
  let sumSq = 0;
  for (const v of values) {
    const d = v - m;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / (n - 1));
}
