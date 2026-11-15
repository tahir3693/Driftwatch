# Implementation Plan: Driftwatch Core

## Overview

JavaScript only. All code lives in `driftwatch/src/`. Pure functions, including `runRulesModule` and the adapter (`defineModule`, `runModules`, no registry), go in `engine/`. Dexie code goes in `store/`. `data/` holds `cutoffs.json`, `cutoffs.js` (only `loadCutoffs`) and `domains.js`. `modules/<name>/` holds only `rules.json` and an `index.js` descriptor. Each engine function gets a unit test beside it (`*.test.js`). Property tests use fast-check and are optional (marked `*`); each is tagged `// Feature: core, Property N: ...` and runs at least 100 times. Store tests use `fake-indexeddb/auto`. Scenario and integration tests go in `driftwatch/tests/`. Run tests from `driftwatch/` with `npm run test:run`.

Band keys follow three families: `z_min`/`z_max`, `abs_z_min`/`abs_z_max`, `value_min`/`value_max`. There is no `basis` field. `_min` is inclusive and `_max` is exclusive. No engine file reads a clock, imports JSON, logs, or makes a network call. "Now" is always passed in.

## Tasks

- [x] 1. Test tooling setup
  - [x] 1.1 Install test dependencies and add the single-run script
    - In `driftwatch/`, run `npm i -D fast-check fake-indexeddb`
    - Add `"test:run": "vitest --run"` to `driftwatch/package.json` scripts
    - Confirm `vitest --run` starts and reports no failing tests
    - _Requirements: 9.2, 9.3, 9.4, 9.5_

- [x] 2. Shared data and validators
  - [x] 2.1 Create shared data files
    - Create `src/data/domains.js` exporting `DOMAINS` (`radiation`, `isolation`, `gravity`, `environment`, `nutrition`, `system`) and `STATUSES` (`normal`, `watch`, `act`)
    - Create `src/data/cutoffs.json` as `{ "watch_from": 30, "act_from": 60, "source": "design value" }`
    - _Requirements: 5.2, 1.4_

  - [x] 2.2 Implement `validateReading` with unit tests
    - Create `src/engine/validateReading.js` returning `{ ok: true }` or `{ ok: false, field, message }`
    - Reject a domain outside `DOMAINS` (message names the domain), a missing timestamp, a missing indicator, and a non-numeric value (message names the field)
    - Write `validateReading.test.js` with valid and invalid examples
    - _Requirements: 1.4, 1.5_

  - [x] 2.3 Implement `validateCutoffs` and `loadCutoffs` with unit tests
    - Create `src/engine/validateCutoffs.js` that throws `CutoffsError` for missing content, non-finite numbers, or `watch_from >= act_from`
    - Create `src/data/cutoffs.js` exporting only `loadCutoffs()`: static import of `cutoffs.json`, validate once, cache, return the frozen object
    - Write `validateCutoffs.test.js` and `src/data/cutoffs.test.js` (values 30 and 60, source `"design value"`, same object returned on repeated calls, invalid input throws)
    - _Requirements: 5.1, 5.2, 5.8, 7.2_

  - [x] 2.4 Implement `validateAlert` with unit tests
    - Create `src/engine/validateAlert.js` returning `{ ok: true }` or `{ ok: false, field, message }`
    - Check the exact ten-field key set (no missing or extra field), lower-case status in `normal|watch|act`, urgency a number from 0 to 100, boolean `escalate`, string `domain`, `indicator`, `why`, `action`, `source`
    - Write `validateAlert.test.js` covering a valid alert and each rejection case
    - _Requirements: 3.3, 3.4, 3.5, 8.4, 8.5_

  - [x] 2.5 Implement `validateRules` with unit tests
    - Create `src/engine/validateRules.js` that throws `RulesError { moduleName, indicator, key, message }`
    - Require top-level `module` equal to `moduleName`; allow an optional `urgency` block without further checks
    - Require per indicator the strings `label`, `unit`, `why`, `action`, `howToMeasure`, `whyItMatters`, a `source` (string or `"design value"`), and `bad_direction` of `low`, `high` or `both`
    - Require `normal`, `watch` and `act` bands that all use one key family (`z_`, `abs_z_` or `value_`); reject mixed families and unknown band keys; `fallback_bands`, when present, must use the `value_` family with the same three band keys
    - Require each pattern to have `needs`, `min_in_watch`, `for_days`, `result`, `escalate`, `why`, `action`, `source`, and every name in `needs` to exist in `indicators`
    - Write `validateRules.test.js` with a valid template and one failing example per rule above, including one rules example per band family and the pattern schema
    - _Requirements: 3.8, 3.9, 6.1, 6.6_

  - [x] 2.6 Write property test for rules validation
    - **Property 12: Invalid rules are rejected at load time**
    - **Validates: Requirements 3.8, 3.9, 6.6**

- [x] 3. Reading store
  - [x] 3.1 Implement the Dexie store
    - Create `src/store/db.js` with schema `readings: '++id, [domain+indicator+timestamp], timestamp'`
    - Create `src/store/readings.js` with `ReadingValidationError { field, message }`, `saveReading(reading)` (calls `validateReading` before any write, returns the new id) and `getReadings({ domain, indicator, windowDays, now })` (compound-index range, `windowDays` lower bound `now - windowDays * 86_400_000` inclusive, oldest first, `id` removed from results)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 3.2 Write store unit tests
    - Create `src/store/readings.test.js` using `import 'fake-indexeddb/auto'` and clear the table in `beforeEach`
    - Cover save and read back, ordering of out-of-order saves, window filtering at the boundary, rejection of an invalid domain and of a missing field with the store left unchanged
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 9.5_

  - [x] 3.3 Write property test for reading round trip
    - **Property 1: Reading round trip**
    - **Validates: Requirements 1.1, 1.6**

  - [x] 3.4 Write property test for ordering and window
    - **Property 2: Ordering and window**
    - **Validates: Requirements 1.2, 1.3**

  - [x] 3.5 Write property test for invalid reading rejection
    - **Property 3: Invalid readings are rejected with the field named**
    - **Validates: Requirements 1.4, 1.5**

- [x] 4. Baseline and z-score
  - [x] 4.1 Implement `stats.js` and `computeBaseline` with unit tests
    - Create `src/engine/stats.js` with `mean` (two-pass) and sample `stdDev` (n - 1 divisor)
    - Create `src/engine/computeBaseline.js`: `computeBaseline(readings, windowDays, options = {})` with `options.now` (default: latest reading timestamp) and `minReadings = 5`; filter to the window, sort a copy, return `{ ready: true, mean, sd, n }` or `{ ready: false, n }` with no `mean` or `sd`
    - Write `stats.test.js` and `computeBaseline.test.js` (ready, not ready at 4 readings, shuffled input gives identical output, two-argument call works)
    - _Requirements: 2.1, 2.2, 2.6_

  - [x] 4.2 Implement `zScore` with unit tests
    - Create `src/engine/zScore.js`: `zScore(value, baseline, fallbackSpread = 1)`; when `sd > 0` use `(value - mean) / sd`; when `sd === 0` return 0 if `value === mean`, otherwise `(value - mean) / fallbackSpread`; never NaN or Infinity
    - Write `zScore.test.js` including the `sd = 0` cases
    - _Requirements: 2.3, 2.4_

  - [x] 4.3 Write property test for baseline statistics and readiness
    - **Property 4: Baseline statistics and readiness**
    - **Validates: Requirements 2.1, 2.2**

  - [x] 4.4 Write property test for baseline order independence
    - **Property 5: Baseline is order independent**
    - **Validates: Requirements 2.6**

  - [x] 4.5 Write property test for z-score
    - **Property 7: Z-score is finite and correct**
    - **Validates: Requirements 2.3, 2.4**

- [x] 5. Drift detection
  - [x] 5.1 Implement CUSUM drift detection with unit tests
    - Create `src/engine/drift.js` exporting `DRIFT_DEFAULTS` (`k: 0.5`, `h: 3`) and `cusum(zSeries, { k, h })` using `C_t = max(0, C_{t-1} + z_t - k)`; return `{ drift, signalIndex, runLength, statistic }`, with `signalIndex` the first index where `C > h` (or -1) and `runLength` the consecutive days since `C` last left zero
    - Write `drift.test.js`: series at or below `k` gives no drift, a slow ramp signals, `k` and `h` come from the arguments and default to `DRIFT_DEFAULTS`
    - _Requirements: 4.1, 4.4, 4.5, 4.6_

  - [x] 5.2 Write property test for no drift at or below the reference value
    - **Property 13: Drift is not signalled at or below the reference value**
    - **Validates: Requirements 4.4**

  - [x] 5.3 Write property test for early drift detection
    - **Property 14: Drift is detected before the watch band is crossed**
    - **Validates: Requirements 4.5**

  - [x] 5.4 Write property test for threshold monotonicity
    - **Property 16: Higher threshold never signals earlier**
    - **Validates: Requirements 4.6**

- [x] 6. Urgency and cut-offs
  - [x] 6.1 Implement urgency scoring with unit tests
    - Create `src/engine/urgency.js` exporting `statusFromUrgency(u, cutoffs)`, `statusRank(status)` (0, 1, 2) and `urgency(alert, { severity = 0, cutoffs })`
    - Status ranges: `normal` 0 to `watch_from - 1`, `watch` `watch_from` to `act_from - 1`, `act` `act_from` to 100; `urgency = round(floor + clamp(severity, 0, 1) * (ceil - floor))`, clamped to 0..100; non-finite severity is 0
    - Write `urgency.test.js` covering boundaries 29, 30, 59, 60, 100, all three exports, and `statusFromUrgency(urgency(a, ctx)) === a.status`
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.9_

  - [x] 6.2 Implement `reconcileCutoffs` with unit tests
    - Create `src/engine/reconcileCutoffs.js`: pure `reconcileCutoffs(rules, cutoffs, moduleName)` returning `{ cutoffs, warnings }`; `cutoffs` is always the same shared object passed in; one warning string naming the module when `rules.urgency` exists and differs; no logging
    - Write `reconcileCutoffs.test.js`: absent block, equal block, differing block, same object identity returned
    - _Requirements: 5.1, 5.7_

  - [x] 6.3 Write property test for urgency mapping
    - **Property 17: Urgency range and cut-off mapping**
    - **Validates: Requirements 5.3, 5.4, 5.5, 5.6, 5.9**

  - [x] 6.4 Write property test for cutoffs validation and precedence
    - **Property 18: Cutoffs validation and precedence**
    - **Validates: Requirements 5.7, 5.8**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Evaluator
  - [x] 8.1 Implement `evaluate` with unit tests
    - Create `src/engine/evaluate.js`: `evaluate(rule, readings, options)` with `options = { now, cutoffs, domain, indicator }` returning an Alert with exactly the ten contract fields
    - Sort a copy, treat the latest reading as the one being evaluated and the rest as the baseline pool (excluded from the baseline); `baseline = computeBaseline(pool, rule.baseline_days ?? 14, { now })`
    - Select the basis from the band key family: `z_` on the signed z-score, `abs_z_` on `|z|`, `value_` on the raw value; `_min` inclusive, `_max` exclusive; look up `act`, then `watch`, then `normal`
    - When the baseline is not ready, use `fallback_bands` (or the rule's own `value_` bands), otherwise `normal`; set the alert `baseline` to `null` and skip drift
    - Compute severity (depth into the band toward the worse end divided by band width, or divided by `rule.severity_span` for open-ended bands, using `bad_direction`), then `urgency(...)` and `escalate = urgency >= cutoffs.act_from`
    - When the baseline is ready and status is `normal`, run `cusum` on the bad-direction z series (`low` flips sign, `both` uses `|z|`) with `k` and `h` from `rule.drift` or `DRIFT_DEFAULTS`; on a signal set status `watch`, severity `min(1, statistic / (2h))`, and make `why` state the drift from the personal baseline and the number of days
    - Fill `why` from the rule template (`{delta}`, `{unit}`), and `action` and `source` from the rule
    - Write `evaluate.test.js`: one example per band family with inclusive `_min` and exclusive `_max` boundaries, not-ready baseline with fallback bands, the evaluated reading excluded from the baseline, `sd = 0`, a slow ramp inside the normal band that gives `watch` with drift text, and `escalate` at the act cut-off
    - _Requirements: 2.3, 2.4, 2.5, 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 3.11, 4.1, 4.2, 4.3, 4.6_

  - [x] 8.2 Write property test for baseline exclusion
    - **Property 6: Evaluated reading is excluded from the baseline**
    - **Validates: Requirements 2.5**

  - [x] 8.3 Write property test for status from bands
    - **Property 8: Status matches the band**
    - **Validates: Requirements 3.1, 3.11**

  - [x] 8.4 Write property test for text fields from rules
    - **Property 11: Text fields come from the rules**
    - **Validates: Requirements 3.7**

  - [x] 8.5 Write property test for drift to watch
    - **Property 15: Drift inside the normal band yields a watch with an explanation**
    - **Validates: Requirements 4.2, 4.3**

- [x] 9. Pattern detection
  - [x] 9.1 Implement `patterns` with unit tests
    - Create `src/engine/patterns.js`: `patterns(patternDefs, history, options)` with `history` an array of per-day alert arrays (oldest first) and `options = { domain, cutoffs }`
    - A pattern fires when, on each of the last `for_days` days, at least `min_in_watch` of the `needs` indicators have status `watch` or `act`
    - The returned alert has `indicator` equal to the pattern name, `domain` from `options.domain`, `status` from `result`, `urgency` at the floor of that status (`watch_from` or `act_from`), `escalate`, `action`, `source` from the pattern, `why` extended with the contributing indicator names, `value` the number of contributing indicators, `baseline` `null`
    - Write `patterns.test.js`: fires, does not fire below `min_in_watch`, does not fire when one of the `for_days` days fails, `why` names the contributors
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

  - [x] 9.2 Write property test for pattern firing
    - **Property 19: Pattern fires exactly when the rule is met**
    - **Validates: Requirements 6.2, 6.5**

  - [x] 9.3 Write property test for pattern alert fields
    - **Property 20: Pattern alert fields**
    - **Validates: Requirements 6.3, 6.4**

- [x] 10. Rules module runner
  - [x] 10.1 Implement `runRulesModule` with unit tests
    - Create `src/engine/runRulesModule.js`: `runRulesModule({ name, domain, rules }, readingsByIndicator, ctx)` with `ctx = { cutoffs, now }`, pure and stateless
    - Evaluate each indicator; build `history` for `D = max(for_days, 1)` days where `dayEnd_i = ctx.now - i * 86_400_000`, evaluating the readings with `timestamp <= dayEnd_i` at `now = dayEnd_i`; run `patterns`
    - Build the overall alert: `indicator` exactly `<domain>_overall`, status the highest rank among indicator and pattern alerts, urgency the maximum, `escalate = urgency >= act_from`, `value` the count of non-normal alerts, `baseline` `null`, `why` and `action` from the highest-urgency alert, `source` `"design value"`
    - Write `runRulesModule.test.js`: one alert per indicator plus the overall alert, every alert passes `validateAlert`, a pattern alert that is higher than all indicators raises the overall status
    - _Requirements: 3.2, 3.3, 3.10, 6.2, 6.7_

  - [x] 10.2 Write property test for the Alert contract
    - **Property 9: Module output satisfies the Alert contract**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.10, 6.7**

  - [x] 10.3 Write property test for escalation
    - **Property 10: Escalate follows the act cut-off**
    - **Validates: Requirements 3.6**

- [x] 11. Module adapter
  - [x] 11.1 Implement `defineModule` and `runModules` with unit tests
    - Create `src/engine/adapter.js` with no registry and no I/O
    - `defineModule(descriptor)`: accepts `{ name, domain, kind: 'function', run }` or `{ name, domain, kind: 'rules', rules }`, throws an error naming the module for an unknown `kind`, missing `run`, or bad domain, calls `validateRules(rules, name)` for `kind: 'rules'`, returns a frozen descriptor
    - `runModules(moduleDescriptors, readingsByDomain, ctx)` returns `{ alerts, errors, warnings }`; it passes the one `ctx.cutoffs` object to every module (for rules modules, the object returned by `reconcileCutoffs`, which is the same object) and collects the reconcile warnings
    - Each module runs inside try/catch; function modules are called with `run(readings, ctx)` and their alerts pass through unchanged; every alert goes through `validateAlert`; invalid alerts are dropped and reported as `{ module, indicator, field, message }`; a missing `<domain>_overall` is reported as `{ module, error }`; a thrown error is reported with the module name and the other modules still run; nothing is logged
    - Write `adapter.test.js`: define one function module and one rules module, pass-through of valid alerts, an invalid alert rejected with details, missing overall reported, a throwing module not stopping the others, differing rules `urgency` block giving a warning, and a test that every module (function and rules) receives the identical cutoffs object (`toBe`)
    - _Requirements: 3.8, 3.9, 5.1, 5.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 11.2 Write property test for pass-through
    - **Property 22: Plain-function alerts pass through unchanged**
    - **Validates: Requirements 8.3**

  - [x] 11.3 Write property test for invalid alert rejection
    - **Property 23: Invalid alerts are rejected with details**
    - **Validates: Requirements 8.4, 8.5**

  - [x] 11.4 Write property test for missing overall alert
    - **Property 24: Missing overall alert is reported**
    - **Validates: Requirements 8.6**

  - [x] 11.5 Write property test for module failure isolation
    - **Property 25: A throwing module does not stop the others**
    - **Validates: Requirements 8.7**

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Module descriptors
  - [x] 13.1 Create `modules/<name>/index.js` descriptors
    - For each module folder that has a `rules.json`, create an `index.js` that imports it and exports `defineModule({ name, domain, kind: 'rules', rules })`
    - For the Radiation and Isolation plain-function modules, create an `index.js` that imports the teammate engine file and exports `defineModule({ name, domain, kind: 'function', run })`
    - Descriptors contain no logic and do not edit the teammate engine files
    - _Requirements: 8.1, 8.2, 3.8, 3.9_

  - [x] 13.2 Write a descriptor load test
    - Create `src/modules/modules.test.js` that imports every `modules/*/index.js` and asserts each default export is a frozen descriptor with a valid domain from `DOMAINS`, and that every `rules.json` passes `validateRules`
    - _Requirements: 3.8, 3.9, 6.1, 6.6, 8.1, 8.2_

- [x] 14. Integration and structure tests
  - [x] 14.1 Write the pattern schema and rules fixture test
    - Create `driftwatch/tests/fixtures/rules.sample.json` (one indicator per band family, one pattern) and `driftwatch/tests/patternSchema.test.js` asserting each pattern has `needs`, `min_in_watch`, `for_days`, `result`, `escalate`, `why`, `action`, `source`, in the fixture and in every bundled `rules.json`
    - _Requirements: 6.1_

  - [x] 14.2 Write the shared 14-day scenario test
    - Create `driftwatch/tests/scenario.test.js` that saves a 14-day scenario into the store (`fake-indexeddb/auto`), reads it back with `getReadings`, loads cutoffs with `loadCutoffs()`, and runs `runModules` for a rules module and a function module
    - Assert both modules receive the same cutoffs object (one shared object for every module), every alert passes `validateAlert`, each module returns `<domain>_overall`, a slow drift raises `watch` before a fixed band is crossed, and `warnings` and `errors` are returned and not logged
    - _Requirements: 1.1, 1.2, 1.3, 3.2, 4.2, 4.5, 5.1, 7.1, 8.2, 8.3_

  - [x] 14.3 Write the engine purity test
    - Create `driftwatch/tests/purity.test.js` that reads every non-test file in `src/engine/` and asserts: no import from `ui/`, `react`, `dexie`, or any `.json` file; no use of `console`, `fetch`, `XMLHttpRequest` or `Date.now`
    - _Requirements: 9.1, 7.2_

  - [x] 14.4 Write property test for offline equivalence
    - **Property 21: Same output online and offline**
    - Create `driftwatch/tests/offline.test.js`: run the full pipeline with `fetch` and `XMLHttpRequest` stubbed to throw and again with them stubbed to succeed, assert deep-equal results and zero calls
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

  - [x] 14.5 Write the engine test coverage check
    - Create `driftwatch/tests/engineCoverage.test.js` that lists `src/engine/*.js` (excluding tests) and asserts each has a sibling `*.test.js` that imports it
    - Run `npm run test:run` in `driftwatch/` and confirm zero failures
    - _Requirements: 9.2, 9.3, 9.4, 9.5_

- [x] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability; all of Requirements 1.1 to 9.5 are covered
- Requirement 5.1 (one shared cutoffs object) is checked in tasks 2.3, 6.2, 11.1 and 14.2; Requirement 6.1 (pattern schema) in tasks 2.5, 13.2 and 14.1
- Property tests live in separate `*.property.test.js` files beside the engine file so they do not conflict with unit test files
- Checkpoints ensure incremental validation

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.4", "2.5", "4.1", "4.2", "5.1", "6.1"] },
    { "id": 2, "tasks": ["2.3", "2.6", "3.1", "4.3", "4.4", "4.5", "5.2", "5.3", "5.4", "6.2", "6.3"] },
    { "id": 3, "tasks": ["3.2", "6.4", "8.1", "9.1"] },
    { "id": 4, "tasks": ["3.3", "3.4", "3.5", "8.2", "8.3", "8.4", "8.5", "9.2", "9.3", "10.1"] },
    { "id": 5, "tasks": ["10.2", "10.3", "11.1"] },
    { "id": 6, "tasks": ["11.2", "11.3", "11.4", "11.5", "13.1"] },
    { "id": 7, "tasks": ["13.2", "14.1", "14.2", "14.3", "14.4", "14.5"] }
  ]
}
```
