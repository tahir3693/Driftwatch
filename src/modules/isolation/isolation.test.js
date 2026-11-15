import { describe, it, expect } from "vitest";
import rules from "./rules.json";
import { evaluateIsolation, overallOf } from "./isolationEngine.js";
import { isolationInputs } from "./scenarioInputs.js";

const FIELDS = ["action", "baseline", "domain", "escalate", "indicator", "source", "status", "urgency", "value", "why"];
const upTo = (n) => isolationInputs.slice(0, n);
const run = (n, opts = {}) => evaluateIsolation(upTo(n), { rules, ...opts });
const find = (alerts, id) => alerts.find((a) => a.indicator === id);

// Five flat baseline days, then one test day
function withDay6(over) {
  const base = { sleep_hours: 7, mood: 3, reaction_ms: 280, social_contact: 60 };
  return [...Array.from({ length: 5 }, () => ({ ...base })), { ...base, ...over }];
}

describe("Isolation module (Driftwatch contract)", () => {
  it("every alert has exactly the 10 contract fields and domain isolation", () => {
    for (let n = 1; n <= 14; n++) {
      for (const a of run(n)) {
        expect(Object.keys(a).sort().join(",")).toBe(FIELDS.join(","));
        expect(a.domain).toBe("isolation");
      }
    }
  });

  it("returns one alert per indicator plus isolation_overall", () => {
    const alerts = run(1);
    expect(alerts).toHaveLength(5);
    expect(overallOf(alerts).indicator).toBe("isolation_overall");
  });

  it("days 1 to 5 are all normal", () => {
    for (let n = 1; n <= 5; n++) {
      expect(overallOf(run(n)).status).toBe("normal");
      expect(overallOf(run(n)).urgency).toBe(0);
    }
  });

  it("day 6 is Watch without strain or escalation", () => {
    const alerts = run(6);
    expect(overallOf(alerts).status).toBe("watch");
    expect(overallOf(alerts).escalate).toBe(false);
    expect(find(alerts, "combined_strain")).toBe(undefined);
  });

  it("days 7 to 11 stay Watch with no escalation", () => {
    for (let n = 7; n <= 11; n++) {
      expect(overallOf(run(n)).status).toBe("watch");
      expect(overallOf(run(n)).escalate).toBe(false);
    }
  });

  it("day 12 raises combined strain, Act, and escalates", () => {
    const alerts = run(12);
    expect(find(alerts, "combined_strain").status).toBe("act");
    expect(overallOf(alerts).status).toBe("act");
    expect(overallOf(alerts).escalate).toBe(true);
  });

  it("status always matches the shared cut-offs (normal under 30, watch 30 to 59, act 60 and up)", () => {
    for (let n = 1; n <= 14; n++) {
      for (const a of run(n)) {
        const expected = a.urgency >= 60 ? "act" : a.urgency >= 30 ? "watch" : "normal";
        expect(a.status).toBe(expected);
        expect(a.escalate).toBe(a.urgency >= 60);
      }
    }
  });

  it("band edge: sleep just above the watch limit is normal, just below is Watch", () => {
    expect(find(evaluateIsolation(withDay6({ sleep_hours: 6.61 }), { rules }), "sleep_hours").status).toBe("normal");
    expect(find(evaluateIsolation(withDay6({ sleep_hours: 6.59 }), { rules }), "sleep_hours").status).toBe("watch");
  });

  it("low food intake adds an extra reason", () => {
    const alerts = evaluateIsolation(upTo(6), { rules, nutritionLow: true });
    expect(find(alerts, "sleep_hours").why).toContain("food intake");
  });

  it("every indicator has a source and help text, and wording avoids diagnostic words", () => {
    for (const ind of Object.values(rules.indicators)) {
      expect(!!ind.source && !!ind.action && !!ind.howToMeasure && !!ind.whyItMatters).toBe(true);
    }
    const text = JSON.stringify([rules.indicators, rules.patterns]).toLowerCase();
    expect(text.includes("diagnos") || text.includes("disorder") || text.includes("depress")).toBe(false);
  });
});
