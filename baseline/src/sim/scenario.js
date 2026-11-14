// Shared 14-day SIMULATED scenario (docs/development-plan.md, "Shared 14-day scenario").
// All values are simulated demo data, not measurements. They are inputs, not limits.
// Radiation inputs come from the teammate's simulate(); the other modules use the values below.
import { simulate } from '../modules/radiation/radiation-engine.js'

export const SIMULATED = true
export const DAY_MS = 86_400_000
export const SCENARIO_DAYS = 14

// One value per day, day 1 first.
const ENV = {
  // 1-hour average CO2 creeps up from day 4 but stays below the 2.8 mmHg Watch edge.
  cabin_co2_mmHg: [1.9, 2.0, 1.9, 2.1, 2.1, 2.2, 2.2, 2.2, 2.3, 2.3, 2.2, 2.2, 2.1, 2.1],
  cabin_co2_7day_avg_mmHg: [1.9, 1.9, 1.9, 1.9, 2.0, 2.0, 2.0, 2.1, 2.1, 2.1, 2.1, 2.1, 2.1, 2.1],
  // Headache logged on day 6 only (code 1).
  symptom_check: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  // Temperature up from day 7 and sleep short from day 6.
  body_temperature: [36.5, 36.6, 36.5, 36.6, 36.5, 36.6, 38.2, 38.6, 38.8, 38.8, 38.6, 38.2, 37.6, 37.2],
  sleep_hours: [7.4, 7.2, 7.5, 7.3, 7.4, 5.6, 4.6, 4.2, 4.0, 4.0, 4.2, 4.6, 5.2, 5.8],
}
// Isolation inputs. PLACEHOLDER: the Isolation teammate's day-by-day inputs are not in the repo yet.
// Replace this block with theirs when they are added. Sleep repeats the environment series on purpose:
// the check-in writes one sleep value to both domains.
const ISOLATION = {
  sleep_hours: ENV.sleep_hours,
  mood: [4, 4, 5, 4, 4, 4, 4, 4, 4, 4, 2, 1, 2, 3],
  reaction_ms: [300, 310, 295, 305, 300, 380, 340, 330, 320, 310, 450, 520, 480, 420],
  social_contact: [120, 110, 125, 115, 120, 110, 115, 115, 110, 110, 30, 10, 20, 40],
}
const GRAVITY = {
  // Weekly exercise sessions drop on day 4 but stay at the Normal edge.
  exercise_sessions_per_week: [7, 7, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  // Fed from nutrition: 1 when intake is below plan (Watch or Act).
  low_intake_bone_note: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
}
const NUTRITION = {
  // Intake falls below 90% of plan on day 8.
  intake_pct_of_plan: [100, 99, 100, 99, 100, 99, 100, 85, 84, 83, 82, 82, 83, 84],
}

const table = (domain, indicators) =>
  Object.entries(indicators).map(([indicator, values]) => ({ domain, indicator, values }))

const SERIES = [
  ...table('environment', ENV),
  ...table('isolation', ISOLATION),
  ...table('gravity', GRAVITY),
  ...table('nutrition', NUTRITION),
]

/**
 * Build the scenario. Pure: the start time is passed in.
 * Returns 14 days: { day, timestamp, readings: [{ timestamp, domain, indicator, value }], radiation }.
 * `radiation` is the input object for the Radiation module on that day.
 */
export function buildScenario(startMs) {
  const radiationDays = simulate()
  return Array.from({ length: SCENARIO_DAYS }, (_, i) => {
    const timestamp = startMs + i * DAY_MS
    return {
      day: i + 1,
      timestamp,
      readings: SERIES.map((s) => ({ timestamp, domain: s.domain, indicator: s.indicator, value: s.values[i] })),
      radiation: radiationDays[i],
    }
  })
}


