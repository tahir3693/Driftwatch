// Turns validated check-in values into Readings. Pure: `now` and the headache history are arguments.
import { deriveSymptomCode } from './symptomCheck.js'
import { SYMPTOM_KEYS } from './radiationInputs.js'

export const INDICATORS = Object.freeze({
  co2: 'cabin_co2_mmHg',
  temperature: 'body_temperature',
  headache: 'headache_logged',
  symptomCheck: 'symptom_check',
  sleep: 'sleep_hours',
  mood: 'mood',
  social: 'social_contact',
  reaction: 'reaction_ms',
  exercise: 'exercise_sessions_per_week',
  intake: 'intake_pct_of_plan',
})

const yn = (b) => (b ? 1 : 0)

/**
 * module: 'environment' | 'radiation' | 'isolation' | 'gravity' | 'nutrition'
 * values: parsed output of validateCheckIn. ctx: { now, priorHeadache } (priorHeadache is read for environment only).
 * Returns Reading[]: { timestamp: now, domain, indicator, value }.
 */
export function mapCheckIn(module, values, { now, priorHeadache } = {}) {
  const reading = (domain, indicator, value) => ({ timestamp: now, domain, indicator, value })
  switch (module) {
    case 'environment':
      return [
        reading('environment', INDICATORS.co2, values.co2),
        reading('environment', INDICATORS.temperature, values.temperature),
        reading('environment', INDICATORS.headache, yn(values.headache)),
        reading(
          'environment',
          INDICATORS.symptomCheck,
          deriveSymptomCode({ headache: values.headache, nauseaFatigue: values.nauseaFatigue }, priorHeadache),
        ),
      ]
    case 'radiation':
      return SYMPTOM_KEYS.map((k) => reading('radiation', `symptom_${k}`, yn(values.symptoms?.[k])))
    case 'isolation': {
      const out = [
        reading('isolation', INDICATORS.sleep, values.sleep),
        reading('isolation', INDICATORS.mood, values.mood),
        reading('isolation', INDICATORS.social, values.social),
        reading('environment', INDICATORS.sleep, values.sleep),
      ]
      if (values.reaction !== null && values.reaction !== undefined) {
        out.push(reading('isolation', INDICATORS.reaction, values.reaction))
      }
      return out
    }
    case 'gravity':
      return [reading('gravity', INDICATORS.exercise, values.exercise)]
    case 'nutrition':
      return [reading('nutrition', INDICATORS.intake, values.intake)]
    default:
      throw new Error(`Unknown module: ${String(module)}`)
  }
}