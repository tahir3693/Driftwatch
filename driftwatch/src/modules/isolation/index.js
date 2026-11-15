// Isolation module entry point for Driftwatch.
// The default export is a module descriptor (defineModule). Its run function maps the shared
// readings onto the teammate's day format and calls his engine unchanged.
import { defineModule } from "../../engine/adapter.js";
import rules from "./rules.json";
import { evaluateIsolation as run, overallOf, baselineFor } from "./isolationEngine.js";
import { isolationInputs } from "./scenarioInputs.js";

export { rules, isolationInputs, overallOf, baselineFor };

const DAY_MS = 86_400_000;
const INDICATORS = Object.keys(rules.indicators);

// days: array of daily records up to today, oldest first
// options: { nutritionLow: boolean }
export function evaluateIsolation(days, options = {}) {
  return run(days, { rules, ...options });
}

/**
 * Map readings ({ [indicator]: [{ timestamp, value }] }) onto the engine's day format:
 * one record per calendar day up to `now`, oldest first, { sleep_hours, mood, reaction_ms, social_contact }.
 * When a day has several readings of one indicator, the latest one is used.
 */
export function readingsToDays(readings, now) {
  const byDay = new Map();
  for (const key of INDICATORS) {
    const list = [...(readings?.[key] ?? [])]
      .filter((r) => typeof r?.timestamp === "number" && (now === undefined || r.timestamp <= now))
      .sort((a, b) => a.timestamp - b.timestamp);
    for (const r of list) {
      const day = Math.floor(r.timestamp / DAY_MS);
      if (!byDay.has(day)) byDay.set(day, {});
      byDay.get(day)[key] = r.value;
    }
  }
  return [...byDay.keys()].sort((a, b) => a - b).map((day) => byDay.get(day));
}

// The engine skips an indicator that has no value today. The contract needs one alert per
// indicator, so a missing one is reported as Normal with no data.
function noDataAlert(key) {
  const ind = rules.indicators[key];
  return {
    domain: "isolation",
    indicator: key,
    value: null,
    baseline: null,
    status: "normal",
    urgency: 0,
    why: `No ${ind.label.toLowerCase()} logged today.`,
    action: rules.normal.action,
    escalate: false,
    source: ind.source,
  };
}

/**
 * Descriptor run function. ctx: { cutoffs, now, nutritionLow? }.
 * The shared cut-offs replace the urgency block of rules.json, so the engine uses 30 and 60.
 * Returns one alert per indicator, any combined pattern alerts, then isolation_overall.
 */
export function runIsolation(readings, ctx = {}) {
  const shared = ctx.cutoffs ?? rules.urgency;
  const sharedRules = {
    ...rules,
    urgency: { ...rules.urgency, watch_from: shared.watch_from, act_from: shared.act_from },
  };
  const days = readingsToDays(readings, ctx.now);
  const alerts = run(days, { rules: sharedRules, nutritionLow: ctx.nutritionLow === true });
  const overall = alerts.at(-1);
  const body = alerts.slice(0, -1);
  const missing = INDICATORS.filter((k) => !body.some((a) => a.indicator === k)).map(noDataAlert);
  return [...missing, ...body, overall];
}

export default defineModule({ name: "isolation", domain: "isolation", kind: "function", run: runIsolation });
