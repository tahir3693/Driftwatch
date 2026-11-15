import { describe, it, expect } from 'vitest';
import { cusum, DRIFT_DEFAULTS } from './drift.js';

describe('DRIFT_DEFAULTS', () => {
  it('holds k = 0.5 and h = 3', () => {
    expect(DRIFT_DEFAULTS).toEqual({ k: 0.5, h: 3 });
  });
});

describe('cusum', () => {
  it('gives no drift for a series at or below k', () => {
    const r = cusum([0.5, 0.5, 0.2, -1, 0.5, 0, 0.5]);
    expect(r.drift).toBe(false);
    expect(r.signalIndex).toBe(-1);
    expect(r.statistic).toBe(0);
    expect(r.runLength).toBe(0);
  });

  it('handles an empty series', () => {
    expect(cusum([])).toEqual({ drift: false, signalIndex: -1, runLength: 0, statistic: 0 });
  });

  it('signals on a slow ramp that stays below 1 sigma', () => {
    const ramp = Array.from({ length: 14 }, (_, i) => 0.1 + i * 0.1);
    const r = cusum(ramp);
    expect(Math.max(...ramp)).toBeLessThan(1.5);
    expect(r.drift).toBe(true);
    expect(r.signalIndex).toBeGreaterThan(0);
    expect(r.statistic).toBeGreaterThan(DRIFT_DEFAULTS.h);
    expect(r.runLength).toBeGreaterThan(1);
  });

  it('reports the first index where C exceeds h and the run up to it', () => {
    // C: 0.5, 1, 1.5, 2, 2.5, 3 (not > 3), 3.5 (signal at index 6)
    const r = cusum([1, 1, 1, 1, 1, 1, 1]);
    expect(r.signalIndex).toBe(6);
    expect(r.runLength).toBe(7);
    expect(r.statistic).toBeCloseTo(3.5);
  });

  it('measures runLength from the last time C left zero', () => {
    // C: 0, 0, 0.5, 1 -> run of 2 at the end
    const r = cusum([-1, 0, 1, 1]);
    expect(r.drift).toBe(false);
    expect(r.runLength).toBe(2);
    expect(r.statistic).toBeCloseTo(1);
  });

  it('resets the run when C returns to zero', () => {
    const r = cusum([1, 1, -5, 1]);
    expect(r.runLength).toBe(1);
  });

  it('uses k from the arguments', () => {
    const series = [1, 1, 1, 1];
    expect(cusum(series, { k: 0.5 }).statistic).toBeCloseTo(2);
    expect(cusum(series, { k: 1 }).statistic).toBe(0);
  });

  it('uses h from the arguments', () => {
    const series = [1, 1, 1, 1];
    expect(cusum(series, { h: 1 }).signalIndex).toBe(2);
    expect(cusum(series, { h: 10 }).drift).toBe(false);
  });

  it('defaults k and h to DRIFT_DEFAULTS', () => {
    const series = [1, 1, 1, 1, 1, 1, 1, 1];
    expect(cusum(series)).toEqual(cusum(series, { k: DRIFT_DEFAULTS.k, h: DRIFT_DEFAULTS.h }));
    expect(cusum(series, {})).toEqual(cusum(series));
    expect(cusum(series, { h: 1 }).statistic).toBeCloseTo(
      cusum(series, { k: DRIFT_DEFAULTS.k, h: 1 }).statistic
    );
  });
});
