# Requirements Document

## Introduction

This spec covers the shared core of Driftwatch, an offline-first early-warning health copilot for astronauts. The core is the code every hazard module depends on: a Dexie reading store, a personal-baseline engine, band evaluation, drift detection, urgency scoring, pattern detection, and a module adapter that wraps existing plain-function modules (the teammates' Radiation and Isolation code) without rewriting them.

Code lives in `baseline/src/`: `engine/` (pure functions), `store/` (Dexie), `modules/<name>/` (rules.json and wrappers). The stack is JavaScript only, Dexie and Vitest. Driftwatch is decision support, not a medical device, and all demo data is simulated.

## Glossary

- **Core**: The shared Driftwatch engine, store and module adapter described in this spec.
- **Reading_Store**: The Dexie database in `store/` that persists readings in IndexedDB.
- **Reading**: A record with `timestamp`, `domain`, `indicator` and `value`.
- **Domain**: One of `radiation`, `isolation`, `gravity`, `environment`, `nutrition`, `system`.
- **Indicator**: A single measured quantity within a domain, such as `sleep_hours`.
- **Baseline_Engine**: The engine function `computeBaseline(readings, windowDays)`.
- **Baseline**: The mean and standard deviation of an astronaut's readings for one indicator over a window of days.
- **Z_Score**: (value − baseline mean) ÷ baseline standard deviation.
- **Evaluator**: The engine function `evaluate(rule, readings, options)`, where `options` contains `now` (the evaluation time in epoch milliseconds) and `cutoffs` (the Cutoffs_File values).
- **Rules_File**: A `modules/<name>/rules.json` file holding bands, patterns, actions and sources as data. Band keys are `normal`, `watch`, `act`.
- **Band**: A named range (`normal`, `watch` or `act`) defined for an indicator in a Rules_File.
- **Alert**: An object with exactly the fields `domain`, `indicator`, `value`, `baseline`, `status`, `urgency`, `why`, `action`, `escalate`, `source`.
- **Alert_Contract**: The exact field set, types and values of an Alert as defined in `structure.md`.
- **Overall_Alert**: The Alert named `<domain>_overall` that each module returns in addition to its per-indicator Alerts.
- **Urgency_Scorer**: The engine function `urgency(alert, context)`.
- **Urgency**: A number from 0 to 100.
- **Cutoffs_File**: The single shared JSON file that holds `watch_from` (30) and `act_from` (60).
- **Drift_Detector**: The engine component that applies EWMA or CUSUM to a series of readings.
- **EWMA**: Exponentially weighted moving average.
- **CUSUM**: Cumulative sum control chart.
- **Pattern_Engine**: The engine function `patterns(patternDefs, history, options)`, where `patternDefs` is the `patterns` section of a Rules_File, `history` is an array of daily Alert arrays ordered oldest first, and `options` contains the Domain and the Cutoffs_File values.
- **Pattern**: A named combination of indicators defined in the `patterns` section of a Rules_File.
- **Module**: A unit that returns Alerts for one Domain, either rules-driven or a plain function.
- **Plain_Function_Module**: An existing function that already returns Alerts in the Alert_Contract.
- **Module_Adapter**: The Core component that registers and validates Modules, including Plain_Function_Modules.
- **Offline**: The state in which the device has no network connection.

## Requirements

### Requirement 1: Store readings locally

**User Story:** As an astronaut, I want my readings saved on my device, so that my history is available at any time.

#### Acceptance Criteria

1. WHEN a Reading is saved, THE Reading_Store SHALL persist the Reading in IndexedDB with its timestamp, domain, indicator and value.
2. WHEN readings are requested for a domain and indicator, THE Reading_Store SHALL return them ordered by timestamp, oldest first.
3. WHEN readings are requested with a window of N days, THE Reading_Store SHALL return only Readings whose timestamp falls within the last N days.
4. IF a Reading is saved with a domain outside the six Domain values, THEN THE Reading_Store SHALL reject the Reading and return an error naming the invalid domain.
5. IF a Reading is saved with a missing timestamp, indicator or a non-numeric value, THEN THE Reading_Store SHALL reject the Reading and return an error naming the invalid field.
6. FOR ALL valid Readings, saving a Reading and then reading it back SHALL return an equivalent Reading (round-trip property).

### Requirement 2: Personal baseline and z-score

**User Story:** As an astronaut, I want alerts judged against my own normal values, so that a drift from my usual is caught even when I am inside general limits.

#### Acceptance Criteria

1. WHEN at least 5 Readings exist for an indicator within the window, THE Baseline_Engine SHALL return the mean and the standard deviation of those Readings.
2. IF fewer than 5 Readings exist for an indicator within the window, THEN THE Baseline_Engine SHALL return a result that marks the Baseline as not ready and contains no mean or standard deviation.
3. WHEN `evaluate(rule, readings, options)` is called with a new Reading for an indicator whose Baseline is ready, THE Evaluator SHALL compute the Z_Score of the new Reading against that Baseline, using `options.now` as the evaluation time and reading no system clock.
4. IF the Baseline standard deviation is 0, THEN THE Evaluator SHALL return a Z_Score of 0 when the value equals the mean and a configured fallback spread otherwise, without producing NaN or Infinity.
5. WHEN a Baseline is computed, THE Baseline_Engine SHALL exclude the Reading being evaluated from the Baseline.
6. THE Baseline_Engine SHALL return identical results for identical inputs regardless of the order of the Readings supplied.

### Requirement 3: Alerts from bands in rules.json

**User Story:** As an astronaut, I want each indicator to produce a clear status with a reason and an action, so that I know what to do.

#### Acceptance Criteria

1. WHEN `evaluate(rule, readings, options)` is called for a Reading, THE Evaluator SHALL select the status whose Band in `rule` contains the Z_Score or the value, as specified by the indicator's Band definition.
2. WHEN a Module evaluates a Domain, THE Core SHALL return one Alert per indicator and one Overall_Alert named `<domain>_overall`.
3. THE Core SHALL return every Alert with exactly the fields `domain`, `indicator`, `value`, `baseline`, `status`, `urgency`, `why`, `action`, `escalate` and `source`.
4. THE Core SHALL set `status` to one of the lower-case strings `normal`, `watch` or `act`.
5. THE Core SHALL set `urgency` to a number from 0 to 100 and `escalate` to a boolean.
6. WHEN an Alert has `urgency` at or above the act cut-off, THE Core SHALL set `escalate` to true.
7. WHEN an indicator Band is selected, THE Core SHALL fill `why` from the Rules_File template with the measured delta and unit, and fill `action` and `source` from the Rules_File.
8. IF a limit in a Rules_File has no `source`, THEN THE Core SHALL reject the Rules_File at load time and name the indicator that lacks a source.
9. IF a Rules_File lacks one of the Band keys `normal`, `watch` or `act` for an indicator, THEN THE Core SHALL reject the Rules_File at load time and name the indicator and the missing key.
10. WHEN a Module returns Alerts, THE Core SHALL set the Overall_Alert `status` to the highest status among that Module's indicator Alerts, where `act` ranks above `watch` and `watch` ranks above `normal`.
11. IF the Baseline for an indicator is not ready, THEN THE Evaluator SHALL evaluate that indicator against the fixed Bands only and set `baseline` to null.

### Requirement 4: Drift detection before a band is crossed

**User Story:** As an astronaut, I want to be warned about slow drift early, so that I can act before a fixed limit is reached.

#### Acceptance Criteria

1. THE Drift_Detector SHALL apply EWMA or CUSUM to the series of Readings for each indicator that has a Baseline ready.
2. WHEN the Drift_Detector signals sustained drift in the bad direction of an indicator while the latest value is still inside the `normal` Band, THE Evaluator SHALL return status `watch` for that indicator.
3. WHEN the Drift_Detector signals drift, THE Evaluator SHALL state in `why` that the cause is a drift from the personal Baseline and name the number of days over which it has built up.
4. WHILE every Reading in a series is at or below 0.5 standard deviation of the Baseline mean in the bad direction, THE Drift_Detector SHALL signal no drift.
5. WHEN a series changes by a constant step per day in the bad direction and the series reaches the `watch` Band, THE Drift_Detector SHALL signal drift on an earlier day than the day on which the same series first crosses the `watch` Band.
6. THE Drift_Detector SHALL read its smoothing factor or reference value and its decision threshold from the Rules_File or a documented default, not from constants in the function body.

### Requirement 5: Shared urgency cut-offs

**User Story:** As a developer, I want one set of urgency cut-offs for all modules, so that the same urgency number always means the same status.

#### Acceptance Criteria

1. THE Core SHALL read `watch_from` and `act_from` once from the Cutoffs_File and use the same values for every Module.
2. THE Cutoffs_File SHALL define `watch_from` as 30 and `act_from` as 60, with a `source` of `"design value"`.
3. WHEN the Urgency_Scorer receives an Alert and a context, THE Urgency_Scorer SHALL return an Urgency from 0 to 100 inclusive.
4. WHEN the Urgency is below `watch_from`, THE Core SHALL assign status `normal`.
5. WHEN the Urgency is from `watch_from` up to but not including `act_from`, THE Core SHALL assign status `watch`.
6. WHEN the Urgency is at or above `act_from`, THE Core SHALL assign status `act`.
7. IF a `rules.json` file contains its own `urgency` cut-offs that differ from the Cutoffs_File, THEN THE Core SHALL use the Cutoffs_File values and log a warning naming the module.
8. IF the Cutoffs_File is missing or contains a non-numeric value or `watch_from` is not less than `act_from`, THEN THE Core SHALL fail at startup with an error describing the invalid cut-offs.
9. FOR ALL integer Urgency values from 0 to 100, the Urgency_Scorer SHALL be monotonic: a higher Urgency SHALL never map to a lower-ranked status.

### Requirement 6: Combined patterns

**User Story:** As an astronaut, I want several small warning signs seen together to raise one clear alert, so that a combined problem is not missed.

#### Acceptance Criteria

1. THE Rules_File SHALL define each Pattern with `needs`, `min_in_watch`, `for_days`, `result`, `escalate`, `why`, `action` and `source`.
2. WHEN `patterns(patternDefs, history, options)` is called and, in each of the last `for_days` entries of `history`, at least `min_in_watch` of the indicators listed in a Pattern's `needs` have status `watch` or `act`, THE Pattern_Engine SHALL return an Alert named for that Pattern with the `result` status.
3. WHEN the Pattern_Engine returns a Pattern Alert, THE Pattern_Engine SHALL set `escalate` to the Pattern's `escalate` value and fill `why`, `action` and `source` from the Pattern.
4. WHEN the Pattern_Engine returns a Pattern Alert, THE Pattern_Engine SHALL set its `domain` to the Pattern's module Domain and name the contributing indicators in `why`.
5. WHILE fewer than `min_in_watch` of the needed indicators are in `watch` or `act`, THE Pattern_Engine SHALL return no Alert for that Pattern.
6. IF a Pattern lists an indicator in `needs` that does not exist in the Rules_File, THEN THE Core SHALL reject the Rules_File at load time and name the Pattern and the missing indicator.
7. WHEN the Pattern_Engine returns a Pattern Alert with a status higher than the Overall_Alert status, THE Core SHALL raise the Overall_Alert to the Pattern status.

### Requirement 7: Offline operation

**User Story:** As an astronaut far from Earth, I want Driftwatch to work with no network, so that I can use it when the link to the ground is down.

#### Acceptance Criteria

1. WHILE Offline, THE Core SHALL save Readings, compute Baselines, evaluate indicators, detect drift and detect Patterns using only data stored on the device.
2. THE Core SHALL load Rules_Files and the Cutoffs_File from files bundled with the application and make no network request while computing Alerts.
3. IF the network becomes unavailable during a computation, THEN THE Core SHALL complete the computation with the same result as when online.
4. WHEN the same Readings and Rules_Files are supplied, THE Core SHALL return the same Alerts whether the device is online or Offline.

### Requirement 8: Wrapping plain-function modules

**User Story:** As a developer, I want to plug in a teammate's existing engine file as a module, so that Radiation and Isolation work without a rewrite.

#### Acceptance Criteria

1. THE Module_Adapter SHALL accept a Module defined as a plain function that returns Alerts in the Alert_Contract.
2. THE Module_Adapter SHALL accept a Module defined by a Rules_File and run it through the Evaluator, Drift_Detector and Pattern_Engine.
3. WHEN a Plain_Function_Module is registered, THE Module_Adapter SHALL call it with the stored Readings and return its Alerts without altering the values it computed.
4. WHEN a Module returns Alerts, THE Module_Adapter SHALL validate each Alert against the Alert_Contract.
5. IF an Alert has a missing field, an extra field, a `status` outside `normal`, `watch` and `act`, an `urgency` outside 0 to 100, or a non-boolean `escalate`, THEN THE Module_Adapter SHALL reject that Alert and report the module name, the indicator and the invalid field.
6. IF a Module does not return an Overall_Alert named `<domain>_overall`, THEN THE Module_Adapter SHALL report the module name and the missing Overall_Alert.
7. IF a Plain_Function_Module throws an error, THEN THE Module_Adapter SHALL catch the error, report the module name, and continue to run the remaining Modules.

### Requirement 9: Testing and structure of the engine

**User Story:** As a developer, I want every engine function tested and kept free of UI code, so that the core is reliable and reusable.

#### Acceptance Criteria

1. THE Core SHALL implement `computeBaseline`, `evaluate`, `urgency` and `patterns` as pure functions in `baseline/src/engine/` with no import from `ui/`, React or Dexie.
2. THE Core SHALL provide at least one Vitest unit test for every function exported from `baseline/src/engine/`.
3. THE Core SHALL provide property-based or multi-case Vitest tests for the Baseline_Engine, the Urgency_Scorer cut-off mapping, the Drift_Detector and the Module_Adapter validation.
4. WHEN `vitest --run` is executed in `baseline/`, THE Core test suite SHALL complete with zero failing tests.
5. WHERE a Vitest test needs IndexedDB, THE Core test suite SHALL use an in-memory IndexedDB substitute so that the tests run without a browser.
