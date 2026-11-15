// One-sided CUSUM drift detection on a z-score series (oldest first).
// C_t = max(0, C_{t-1} + z_t - k). Pure: no I/O, no clock.

export const DRIFT_DEFAULTS = Object.freeze({ k: 0.5, h: 3 });

export function cusum(zSeries, { k = DRIFT_DEFAULTS.k, h = DRIFT_DEFAULTS.h } = {}) {
  let c = 0;
  let runLength = 0;
  let signalIndex = -1;

  for (let i = 0; i < zSeries.length; i += 1) {
    c = Math.max(0, c + zSeries[i] - k);
    runLength = c > 0 ? runLength + 1 : 0;
    if (c > h) {
      signalIndex = i;
      break;
    }
  }

  return { drift: signalIndex !== -1, signalIndex, runLength, statistic: c };
}
