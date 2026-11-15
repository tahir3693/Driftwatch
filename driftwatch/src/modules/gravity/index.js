import { defineModule } from '../../engine/adapter.js'
import { validateRules } from '../../engine/validateRules.js'
import { reconcileCutoffs } from '../../engine/reconcileCutoffs.js'
import { runRulesModule } from '../../engine/runRulesModule.js'
import rules from './rules.json'
import { bmdAlerts, gravityOverall } from '../bmd-strength/index.js'

validateRules(rules, 'gravity')

const isOverall = (a) => a.indicator === 'gravity_overall'
const utcDay = (ms) => new Date(ms).toISOString().slice(0, 10)

/**
 * Gravity module: the rules.json indicators and pattern, plus the BMD and strength tracker.
 * ctx: { cutoffs, now, bmd?: { state, today } }. `bmd.state` is the tracker's saved state
 * (loadBmdState in modules/bmd-strength); without it the tracker alerts are Normal with "no baseline" text.
 * Returns every indicator and pattern alert followed by one combined gravity_overall.
 */
export function runGravity(readings, ctx) {
  const { cutoffs } = reconcileCutoffs(rules, ctx.cutoffs, 'gravity')
  const ruleAlerts = runRulesModule({ domain: 'gravity', rules }, readings ?? {}, { ...ctx, cutoffs })
  const today = ctx.bmd?.today ?? utcDay(ctx.now)
  const trackerAlerts = bmdAlerts(ctx.bmd?.state ?? null, { today, cutoffs })
  const all = [...ruleAlerts, ...trackerAlerts].filter((a) => !isOverall(a))
  return [...all, gravityOverall(all, cutoffs)]
}

export { rules }

export default defineModule({ name: 'gravity', domain: 'gravity', kind: 'function', run: runGravity })
