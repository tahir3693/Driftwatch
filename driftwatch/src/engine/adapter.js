import { DOMAINS } from '../data/domains.js'
import { validateAlert } from './validateAlert.js'
import { validateRules } from './validateRules.js'
import { reconcileCutoffs } from './reconcileCutoffs.js'
import { runRulesModule } from './runRulesModule.js'

const KINDS = ['function', 'rules']

/**
 * Validate a module descriptor and return a frozen copy.
 * Throws an Error whose message names the module.
 */
export function defineModule(descriptor) {
  const d = descriptor ?? {}
  const name = typeof d.name === 'string' && d.name ? d.name : '(unnamed)'
  if (typeof d.name !== 'string' || !d.name) {
    throw new Error(`Module "${name}": missing name`)
  }
  if (!DOMAINS.includes(d.domain)) {
    throw new Error(`Module "${name}": invalid domain "${String(d.domain)}"`)
  }
  if (!KINDS.includes(d.kind)) {
    throw new Error(`Module "${name}": unknown kind "${String(d.kind)}"`)
  }
  if (d.kind === 'function') {
    if (typeof d.run !== 'function') {
      throw new Error(`Module "${name}": kind "function" requires a run function`)
    }
    return Object.freeze({ name: d.name, domain: d.domain, kind: 'function', run: d.run })
  }
  if (d.rules === null || typeof d.rules !== 'object') {
    throw new Error(`Module "${name}": kind "rules" requires a rules object`)
  }
  validateRules(d.rules, d.name)
  return Object.freeze({ name: d.name, domain: d.domain, kind: 'rules', rules: d.rules })
}

/**
 * Run module descriptors against readings. Pure: no registry, no I/O, no logging.
 * ctx: { cutoffs, now }. Returns { alerts, errors, warnings }.
 */
export function runModules(moduleDescriptors, readingsByDomain, ctx) {
  const alerts = []
  const errors = []
  const warnings = []

  for (const mod of moduleDescriptors ?? []) {
    const name = mod?.name
    try {
      const readings = readingsByDomain?.[mod.domain]
      let output
      if (mod.kind === 'rules') {
        const rec = reconcileCutoffs(mod.rules, ctx.cutoffs, name)
        warnings.push(...rec.warnings)
        output = runRulesModule(
          mod,
          readings ?? {},
          { ...ctx, cutoffs: rec.cutoffs }
        )
      } else {
        output = mod.run(readings, ctx)
      }

      if (!Array.isArray(output)) {
        throw new Error('module did not return an array of alerts')
      }

      const valid = []
      for (const alert of output) {
        const res = validateAlert(alert)
        if (res.ok) {
          valid.push(alert)
        } else {
          errors.push({
            module: name,
            indicator: alert?.indicator,
            field: res.field,
            message: res.message,
          })
        }
      }

      const overall = `${mod.domain}_overall`
      if (!valid.some((a) => a.indicator === overall)) {
        errors.push({ module: name, error: `missing overall alert "${overall}"` })
      }
      alerts.push(...valid)
    } catch (e) {
      errors.push({ module: name, error: e instanceof Error ? e.message : String(e) })
    }
  }

  return { alerts, errors, warnings }
}
