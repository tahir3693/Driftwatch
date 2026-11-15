# Implementation Plan: Driftwatch Dashboard

## Overview

JavaScript only. All code lives in `driftwatch/src/`. UI components and their pure helpers go in `ui/`. `data/` gets `regionMapping.json` and `indicatorRules.js`. `store/` gets one hook, `dashboardData.js`, which is the only new non-UI file that touches Dexie and the engine. The dashboard adds no engine logic. Components receive a `DashboardData` object as props and never import Dexie or call engine functions (only `statusRank` from `engine/urgency.js` is imported, by `regionStatus.js`).

Each helper and component gets a unit or component test beside it (`*.test.js` or `*.test.jsx`). Component tests start with `// @vitest-environment jsdom` and mock `react-chartjs-2` where a chart is rendered. Helper tests stay in the default node environment. `vite.config.js` is not changed. Property tests use fast-check, are optional (marked `*`), run at least 100 times, and are tagged `// Feature: dashboard, Property N: ...`. To avoid two tasks editing one file, each property test lives in its own file named `<helper>.<topic>.property.test.js`. Run tests from `driftwatch/` with `npm run test:run`.

## Tasks

- [x] 1. Test tooling setup
  - [x] 1.1 Install component test dependencies
    - In `driftwatch/`, run `npm i -D @testing-library/react @testing-library/user-event jsdom`
    - Do not change `vite.config.js`; component test files opt into jsdom with `// @vitest-environment jsdom` on their first line
    - Confirm `npm run test:run` still reports no failing tests
    - _Requirements: 12.3, 12.4, 12.5, 12.6_

- [x] 2. Shared data, wording and status style
  - [x] 2.1 Create the region mapping and fixed wording
    - Create `src/data/regionMapping.json` with the three regions in Tab order: `head_and_lungs` ("Head and lungs": radiation, environment), `bones_and_muscles` ("Bones and muscles": gravity), `whole_body` ("Whole body": isolation, nutrition, system)
    - Create `src/ui/wording.js` exporting `DISCLAIMER` ("Simulated data. Decision support only, not a medical device."), `REFERENCE_DOSE_TEXT` ("NASA design requirement for a reference solar particle event") and `CAREER_DOSE_TEXT` ("NASA career effective dose requirement")
    - Write `src/data/regionMapping.test.js`: three regions in order, and every value of `DOMAINS` appears in exactly one region
    - _Requirements: 1.1, 2.2, 2.8, 8.2, 8.4, 8.5_

  - [x] 2.2 Create the shared status style with unit tests
    - Create `src/ui/statusStyle.js` exporting `STATUS_STYLE` (`normal`, `watch`, `act`, `nodata`, each with `label`, `color`, `icon`, `classes`), `statusLabel(status)` (null or undefined gives "No data") and `SURFACE` (`background: '#0f172a'`, `text: '#f1f5f9'`)
    - Use icon shapes circle, triangle, square and dash, and colours `#4ade80`, `#fbbf24`, `#f87171`, `#94a3b8`
    - Write `statusStyle.test.js`: distinct colours and icon shapes per status, label mapping, and a WCAG contrast ratio of at least 4.5 for each colour and the text colour against `SURFACE.background`
    - _Requirements: 2.3, 2.7, 10.1, 10.2, 10.3, 10.4_

- [x] 3. Pure helpers
  - [x] 3.1 Implement `regionStatus.js` with unit tests
    - Create `src/ui/regionStatus.js` exporting `groupByRegion(alerts, mapping)`, `computeRegionStatus(alerts)`, `sortByUrgency(alerts)` and `regionAccessibleName(regionName, status)`
    - `groupByRegion` returns every region id and drops Alerts whose domain is unmapped; `computeRegionStatus` returns `{ status, escalate }` with `status` null for an empty array and uses `statusRank` imported from `engine/urgency.js`; `sortByUrgency` is stable and returns a new array
    - No React or DOM import
    - Write `regionStatus.test.js` with examples for each function, including an empty array, an unmapped domain and an escalating Alert
    - _Requirements: 2.4, 2.5, 2.7, 3.1, 3.2, 4.3, 5.1, 12.2, 12.3_

  - [x]* 3.2 Write property test for highest status
    - File: `src/ui/regionStatus.highest.property.test.js`
    - **Property 1: Highest status wins**
    - **Validates: Requirements 2.7, 3.1**

  - [x]* 3.3 Write property test for order independence
    - File: `src/ui/regionStatus.order.property.test.js`
    - **Property 2: Region status is order independent**
    - **Validates: Requirements 3.4**

  - [x]* 3.4 Write property test for adding a lower or equal Alert
    - File: `src/ui/regionStatus.lower.property.test.js`
    - **Property 3: Adding a lower or equal Alert leaves the status unchanged**
    - **Validates: Requirements 3.3**

  - [x]* 3.5 Write property test for escalate
    - File: `src/ui/regionStatus.escalate.property.test.js`
    - **Property 4: Escalate is true if any Alert escalates**
    - **Validates: Requirements 3.2**

  - [x]* 3.6 Write property test for grouping and labels
    - File: `src/ui/regionStatus.group.property.test.js`
    - **Property 5: Grouping follows the mapping and labels are consistent**
    - **Validates: Requirements 2.4, 2.5, 4.3**

  - [x]* 3.7 Write property test for urgency sorting
    - File: `src/ui/regionStatus.sort.property.test.js`
    - **Property 6: Alerts for a region are sorted by urgency**
    - **Validates: Requirements 5.1**

  - [x] 3.8 Implement `alertModel.js` with unit tests
    - Create `src/ui/alertModel.js` exporting `alertCardModel(alert, rule)` returning `{ title, statusLabel, urgency, valueText, baselineText, why, action, source, escalate }`
    - `title` is `rule.label`, else the Alert `indicator`, and "Overall: <domain>" for `<domain>_overall`; units come from `rule.unit` when present; `baselineText` is "Baseline not ready" when `baseline` is null; `why`, `action`, `source` pass through unchanged
    - Write `alertModel.test.js` covering a rule present, no rule, an overall Alert, a null baseline and `"design value"` as source
    - _Requirements: 5.2, 5.3, 5.6, 5.7, 8.1_

  - [x]* 3.9 Write property test for alert card text
    - File: `src/ui/alertModel.passthrough.property.test.js`
    - **Property 7: Alert card text is passed through unchanged**
    - **Validates: Requirements 5.2, 5.3, 5.6, 5.7**

  - [x] 3.10 Implement `trendModel.js` with unit tests
    - Create `src/ui/trendModel.js` exporting `buildTrendModel({ alert, rule, readings, stats })` returning `{ empty, title, statusLabel, unit, labels, values, pointStyles, band, baselineNotReady, altText }`
    - Point style `'rectRot'` for the last point and `'circle'` for the others; band is baseline minus and plus `stats?.sd ?? 0` per Reading, or `null` with `baselineNotReady: true` when the baseline is null; `empty` is true with no Readings; `altText` states label, latest value, baseline (or "baseline not ready") and Status_Label
    - Write `trendModel.test.js` covering empty readings, null baseline, missing stats, no rule (indicator as label, no unit) and the alt text
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x]* 3.11 Write property test for the baseline band
    - File: `src/ui/trendModel.band.property.test.js`
    - **Property 8: Baseline band is centred on the baseline with width of two standard deviations**
    - **Validates: Requirements 6.3, 6.4**

  - [x]* 3.12 Write property test for the latest point marker
    - File: `src/ui/trendModel.latest.property.test.js`
    - **Property 9: Exactly the latest point is marked**
    - **Validates: Requirements 6.5**

  - [x]* 3.13 Write property test for the text alternative
    - File: `src/ui/trendModel.alt.property.test.js`
    - **Property 11: Text alternative states the key facts**
    - **Validates: Requirements 6.6**

  - [x] 3.14 Implement `helpModel.js` with unit tests
    - Create `src/ui/helpModel.js` exporting `helpSections(rule)` returning `{ label, sections }` with the four headings "How to measure", "Why it matters", "What to do", "Source" in that order
    - Section text is `rule.howToMeasure`, `rule.whyItMatters`, `rule.action`, `rule.source` unchanged when a non-empty string, otherwise "Not available" (also when `rule` is undefined)
    - Write `helpModel.test.js` covering a full rule, a partial rule, empty strings and no rule
    - _Requirements: 7.2, 7.5, 7.6, 8.1_

  - [x]* 3.15 Write property test for help text
    - File: `src/ui/helpModel.text.property.test.js`
    - **Property 10: Help text is exact or "Not available"**
    - **Validates: Requirements 7.2, 7.5, 7.6**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. UI components
  - [x] 5.1 Implement `StatusBadge` and `SimulatedBanner` with component tests
    - Create `src/ui/StatusBadge.jsx`: inline SVG icon shape, Status_Label text and colour, all read from `statusStyle.js`
    - Create `src/ui/SimulatedBanner.jsx`: full-width bar with the `DISCLAIMER` text and no button or dismiss control
    - Write `StatusBadge.test.jsx` (label and a distinct icon per status) and `SimulatedBanner.test.jsx` (exact text, no button)
    - _Requirements: 1.1, 1.2, 1.3, 10.3, 10.4_

  - [x] 5.2 Implement `BodyMap` with component tests
    - Create `src/ui/BodyMap.jsx` with props `{ alertsByRegion, regions, selectedRegion, onSelect }`: one inline `<svg viewBox="0 0 240 420">` with drawn shapes, no `<image>`, minimum height 360 px
    - Each region is a `<g role="button" tabindex="0" aria-label="<name>: <Status_Label>" aria-pressed>`; fill from `STATUS_STYLE`; click, Enter and Space call `onSelect`; selected region gets a thicker outline; visible name, Status_Label ("No data" when empty) and "Escalate" text next to each region; a caption "Simulated"
    - Add `:focus-visible` outline styles (3 px, `SURFACE.text` colour) to `src/index.css`; touch-friendly sizing with `min-h-11 min-w-11` on any HTML controls
    - Write `BodyMap.test.jsx`: no `img` element, exactly three buttons, label text and accessible name for each of normal, watch, act, "No data", "Escalate", rerender updates, Tab order, Enter and Space select, `aria-pressed`
    - _Requirements: 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.2, 4.1, 4.2, 4.3, 4.4, 4.5, 9.3, 10.2, 12.1, 12.4_

  - [x] 5.3 Implement `AlertCard` with component tests
    - Create `src/ui/AlertCard.jsx` using `alertCardModel`, `StatusBadge` and "Simulated" label; show label, status, urgency, value, baseline, why, action, source
    - Show the Escalation_Notice "Escalate: contact the flight surgeon or crew support." with a distinct icon and border only when `escalate` is true
    - Add a "Help" button (`min-h-11 min-w-11`) that calls an `onOpenHelp(openerEl)` prop
    - Write `AlertCard.test.jsx`: notice present when true and absent when false, "Baseline not ready", "design value" shown, Help button calls the handler
    - _Requirements: 1.4, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 7.1, 9.3, 12.1, 12.5_

  - [x] 5.4 Implement `TrendChart` with component tests
    - Create `src/ui/TrendChart.jsx` using `buildTrendModel` and `react-chartjs-2`; register `LineElement`, `PointElement`, `LinearScale`, `CategoryScale`, `Tooltip`, `Legend`, `Filler`
    - Draw the value line in the latest status colour, an invisible lower dataset, and an upper dataset labelled "Your baseline" with `fill: '-1'`; legend hides the lower dataset; y axis title is the unit; `responsive: true`, `maintainAspectRatio: false` in a fixed-height container; canvas `role="img"` with `aria-label` from `altText`
    - Title row shows the label, Status_Label and "Simulated"; show "No readings yet" when empty and "Baseline not ready" when the baseline is null
    - Write `TrendChart.test.jsx` with `react-chartjs-2` mocked: empty state, null baseline, options (`responsive`, unit axis title, "Your baseline" entry), alt text on the canvas
    - _Requirements: 1.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 9.5, 10.2, 10.4, 11.1, 12.1_

  - [x] 5.5 Implement `HelpPanel` with component tests
    - Create `src/ui/HelpPanel.jsx` using `helpSections`: non-modal `<aside role="dialog" aria-labelledby>` with the four visible headings, a close button (`min-h-11 min-w-11`), heading with `tabIndex={-1}` that receives focus on open, Escape calls `onClose`
    - Write `HelpPanel.test.jsx`: four headings with rule text, "Not available" fallback, focus moves into the panel, Escape calls `onClose`
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 9.3, 12.1_

- [x] 6. Data layer
  - [x] 6.1 Implement `indicatorRules.js` with unit tests
    - Create `src/data/indicatorRules.js` exporting `loadIndicatorRules()`: static import of each module `rules.json` (radiation, gravity, environment, nutrition), returning `{ "domain/indicator": rule }`; radiation yields no entries because it has no `indicators`
    - Write `indicatorRules.test.js`: keys have the form `domain/indicator`, rules carry `label` and the four help fields, and an unknown key is absent
    - _Requirements: 5.2, 7.2, 8.1, 11.1_

  - [x] 6.2 Implement `useDashboardData` with tests
    - Create `src/store/dashboardData.js` returning `{ status, alerts, readings, baselineStats, rules }`: reads cutoffs with `loadCutoffs()`, readings with `getReadings` for every indicator in `rules`, alerts with `runModules`, and `baselineStats` from `computeBaseline` on all Readings except the latest, with the rule `baseline_days` (default 14), kept only when ready
    - Start with `status: 'loading'`; on a Dexie read failure return an empty `DashboardData` with `status: 'ready'` and log the error; log `runModules` errors and one warning for an Alert domain missing from the mapping; no scoring logic in this file
    - Write `dashboardData.test.jsx` (jsdom, `fake-indexeddb/auto`): loading then ready, alerts present after saving Readings, `baselineStats` present only when ready, failure path returns empty data
    - _Requirements: 2.5, 6.3, 11.1, 11.3, 12.6_

- [x] 7. Dashboard assembly and wiring
  - [x] 7.1 Implement `Dashboard` with component tests
    - Create `src/ui/Dashboard.jsx` with props `{ data, mapping = regionMapping }`, state `selectedRegion` and `helpTarget`; render `SimulatedBanner` always, "Loading data" while `status` is `'loading'`, a `lg:grid-cols-2` grid (single column below `lg`) with `BodyMap` and a `<section aria-live="polite">` region panel
    - Region panel: "Select a body region to see its alerts." when nothing is selected, "No alerts for this region yet." when empty, otherwise `AlertCard` plus `TrendChart` per Alert in `sortByUrgency` order (no chart for `<domain>_overall`); `HelpPanel` opens from the card Help button, and on close focus returns to the saved opener if it is still in the document; base text `text-base`, `overflow-x-hidden` on the page
    - Write `Dashboard.test.jsx` (with `react-chartjs-2` mocked): initial text, empty region text, cards ordered by urgency, live region attribute, loading state with all regions "No data", banner always present, help open and Escape restores focus, renders with `fetch` stubbed to throw
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.6, 5.1, 5.8, 5.9, 7.1, 7.3, 9.1, 9.2, 9.4, 9.5, 11.1, 11.3, 12.1_

  - [x] 7.2 Wire the dashboard into `App.jsx`
    - Update `src/App.jsx` to call `useDashboardData()` and render `<Dashboard data={...} />` with the dark `SURFACE` page background and system font stack
    - Make sure no remote font, image, script or stylesheet is referenced from `index.html` or `index.css`
    - Write `App.test.jsx` (jsdom, `fake-indexeddb/auto`, `react-chartjs-2` mocked): renders the banner and the three regions
    - _Requirements: 1.2, 9.1, 9.2, 11.1, 11.2_

  - [x] 7.3 Add source scan tests for `ui/`
    - Create `src/ui/sourceScan.test.js` (node environment) that reads the `ui/` source files and asserts: no hex colour outside `statusStyle.js` (and the `index.css` focus rule is not scanned); the digits `250` and `600` appear only in `wording.js` (as text, not in the constants of the dashboard's own wording elsewhere); no `http://`, `https://`, `fetch` or `XMLHttpRequest`; `regionStatus.js` imports no React or DOM module and only `statusRank` from the engine; no `ui/` file imports Dexie or `store/`
    - _Requirements: 8.2, 8.3, 8.4, 10.4, 11.2, 12.2_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Layout, 16 px text, banner visibility at both widths, wording quality and the bundled Chart.js are checked by hand in the browser at 360 px and 1280 px with the network disabled (Requirements 1.2, 6.8, 8.1, 8.5, 9.1, 9.2, 9.4)
- Property tests validate universal correctness of the pure helpers; component tests cover rendering, focus and accessibility

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1", "3.8", "3.10", "3.14", "6.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.9", "3.11", "3.12", "3.13", "3.15", "5.1", "6.2"] },
    { "id": 4, "tasks": ["5.2", "5.3", "5.4", "5.5"] },
    { "id": 5, "tasks": ["7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3"] }
  ]
}
```
