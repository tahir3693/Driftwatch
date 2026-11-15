// Builds the Radiation module's input object from stored Readings. Pure: `now` is passed in.
export const SYMPTOM_KEYS = Object.freeze(['nausea', 'vomiting', 'fatigue', 'skin', 'fever', 'bruising'])

// Value of the Reading with the greatest timestamp <= now. For equal timestamps the later one in the list wins.
function latestValue(list, now) {
  let best = null
  for (const r of Array.isArray(list) ? list : []) {
    if (!r || typeof r.timestamp !== 'number' || r.timestamp > now) continue
    if (best === null || r.timestamp >= best.timestamp) best = r
  }
  return best === null ? null : best.value
}

/**
 * readingsByIndicator: { [indicator]: Reading[] } in any order.
 * Returns { cumulativeDose_mSv, premissionDose_mSv, protonFlux_pfu, symptoms }.
 * A missing dose or flux gives 0. `symptoms` lists the keys whose latest `symptom_<key>` is 1.
 */
export function buildRadiationInputs(readingsByIndicator, now) {
  const by = readingsByIndicator ?? {}
  const num = (indicator) => {
    const v = latestValue(by[indicator], now)
    return typeof v === 'number' && Number.isFinite(v) ? v : 0
  }
  return {
    cumulativeDose_mSv: num('cumulative_dose_mSv'),
    premissionDose_mSv: num('premission_dose_mSv'),
    protonFlux_pfu: num('proton_flux_pfu'),
    symptoms: SYMPTOM_KEYS.filter((k) => latestValue(by[`symptom_${k}`], now) === 1),
  }
}
