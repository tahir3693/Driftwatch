// BMD and strength sub-module of the gravity domain. It has no default export on purpose:
// it is not a module descriptor and must not be passed to runModules on its own (that would
// add a second gravity_overall). The gravity descriptor imports engineAlerts and merges its
// alerts into the one gravity_overall.
import rules from './rules.json'

export { rules }
export {
  gravityOverall,
  weekDates,
  missedTrainingDays,
  BMD_STORAGE_KEY,
  BMD_TRACKER_PATH,
} from './bmdAdapter.js'
export {
  engineAlerts,
  workoutsThisWeek,
  BMD_STRENGTH_OVERALL,
  BMD_SOURCE,
  STRENGTH_SOURCE,
  WORKOUTS_SOURCE,
} from './engineAdapter.js'
export { loadBmdState, localToday } from '../../store/bmdState.js'
