// Indicator help and display rules, keyed "domain/indicator". Static imports so it works offline.
import environment from '../modules/environment/rules.json'
import gravity from '../modules/gravity/rules.json'
import nutrition from '../modules/nutrition/rules.json'
import isolation from '../modules/isolation/rules.json'
import radiation from '../modules/radiation/rules.json'
import bmd from '../modules/bmd-strength/rules.json'

const SOURCES = { environment, gravity, nutrition, isolation, radiation }

export function loadIndicatorRules() {
  const out = {}
  for (const [domain, rules] of Object.entries(SOURCES)) {
    for (const [indicator, rule] of Object.entries(rules.indicators ?? {})) out[`${domain}/${indicator}`] = rule
  }
  // BMD and strength tracker (sub-module of gravity): one entry per measure.
  // The alert value is the raw measurement, so the unit comes from the measure, not the rule.
  for (const rule of Object.values(bmd.indicators ?? {})) {
    for (const measure of rule.measures ?? []) {
      out[`${bmd.domain}/${measure.indicator}`] = {
        label: measure.label,
        unit: measure.unit,
        howToMeasure: rule.howToMeasure,
        whyItMatters: rule.whyItMatters,
        action: rule.action,
        source: rule.source,
      }
    }
  }
  return out
}
