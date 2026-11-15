// Isolation module entry point for Driftwatch.
// Plain function that returns the alert contract (domain "isolation" + "isolation_overall").
import rules from "./rules.json";
import { evaluateIsolation as run, overallOf, baselineFor } from "./isolationEngine.js";
import { isolationInputs } from "./scenarioInputs.js";

export { rules, isolationInputs, overallOf, baselineFor };

// days: array of daily records up to today, oldest first
// options: { nutritionLow: boolean }
export function evaluateIsolation(days, options = {}) {
  return run(days, { rules, ...options });
}

export default evaluateIsolation;
