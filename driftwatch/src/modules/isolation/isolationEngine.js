// Isolation module engine: a plain function that returns the Driftwatch alert contract.
// Every limit comes from rules.json (passed in). No limits are typed in this file.
//
// evaluateIsolation(days, { rules, nutritionLow })
//   days  = array of daily records up to and including today, oldest first:
//           { sleep_hours, mood, reaction_ms, social_contact }
//   returns one alert per indicator, plus combined patterns, plus "isolation_overall".

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
};
const fill = (t, v) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
const RANK = { normal: 0, watch: 1, act: 2 };

// z-score edges, measured in the "bad" direction, read from the rule's bands
function edges(ind) {
  const w = ind.bands.watch;
  const a = ind.bands.act;
  return ind.bad_direction === "low"
    ? { watch: -w.z_max, act: -a.z_max }
    : { watch: w.z_min, act: a.z_min };
}

// Personal normal: mean and spread of the first baseline_days days (with a minimum spread)
export function baselineFor(days, key, rules) {
  const vals = days.slice(0, rules.baseline_days).map((d) => d[key]).filter((v) => typeof v === "number");
  if (vals.length === 0) return null;
  return { mean: mean(vals), sd: Math.max(sd(vals), rules.indicators[key].min_sd), n: vals.length };
}

// 0 to 100. Lands exactly on the cut-offs: z at the watch edge = watch_from, z at the act edge = act_from.
function urgencyFromZ(z, e, u) {
  if (z <= 0) return 0;
  let x;
  if (z < e.watch) x = (u.watch_from * z) / e.watch;
  else if (z < e.act) x = u.watch_from + ((u.act_from - u.watch_from) * (z - e.watch)) / (e.act - e.watch);
  else x = u.act_from + 20 * (z - e.act);
  return Math.min(100, Math.floor(x));
}

function scoreIndicator(days, idx, key, rules) {
  const ind = rules.indicators[key];
  const value = days[idx]?.[key];
  const base = baselineFor(days, key, rules);
  const learning = idx < rules.baseline_days; // not enough history yet: stays normal
  if (typeof value !== "number" || !base || learning) return { value, base, status: "normal", urgency: 0 };
  const zRaw = (value - base.mean) / base.sd;
  const z = ind.bad_direction === "low" ? -zRaw : zRaw;
  const e = edges(ind);
  const status = z >= e.act ? "act" : z >= e.watch ? "watch" : "normal";
  return { value, base, status, urgency: urgencyFromZ(z, e, rules.urgency) };
}

function patternFires(days, idx, rules, p) {
  for (let d = idx - p.for_days + 1; d <= idx; d++) {
    if (d < 0) return false;
    const off = p.needs.filter((k) => scoreIndicator(days, d, k, rules).status !== "normal").length;
    if (off < p.min_in_watch) return false;
  }
  return true;
}

export function evaluateIsolation(days, { rules, nutritionLow = false } = {}) {
  if (!rules) throw new Error("evaluateIsolation needs rules (import rules.json and pass it in)");
  const idx = days.length - 1;
  const domain = rules.module;
  const alerts = [];
  const scored = {};

  if (idx >= 0) {
    for (const [key, ind] of Object.entries(rules.indicators)) {
      const s = scoreIndicator(days, idx, key, rules);
      scored[key] = s;
      if (typeof s.value !== "number") continue;
      const delta = Math.abs(s.value - s.base.mean).toFixed(ind.unit === "ms" ? 0 : 1);
      let why = s.status === "normal" ? rules.normal.why : fill(ind.why, { delta, unit: ind.unit });
      let action = s.status === "normal" ? rules.normal.action : ind.action;
      if (s.status === "act") action += ` ${rules.escalate_action}`;
      if (nutritionLow && s.status !== "normal") why += ` ${rules.extra_reasons.low_intake}`;
      alerts.push({
        domain, indicator: key, value: s.value,
        baseline: Math.round(s.base.mean * 100) / 100,
        status: s.status, urgency: s.urgency, why, action,
        escalate: s.urgency >= rules.urgency.act_from,
        source: ind.source,
      });
    }

    for (const [id, p] of Object.entries(rules.patterns)) {
      if (!patternFires(days, idx, rules, p)) continue;
      const needed = p.needs.map((k) => scored[k]?.urgency ?? 0);
      alerts.push({
        domain, indicator: id, value: null, baseline: null,
        status: p.result,
        urgency: Math.max(rules.urgency.act_from, ...needed),
        why: nutritionLow ? `${p.why} ${rules.extra_reasons.low_intake}` : p.why,
        action: p.action, escalate: p.escalate, source: p.source,
      });
    }
  }

  // Overall object: worst status, highest urgency
  const top = [...alerts].sort((a, b) => RANK[b.status] - RANK[a.status] || b.urgency - a.urgency)[0];
  alerts.push({
    domain, indicator: `${domain}_overall`, value: null, baseline: null,
    status: top ? top.status : "normal",
    urgency: alerts.reduce((m, a) => Math.max(m, a.urgency), 0),
    why: top ? top.why : "No readings yet.",
    action: top ? top.action : rules.normal.action,
    escalate: alerts.some((a) => a.escalate),
    source: top ? top.source : "design value",
  });
  return alerts;
}

export const overallOf = (alerts) => alerts.find((a) => a.indicator.endsWith("_overall"));
