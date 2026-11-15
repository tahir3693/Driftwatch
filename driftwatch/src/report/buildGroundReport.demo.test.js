// @vitest-environment jsdom
// Worked example from the real code path: the simulated 14-day scenario, day 14, built by the
// real dashboard build, then flattenReadings and buildGroundReport.
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeAll } from 'vitest'
import { db } from '../store/db.js'
import { seedScenario } from '../store/seedScenario.js'
import { buildDashboardData } from '../store/dashboardData.js'
import { loadReportConfig } from '../data/reportConfig.js'
import { flattenReadings } from './flattenReadings.js'
import { buildGroundReport } from './buildGroundReport.js'

const NOW = new Date(2026, 4, 14, 12, 0).getTime()
const DAY = 86_400_000
let data
let model

beforeAll(async () => {
  await db.readings.clear()
  localStorage.clear()
  await seedScenario(NOW)
  data = await buildDashboardData(NOW)
  model = buildGroundReport({
    alerts: data.alerts,
    readings: flattenReadings(data.readings),
    rules: data.rules,
    now: NOW,
    config: loadReportConfig(),
  })
})

describe('buildGroundReport on the 14-day demo, day 14', () => {
  it('has the window and the six modules in order', () => {
    expect(model.now).toBe(NOW)
    expect(model.windowStart).toBe(NOW - 7 * DAY)
    expect(model.windowEnd).toBe(NOW)
    expect(model.modules.map((m) => m.domain)).toEqual(['radiation', 'isolation', 'gravity', 'environment', 'nutrition', 'system'])
  })

  it('gives each module its status, urgency and active alerts', () => {
    const summary = model.modules.map((m) => ({
      domain: m.domain,
      status: m.status,
      urgency: m.urgency,
      active: m.activeAlerts.map((a) => `${a.indicator}:${a.status}:${a.urgency}:${a.escalate}`),
      activeTotal: m.activeTotal,
      moreAlerts: m.moreAlerts,
    }))
    expect(summary).toEqual([
      { domain: 'radiation', status: 'watch', urgency: 40, active: ['symptom_check_in:watch:40:false', 'cumulative_dose:watch:33:false', 'radiation_overall:watch:32:false'], activeTotal: 3, moreAlerts: 0 },
      { domain: 'isolation', status: 'act', urgency: 60, active: ['combined_strain:act:60:true', 'isolation_overall:act:60:true', 'reaction_ms:watch:40:false', 'mood:watch:34:false'], activeTotal: 4, moreAlerts: 0 },
      { domain: 'gravity', status: 'watch', urgency: 30, active: ['low_intake_bone_note:watch:30:false', 'gravity_overall:watch:30:false'], activeTotal: 2, moreAlerts: 0 },
      { domain: 'environment', status: 'watch', urgency: 45, active: ['cabin_co2_7day_avg_mmHg:watch:45:false', 'environment_overall:watch:45:false'], activeTotal: 2, moreAlerts: 0 },
      { domain: 'nutrition', status: 'watch', urgency: 42, active: ['intake_pct_of_plan:watch:42:false', 'nutrition_overall:watch:42:false'], activeTotal: 2, moreAlerts: 0 },
      { domain: 'system', status: null, urgency: null, active: [], activeTotal: 0, moreAlerts: 0 },
    ])
  })

  it('lists the two open escalations, both Isolation', () => {
    expect(model.escalations.map((e) => [e.domain, e.label, e.indicator, e.urgency, e.status])).toEqual([
      ['isolation', 'Isolation', 'combined_strain', 60, 'act'],
      ['isolation', 'Isolation', 'isolation_overall', 60, 'act'],
    ])
    for (const e of model.escalations) expect(e.action).toEqual(expect.any(String))
  })

  it('lists the newest Last_Reading rows up to the cap, with units from the rules and raw names for Radiation', () => {
    const rows = model.lastReadings.map((r) => [r.domain, r.indicator, r.indicatorLabel, r.unit, r.value])
    // All 21 day-14 readings share one timestamp, so they sort by module order, then indicator.
    // The shipped cap (maxLastReadings 12) keeps the first 12 of this list.
    const all = ([
      ['radiation', 'cumulative_dose_mSv', 'cumulative_dose_mSv', '', 196],
      ['radiation', 'premission_dose_mSv', 'premission_dose_mSv', '', 120],
      ['radiation', 'proton_flux_pfu', 'proton_flux_pfu', '', 12],
      ['radiation', 'symptom_bruising', 'symptom_bruising', '', 0],
      ['radiation', 'symptom_fatigue', 'symptom_fatigue', '', 1],
      ['radiation', 'symptom_fever', 'symptom_fever', '', 0],
      ['radiation', 'symptom_nausea', 'symptom_nausea', '', 1],
      ['radiation', 'symptom_skin', 'symptom_skin', '', 0],
      ['radiation', 'symptom_vomiting', 'symptom_vomiting', '', 0],
      ['isolation', 'mood', 'Mood and stress', 'points', 3.9],
      ['isolation', 'reaction_ms', 'Reaction time', 'ms', 296],
      ['isolation', 'sleep_hours', 'Sleep', 'h', 6.7],
      ['isolation', 'social_contact', 'Social contact', 'min', 54],
      ['gravity', 'exercise_sessions_per_week', 'Exercise sessions per week', 'sessions', 6],
      ['gravity', 'low_intake_bone_note', 'Low food intake (bone note)', 'code', 1],
      ['environment', 'body_temperature', 'Body temperature', 'deg C', 37.2],
      ['environment', 'cabin_co2_7day_avg_mmHg', 'Cabin CO2 (7-day average)', 'mmHg', 2.1],
      ['environment', 'cabin_co2_mmHg', 'Cabin CO2 (1-hour average)', 'mmHg', 2.1],
      ['environment', 'sleep_hours', 'Sleep', 'h', 5.8],
      ['environment', 'symptom_check', 'Symptom check', 'code', 0],
      ['nutrition', 'intake_pct_of_plan', 'Food intake against plan', '% of plan', 84],
    ])
    expect(all).toHaveLength(21)
    expect(rows).toEqual(all.slice(0, 12))
  })

  it('caps the readings to fit one page, keeps every active alert, and counts add up', () => {
    expect(model.counts).toEqual({ activeTotal: 13, activeListed: 13, readingsTotal: 21, readingsListed: 12, moreReadings: 9, capped: true })
  })

  it('copies why, action and source unchanged from the alerts', () => {
    for (const m of model.modules) {
      for (const a of m.activeAlerts) {
        const original = data.alerts.find((x) => x.domain === a.domain && x.indicator === a.indicator)
        expect({ why: a.why, action: a.action, source: a.source }).toEqual({ why: original.why, action: original.action, source: original.source })
      }
    }
  })

  it('survives a JSON round trip', () => {
    expect(JSON.parse(JSON.stringify(model))).toEqual(model)
  })
})
