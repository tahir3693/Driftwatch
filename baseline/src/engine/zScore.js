// z-score of a value against a personal baseline { mean, sd }.
// Always returns a finite number.
export function zScore(value, baseline, fallbackSpread = 1) {
  const mean = baseline?.mean;
  const sd = baseline?.sd;
  if (!Number.isFinite(value) || !Number.isFinite(mean)) return 0;

  const spread =
    Number.isFinite(fallbackSpread) && fallbackSpread > 0 ? fallbackSpread : 1;

  let z;
  if (Number.isFinite(sd) && sd > 0) {
    z = (value - mean) / sd;
  } else if (value === mean) {
    z = 0;
  } else {
    z = (value - mean) / spread;
  }
  return Number.isFinite(z) ? z : 0;
}
