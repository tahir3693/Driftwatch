# Implementation Plan: Driftwatch Daily Check-In

## Overview

JavaScript only. All code lives in `baseline/src/`. Pure check-in logic goes in `engine/` (one new file per function group, each with a `*.test.js` beside it). `data/` gets the form ranges, the config and the shared module list. `store/` gets the Dexie `checkins` table (schema version 2), the save functions, the submit service and a hook. `ui/` gets the check-in screen, the five forms, the reaction check and the streak display. The check-in adds no scoring logic and changes no `rules.json` band, no Radiation engine rule and no `cutoffs.json` value.

Layering: `engine/` files import no Dexie, React, JSON, `console`, clock or randomness. Ranges and config are loaded by `data/checkinData.js` and passed into pure functions as arguments. Only `store/` imports Dexie. `ui/` never imports Dexie or `store/`; `App.jsx` wires props.

Property tests use fast-check, are optional (marked `*`), run at least 100 times, and are tagged `// Feature: checkin, Property N: ...`. To avoid two tasks editing one file, each property test lives in its own file named `<unit>.<topic>.property.test.js`. Store property tests use `fake-indexeddb/auto` and clear both tables in `beforeEach`. Component tests start with `// @vitest-environment jsdom`. Run tests from `baseline/` with `npm run test:run`.

## Tasks

- [ ] 1. Test tooling setup
  - [ ] 1.1 Ensure component test dependencies are installed
    - In `baseline/`, check `package.json`; if `@testing-library/react`, `@testing-library/user-event` and `jsdom` are missing from `devDependencies`, run `npm i -D @testing-library/react @testing-library/user-event jsdom`
    - Do not change `vite.config.js`; component test files opt into jsdom with `// @vitest-environment jsdom` on their first line
    - Confirm `npm run test:run` still reports no failing tests
    - _Requirements: 13.7, 13.8_

- [ ] 2. Data files and day keys
  - [ ] 2.1 Create the form ranges, the config and the loader with unit tests
    - Create `src/data/checkinRanges.json` with the seven fields from the design (`co2`, `temperature`, `sleep`, `mood`, `exercise`, `intake`, `reaction`), each with `label`, `unit`, `min`, `max`, `integer` and `"source": "design value"`; values: CO2 0 to 10 mmHg, temperature 34 to 42 deg C, sleep 0 to 16 h, mood 1 to 5 (whole), exercise 0 to 21 (whole), intake 0 to 150 %, reaction 100 to 2000 ms
    - Create `src/data/checkinConfig.json` with `{ "minModulesPerDay": 1, "reactionMinTaps": 5, "source": "design value" }`
    - Create `src/data/checkinData.js` exporting `loadCheckinRanges()` and `loadCheckinConfig()`: static import, shape check that throws on a missing field, `min >= max` or a missing `source`, then cache and `Object.freeze` (same pattern as `data/cutoffs.js`)
    - Write `checkinData.test.js`: every required number, unit and `"design value"` source is present (7.1), a malformed object throws, the result is frozen, and each range differs from the matching band limits in the four `rules.json` files (7.9)
    - _Requirements: 7.1, 7.9, 10.2, 5.5, 13.2, 13.4_

  - [ ] 2.2 Implement `dayKey.js` with unit tests
    - Create `src/engine/dayKey.js` exporting `dayKeyOf(timestamp)` (local `YYYY-MM-DD`), `dayBounds(dayKey)` (`{ start, end }`, local midnight to next local midnight, end exclusive) and `shiftDayKey(dayKey, days)` (pure calendar arithmetic with `Date.UTC`, negative days allowed)
    - No clock read, no React, Dexie or JSON import
    - Write `dayKey.test.js`: a known timestamp, midnight edges (start inclusive, end exclusive), month and year rollover, negative shift, and a 23 hour and a 25 hour daylight-saving day counted as one day
    - _Requirements: 10.1, 10.3, 13.1, 13.2_

  - [ ]* 2.3 Write property test for the day key round trip
    - File: `src/engine/dayKey.roundtrip.property.test.js`
    - **Property 17: Day key round trip**
    - **Validates: Requirements 10.1, 10.3, 2.6**

- [ ] 3. Pure engine functions
  - [ ] 3.1 Implement `validateCheckIn.js` with unit tests
    - Create `src/engine/validateCheckIn.js` exporting `validateCheckIn(module, raw, ranges)` returning `{ ok: true, values }` or `{ ok: false, errors: [{ field, message }] }`; fields in form order per module as in the design
    - Number pattern `/^[+-]?(\d+\.?\d*|\.\d+)$/` after trim; rule order per numeric field: empty ("Enter a value for <label>."), not a number ("<label> must be a number."), whole number ("<label> must be a whole number."), range ("<label> must be from <min> to <max> <unit>.", unit and its space omitted when the unit is empty); yes or no not `true` or `false` gives "Choose yes or no."; `reaction` is optional and gives `values.reaction = null` when empty
    - Radiation has no error case (unticked is `false`); no range literal in the function body; no message says "normal" or "abnormal"
    - Write `validateCheckIn.test.js`: each message text, every range at its minimum, its maximum and just outside both (taken from `checkinRanges.json`), `0x10`, `1e3`, `Infinity` and `NaN` rejected, unanswered yes or no, optional reaction empty, errors in form order, and a Radiation submit with nothing ticked accepted
    - _Requirements: 3.3, 4.5, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8, 7.9, 13.1, 13.2, 13.4_

  - [ ]* 3.2 Write property test for the accepted range
    - File: `src/engine/validateCheckIn.range.property.test.js`
    - **Property 1: Validation accepts exactly the in-range numbers**
    - **Validates: Requirements 7.2, 7.5, 7.6**

  - [ ]* 3.3 Write property test for the message templates
    - File: `src/engine/validateCheckIn.messages.property.test.js`
    - **Property 2: Validation error messages follow the fixed templates**
    - **Validates: Requirements 7.3, 7.4, 7.5, 7.6, 7.8, 7.9**

  - [ ]* 3.4 Write property test for the format, validate and parse round trip
    - File: `src/engine/validateCheckIn.roundtrip.property.test.js`
    - **Property 3: Format, validate and parse round trip**
    - **Validates: Requirements 7.2, 8.1**

  - [ ]* 3.5 Write property test for error order
    - File: `src/engine/validateCheckIn.order.property.test.js`
    - **Property 4: Invalid input produces errors in form order and no values**
    - **Validates: Requirements 7.3, 7.4, 7.5, 7.6, 7.8**

  - [ ] 3.6 Implement `symptomCheck.js` with unit tests
    - Create `src/engine/symptomCheck.js` exporting `deriveSymptomCode({ headache, nauseaFatigue }, prior)` returning 0, 1 or 2: nausea with fatigue gives 2; headache with both prior days true gives 2; headache with at least one prior day true gives 1; otherwise 0
    - Add a comment that the 3-day persistence rule is a design value
    - Write `symptomCheck.test.js`: one case per rule (2.5 to 2.8) and the boundary where only one prior day is true
    - _Requirements: 2.4, 2.5, 2.6, 2.7, 2.8, 13.1, 13.2, 13.4_

  - [ ]* 3.7 Write property test for the symptom code
    - File: `src/engine/symptomCheck.rules.property.test.js`
    - **Property 7: Symptom code follows the rule table**
    - **Validates: Requirements 2.4, 2.5, 2.6, 2.7, 2.8**

  - [ ] 3.8 Implement `mapCheckIn.js` with unit tests
    - Create `src/engine/mapCheckIn.js` exporting `mapCheckIn(module, values, { now, priorHeadache })` returning Readings `{ timestamp: now, domain, indicator, value }`, and exporting the indicator name constants
    - Mapping per the design table: environment (`cabin_co2_mmHg`, `body_temperature`, `headache_logged`, `symptom_check` via `deriveSymptomCode`), radiation (six `symptom_<key>` Readings, always), isolation (`sleep_hours`, `mood`, an `environment` `sleep_hours` with the same value, and `reaction_ms` only when not null), gravity (`exercise_sessions_per_week`), nutrition (`intake_pct_of_plan`); yes is 1 and no is 0
    - Write `mapCheckIn.test.js`: each module's exact indicator set, 1 or 0 values, reaction omitted when null, every Reading accepted by `validateReading`, and every indicator that exists in a `rules.json` matches it exactly (check-in-only names `headache_logged`, `symptom_<key>`, `reaction_ms`, `mood` are listed in the test)
    - _Requirements: 2.2, 2.3, 2.4, 3.2, 4.2, 4.3, 4.4, 4.5, 6.2, 6.4, 8.1, 8.2, 8.3, 8.4, 13.1, 13.2_

  - [ ]* 3.9 Write property test for the Reading contract
    - File: `src/engine/mapCheckIn.contract.property.test.js`
    - **Property 5: Mapped readings satisfy the Reading contract**
    - **Validates: Requirements 8.1, 8.3, 8.4, 13.3**

  - [ ]* 3.10 Write property test for the indicators written per module
    - File: `src/engine/mapCheckIn.indicators.property.test.js`
    - **Property 6: Each module writes its documented indicators and values**
    - **Validates: Requirements 2.2, 2.3, 3.2, 4.2, 4.3, 4.4, 4.5, 6.2, 6.4**

  - [ ] 3.11 Implement `radiationInputs.js` with unit tests
    - Create `src/engine/radiationInputs.js` exporting `buildRadiationInputs(readingsByIndicator, now)` returning `{ cumulativeDose_mSv, premissionDose_mSv, protonFlux_pfu, symptoms }`
    - For each indicator take the Reading with the greatest `timestamp <= now` (the last in the list for equal timestamps); a missing dose or flux gives 0; `symptoms` lists keys in the fixed order (`nausea`, `vomiting`, `fatigue`, `skin`, `fever`, `bruising`) whose latest `symptom_<key>` is 1
    - Do not change `modules/radiation/radiation-engine.js`
    - Write `radiationInputs.test.js`: latest value wins, a Reading after `now` is ignored, missing dose and flux give 0, symptom order, an empty input
    - _Requirements: 3.4, 3.5, 3.6, 13.1, 13.2_

  - [ ]* 3.12 Write property test for the latest readings
    - File: `src/engine/radiationInputs.latest.property.test.js`
    - **Property 8: Radiation input builder uses the latest readings**
    - **Validates: Requirements 3.4, 3.5**

  - [ ] 3.13 Implement `reaction.js` with unit tests
    - Create `src/engine/reaction.js` exporting `medianReaction(times)` (sorts a copy; mean of the two middle values for even length), `summarizeReaction(times, minTaps)` (`{ ok: true, median }` or `{ ok: false, message: 'Not enough taps. Please run the reaction check again.' }`) and `nextWaitMs(random)` (`2000 + random * 4000`)
    - Write `reaction.test.js`: odd and even lists, one element, unsorted input not mutated, 4 taps fail and 5 taps pass, `nextWaitMs(0)` is 2000 and `nextWaitMs(0.999)` is below 6000
    - _Requirements: 5.1, 5.5, 5.8, 13.1, 13.2_

  - [ ]* 3.14 Write property test for the median
    - File: `src/engine/reaction.median.property.test.js`
    - **Property 9: Median is bounded and order independent**
    - **Validates: Requirements 5.1, 5.5, 5.8, 13.3**

  - [ ] 3.15 Implement `streak.js` with unit tests
    - Create `src/engine/streak.js` exporting `computeStreak(records, todayKey, minModules)`; group by `dayKey` into sets of distinct module names, count a day when its set size is at least `minModules`, start at `todayKey` if it is counted else at the day before, then count back while days are counted; records dated after `todayKey` are ignored
    - Input is only day keys and module names (no Reading value, Alert or status); uses `shiftDayKey`
    - Write `streak.test.js`: empty list is 0, today only, yesterday only (today not yet counted), a gap ends the run, duplicates, `minModules` of 2, a future record ignored, unordered input
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 13.1, 13.2_

  - [ ]* 3.16 Write property test for the reference model
    - File: `src/engine/streak.model.property.test.js`
    - **Property 10: Streak matches a reference model**
    - **Validates: Requirements 10.2, 10.3, 10.4, 13.3**

  - [ ]* 3.17 Write property test for order and duplicates
    - File: `src/engine/streak.order.property.test.js`
    - **Property 11: Streak ignores order and duplicates**
    - **Validates: Requirements 10.10, 13.3**

  - [ ]* 3.18 Write property test for the metamorphic relations
    - File: `src/engine/streak.metamorphic.property.test.js`
    - **Property 12: Streak metamorphic relations**
    - Treat "before the first day of the current run" as a gap of at least 1 missing day (a day at least 2 days before the run start); a day directly adjacent to the run extends it
    - **Validates: Requirements 10.11, 13.3**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Store, module wiring and submit service
  - [ ] 5.1 Add the `checkins` table to `store/db.js` with a schema upgrade test
    - Keep the `db.version(1)` line as it is and add `db.version(2).stores({ checkins: '++id, &[dayKey+module], dayKey' })`
    - Write `src/store/db.test.js` (`fake-indexeddb/auto`): open a version 1 database holding one Reading, then open version 2 and check the Reading is still there and `checkins` exists; a second record for the same `[dayKey+module]` is rejected by the unique index
    - _Requirements: 9.5, 10.1, 13.5_

  - [ ] 5.2 Implement `store/checkins.js` with store tests
    - Create `src/store/checkins.js` exporting `saveCheckIn({ module, dayKey, now, readings })`, `getCheckInDays()` and `getHeadacheHistory(dayKey)`
    - `saveCheckIn` runs one transaction on `db.readings` and `db.checkins`: get the record for `[dayKey+module]`, `bulkDelete` its `readingIds`, re-check each Reading with `validateReading`, `bulkAdd` with `allKeys: true`, then `put` the record `{ dayKey, module, submittedAt: now, readingIds }` (keeping the existing `id`); any thrown error rolls everything back
    - `getHeadacheHistory` returns `[dayKey-1, dayKey-2]` booleans from `environment/headache_logged` Readings over local-day bounds, excluding the current day
    - Write `checkins.test.js` (`fake-indexeddb/auto`, clear both tables in `beforeEach`): save and read back through `getReadings`; a second save of one module on one day leaves one set of Readings and one record; Readings written by other means on the same day are untouched; a forced `put` failure leaves neither new Readings nor a new record and keeps an earlier record and its Readings; headache history across a local midnight; records survive closing and reopening the database
    - _Requirements: 8.5, 9.1, 9.4, 9.5, 9.6, 10.1, 10.9, 13.5_

  - [ ]* 5.3 Write property test for the save and read back round trip
    - File: `src/store/checkins.roundtrip.property.test.js`
    - **Property 14: Save and read back round trip**
    - **Validates: Requirements 8.5, 9.1**

  - [ ]* 5.4 Write property test for resubmit replacement
    - File: `src/store/checkins.resubmit.property.test.js`
    - **Property 15: Resubmit replaces and leaves one set per day**
    - **Validates: Requirements 9.4, 9.5, 10.1**

  - [ ] 5.5 Create the module descriptors and the shared module list
    - Create `src/modules/environment/index.js`, `src/modules/gravity/index.js` and `src/modules/nutrition/index.js`, each default-exporting `defineModule({ name, domain, kind: 'rules', rules })` with the module's existing `rules.json`; no scoring logic and no `rules.json` change
    - Create `src/data/moduleList.js` exporting `getModuleDescriptors()` returning the radiation descriptor (from `modules/radiation/index.js`) followed by the three rules modules; Isolation is not included (the module does not exist yet), so Isolation Readings are stored and produce no Alert
    - Write `src/data/moduleList.test.js`: four descriptors, domains `radiation`, `environment`, `gravity`, `nutrition`, and `runModules` over them with empty input returns each `<domain>_overall` or a reported per-module error without throwing
    - _Requirements: 4.6, 9.2_

  - [ ] 5.6 Create or extend `store/dashboardData.js` with `refresh(now)`
    - Dashboard spec task 6.2 builds `useDashboardData` in this file. If it is not implemented yet, create the minimum here exactly as the dashboard design defines it: `{ status, alerts, readings, baselineStats, rules }`, `loadCutoffs()`, `getModuleDescriptors()`, `getReadings` for each rules indicator, `runModules`, and `computeBaseline` on all Readings except the latest kept only when ready. If it already exists, only add `refresh` and the radiation input step
    - Build `readingsByDomain` as `{ indicator: Reading[] }` for `environment`, `gravity` and `nutrition`, and for `radiation` read the dose, flux and six symptom indicators and pass `buildRadiationInputs(byIndicator, now)`
    - Share one build function between first load and `refresh(now)`; `refresh` returns `Promise<void>`, replaces the hook state, and rejects only when the build throws; per-module `runModules` errors and warnings are logged, not thrown
    - Write or extend `dashboardData.test.jsx` (jsdom, `fake-indexeddb/auto`): loading then ready, after saving CO2 Readings and calling `refresh(now)` the `environment_overall` Alert is present without remounting, radiation symptoms reach the radiation Alert, `refresh` rejects when the build throws
    - _Requirements: 3.4, 3.5, 9.2, 9.3, 9.7_

  - [ ] 5.7 Implement `store/checkinService.js` with tests
    - Create `src/store/checkinService.js` exporting `submitCheckIn({ module, raw, now, refresh })` returning `{ status, errors?, streakBefore?, streakAfter? }` with status `saved`, `invalid`, `save_failed` or `saved_rerun_failed`
    - Steps in order: `dayKey = dayKeyOf(now)`; `validateCheckIn` (on errors return `invalid` and touch nothing); `computeStreak` before; for `environment` read `getHeadacheHistory`; `mapCheckIn`; `saveCheckIn` (a thrown error, including a failed history read, returns `save_failed` and writes nothing); `await refresh(now)` (a rejection returns `saved_rerun_failed` and keeps the data); `computeStreak` after
    - Read no clock and make no network request; `now` and `refresh` are arguments
    - Write `checkinService.test.js` (`fake-indexeddb/auto`): invalid input saves nothing, `save_failed` writes no record, `refresh` is called once with `now` after the save, a rejecting `refresh` gives `saved_rerun_failed` with data kept, `streakAfter` greater than `streakBefore` on a first submit, and a submit still saves with `fetch` stubbed to throw
    - _Requirements: 7.7, 9.1, 9.2, 9.6, 9.7, 9.8, 10.7, 12.4, 13.5_

  - [ ]* 5.8 Write property test for invalid submit
    - File: `src/store/checkinService.invalid.property.test.js`
    - **Property 16: Invalid submit leaves the store unchanged**
    - **Validates: Requirements 7.7**

  - [ ]* 5.9 Write property test for streak independence from values
    - File: `src/store/checkinService.streak.property.test.js`
    - **Property 13: Streak does not depend on values or alert status**
    - **Validates: Requirements 10.5, 10.12**

  - [ ] 5.10 Implement `store/useCheckIn.js` with tests
    - Create `src/store/useCheckIn.js` exporting `useCheckIn(refresh)` returning `{ streak: { count, todayModules }, submit(module, raw) }`; it reads the clock once per `submit` and passes `now` to `submitCheckIn`, loads the stored records on mount (the streak survives an app restart), and updates the streak and `todayModules` after each submit
    - Write `useCheckIn.test.jsx` (jsdom, `fake-indexeddb/auto`): the streak is computed from stored records on mount, a submit updates `todayModules` and the streak, and it reports the service status
    - _Requirements: 9.2, 10.1, 10.6, 10.9_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. UI components and wiring
  - [ ] 7.1 Create fixed text, `FormField` and the banner with component tests
    - Create `src/ui/checkinText.js` exporting the fixed strings: form titles in order, field labels, "Saved. Alerts updated.", "Saved. Alerts could not be updated yet.", "Could not save your check-in. Please try again.", "Thank you for checking in.", the headache hint, the radiation symptom labels (Requirement 3.1) and the reaction messages; use the word "possible" for symptoms and risks, and no diagnostic wording
    - Create `src/ui/FormField.jsx`: a `<label htmlFor>` and an input; on error the message is in a `<p id>` below, with `aria-invalid="true"` and `aria-describedby` pointing at it, shown with an icon and text
    - Create `src/ui/SimulatedBanner.jsx` only if the dashboard spec has not already created it: full-width bar with the exact text "Simulated data. Decision support only, not a medical device." and no button
    - Write `FormField.test.jsx` (label association, error wiring) and `SimulatedBanner.test.jsx` if created here
    - _Requirements: 1.3, 1.6, 11.1, 11.3, 11.7, 12.6_

  - [ ] 7.2 Implement `ReactionCheck` with component tests
    - Create `src/ui/ReactionCheck.jsx` with props `{ onResult(medianOrNull) }` and states `idle`, `waiting`, `prompt`, `done`; waits use `nextWaitMs(Math.random())`; a tap in `waiting` shows "Too early. Wait for the prompt." and starts a new wait; a tap in `prompt` records `performance.now() - promptShownAt`; ends after 60 seconds (after the current tap or wait) with a hard stop at 120 seconds; `summarizeReaction` with `reactionMinTaps` from `loadCheckinConfig()`; the median is rounded to a whole millisecond
    - The prompt "Tap now" is in a `role="status"` `aria-live="polite"` region; a single focused button works with click, Space and Enter; a "Skip reaction check" button stops the timers and reports `null`; clear timers on unmount; controls use `min-h-11 min-w-11`
    - Write `ReactionCheck.test.jsx` (jsdom, fake timers, mocked `performance.now`): prompt appears 2 to 6 seconds after start, an early tap is discarded with the message, ends at 60 seconds with a median, ends at 120 seconds with no tap, fewer than 5 taps give the message and `null`, Space and Enter record a tap, polite live region, skip reports `null`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 11.5, 12.3_

  - [ ] 7.3 Implement `EnvironmentForm` and `RadiationForm` with component tests
    - Create `src/ui/EnvironmentForm.jsx`: CO2 (mmHg), headache or vision change (yes or no radios in a `fieldset` with `legend`), nausea with fatigue (yes or no radios), body temperature (deg C); shows the hint "A single day is saved to your history. Possible symptoms raise an alert when they repeat." only when headache is yes
    - Create `src/ui/RadiationForm.jsx`: six checkboxes in a `fieldset` labelled "Nausea", "Vomiting", "Unusual fatigue", "Skin redness or irritation", "Fever or chills", "Easy bruising or bleeding"
    - Each form is a `<form>` with one submit button (`min-h-11`), is controlled through props (`value`, `onChange`, `onSubmit`, `errors`, `resultText`, `submitting`), disables the button while a submit is in flight, and focuses the element for `errors[0].field` by `id` after a failed submit
    - Write `EnvironmentForm.test.jsx` and `RadiationForm.test.jsx` (jsdom): labels, fieldsets with legends, hint only when headache is yes, error wiring and focus, Enter submits one form, untouched Radiation submit calls `onSubmit`
    - _Requirements: 1.2, 2.1, 2.9, 3.1, 3.3, 11.1, 11.2, 11.3, 11.4, 11.5, 12.3_

  - [ ] 7.4 Implement `IsolationForm`, `GravityForm` and `NutritionForm` with component tests
    - Create `src/ui/IsolationForm.jsx`: sleep in hours, mood as five radios in a `fieldset` (1 "Very low" to 5 "Very good"), and `ReactionCheck` whose result is stored in `raw.reaction` (`null` when skipped or too few taps)
    - Create `src/ui/GravityForm.jsx` (exercise sessions in the last 7 days, whole number) and `src/ui/NutritionForm.jsx` (share of planned menu eaten today, percent), with the same props, button and focus behaviour as task 7.3
    - Write `IsolationForm.test.jsx`, `GravityForm.test.jsx` and `NutritionForm.test.jsx` (jsdom): labels, mood fieldset and legend, a submit without a reaction result is allowed, error wiring and focus
    - _Requirements: 1.2, 4.1, 4.5, 6.1, 6.3, 11.1, 11.2, 11.3, 11.4, 11.5, 12.3_

  - [ ] 7.5 Implement `StreakDisplay` with component tests
    - Create `src/ui/StreakDisplay.jsx` with props `{ count, todayModules, increased }` showing "Check-in streak: N days", "Modules checked in today: M of 5" and "Simulated"; when the streak is 0 and nothing was submitted today show "Check-in streak: 0 days. Submit any form to start a streak."; when `increased` show "Thank you for checking in." and no text that rates health or results
    - Write `StreakDisplay.test.jsx` (jsdom): the three texts, the word "Simulated", and no rating words
    - _Requirements: 10.6, 10.7, 10.8, 12.6_

  - [ ] 7.6 Implement `CheckInScreen` with component tests
    - Create `src/ui/CheckInScreen.jsx` with props `{ onSubmit(module, raw) -> Promise<Result>, streak, onShowDashboard }`: `SimulatedBanner`, a "Dashboard" switch button (`min-h-11 min-w-11`), `StreakDisplay`, and the five forms titled "Environment", "Radiation", "Isolation", "Gravity" and "Nutrition" in that order in a `grid-cols-1 lg:grid-cols-2` grid; base text `text-base`, `overflow-x-hidden`
    - Keep one `raw` state object and one result per module so entered values stay visible after a submit; map `saved` to "Saved. Alerts updated.", `saved_rerun_failed` to "Saved. Alerts could not be updated yet." and `save_failed` to "Could not save your check-in. Please try again." next to the form; repeat the latest message in one `<div aria-live="polite">`
    - Write `CheckInScreen.test.jsx` (jsdom): five forms in order each with one submit button, banner text, switch control classes, confirmation text with values kept, each failure text, live region, an invalid result sets `aria-invalid` and `aria-describedby` and focuses the first invalid field, keyboard Tab reaches every control and Enter submits one form, no network call with `fetch` stubbed to throw
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 9.6, 9.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 12.1, 12.2, 12.3, 12.4_

  - [ ] 7.7 Wire the check-in into `App.jsx`
    - Dashboard spec task 7.2 also edits `src/App.jsx`. Extend whatever is there: keep one `useDashboardData()` instance, add `view` state (`'dashboard'` or `'checkin'`), render `Dashboard` with `data` or `CheckInScreen` with `onSubmit` from `useCheckIn(refresh)` and `streak`, and give the Dashboard a control that switches to the check-in; no router
    - If the dashboard is not implemented yet, render a minimal placeholder for the dashboard view that receives `data` and has the switch control, so the wiring compiles
    - Make sure no remote font, image, script or stylesheet is referenced from `index.html` or `index.css`
    - Write or extend `App.test.jsx` (jsdom, `fake-indexeddb/auto`, `react-chartjs-2` mocked): switch to the check-in view and back, submit an Environment form and see "Saved. Alerts updated."
    - _Requirements: 1.4, 9.2, 9.3, 12.4, 12.5_

  - [ ] 7.8 Add source scan tests for the check-in files
    - Create `src/engine/checkinSourceScan.test.js` (node environment) that reads the new `engine/` files (`dayKey`, `validateCheckIn`, `symptomCheck`, `mapCheckIn`, `radiationInputs`, `reaction`, `streak`) and asserts: no import from `ui/`, React, Dexie or JSON, no `console`, `Date.now`, `new Date()` without an argument or `Math.random`, and no numeric range literal in `validateCheckIn.js`
    - Create `src/store/checkinSourceScan.test.js` that reads the check-in files in `ui/` and `store/` and asserts: no `fetch`, `XMLHttpRequest`, `http://` or `https://`, and no check-in `ui/` file imports Dexie or `store/`
    - _Requirements: 7.2, 9.8, 12.5, 13.1_

  - [ ] 7.9 Add the integration test
    - Create `src/store/checkin.integration.test.js` (`fake-indexeddb/auto`, real `runModules`, `getModuleDescriptors()`, `loadCutoffs()`): seed enough environment history for a ready baseline, submit an Environment form with a CO2 value above the `act` band edge through `submitCheckIn`, check `environment_overall` changes from its earlier status, and that the streak computed from the stored records before and after the status change is the same for the same records
    - Second case: submit only the Isolation form, check the Readings are stored and nothing fails; third case: `refresh` is called once with the submit time after the save; fourth case: a rejecting `refresh` gives `saved_rerun_failed` and the data stays
    - _Requirements: 4.6, 9.2, 9.3, 9.7, 10.12, 13.6_

- [ ] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability; requirements 1 to 13 are each referenced by at least one task
- Dependency on the dashboard spec: `store/dashboardData.js`, `useDashboardData`, the module `index.js` files for environment, gravity and nutrition, and `ui/SimulatedBanner.jsx` do not exist yet. This plan does not wait for the dashboard tasks. Tasks 5.5, 5.6, 7.1 and 7.7 create the minimum needed (module descriptors and `data/moduleList.js`, the data hook with `refresh(now)`, the banner, the view switch). If the dashboard spec lands first, those tasks only extend the existing files (add `refresh` and the radiation input step in 5.6, and the view switch in 7.7), and the banner in 7.1 is skipped. Both specs must edit `dashboardData.js` and `App.jsx` one at a time, not in parallel
- Isolation has no module code, so Isolation Readings are stored and no Isolation Alert appears until that module exists
- Requirement 10.11 note: the requirement says a day "before the first day of the current run" leaves the Streak unchanged. A day directly adjacent to the run would extend it, so Property 12 (task 3.18) states the unchanged case for a gap of at least 1 missing day. Suggested rewording of 10.11: "adding a Day_Key that lies at least 2 days before the first day of the current run SHALL leave the Streak unchanged"
- Layout at 360 px and 1280 px, 16 px text, contrast of the check-in colours (they reuse the dashboard `statusStyle.js` constants) and wording quality are checked by hand in the browser with the network disabled (Requirements 1.6, 12.1, 12.2, 12.3, 12.7, 11.7)
- Property tests validate universal correctness of the pure functions and the store; component tests cover rendering, focus and accessibility; the integration test covers the engine re-run

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3.6", "3.11", "3.13", "5.1", "5.5", "7.1"] },
    { "id": 2, "tasks": ["2.3", "3.1", "3.7", "3.8", "3.12", "3.14", "3.15", "5.2", "5.6", "7.2", "7.3", "7.5"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "3.5", "3.9", "3.10", "3.16", "3.17", "3.18", "5.3", "5.4", "5.7", "7.4"] },
    { "id": 4, "tasks": ["5.8", "5.9", "5.10", "7.6", "7.9"] },
    { "id": 5, "tasks": ["7.7", "7.8"] }
  ]
}
```
