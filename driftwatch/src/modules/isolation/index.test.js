import { describe, it, expect } from "vitest";
import isolation, { runIsolation, readingsToDays, isolationInputs, rules } from "./index.js";
import { runModules } from "../../engine/adapter.js";
import { validateAlert } from "../../engine/validateAlert.js";
import cutoffs from "../../data/cutoffs.json";

const DAY = 86_400_000;
const START = 1_700_000_000_000;
const KEYS = ["sleep_hours", "mood", "reaction_ms", "social_contact"];

// The teammate's 14 days as shared readings ({ [indicator]: [{ timestamp, domain, indicator, value }] }).
function readingsFor(inputs) {
  const out = {};
  inputs.forEach((d, i) => {
    for (const k of KEYS) {
      if (typeof d[k] !== "number") continue;
      (out[k] ??= []).push({ timestamp: START + i * DAY, domain: "isolation", indicator: k, value: d[k] });
    }
  });
  return out;
}
const readings = readingsFor(isolationInputs);
const onDay = (n) => runIsolation(readings, { cutoffs, now: START + (n - 1) * DAY });
const find = (alerts, id) => alerts.find((a) => a.indicator === id);

describe("isolation descriptor", () => {
  it("is a frozen function descriptor", () => {
    expect(Object.isFrozen(isolation)).toBe(true);
    expect(isolation).toMatchObject({ name: "isolation", domain: "isolation", kind: "function" });
    expect(isolation.run).toBe(runIsolation);
  });

  it("maps readings onto one day record per day, oldest first, up to now", () => {
    const days = readingsToDays(readings, START + 2 * DAY);
    expect(days).toEqual(isolationInputs.slice(0, 3).map(({ day, ...rest }) => rest));
    expect(readingsToDays({}, START)).toEqual([]);
  });

  it("uses the latest reading of a day", () => {
    const r = { mood: [{ timestamp: START + 10, value: 3 }, { timestamp: START + 5, value: 9 }] };
    expect(readingsToDays(r, START + DAY)).toEqual([{ mood: 3 }]);
  });

  it("returns only valid contract alerts, one per indicator, ending with isolation_overall", () => {
    for (let n = 1; n <= 14; n++) {
      const alerts = onDay(n);
      for (const a of alerts) expect(validateAlert(a)).toEqual({ ok: true });
      for (const k of KEYS) expect(find(alerts, k)).toBeDefined();
      expect(alerts.at(-1).indicator).toBe("isolation_overall");
      expect(alerts.filter((a) => a.indicator === "isolation_overall")).toHaveLength(1);
    }
  });

  it("gives the same result as the teammate's engine on his inputs", async () => {
    const { evaluateIsolation } = await import("./isolationEngine.js");
    for (let n = 1; n <= 14; n++) {
      const engine = evaluateIsolation(isolationInputs.slice(0, n).map(({ day, ...rest }) => rest), { rules });
      expect(onDay(n)).toEqual(engine);
    }
  });

  it("day 6 is Watch (sleep and reaction check), days 7 to 11 have no strain", () => {
    const d6 = onDay(6);
    expect(find(d6, "isolation_overall")).toMatchObject({ status: "watch", escalate: false });
    expect(find(d6, "sleep_hours").status).toBe("watch");
    expect(find(d6, "reaction_ms").status).toBe("watch");
    for (let n = 7; n <= 11; n++) expect(find(onDay(n), "combined_strain")).toBeUndefined();
  });

  it("day 12: 2 or more indicators in watch for 2 days gives combined strain, Act and escalate", () => {
    const d12 = onDay(12);
    const p = find(d12, "combined_strain");
    expect(p).toMatchObject({ status: "act", escalate: true });
    expect(p.urgency).toBeGreaterThanOrEqual(cutoffs.act_from);
    expect(find(d12, "isolation_overall")).toMatchObject({ status: "act", escalate: true });
    const text = d12.map((a) => `${a.why} ${a.action}`).join(" ").toLowerCase();
    expect(text).toContain("strain");
    expect(text).not.toMatch(/depress|anxiety|disorder|psychosis|diagnos/);
  });

  it("uses the shared cut-offs, not the rules.json urgency block", () => {
    const strict = { watch_from: 20, act_from: 40, source: "test" };
    const alerts = runIsolation(readings, { cutoffs: strict, now: START + 11 * DAY });
    expect(find(alerts, "combined_strain").urgency).toBeGreaterThanOrEqual(40);
    for (let n = 1; n <= 14; n++) {
      for (const a of onDay(n)) {
        const expected = a.urgency >= 60 ? "act" : a.urgency >= 30 ? "watch" : "normal";
        expect(a.status).toBe(expected);
      }
    }
  });

  it("reports a missing indicator as Normal with no data", () => {
    const { mood, ...rest } = readings;
    const alerts = runIsolation(rest, { cutoffs, now: START + 5 * DAY });
    expect(find(alerts, "mood")).toMatchObject({ status: "normal", value: null, baseline: null, urgency: 0, escalate: false });
    expect(validateAlert(find(alerts, "mood"))).toEqual({ ok: true });
  });

  it("returns no-data alerts and a Normal isolation_overall for no readings", () => {
    const alerts = runIsolation(undefined, { cutoffs, now: START });
    expect(alerts.map((a) => a.indicator)).toEqual([...KEYS, "isolation_overall"]);
    expect(alerts.at(-1)).toMatchObject({ status: "normal", urgency: 0, escalate: false });
  });

  it("runs through runModules with no errors", () => {
    const res = runModules([isolation], { isolation: readings }, { cutoffs, now: START + 11 * DAY });
    expect(res.errors).toEqual([]);
    expect(find(res.alerts, "isolation_overall").status).toBe("act");
  });
});
