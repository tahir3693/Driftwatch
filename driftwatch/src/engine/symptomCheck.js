// Derives the environment symptom_check code (0, 1 or 2) from today's answers and the 2 prior days.
// The 3-day persistence rule (today plus the 2 preceding days) is a design value.
/**
 * answers: { headache, nauseaFatigue } booleans. prior: [yesterdayHeadache, dayBeforeHeadache] booleans.
 */
export function deriveSymptomCode({ headache, nauseaFatigue }, prior) {
  const p = Array.isArray(prior) ? prior : []
  const yesterday = p[0] === true
  const dayBefore = p[1] === true
  if (nauseaFatigue === true) return 2
  if (headache === true && yesterday && dayBefore) return 2
  if (headache === true && (yesterday || dayBefore)) return 1
  return 0
}