// Wording rules for every alert the 14-day scenario produces, and for the BMD and strength alerts.
import { describe, it, expect } from 'vitest'
import { buildDefaultScenario, playDay } from '../src/sim/playScenario.js'
import { loadCutoffs } from '../src/data/cutoffs.js'
import { engineAlerts } from '../src/modules/bmd-strength/engineAdapter.js'

const cutoffs = loadCutoffs()
const days = buildDefaultScenario()
const scenarioAlerts = days.flatMap((_, i) => playDay(days, i + 1, cutoffs).alerts)

// BMD and strength alerts at Normal, Watch and Act (ratios 0.99, 0.96 and 0.9 of baseline; 6, 4 and 2 trained days).
const base = { id: 'b', created: 1, date: '2025-01-01', baseline: true, hip: 1, lumbar: 1, deadlift: 100, bench: 100 }
const bmd = [[0.99, 6], [0.96, 4], [0.9, 2]].flatMap(([r, trained]) =>
  engineAlerts(
    { measurements: [base, { id: 'l', created: 2, date: '2025-01-10', baseline: false, hip: r, lumbar: r, deadlift: 100 * r, bench: 100 * r }], weeklyWorkouts: Object.fromEntries(['2025-01-13', '2025-01-14', '2025-01-15', '2025-01-16', '2025-01-17', '2025-01-18'].slice(0, trained).map((d) => [d, { strength: true }])) },
    { today: '2025-01-19', cutoffs },
  ),
)
const all = [...scenarioAlerts, ...bmd]
const DIAGNOSTIC = /(?<!not a )diagnos(is|ed|e)\b|\byou have\b|\bdisease\b|\bdisorder\b|depress|anxiety|psychosis|osteoporosis|syndrome|\binfection\b(?!-like)|radiation sickness/i
const HEALTH_CLAIM = /\b(symptoms?|risk|concern|pattern|loss)\b/i

describe('alert wording', () => {
  it('covers Watch and Act alerts from every module', () => {
    const domains = new Set(all.filter((a) => a.status !== 'normal').map((a) => a.domain))
    expect([...domains].sort()).toEqual(['environment', 'gravity', 'isolation', 'nutrition', 'radiation'])
  })

  it('every alert has a why, an action and a source', () => {
    for (const a of all) {
      for (const k of ['why', 'action', 'source']) expect(a[k].trim().length, `${a.indicator} ${k}`).toBeGreaterThan(0)
    }
  })

  it('no alert text reads as a diagnosis', () => {
    for (const a of all) expect(`${a.why} ${a.action}`, a.indicator).not.toMatch(DIAGNOSTIC)
  })

  it('a Watch or Act alert that names a health effect calls it possible', () => {
    for (const a of all.filter((x) => x.status !== 'normal' && HEALTH_CLAIM.test(x.why) && !/signs of strain/.test(x.why))) {
      expect(a.why, `${a.domain}/${a.indicator}`).toMatch(/possible/i)
    }
  })

  it('every Act alert refers to the flight surgeon', () => {
    const acts = all.filter((a) => a.status === 'act')
    expect(acts.length).toBeGreaterThan(0)
    for (const a of acts) expect(`${a.why} ${a.action}`, `${a.domain}/${a.indicator}`).toMatch(/flight surgeon/i)
  })

  it('refers to the flight surgeon, not to other medical roles', () => {
    for (const a of all) expect(`${a.why} ${a.action}`).not.toMatch(/crew medical officer/i)
  })
})
