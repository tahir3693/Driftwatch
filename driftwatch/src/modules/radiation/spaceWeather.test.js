import { describe, it, expect } from 'vitest'
import { evaluate } from './index.js'
import { evaluate as engine } from './radiation-engine.js'
import { buildSpaceWeather } from '../../data/donki.js'
import { validateAlert } from '../../engine/validateAlert.js'

const inputs = { cumulativeDose_mSv: 120, premissionDose_mSv: 100, protonFlux_pfu: 1500, symptoms: [] }
const sw = buildSpaceWeather({ mode: 'sample', events: [{ eventTime: '2024-06-12T04:03Z', sentNotifications: null }], downloaded: '2026-11-15T07:55:01Z' })
const flux = (alerts) => alerts.find((a) => a.indicator === 'solar_proton_flux')

describe('radiation wrapper with DONKI context', () => {
  it('appends the context to the why of solar_proton_flux only', () => {
    const base = [...engine(inputs)]
    const out = evaluate(inputs, sw)
    expect(flux(out).why).toBe(`${flux(base).why} Space weather context (NASA DONKI, saved sample): the latest solar energetic particle event listed is 2024-06-12 04:03 UTC. No NASA notification is listed for it. DONKI gives no flux or dose, so this is context only and does not change the score.`)
    for (const a of out.filter((x) => x.indicator !== 'solar_proton_flux')) {
      expect(a).toEqual(base.find((b) => b.indicator === a.indicator))
    }
  })

  it('changes no score, status, escalate flag or source label', () => {
    const base = flux([...engine(inputs)])
    const withContext = flux(evaluate(inputs, sw))
    for (const k of ['value', 'baseline', 'status', 'urgency', 'action', 'escalate', 'source', 'domain', 'indicator']) {
      expect(withContext[k], k).toEqual(base[k])
    }
    expect(withContext.source).toMatch(/^NOAA SWPC GOES proton flux and S-scale/)
  })

  it('is unchanged without space weather, and every alert still passes validateAlert', () => {
    expect(evaluate(inputs)).toEqual([...engine(inputs)])
    for (const a of evaluate(inputs, sw)) expect(validateAlert(a)).toEqual({ ok: true })
  })
})
