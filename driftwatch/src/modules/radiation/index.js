import { defineModule } from '../../engine/adapter.js'
import { evaluate as evaluateEngine } from './radiation-engine.js'
import { whyContext } from '../../data/donki.js'
/**
 * Radiation module. inputs: { cumulativeDose_mSv, premissionDose_mSv, protonFlux_pfu, symptoms }.
 * Returns the four Alert-contract objects: cumulative_dose, symptom_check_in,
 * solar_proton_flux and radiation_overall. The engine's scoring is not changed.
 *
 * spaceWeather (optional, from ctx.spaceWeather): NASA DONKI context. Its latest event is appended to
 * the why text of solar_proton_flux. Nothing else changes: not the scores, the status, escalate or
 * the source label.
 */
export function evaluate(inputs, spaceWeather) {
  const alerts = [...evaluateEngine(inputs)]
  const context = whyContext(spaceWeather)
  if (!context) return alerts
  return alerts.map((a) => (a.indicator === 'solar_proton_flux' ? { ...a, why: `${a.why} ${context}` } : a))
}
export default defineModule({
  name: 'radiation',
  domain: 'radiation',
  kind: 'function',
  run: (inputs, ctx) => evaluate(inputs, ctx?.spaceWeather),
})
