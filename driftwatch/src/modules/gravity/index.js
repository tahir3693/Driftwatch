import { defineModule } from '../../engine/adapter.js'
import { validateRules } from '../../engine/validateRules.js'
import { reconcileCutoffs } from '../../engine/reconcileCutoffs.js'
import { runRulesModule } from '../../engine/runRulesModule.js'
import rules from './rules.json'
import { engineAlerts, gravityOverall, BMD_STRENGTH_OVERALL } from '../bmd-strength/index.js'

validateRules(rules, 'gravity')

const isOverall = (a) => a.indicator === 'gravity_overall'
const utcDay = (ms) => new Date(ms).toISOString().slice(0, 10)

/**
 * Gravity module: the rules.json indicators and pattern, plus the BMD and strength alerts from the
 * teammate's scoring engine (bmd-strength/engineAdapter.js). Those replace the earlier hip, lumbar and
 * training alerts, so nothing is reported twice.
 * ctx: { cutoffs, now, bmd?: { state, today } }. `bmd.state` is the tracker's saved state
 * (loadBmdState in modules/bmd-strength); without it the tracker alerts are Normal with "no baseline" text.
 * Returns every indicator and pattern alert followed by one combined gravity_overall.
 */
export function runGravity(readings, ctx) {
  const { cutoffs } = reconcileCutoffs(rules, ctx.cutoffs, 'gravity')
  const ruleAlerts = runRulesModule({ domain: 'gravity', rules }, readings ?? {}, { ...ctx, cutoffs })
  const today = ctx.bmd?.today ?? utcDay(ctx.now)
  const trackerAlerts = engineAlerts(ctx.bmd?.state ?? null, { today, cutoffs })
  // The tracker's own overall is folded into the one gravity_overall below.
  const all = [...ruleAlerts, ...trackerAlerts].filter((a) => !isOverall(a) && a.indicator !== BMD_STRENGTH_OVERALL)
  return [...all, gravityOverall(all, cutoffs)]
}

export { rules }

export default defineModule({ name: 'gravity', domain: 'gravity', kind: 'function', run: runGravity })
