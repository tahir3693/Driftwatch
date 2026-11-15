import { defineModule } from '../../engine/adapter.js'
import { evaluate as evaluateEngine } from './radiation-engine.js'

/**
 * Radiation module. inputs: { cumulativeDose_mSv, premissionDose_mSv, protonFlux_pfu, symptoms }.
 * Returns the four Alert-contract objects: cumulative_dose, symptom_check_in,
 * solar_proton_flux and radiation_overall. The engine's scoring is not changed.
 */
export function evaluate(inputs) {
  return [...evaluateEngine(inputs)]
}

export default defineModule({
  name: 'radiation',
  domain: 'radiation',
  kind: 'function',
  run: (inputs) => evaluate(inputs),
})
