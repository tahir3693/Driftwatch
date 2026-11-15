# Requirements Document

## Introduction

This spec covers the Driftwatch dashboard: the screen an astronaut uses to see, at a glance, which parts of the body need attention and why. It consists of a drawn body map, an alert card, a trend chart per indicator, a help panel per indicator and a permanent disclaimer banner. The dashboard reads Alerts and Readings produced by the core (see `.kiro/specs/core/`) and rules text from each module's `rules.json`. It adds no new engine logic.

Code lives in `driftwatch/src/ui/` as `BodyMap`, `TrendChart`, `AlertCard`, `HelpPanel` and shared components (such as a status badge and the disclaimer banner). The stack is React with Vite, JavaScript only, Tailwind CSS, Chart.js through react-chartjs-2, and Vitest. The dashboard needs no backend and no network at runtime. All text is English, there are no NASA logos or branding, and there are no photos of people. All demo data is simulated and labelled "Simulated".

Assumptions (to be fixed in the design):

1. The body map has three clickable Body_Regions: Head_And_Lungs, Bones_And_Muscles and Whole_Body. The design will fix which domains and indicators belong to each region. The working assumption is that Head_And_Lungs covers radiation and environment indicators, Bones_And_Muscles covers gravity indicators, and Whole_Body covers isolation, nutrition and system indicators.
2. The personal baseline band on a trend chart is the baseline mean plus and minus one standard deviation, taken from the core Baseline for that indicator. The design may change the band width.
3. Alert text (`why`, `action`, `source`) is shown exactly as the core and `rules.json` supply it. The dashboard does not rewrite it.
4. The dashboard receives Alerts, Readings and rules data from the application state. It does not call the engine itself or talk to Dexie directly. The design will decide the data-passing interface.
5. "Phone width" means 360 CSS pixels and "laptop width" means 1280 CSS pixels.
6. The dashboard shows the indicator `label`, `howToMeasure`, `whyItMatters` and `action` fields defined in each `rules.json`.

## Glossary

- **Dashboard**: The Driftwatch screen made up of the Disclaimer_Banner, the Body_Map, the Alert_Card, the Trend_Chart and the Help_Panel.
- **Body_Map**: The `BodyMap` component, a simple drawn human figure in SVG with clickable Body_Regions.
- **Body_Region**: A clickable area of the Body_Map. The three Body_Regions are Head_And_Lungs, Bones_And_Muscles and Whole_Body.
- **Region_Status**: The status of a Body_Region, equal to the highest status among the Alerts of the indicators mapped to that Body_Region, where `act` ranks above `watch` and `watch` ranks above `normal`.
- **Region_Mapping**: The data that assigns each Domain and indicator to one Body_Region.
- **Status_Label**: The capitalised text "Normal", "Watch" or "Act" shown for a status.
- **Status_Badge**: The shared component that shows a Status_Label together with a colour and an icon shape.
- **Alert**: An object with exactly the fields `domain`, `indicator`, `value`, `baseline`, `status`, `urgency`, `why`, `action`, `escalate`, `source`, as defined by the core spec.
- **Alert_Card**: The `AlertCard` component that shows one Alert in full.
- **Escalation_Notice**: The text shown on an Alert_Card when `escalate` is true, advising contact with the flight surgeon or crew support.
- **Trend_Chart**: The `TrendChart` component, a Chart.js line chart of one indicator's Readings over time with the Baseline_Band.
- **Baseline_Band**: The shaded range on a Trend_Chart that shows the personal baseline of the astronaut for that indicator.
- **Help_Panel**: The `HelpPanel` component that explains one indicator.
- **Indicator_Rule**: The entry for one indicator in a module's `rules.json`, with `label`, `howToMeasure`, `whyItMatters`, `action` and `source`.
- **Disclaimer_Banner**: The permanent banner that reads "Simulated data. Decision support, not a medical device."
- **Selected_Region**: The Body_Region the astronaut most recently activated on the Body_Map.
- **Reference_Dose_Text**: The wording "NASA design requirement for a reference solar particle event", used whenever the Dashboard mentions the 250 mSv value.
- **Phone_Width**: A viewport 360 CSS pixels wide.
- **Laptop_Width**: A viewport 1280 CSS pixels wide.

## Requirements

### Requirement 1: Permanent disclaimer banner

**User Story:** As an astronaut, I want to see on every screen that the data is simulated and that Driftwatch is decision support, so that I never mistake the Dashboard for a medical device.

#### Acceptance Criteria

1. THE Dashboard SHALL display the Disclaimer_Banner with the exact text "Simulated data. Decision support, not a medical device."
2. THE Dashboard SHALL keep the Disclaimer_Banner visible at Phone_Width and at Laptop_Width without any user action to reveal it.
3. THE Dashboard SHALL NOT provide a control that hides or dismisses the Disclaimer_Banner.
4. THE Dashboard SHALL label each Alert_Card, Trend_Chart and Body_Map that shows demo data with the word "Simulated".

### Requirement 2: Drawn body map with status regions

**User Story:** As an astronaut, I want a simple drawn body with coloured regions, so that I can see at a glance which area needs attention.

#### Acceptance Criteria

1. THE Body_Map SHALL render a simple human figure as inline SVG drawing, using no photographic or raster image of a person.
2. THE Body_Map SHALL provide exactly three clickable Body_Regions: Head_And_Lungs, Bones_And_Muscles and Whole_Body.
3. THE Body_Map SHALL fill each Body_Region with a colour that corresponds to its Region_Status.
4. THE Body_Map SHALL show, next to each Body_Region, a visible text with the region name and its Status_Label, so that the status is never conveyed by colour alone.
5. THE Body_Map SHALL derive each Region_Status from the Alerts of the indicators that the Region_Mapping assigns to that Body_Region.
6. WHEN the Alerts supplied to the Body_Map change, THE Body_Map SHALL update the colour and Status_Label of every affected Body_Region.
7. IF a Body_Region has no Alert, THEN THE Body_Map SHALL show the text "No data" for that Body_Region and use a neutral colour that is different from the Normal, Watch and Act colours.
8. THE Body_Map SHALL read the Region_Mapping from a data file, not from constants in the component body.

### Requirement 3: Region status is the highest alert status

**User Story:** As an astronaut, I want a region to show its worst current status, so that a problem is never hidden behind a better reading in the same region.

#### Acceptance Criteria

1. WHEN a Body_Region has one or more mapped Alerts, THE Body_Map SHALL set the Region_Status to the highest status among those Alerts, where `act` ranks above `watch` and `watch` ranks above `normal`.
2. WHEN any Alert mapped to a Body_Region has `escalate` set to true, THE Body_Map SHALL show the text "Escalate" next to that Body_Region.
3. FOR ALL sets of Alerts mapped to a Body_Region, adding an Alert with a lower or equal status SHALL leave the Region_Status unchanged (invariant property).
4. FOR ALL sets of Alerts mapped to a Body_Region, the order in which the Alerts are supplied SHALL NOT change the Region_Status (order-independence property).

### Requirement 4: Keyboard and screen-reader access to regions

**User Story:** As an astronaut using a keyboard or a screen reader, I want to reach and activate every body region, so that the Dashboard works without a pointer.

#### Acceptance Criteria

1. THE Body_Map SHALL make each Body_Region focusable with the Tab key in a fixed order: Head_And_Lungs, Bones_And_Muscles, Whole_Body.
2. WHEN a Body_Region has keyboard focus and the Enter key or the Space key is pressed, THE Body_Map SHALL select that Body_Region in the same way as a click.
3. THE Body_Map SHALL give each Body_Region an accessible name in the form "<region name>: <Status_Label>", for example "Head and lungs: Watch".
4. WHEN a Body_Region is the Selected_Region, THE Body_Map SHALL mark it as selected for assistive technology and show a visible selection outline.
5. WHILE a Body_Region has keyboard focus, THE Body_Map SHALL show a visible focus outline with a contrast ratio of at least 3:1 against the adjacent colours.
6. WHEN the Selected_Region changes, THE Dashboard SHALL announce the new Alert_Card content to assistive technology through a polite live region.

### Requirement 5: Alert card for the selected region

**User Story:** As an astronaut, I want to click a region and read why it has its status and what to do, so that I can act on the early warning.

#### Acceptance Criteria

1. WHEN a Body_Region is clicked, THE Dashboard SHALL show an Alert_Card for each Alert mapped to that Body_Region, ordered by `urgency` from highest to lowest.
2. THE Alert_Card SHALL show the indicator `label`, the Status_Badge with the Status_Label, the `urgency` value, the `why` text, the `action` text and the `source` text of its Alert.
3. THE Alert_Card SHALL show `value` and `baseline` of its Alert, and WHEN `baseline` is null, THE Alert_Card SHALL show the text "Baseline not ready" in place of the baseline value.
4. WHEN the `escalate` field of an Alert is true, THE Alert_Card SHALL show the Escalation_Notice with the text "Escalate: contact the flight surgeon or crew support."
5. WHEN the `escalate` field of an Alert is false, THE Alert_Card SHALL show no Escalation_Notice.
6. THE Alert_Card SHALL show the `why`, `action` and `source` strings exactly as supplied by the Alert, without changing or adding diagnostic wording.
7. WHERE the `source` of an Alert is "design value", THE Alert_Card SHALL show the text "design value" as the source.
8. WHEN no Body_Region has been selected, THE Dashboard SHALL show the text "Select a body region to see its alerts."
9. IF the Selected_Region has no mapped Alert, THEN THE Dashboard SHALL show the text "No alerts for this region yet."

### Requirement 6: Trend chart with personal baseline band

**User Story:** As an astronaut, I want to see how an indicator has moved against my own normal, so that I notice a drift before a limit is crossed.

#### Acceptance Criteria

1. THE Trend_Chart SHALL draw one line chart per indicator, with time on the horizontal axis and the indicator value on the vertical axis labelled with the `unit` from the Indicator_Rule.
2. THE Trend_Chart SHALL draw the Baseline_Band as a shaded range together with a text legend entry "Your baseline".
3. WHEN the Alert for the indicator has a non-null `baseline`, THE Trend_Chart SHALL draw the Baseline_Band around that baseline value.
4. IF the Alert for the indicator has a null `baseline`, THEN THE Trend_Chart SHALL draw the Readings without a Baseline_Band and show the text "Baseline not ready".
5. THE Trend_Chart SHALL mark the latest Reading with a point style that differs from the other Readings and show the Status_Label of the latest Alert next to the chart title.
6. THE Trend_Chart SHALL provide a text alternative that states the indicator label, the latest value, the baseline value and the Status_Label.
7. IF no Readings exist for the indicator, THEN THE Trend_Chart SHALL show the text "No readings yet" in place of the chart.
8. THE Trend_Chart SHALL render using Chart.js code bundled with the application, with no network request.

### Requirement 7: Help panel per indicator

**User Story:** As an astronaut, I want a short explanation for each indicator, so that I know how to measure it, why it matters and what to do.

#### Acceptance Criteria

1. WHEN an Alert_Card is shown, THE Dashboard SHALL provide a control on it that opens the Help_Panel for the indicator of that Alert.
2. THE Help_Panel SHALL show the indicator `label`, the `howToMeasure` text, the `whyItMatters` text, the `action` text and the `source` text from the Indicator_Rule, each under a visible heading "How to measure", "Why it matters", "What to do" and "Source".
3. WHEN the Help_Panel is open and the Escape key is pressed, THE Help_Panel SHALL close and return keyboard focus to the control that opened it.
4. WHEN the Help_Panel opens, THE Help_Panel SHALL move keyboard focus into the panel.
5. IF an indicator has no Indicator_Rule text for a section, THEN THE Help_Panel SHALL show the text "Not available" under that heading.
6. THE Help_Panel SHALL show the Indicator_Rule text exactly as supplied by the `rules.json`, without added diagnostic wording.

### Requirement 8: Wording rules for radiation and diagnosis

**User Story:** As an astronaut, I want wording that never claims a diagnosis and never misstates a radiation limit, so that I trust the Dashboard.

#### Acceptance Criteria

1. THE Dashboard SHALL show Alert and Indicator_Rule text only from the Alerts and `rules.json` files supplied, and add no diagnostic wording of its own.
2. WHEN the Dashboard mentions the 250 mSv value in its own text, THE Dashboard SHALL describe it only as "NASA design requirement for a reference solar particle event".
3. THE Dashboard SHALL NOT describe the 250 mSv value as a limit, a threshold or a per-event dose limit in text that the Dashboard itself writes.
4. WHEN the Dashboard shows the 600 mSv value in its own text, THE Dashboard SHALL describe it as the NASA career effective dose requirement.
5. THE Dashboard SHALL write its own labels and messages in English.

### Requirement 9: Responsive layout for phone and laptop

**User Story:** As an astronaut, I want the Dashboard to be readable on a phone and a laptop, so that I can use whichever device is at hand.

#### Acceptance Criteria

1. WHILE the viewport is Phone_Width, THE Dashboard SHALL arrange the Disclaimer_Banner, the Body_Map, the Alert_Card, the Trend_Chart and the Help_Panel in a single column with no horizontal scrolling of the page.
2. WHILE the viewport is Laptop_Width, THE Dashboard SHALL show the Body_Map and the Alert_Card side by side in two columns.
3. THE Dashboard SHALL give every interactive control, including each Body_Region, a touch target of at least 44 by 44 CSS pixels.
4. THE Dashboard SHALL set body text to at least 16 CSS pixels at Phone_Width.
5. WHEN the viewport width changes between Phone_Width and Laptop_Width, THE Trend_Chart SHALL resize to the width of its container without a page reload.

### Requirement 10: Contrast and colour independence

**User Story:** As an astronaut with reduced colour vision or in poor lighting, I want strong contrast and text labels, so that I can read every status.

#### Acceptance Criteria

1. THE Dashboard SHALL render text with a contrast ratio of at least 4.5:1 against its background.
2. THE Dashboard SHALL render the Body_Region outlines, the Status_Badge shapes and the chart lines with a contrast ratio of at least 3:1 against their background.
3. THE Status_Badge SHALL combine the Status_Label text, a colour and a distinct icon shape for each of Normal, Watch and Act.
4. THE Dashboard SHALL define the Normal, Watch and Act colours in one shared style definition used by the Body_Map, the Status_Badge and the Trend_Chart.

### Requirement 11: Offline operation and local data

**User Story:** As an astronaut far from Earth, I want the Dashboard to work with no network, so that I can use it when the link to the ground is down.

#### Acceptance Criteria

1. WHILE Offline, THE Dashboard SHALL render the Body_Map, the Alert_Card, the Trend_Chart and the Help_Panel from data held on the device.
2. THE Dashboard SHALL make no network request while rendering, including no web font, image, script or style loaded from a remote address.
3. IF the Alerts are not yet available when the Dashboard first renders, THEN THE Dashboard SHALL show the text "Loading data" and show every Body_Region as "No data" until the Alerts arrive.

### Requirement 12: Component structure and tests

**User Story:** As a developer, I want the Dashboard built from small shared components with tests, so that it is easy to verify and reuse.

#### Acceptance Criteria

1. THE Dashboard SHALL implement `BodyMap`, `TrendChart`, `AlertCard` and `HelpPanel` as separate React components in `driftwatch/src/ui/`.
2. THE Dashboard SHALL implement the Region_Status computation as a pure function with no React or DOM import.
3. THE Dashboard test suite SHALL include a Vitest test for the Region_Status function that covers the invariant and order-independence properties of Requirement 3.
4. THE Dashboard test suite SHALL include Vitest component tests that check, for each of Normal, Watch and Act, that the Body_Map shows the Status_Label text and the accessible name for a Body_Region.
5. THE Dashboard test suite SHALL include Vitest component tests for the Alert_Card that check the Escalation_Notice appears when `escalate` is true and is absent when `escalate` is false.
6. WHEN `vitest --run` is executed in `driftwatch/`, THE Dashboard test suite SHALL complete with zero failing tests.
