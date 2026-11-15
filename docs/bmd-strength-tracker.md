# BMD and strength tracking tool

Vanilla JavaScript, HTML and CSS. No npm installation or build step required.

## Run

Extract this ZIP. In the bmd-strength-tracker folder, run:

    python -m http.server 8000

On Windows, you can also use:

    py -m http.server 8000

Then open http://localhost:8000. Alternatively, use VS Code Live Server.

## Included

- index.html: page structure
- style.css: styles and responsive layout
- app.js: storage, forms, graphs, tooltips, workout checklist and alerts

## Features

- Four baseline measurements and individual dated records, with edit/delete.
- Four independent graphs with nearest-record hover tooltips and keyboard navigation.
- BMD axes: 80–110% of baseline. Strength axes: start at 50% of baseline with adaptive maximum.
- Strength reference lines: 80% and 90%. BMD reference lines: 95% and 98%.
- Red below lower line, yellow between lines, green above upper line.
- Latest reading per metric per day on graphs; full measurement history retained.
- Weekly strength/endurance checkboxes, week navigation and persistence.
- Yellow measurement alerts in the configured bands; red Warning below the lower boundaries.
- Yellow training alerts for 2–3 unchecked days per type in the displayed week; red for 4 or more.
- Red alerts take priority. All-clear message when no alerts are active.
- kg/lb display, JSON export and browser-local storage.

## Storage

Records stay in localStorage under the legacy key orbit-journal-v1. The key is retained so existing records survive updates. Data is specific to the browser and site address; the locally served app does not automatically share records with the hosted app. JSON export is available; import is not implemented.

The code retains the previously requested one-time reset: state without resetVersion=1 is cleared on first load, then saved with the marker. Subsequent records persist normally. There is no mission-start date restriction.

The only external asset request is optional Google Fonts; system fonts provide a fallback. The app has no backend or dependencies. Alerts use configured tracking thresholds and do not diagnose health conditions.
