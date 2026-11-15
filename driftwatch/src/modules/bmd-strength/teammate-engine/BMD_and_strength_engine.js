/* Driftwatch: BMD and strength module engine (plain JS, no dependencies).
 Every number is tagged OFFICIAL (NASA) or PROTOTYPE (our own rule). */
export const RULES = {
  // OFFICIAL: NASA-STD-3001 Vol 1: drop in strength < 0.2 * strength in earth
  low_strength_limit: 0.8,
  // OFFICIAL: NASA-STD-3001 Vol 1: drop in BMD < 0.05 * BMD in earth
  low_BMD_limit: 0.95,
  // PROTOTYPE: max points each input can add; total is capped at 100
  maxPoints: { "workouts": 20, "baselines": 80 },
  // PROTOTYPE status bands on the 0-100 urgency score
  bands: { watch: 20, act: 50 },
  Benchpress: [0.9, 0.8],
  Deadlift: [0.9, 0.8],
  Spine: [0.98, 0.95],
  Hip: [0.98, 0.95]
};

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const statusOf = (u) => (u >= RULES.bands.act ? "act" : u >= RULES.bands.watch ? "watch" : "normal");
// Driftwatch edit: removed the module-level mutable `parameters` object. The pre-mission baseline is an input (inp.baseline_value), so evaluate is pure.

function scoreWorkout(workouts_this_week) {
  const val = 7 - workouts_this_week;
  const pts = val <= 1 ? 0 : val <= 3 ? 10 : 20;
  return { val, "pts":pts};
}
// Driftwatch edit: baseline_value is a new argument (the pre-mission baseline), no longer remembered from the first reading.
function scoreBaselines(latest_parameter_reading, parameter_name, baseline_value) {
  let frac = (baseline_value - latest_parameter_reading)/baseline_value; // Driftwatch edit: baseline_value instead of parameters[...]
  let raw = latest_parameter_reading > baseline_value * RULES[parameter_name][0] ? 0 : latest_parameter_reading > baseline_value * RULES[parameter_name][1] ? 40:80; // Driftwatch edit: baseline_value instead of parameters[...]
  return { frac, raw, pts: Math.min(raw, RULES.maxPoints.baselines) , parameter_name };
}

const ACTIONS = {
  workouts: {
    normal: "No action needed. Keep logging your workouts.",
    watch: "Continue with consistent training through the week to ensure minimum bone and muscle loss.",
    act: "Continue with consistent training through the week to ensure minimum bone and muscle loss."
  },
  BMD_and_strength_check_in: {
    normal: "No action needed.",
    watch: "Repeat the check-in in a few days and record any inconsistencies in your workouts.",
    act: "Contact the flight surgeon now and log any recent workout inconsistency."
  },
};

// MAIN: inputs -> array of shared-contract objects (2 indicators)
export function evaluate(inp) {
  const d = scoreWorkout(inp.registered_week_workouts);
  const s = scoreBaselines(inp.registered_value, inp.baseline_indicator, inp.baseline_value); // Driftwatch edit: pass the baseline input
  let total = Math.round(clamp(d.pts + s.pts, 0, 100));

  const reasons = [];
  if (d.pts > 0) reasons.push(`Six workouts a week requirement not met for reducing bone and strength loss.`);
  if (s.pts > 0) reasons.push(`Current ${s.parameter_name} loss is ${s.frac} compared to baseline value.`);

  let escalate = false, escReason = "";
  if (s.frac >= 1 - RULES[s.parameter_name][1]) { total = Math.max(total, 90); escalate = true; escReason = "Reached maximum " + s.parameter_name + " loss."; }

  const status = statusOf(total);
  const why = reasons.length ? "Possible bone or muscle loss concern: " + reasons.join("; ") + "." : "No parameters under declared limits.";
  const pct = (pts, max) => Math.round((pts / max) * 100);
  const base = { domain: "BMD_and_strength" };

  const out = [
    { ...base, indicator: "Workouts", value: inp.registered_week_workouts, status: statusOf(pct(d.pts, 20)),
      urgency: pct(d.pts, RULES.maxPoints.workouts), why: `${inp.registered_week_workouts} have been completed in the last week when 6 workouts a week is key for keeping a good health`,
      action: ACTIONS.workouts[statusOf(pct(d.pts, 40))], escalate: d.pts >= 10, source: "NASA Science In Space: May 2024 - Astronaut Excercise [Astronauts exercise two hours a day ... spending up to 10 hours a week exercising]" },
    { ...base, indicator: "BMS and muscle loss", value: {"parameter":s.parameter_name, "value":s.frac}, baseline: inp.baseline_value /* Driftwatch edit: was parameters[s.parameter_name] */, status: statusOf(pct(s.pts, 80)),
      urgency: pct(s.pts, RULES.maxPoints.baselines), why: "A loss of " + String(-1 *s.frac) + " on " + s.parameter_name + " has been detected.",
      action: ACTIONS.BMD_and_strength_check_in[statusOf(pct(s.pts, 80))], escalate: s.pts >= 80 /* Driftwatch edit: this alert's own score (s.pts); was d.pts >= 80 */, source: "NASA-STD-3001 Vol 1 Rev C (5% limit for bone loss & 20% limit for strength loss)." },
  ];
  out.parts = { workouts_left: d.val, "baseline_drop": {"parameter": s.parameter_name, "drop": -1 * s.frac}};
  return out;
}

// Driftwatch edit: removed the self-running main() test call. It now lives in BMD_and_strength_engine.test.js.
