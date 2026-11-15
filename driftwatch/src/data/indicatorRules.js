// Indicator help and display rules, keyed "domain/indicator". Static imports so it works offline.
import environment from '../modules/environment/rules.json'
import gravity from '../modules/gravity/rules.json'
import nutrition from '../modules/nutrition/rules.json'
import isolation from '../modules/isolation/rules.json'
import radiation from '../modules/radiation/rules.json'
import bmd from '../modules/bmd-strength/rules.json'
import radiationHelp from '../modules/radiation/help.json'
import environmentHelp from '../modules/environment/help.json'
import isolationHelp from '../modules/isolation/help.json'
import gravityHelp from '../modules/gravity/help.json'
import nutritionHelp from '../modules/nutrition/help.json'

const SOURCES = { environment, gravity, nutrition, isolation, radiation }
// Fallback help (help.json in each module folder) for alerts whose help is not in rules.json:
// the radiation alerts, every <domain>_overall, the patterns and the tracker's workouts alert.
export const HELP_FALLBACK = { radiation: radiationHelp, environment: environmentHelp, isolation: isolationHelp, gravity: gravityHelp, nutrition: nutritionHelp }
const HELP_FIELDS = ['label', 'unit', 'howToMeasure', 'whyItMatters', 'action', 'source']
const hasText = (v) => typeof v === 'string' && v.trim().length > 0
/** Fill only the help fields that rules.json leaves missing or empty. rules.json always wins. */
function withFallback(rule, help) {
  if (!help) return rule
  const out = { ...(rule ?? {}) }
  for (const f of HELP_FIELDS) if (!hasText(out[f]) && hasText(help[f])) out[f] = help[f]
  return out
}

export function loadIndicatorRules() {
  const out = {}
  for (const [domain, rules] of Object.entries(SOURCES)) {
    for (const [indicator, rule] of Object.entries(rules.indicators ?? {})) out[`${domain}/${indicator}`] = rule
  }
  // BMD and strength tracker (sub-module of gravity): one entry per measure.
  // Ratio indicators: the alert value is the ratio to the baseline, so the unit is the rule's unit.
  for (const rule of Object.values(bmd.indicators ?? {})) {
    for (const measure of rule.measures ?? []) {
      out[`${bmd.domain}/${measure.indicator}`] = {
        label: measure.label,
        unit: rule.kind === 'baseline_ratio' ? rule.unit : measure.unit,
        howToMeasure: rule.howToMeasure,
        whyItMatters: rule.whyItMatters,
        action: rule.action,
        source: rule.source,
      }
    }
  }
  for (const [domain, file] of Object.entries(HELP_FALLBACK)) {
    for (const [indicator, help] of Object.entries(file.indicators ?? {})) {
      const key = `${domain}/${indicator}`
      out[key] = withFallback(out[key], help)
    }
  }
  return out
}
