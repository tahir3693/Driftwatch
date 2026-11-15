# Requirements Document

## Introduction

This spec covers the Driftwatch Ground_Report: a one-page summary of the last 7 days that an astronaut prints or saves as PDF when the link to Earth opens (build plan, "Distance from Earth"). It shows the status of each module, the active alerts with reason and action, urgency scores, the open escalations and the last reading of each indicator. The report is built by a pure function from Alerts, Readings and a supplied time, and shown on a Ground report screen with a Print button. It reads the Alert and Reading data the core, dashboard and check-in specs already produce (see `.kiro/specs/core/`, `dashboard/` and `checkin/`) and adds no engine logic.

The stack is React with Vite, JavaScript only, Tailwind CSS and Vitest. The report needs no backend and no network at runtime (milestone M4: works with the network off). All text is English, there are no NASA logos or branding, and there are no photos of people. All demo data is simulated and the report says so. Driftwatch is decision support, not a medical device.

Code location: the pure function and its helpers go in `driftwatch/src/report/` (development plan), with a test file beside each. The screen component goes in `driftwatch/src/ui/`. Print rules are a stylesheet with an `@media print` block.

Assumptions (to be confirmed in the design):

1. An Alert has no timestamp. The 7-day window therefore applies to Readings only. The Alerts passed in are the current Alerts from the latest engine run, and the report treats them as the state at `now`.
2. The 7-day window is inclusive at both ends: a Reading is in the Report_Window when `now - 7 days <= timestamp <= now`, with `7 days = 604800000` ms. A Reading after `now` is outside the window.
3. The app has no stored log of actions the astronaut took. In v1, "actions taken" is shown as the recommended `action` of each Active_Alert. The report does not claim that an action was carried out.
4. "Open escalations" are the Active_Alerts whose `escalate` is `true`. The app has no way to close an escalation in v1, so every current escalating Alert is open.
5. A module without Alerts (for example `system`, which has no module code) shows "No data".
6. The report is capped at 6 Active_Alerts per module and 1 last reading per indicator, with at most 12 Last_Reading rows in total (set from the print preview check). Excess items are replaced by an "and N more" line. The design may adjust these numbers when it fixes the page layout.
7. Page size is A4 or Letter. Print is black and white safe. Text is at least 9 pt in print.
8. Units for Last_Reading come from the Indicator_Rule (`unit`) supplied with the data. A missing unit shows no unit text.

## Glossary

- **Ground_Report**: The one-page summary defined by this spec, shown on the Ground_Report_Screen and printed from it.
- **Ground_Report_Screen**: The React screen in `ui/` that displays the Ground_Report and the Print_Button.
- **Report_Builder**: The pure function `buildGroundReport({ alerts, readings, rules, now })` in `report/` that returns a Report_Model.
- **Report_Model**: The plain object returned by the Report_Builder, with one Module_Summary per Domain, the Active_Alert lists, the escalation list, the Last_Reading rows, the window bounds and the cap counts.
- **Module_Summary**: The entry for one Domain in the Report_Model: Module_Status, Module_Urgency and the module's Active_Alerts.
- **Domain**: One of `radiation`, `isolation`, `gravity`, `environment`, `nutrition`, `system`.
- **Module_Label**: The display name of a Domain: Radiation, Isolation, Gravity, Environment, Nutrition, and "Offline and ground report" for `system`.
- **Alert**: An object with exactly the fields `domain`, `indicator`, `value`, `baseline`, `status`, `urgency`, `why`, `action`, `escalate`, `source`, as defined in `structure.md`.
- **Active_Alert**: An Alert whose `status` is `watch` or `act`.
- **Module_Status**: The highest Alert `status` among all Alerts of a Domain, where `act` ranks above `watch` and `watch` ranks above `normal`. It is "No data" when the Domain has no Alert.
- **Module_Urgency**: The highest Alert `urgency` among all Alerts of a Domain, or "No data" when the Domain has no Alert.
- **Status_Label**: The capitalised text "Normal", "Watch" or "Act" for a status, or "No data".
- **Reading**: A record with `timestamp`, `domain`, `indicator` and `value`, as defined by the core spec.
- **Report_Window**: The closed time interval from `now - 604800000` ms to `now`, both ends included.
- **Last_Reading**: For one indicator, the Reading with the greatest `timestamp` inside the Report_Window.
- **Indicator_Rule**: The entry for one indicator in a module's `rules.json`, with `label` and `unit`.
- **Open_Escalation**: An Active_Alert with `escalate` equal to `true`.
- **Now**: The evaluation time in epoch milliseconds passed to the Report_Builder. The Report_Builder reads no system clock.
- **Generated_Timestamp**: The text of `now` shown on the report as a local date and time.
- **Simulated_Line**: The exact text "All data in this report is simulated. Decision support, not a medical device."
- **Print_Button**: The button on the Ground_Report_Screen that opens the browser print dialog.
- **Print_Stylesheet**: The CSS inside `@media print` that formats the Ground_Report for one page.
- **Reference_Dose_Text**: The wording "NASA design requirement for a reference solar particle event", used whenever the Ground_Report mentions the 250 mSv value.

## Requirements

### Requirement 1: Build the report from data with a pure function

**User Story:** As a developer, I want the report built by a pure function, so that the same inputs always give the same report and the report is easy to test.

#### Acceptance Criteria

1. WHEN `buildGroundReport` is called with Alerts, Readings, rules and `now`, THE Report_Builder SHALL return a Report_Model without reading the system clock, Dexie, the network or the DOM.
2. THE Report_Builder SHALL return identical Report_Models for identical inputs, regardless of the order of the Alerts and Readings supplied, except for Readings of one indicator with equal timestamps, where requirement 5.2 applies.
3. THE Report_Builder SHALL not modify the Alerts, Readings or rules passed in.
4. THE Report_Model SHALL contain exactly one Module_Summary for each of the six Domains, in the order radiation, isolation, gravity, environment, nutrition, system.
5. THE Report_Model SHALL contain the Report_Window start and end, equal to `now - 604800000` and `now`.
6. IF an Alert has a `domain` outside the six Domain values, THEN THE Report_Builder SHALL leave that Alert out of the Report_Model.

### Requirement 2: Status and urgency per module

**User Story:** As a ground flight surgeon, I want one status and one urgency score per module, so that I can see the state of each hazard at a glance.

#### Acceptance Criteria

1. THE Report_Builder SHALL set the Module_Status of each Domain to the highest Alert `status` among all Alerts of that Domain, including the `<domain>_overall` Alert.
2. IF a Domain has no Alert, THEN THE Report_Builder SHALL set the Module_Status and the Module_Urgency to null, and THE Ground_Report SHALL show "No data" for both.
3. THE Report_Builder SHALL set the Module_Urgency of each Domain to the highest Alert `urgency` among all Alerts of that Domain.
4. WHEN the same Alerts are supplied in a different order, THE Report_Builder SHALL return the same Module_Status and Module_Urgency for every Domain.
5. THE Ground_Report SHALL show, for each of the six Domains, the Module_Label, the Status_Label and the Module_Urgency.

### Requirement 3: Active alerts with reason and action

**User Story:** As a ground flight surgeon, I want the alerts that need attention with the reason and the recommended action, so that I can advise the crew without opening the app.

#### Acceptance Criteria

1. THE Report_Builder SHALL include in the Active_Alert list of a Domain every Alert of that Domain whose `status` is `watch` or `act`, and no Alert whose `status` is `normal`.
2. THE Report_Builder SHALL order the Active_Alerts of a Domain by `urgency` from highest to lowest, keeping the input order for equal `urgency`.
3. THE Ground_Report SHALL show, for each listed Active_Alert, the indicator, the Status_Label, the `urgency`, the `why` text and the `action` text.
4. THE Ground_Report SHALL show the `why`, `action` and `source` text of each Alert exactly as supplied, without rewriting it and without adding diagnostic wording.
5. IF no Alert in the whole report is an Active_Alert, THEN THE Ground_Report SHALL show the text "No active alerts in the last 7 days."
6. WHERE an Alert `source` is shown, THE Ground_Report SHALL show it as a short citation or "design value".
7. WHERE the Ground_Report mentions the 250 mSv value, THE Ground_Report SHALL describe it with the Reference_Dose_Text.

### Requirement 4: Open escalations

**User Story:** As a ground flight surgeon, I want escalations listed in one place, so that I can see first what needs contact.

#### Acceptance Criteria

1. THE Report_Builder SHALL list as Open_Escalations every Active_Alert whose `escalate` equals `true`, ordered by `urgency` from highest to lowest.
2. THE Ground_Report SHALL show the Open_Escalations in a section titled "Open escalations", above the per-module alert lists, with the Module_Label, the indicator and the `urgency` of each.
3. IF the Report_Model has no Open_Escalation, THEN THE Ground_Report SHALL show the text "No open escalations."
4. THE Ground_Report SHALL label the actions shown for Active_Alerts as "Recommended action" and SHALL NOT state that an action was completed.

### Requirement 5: Last readings in the window

**User Story:** As a ground flight surgeon, I want the latest value of each indicator with its time and unit, so that I can check the numbers behind each status.

#### Acceptance Criteria

1. THE Report_Builder SHALL include a Reading in the Report_Window when `now - 604800000 <= timestamp <= now`.
2. THE Report_Builder SHALL return, for each Domain and indicator that has at least one Reading in the Report_Window, one Last_Reading holding the Reading with the greatest `timestamp`, and the latest Reading supplied last for equal `timestamp`.
3. THE Ground_Report SHALL show, for each Last_Reading, the Module_Label, the indicator label, the value, the unit and the Reading time as a local date and time.
4. WHERE an Indicator_Rule supplies a `label`, THE Ground_Report SHALL show that label, and otherwise THE Ground_Report SHALL show the `indicator` string.
5. IF a Reading has a `timestamp` outside the Report_Window, THEN THE Report_Builder SHALL leave that Reading out of the Last_Reading rows.
6. IF no Reading falls inside the Report_Window, THEN THE Ground_Report SHALL show the text "No readings in the last 7 days."

### Requirement 6: Simulated and generated labels

**User Story:** As a ground flight surgeon, I want to see that the data is simulated and when the report was made, so that I do not mistake it for a medical record.

#### Acceptance Criteria

1. THE Ground_Report SHALL show the Simulated_Line with the exact text "All data in this report is simulated. Decision support, not a medical device."
2. THE Ground_Report SHALL show the Simulated_Line on screen and in print, with no control that hides it.
3. THE Ground_Report SHALL show the Generated_Timestamp and the Report_Window start and end as local dates and times.
4. THE Ground_Report_Screen SHALL take `now` as a prop supplied by the application and SHALL NOT read the system clock inside the Report_Builder.
5. THE Ground_Report SHALL show the product name "Driftwatch" and the title "Ground report", and SHALL contain no NASA logo, no NASA branding and no photograph of a person.

### Requirement 7: Empty and partial data

**User Story:** As an astronaut, I want the report to still open when some modules have no data, so that I can send what exists.

#### Acceptance Criteria

1. IF the Alerts list is empty, THEN THE Ground_Report SHALL show "No data" as the status of every module and SHALL still show the Simulated_Line and the Generated_Timestamp.
2. IF a Domain has no Alert, THEN THE Ground_Report SHALL show "No data" for that Domain in place of its Status_Label and urgency.
3. IF the Alerts or Readings supplied are not arrays, THEN THE Report_Builder SHALL treat them as empty lists and SHALL return a Report_Model without throwing.
4. IF a Reading has a non-finite `timestamp` or a non-numeric `value`, THEN THE Report_Builder SHALL leave that Reading out of the Report_Model.
5. WHILE the application data is loading, THE Ground_Report_Screen SHALL show the text "Loading data" and SHALL disable the Print_Button.

### Requirement 8: Fit on one page with capped lists

**User Story:** As an astronaut, I want the report to fit on one page, so that the ground team gets a single sheet.

#### Acceptance Criteria

1. THE Report_Builder SHALL limit each Domain's listed Active_Alerts to 6, and the Last_Reading rows to 12 in total, in order of the most recent Reading time first.
2. WHEN the number of Active_Alerts of a Domain exceeds 6, THE Ground_Report SHALL show the line "and N more" for that Domain, where N is the number not listed.
3. WHEN the number of Last_Reading rows exceeds 12, THE Ground_Report SHALL show the line "and N more readings" where N is the number not listed.
4. WHEN any list is capped, THE Ground_Report SHALL show the text "Lists are shortened to fit one page. Open the dashboard for the full detail."
5. THE Report_Builder SHALL always list every Open_Escalation, so that a cap never hides an escalation.
6. THE Report_Model SHALL contain the total counts and the listed counts of Active_Alerts and Last_Reading rows, so that the capping is testable.

### Requirement 9: Print or Save as PDF

**User Story:** As an astronaut, I want a button that prints the report or saves it as a PDF, so that I can send it when the link opens.

#### Acceptance Criteria

1. THE Ground_Report_Screen SHALL show a Print_Button labelled "Print or Save as PDF".
2. WHEN the Print_Button is activated, THE Ground_Report_Screen SHALL call `window.print()`.
3. THE Print_Button SHALL be reachable by the Tab key and activated by Enter and Space, with a visible focus outline and a touch target of at least 44 by 44 CSS pixels.
4. THE Print_Stylesheet SHALL hide the navigation, the Print_Button and every other control, and SHALL leave the Ground_Report visible.
5. THE Print_Stylesheet SHALL fit the Ground_Report on one A4 or Letter page, with a base text size of at least 9 pt.
6. THE Print_Stylesheet SHALL render on a white background with black text, and SHALL not depend on colour to carry meaning.
7. THE Ground_Report SHALL show each status as the Status_Label text, with a distinct icon shape for Normal, Watch and Act, so that the status is readable in a black and white print.
8. THE Ground_Report SHALL set a title for the printed document that contains "Driftwatch ground report".

### Requirement 10: Works offline and accessible

**User Story:** As an astronaut far from Earth, I want the report to work with no network, so that I can produce it at any time.

#### Acceptance Criteria

1. THE Ground_Report_Screen SHALL build and show the Ground_Report with the network off, making no network request.
2. THE Ground_Report_Screen SHALL use a system font stack and bundled assets only, with no remote font, script, stylesheet or image.
3. WHEN the application loads with the network off, THE Ground_Report_Screen SHALL remain reachable from the application navigation.
4. THE Ground_Report_Screen SHALL use headings in a logical order and a text label on every status, and SHALL be operable by keyboard alone.
5. THE Ground_Report_Screen SHALL show all text in English.
6. THE Ground_Report_Screen SHALL reach the Report_Builder through props or a hook in `store/`, and SHALL NOT import Dexie directly from `ui/`.
