# Implementation Plan: Driftwatch Ground Report

## Overview

JavaScript only. All code lives in `baseline/src/`. The pure report code goes in a new `report/` folder (one file per function, each with a `*.test.js` beside it). `data/` gets the report config (caps, window length, module labels). `ui/` gets the Ground report screen, its print stylesheet and a small navigation bar. The report adds no engine logic, changes no `rules.json` and changes no `cutoffs.json` value. It reads the `DashboardData` that `useDashboardData` already holds.

Layering: `report/` files import no React, Dexie, `store/`, `ui/`, JSON, `console`, clock or randomness. They import only `engine/urgency.js` (`statusRank`) and `data/domains.js` (`DOMAINS`). `data/reportConfig.js` loads the JSON and passes the config into the builder as an argument. `ui/` never imports Dexie or `store/`; `App.jsx` wires props.

Property tests use fast-check, are optional (marked `*`), run at least 100 times, and are tagged `// Feature: ground-report, Property N: ...`. To avoid two tasks editing one file, each property test lives in its own file named `buildGroundReport.<topic>.property.test.js`. Component tests start with `// @vitest-environment jsdom`. Run tests from `baseline/` with `npm run test:run`.

## Tasks

- [ ] 1. Test tooling check
  - [ ] 1.1 Confirm test dependencies are installed
    - In `baseline/`, check `package.json`; if `fast-check`, `@testing-library/react`, `@testing-library/user-event` or `jsdom` are missing from `devDependencies`, run `npm i -D` for the missing ones
    - Do not change `vite.config.js`; component test files opt into jsdom with `// @vitest-environment jsdom` on their first line
    - Confirm `npm run test:run` reports no failing tests
    - _Requirements: 10.1, 10.2_

- [ ] 2. Config, helpers and formatting (pure, no UI)
  - [ ] 2.1 Implement `validateReportConfig.js` with unit tests
    - Create `src/report/validateReportConfig.js` exporting `validateReportConfig(config)`: it returns the config when valid and throws `TypeError` otherwise; valid means `windowDays`, `maxActiveAlertsPerModule` and `maxLastReadings` are positive integers, `moduleLabels` has a non-empty string for each of the six Domains in `DOMAINS`, and `source` is a non-empty string
    - It lives in `report/` (not in `data/reportConfig.js`) so the builder can use it without importing JSON; `data/reportConfig.js` imports it
    - Write `validateReportConfig.test.js`: the valid shape passes, zero or negative or fractional caps throw, a missing label throws, a missing `source` throws, `null` and a non-object throw
    - _Requirements: 1.1, 1.4, 8.1_

  - [ ] 2.2 Create the report config and loader with unit tests
    - Create `src/data/reportConfig.json` with `windowDays` 7, `maxActiveAlertsPerModule` 6, `maxLastReadings` 24, `moduleLabels` for the six Domains (`radiation` "Radiation", `isolation` "Isolation", `gravity` "Gravity", `environment` "Environment", `nutrition` "Nutrition", `system` "Offline and ground report") and `"source": "design value"`
    - Create `src/data/reportConfig.js` exporting `loadReportConfig()`: static import of the JSON, `validateReportConfig`, `Object.freeze` (deep for `moduleLabels`), then cache (same pattern as `data/cutoffs.js`)
    - Write `reportConfig.test.js`: the shipped file loads and is frozen, the six labels match the Module_Labels in the requirements, `windowDays` is 7, the caps are 6 and 24, `source` is present, and invalid variants (zero cap, missing label, no source) make the validator throw
    - _Requirements: 1.4, 1.5, 2.5, 8.1_

  - [ ] 2.3 Implement `flattenReadings.js` with unit tests
    - Create `src/report/flattenReadings.js` exporting `flattenReadings(readingsByKey)`: concatenates the arrays of a `{ key: Reading[] }` map in key order, ignores values that are not arrays, returns `[]` for a non-object; it does not sort, validate or copy
    - Write `flattenReadings.test.js`: concatenation in key order, a non-array value ignored, `null`, `undefined` and an array input give `[]`, the input map is not changed
    - _Requirements: 1.1, 5.1, 7.3_

  - [ ] 2.4 Implement `formatTime.js` with unit tests
    - Create `src/report/formatTime.js` exporting `formatDateTime(timestamp)` (local `dd Mon yyyy, HH:mm`, fixed English month names, 24-hour clock, `'Unknown time'` for a non-finite value) and `formatDayKey(timestamp)` (local `YYYY-MM-DD`, used for the document title)
    - Use `Date` local getters and a fixed month array so the output does not depend on the browser locale; read no clock
    - Write `formatTime.test.js`: build timestamps with `new Date(y, m, d, h, mi).getTime()` so the test passes in any time zone; check a normal time, midnight, noon, single-digit day padding, the 31 December to 1 January edge, and `NaN`, `Infinity` and `undefined` giving `'Unknown time'`
    - _Requirements: 5.3, 6.3, 9.8, 10.5_

- [ ] 3. Report builder
  - [ ] 3.1 Implement `buildGroundReport.js` with unit tests
    - Create `src/report/buildGroundReport.js` exporting `buildGroundReport({ alerts, readings, rules, now, config })`; throw `TypeError` for an invalid `config` (via `validateReportConfig`) or a non-finite `now`; treat every other bad input as data
    - Window: `windowStart = now - config.windowDays * 86400000`, `windowEnd = now`; keep a Reading only when it is a plain object with a known Domain, a non-empty string `indicator`, a finite `timestamp`, a finite numeric `value`, and `windowStart <= timestamp <= windowEnd`; per `domain` and `indicator` keep the greatest `timestamp`, and the last supplied for equal timestamps
    - Alerts: non-array gives `[]`; keep only plain objects with a Domain in `DOMAINS` and a `status` that `statusRank` ranks 0 to 2; copy each with `{ ...alert }`; a non-finite `urgency` counts as 0 for sorting and Module_Urgency; sort by `(urgency desc, input index)`
    - Modules: exactly six, in `DOMAINS` order, each `{ domain, label, status, urgency, activeAlerts, activeTotal, moreAlerts }`; `status` is the status of the highest `statusRank` and `urgency` the highest urgency, both `null` when the Domain has no Alert; `activeAlerts` are the `watch` and `act` Alerts capped at `config.maxActiveAlertsPerModule`
    - Escalations: every kept Active_Alert with `escalate === true`, before any cap, sorted by urgency descending (stable), as `{ domain, label, indicator, urgency, status, action }`; never capped
    - Last readings: rows `{ domain, label, indicator, indicatorLabel, unit, value, timestamp }` where `indicatorLabel` is `rules["<domain>/<indicator>"].label` when a non-empty string, else the `indicator`, and `unit` is the rule `unit` when a string, else `''`; sort by `timestamp` desc, then `DOMAINS` index, then `indicator` asc; cap at `config.maxLastReadings`
    - Counts: `{ activeTotal, activeListed, readingsTotal, readingsListed, moreReadings, capped }` with `capped` true when anything was left out
    - Copy `why`, `action` and `source` unchanged; build no user text other than the `label` strings from `config`; the output is plain JSON data
    - Write `buildGroundReport.test.js`: a worked example from the 14-day demo (alerts and readings for day 14) with exact expected modules, escalations and rows; empty input gives six `null` statuses and urgencies; the six modules in order; 7 alerts in one module and 25 readings give "more" counts of 1 and `capped` true; an escalating alert cut from its module list is still in `escalations`; the equal-timestamp tie rule (last supplied wins); readings exactly at `windowStart` and `now` are included and 1 ms outside is excluded; a future reading is excluded; an Alert with an unknown domain or status is dropped; a missing rule gives the raw indicator and no unit (as for Radiation); non-array `alerts` and `readings` give an empty report without throwing; invalid `config` and non-finite `now` throw `TypeError`; the input arrays and objects are not changed; `JSON.parse(JSON.stringify(model))` equals the model
    - Also feed a `DashboardData`-shaped fixture through `flattenReadings` and the builder to check the two work together
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.4, 4.1, 5.1, 5.2, 5.4, 5.5, 7.1, 7.3, 7.4, 8.1, 8.5, 8.6_

  - [ ]* 3.2 Write property test for the inclusive window
    - File: `src/report/buildGroundReport.window.property.test.js`
    - **Property 1: Window is inclusive at both ends**
    - **Validates: Requirements 1.5, 5.1, 5.5**

  - [ ]* 3.3 Write property test for module status and urgency
    - File: `src/report/buildGroundReport.moduleStatus.property.test.js`
    - **Property 2: Module status and urgency are the highest of the module's Alerts**
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [ ]* 3.4 Write property test for active alerts
    - File: `src/report/buildGroundReport.active.property.test.js`
    - **Property 3: Active alerts are exactly the watch and act alerts**
    - **Validates: Requirements 3.1, 3.2, 3.4**

  - [ ]* 3.5 Write property test for escalations
    - File: `src/report/buildGroundReport.escalations.property.test.js`
    - **Property 4: Escalations are every escalating active alert and are never capped**
    - **Validates: Requirements 4.1, 8.5**

  - [ ]* 3.6 Write property test for the caps
    - File: `src/report/buildGroundReport.caps.property.test.js`
    - **Property 5: Caps keep the most urgent and newest items and report the truncation**
    - **Validates: Requirements 3.2, 8.1, 8.6**

  - [ ]* 3.7 Write property test for order independence
    - File: `src/report/buildGroundReport.order.property.test.js`
    - **Property 6: Order independence**
    - The generator gives all Alerts of one Domain distinct urgencies and no two Readings the same `domain`, `indicator` and `timestamp` (the tie cases in requirements 1.2 and 5.2 conflict; see Notes)
    - **Validates: Requirements 1.2, 2.4**

  - [ ]* 3.8 Write property test for input immutability
    - File: `src/report/buildGroundReport.immutable.property.test.js`
    - **Property 7: Inputs are not modified**
    - **Validates: Requirements 1.3**

  - [ ]* 3.9 Write property test for last readings
    - File: `src/report/buildGroundReport.lastReadings.property.test.js`
    - **Property 8: Last reading per indicator is the latest in the window**
    - **Validates: Requirements 5.2, 5.4**

  - [ ]* 3.10 Write property test for bad input
    - File: `src/report/buildGroundReport.badInput.property.test.js`
    - **Property 9: Bad input never throws and keeps the shape**
    - **Validates: Requirements 1.4, 1.6, 7.3, 7.4**

  - [ ]* 3.11 Write property test for the model round trip
    - File: `src/report/buildGroundReport.roundtrip.property.test.js`
    - **Property 10: Report model round trip**
    - **Validates: Requirements 1.1, 1.2**

  - [ ] 3.12 Add source scan tests for `report/`
    - Create `src/report/reportSourceScan.test.js` (node environment) that reads every non-test file in `src/report/` and asserts: no import from React, Dexie, `store/`, `ui/` or any `.json` file; the only engine and data imports are `engine/urgency.js` and `data/domains.js`; no `Date.now`, `new Date()` without an argument (except in `formatTime.js`, which only uses `new Date(timestamp)`), `console`, `fetch`, `XMLHttpRequest` or `Math.random`; and no `250` or `NASA` text
    - _Requirements: 1.1, 3.7, 6.5, 10.1_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. UI, print stylesheet and wiring
  - [ ] 5.1 Create the fixed report text with unit tests
    - Create `src/ui/groundReportText.js` (a new file, so it does not clash with edits to `ui/wording.js`) exporting the fixed strings: `GROUND_REPORT_TITLE` "Ground report", `GROUND_REPORT_SIMULATED_LINE` "All data in this report is simulated. Decision support only, not a medical device.", `NO_ACTIVE_ALERTS` "No active alerts in the last 7 days.", `NO_ESCALATIONS` "No open escalations.", `NO_READINGS` "No readings in the last 7 days.", `LOADING_DATA` "Loading data", `CAPPED_NOTE` "Lists are shortened to fit one page. Open the dashboard for the full detail.", `PRINT_LABEL` "Print or Save as PDF", `NO_DATA_LABEL` "No data", the section headings ("Module status", "Open escalations", "Active alerts", "Last readings"), the label "Recommended action", and the functions `moreAlertsText(n)` ("and N more") and `moreReadingsText(n)` ("and N more readings")
    - No diagnostic wording, no `250`, no `NASA`
    - Write `groundReportText.test.js`: each exact string, the two functions for 1 and 12, and no `250` or `NASA` in the file source
    - _Requirements: 3.5, 4.2, 4.3, 4.4, 5.6, 6.1, 6.5, 7.5, 8.2, 8.3, 8.4, 9.1, 10.5_

  - [ ] 5.2 Create the print stylesheet with a source test
    - Create `src/ui/groundReport.css` with the `@media print` block from the design: `@page` margin 10mm and `size: auto`; white background and black text at `9pt` base; `.no-print { display: none !important }`; black `fill` and `stroke` for SVG inside `.report-sheet`; heading sizes of at least 9pt; full-width collapsed tables; `break-inside: avoid` for `.alert-entry`; a two-column `.readings-table-wrap`
    - Use colour keywords `black` and `white` only: no hex colour, no `url()`, no `@import`, no `overflow: hidden`, no fixed height on the sheet, no `font-size` below `9pt`
    - Write `groundReportCss.test.js` (node environment, reads the file): has an `@media print` block that contains `.no-print`, `white`, `black` and `9pt`; no hex colour; no `url(`, `@import` or `http`; no font size under 9pt
    - _Requirements: 9.4, 9.5, 9.6, 10.2_

  - [ ] 5.3 Implement `GroundReport` with component tests
    - Dashboard tasks 5.x (`StatusBadge`, `statusStyle.js`) and 7.1 (`SimulatedBanner`) must exist first
    - Create `src/ui/GroundReport.jsx` with props `{ data, now, config = loadReportConfig(), onPrint = () => window.print?.(), refreshing = false }`; when `data.status === 'loading'` or `refreshing`, show "Loading data" and disable the Print_Button; otherwise `useMemo` the model from `buildGroundReport({ alerts: data.alerts, readings: flattenReadings(data.readings), rules: data.rules, now, config })`
    - Markup per the design: `SimulatedBanner` and the toolbar (Print_Button, native `button`, `min-h-11 min-w-11`, visible 3 px focus outline) both with class `no-print`; then `<article class="report-sheet" aria-labelledby="report-title">` with the header ("Driftwatch", `h1` "Ground report", a "Simulated" tag, Generated_Timestamp, window start and end via `formatDateTime`, and the Simulated_Line), then `h2` sections in this order: Module status table, Open escalations, Active alerts (`h3` per module with alerts), Last readings, and the capped note only when `counts.capped`
    - Module status table: a real `<table>` with `th scope`, a row per module with its Module_Label, `StatusBadge` (icon shape plus Status_Label text) and urgency; a `null` status shows `StatusBadge` with `statusLabel(null)` ("No data") and "No data" for urgency
    - Active alert entry (`class="alert-entry"`): `StatusBadge`, indicator, "Urgency N", then "Why: ...", "Recommended action: ..." and "Source: ..." exactly as supplied, then "and N more" when `moreAlerts > 0`; empty states from `groundReportText.js`
    - Last readings: table with Module_Label, indicator label, value with unit, local time; "and N more readings" when `counts.moreReadings > 0`
    - An effect sets `document.title` to `Driftwatch ground report <YYYY-MM-DD>` and restores the old title on unmount; import `./groundReport.css`; no `img`, logo, remote asset, Dexie or `store/` import
    - Write `GroundReport.test.jsx` (jsdom): title, "Driftwatch", Generated_Timestamp and window times; the six Module_Labels with Status_Label text and urgency; "No data" for a module without Alerts and for an empty `alerts` list while the Simulated_Line and Generated_Timestamp still show; active entries with "Recommended action", `why` and `source`; escalations section before the per-module section in DOM order; last readings with unit; each fixed empty text; "and 1 more" and "and 2 more readings"; capped note only when capped; the Simulated_Line is in the sheet and not inside a `no-print` element; each of Normal, Watch, Act and No data has its text and its own SVG shape; Print_Button label, one `onPrint` call per click, default click calls a stubbed `window.print`, is a `button`, reachable by `userEvent.tab()`, activated by Enter and Space, has `min-h-11` and `min-w-11`, is disabled with "Loading data" when loading or `refreshing`; banner and toolbar carry `no-print`; `document.title` is set while mounted and restored after unmount; one `h1`, `h2` sections and `h3` per module in order; with `fetch` and `XMLHttpRequest` stubbed to throw, rendering and printing succeed, the stub is never called, and the document has no `img`, `link[href^=http]` or `script[src]`
    - _Requirements: 2.5, 3.3, 3.4, 3.5, 3.6, 4.2, 4.3, 4.4, 5.3, 5.4, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.5, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 9.7, 9.8, 10.1, 10.2, 10.4, 10.5, 10.6_

  - [ ] 5.4 Implement `AppNav` with component tests
    - Create `src/ui/AppNav.jsx` with props `{ view, onChange }`: `<nav aria-label="Main" class="no-print">` with three native buttons "Dashboard", "Check-in" and "Ground report", each `min-h-11 min-w-11` with a visible focus outline, the current one with `aria-current="page"`, and `onChange` called with `'dashboard'`, `'checkin'` or `'report'`
    - Write `AppNav.test.jsx` (jsdom): three buttons in order, `aria-current` on the current view only, `onChange` value per button, the `no-print` class, control size classes, Tab reaches each button
    - _Requirements: 9.4, 10.3, 10.4_

  - [ ] 5.5 Load radiation readings in `useDashboardData`
    - Check-in task 5.6 must be done first (it adds `refresh(now)` and the radiation indicator list to `store/dashboardData.js`); this task only extends that file, one edit at a time
    - In `store/dashboardData.js`, also read the radiation indicators `cumulative_dose_mSv`, `premission_dose_mSv`, `proton_flux_pfu` and `symptom_nausea`, `symptom_vomiting`, `symptom_fatigue`, `symptom_skin`, `symptom_fever`, `symptom_bruising` and add them to `DashboardData.readings` under `radiation/<indicator>` keys, for both the first load and `refresh(now)`; reuse the list the check-in already builds for the radiation engine input, and do not add `rules` entries for them (the report then shows the raw indicator and no unit)
    - Extend `dashboardData.test.jsx` (jsdom, `fake-indexeddb/auto`): after saving a cumulative dose and a symptom Reading, `data.readings['radiation/cumulative_dose_mSv']` and `data.readings['radiation/symptom_nausea']` hold them; existing assertions on rules-based readings still pass; `flattenReadings(data.readings)` fed to `buildGroundReport` gives Last_Reading rows for Radiation
    - _Requirements: 5.1, 5.3, 5.4_

  - [ ] 5.6 Wire the Ground report into `App.jsx`
    - Dashboard task 7.2 and check-in task 7.7 must be done first (both edit `src/App.jsx`); this task extends what they left, one edit at a time
    - Keep the single `useDashboardData()` instance; add `'report'` to the `view` union, render `AppNav` (it replaces nothing that exists; the per-screen switch buttons stay), add `reportNow` and `preparing` state; when the user opens the report, `changeView('report')` reads `Date.now()` once, stores it as `reportNow`, sets `preparing`, then calls `refresh?.(now)` and clears `preparing` when it settles (a rejection is ignored and the in-memory data is shown)
    - Render `<GroundReport data={data} now={reportNow} refreshing={preparing} />` for the `'report'` view; no router; make sure no remote font, image, script or stylesheet is referenced from `index.html` or `index.css`
    - Extend `App.test.jsx` (jsdom, `fake-indexeddb/auto`, `react-chartjs-2` mocked): click "Ground report" and see the title and the Simulated_Line; go back to "Dashboard"; the open call passes one numeric `now` to a spied `refresh`; a rejecting `refresh` still shows the report; with `fetch` stubbed to throw the report still opens
    - _Requirements: 6.4, 7.5, 10.1, 10.3, 10.6_

  - [ ] 5.7 Add source scan tests for the report UI
    - Create `src/ui/groundReportSourceScan.test.js` (node environment) that reads `GroundReport.jsx`, `AppNav.jsx`, `groundReportText.js` and `groundReport.css` and asserts: no import of `dexie` or `store/` (Requirement 10.6), no `http://`, `https://`, `fetch` or `XMLHttpRequest`, no `<img`, no `250` and no `NASA`, no hex colour in the `.jsx` and `.css` files, and `GroundReport.jsx` contains no `Date.now` or `new Date()` without an argument
    - _Requirements: 3.7, 6.4, 6.5, 9.6, 10.1, 10.2, 10.6_

- [ ] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability; requirements 1 to 10 are each referenced by at least one task
- Sequencing: tasks 1 to 4 (everything in `report/` and `data/`) depend on nothing from the other specs and can start at once. Tasks 5.3, 5.5 and 5.6 depend on other specs. 5.3 needs the dashboard `StatusBadge`, `statusStyle.js` and `SimulatedBanner`. 5.5 needs check-in task 5.6 (`refresh(now)` in `store/dashboardData.js`). 5.6 needs dashboard task 7.2 and check-in task 7.7 (both edit `App.jsx`). If any of those do not exist yet, these wiring tasks must be run after them, one edit at a time, never in parallel with a task from another spec that edits `App.jsx` or `dashboardData.js`. The wiring tasks only extend; they do not rewrite
- Deviations from the design, made to keep files free of edit conflicts: `validateReportConfig` lives in `report/validateReportConfig.js` (task 2.1) so the builder imports no JSON, and the fixed strings live in the new `ui/groundReportText.js` (task 5.1) instead of `ui/wording.js`. `GroundReport` and `AppNav` are additions to the `ui/` list in `structure.md`, and `report/` is an addition to the folder list; update `structure.md` when the code lands
- Requirement issues found in the design:
  1. Requirement 1.2 (output does not depend on input order) conflicts with 5.2 (the latest supplied wins for equal timestamps) when two Readings of one indicator share a timestamp and differ in value. The code keeps 5.2 for that case, and Property 6 (task 3.7) excludes it. Suggested rewording of 1.2: "...regardless of the order of the Alerts and Readings supplied, except for Readings of one indicator with equal timestamps"
  2. Requirement 2.2 says the status "is No data". The builder returns `status: null` and `urgency: null`, and the UI shows `null` as "No data" through `statusLabel(null)`. Tests for the model (tasks 3.1, 3.3) check `null`; tests for the screen (task 5.3) check the text "No data". Suggested rewording of 2.2: "...THE Report_Builder SHALL set them to null and THE Ground_Report SHALL show 'No data'"
  3. Radiation Readings (dose, flux, symptoms) are not in `DashboardData.readings` as the dashboard design stands, because the radiation `rules.json` has no `indicators`. Task 5.5 adds them. Radiation rows then show the raw indicator name and no unit, since no rule exists
- Page fit: the caps 6 and 24 are placeholders. The worst case (6 alerts in each of 6 modules) cannot fit one page at 9 pt, so content then flows onto a second page and is never clipped. The final caps come from the print preview check below and live in `data/reportConfig.json`; if the demo does not fit, lower `maxActiveAlertsPerModule` to 3 first
- Manual checks (cannot run in jsdom, done by hand after task 5.6; not coding tasks):
  1. Print preview fits one page: run the 14-day scenario to day 14, open the Ground report, and check print preview in Chrome and Edge at A4 and at Letter: one page, no text under 9 pt. Then use a worst-case fixture (an alert in every module, several escalations, more than 24 readings) and confirm it continues to a second page without clipping
  2. Black and white: print preview in black and white or grayscale, and a PDF viewed in grayscale: white page, black text, no dark boxes, icons differ by shape, every status has its word
  3. Offline: `npm run build` and `npm run preview`, load once online, switch DevTools Network to Offline, reload, open the Ground report from the navigation, check print preview works, no failed request and no remote font
  4. Save as PDF file name starts with "Driftwatch ground report"
  5. Keyboard: Tab to the navigation and to Print, see the focus outline, activate with Enter and Space
- Property tests validate universal correctness of `buildGroundReport`; component tests and source scans cover rendering, print rules and layering

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.3", "2.4", "5.1", "5.2", "5.4"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "3.9", "3.10", "3.11", "3.12"] },
    { "id": 4, "tasks": ["5.3", "5.5"] },
    { "id": 5, "tasks": ["5.6", "5.7"] }
  ]
}
```
