# Driftwatch: development plan

Driftwatch is an offline-first early-warning health copilot for astronauts on long missions (NASA Space Apps 2026). It builds a personal baseline per astronaut and raises explainable alerts with a reason, an action and a source. It is decision support, not a medical device. All demo data is simulated and labelled "Simulated" in the UI.

Tagline: "Catch the drift before it becomes a problem."

## Stack and rules

- React + Vite (JavaScript), Tailwind CSS, Chart.js via react-chartjs-2, Dexie (IndexedDB), vite-plugin-pwa, Vitest.
- No backend. The app must work with the network off.
- All UI text in English. No NASA logos or branding. No photos of people (the body map is a drawing).
- Never read, print or commit an API key. Keys go in `.env` (git-ignored) only.

## Repo structure

```text
driftwatch/
  docs/                    build-plan.md, development-plan.md, NASA brief, sources
  data/nasa/               saved NASA data files with source URL and download date
  src/
    engine/                computeBaseline, evaluate, urgency, patterns (pure functions)
    sim/                   scenario.js: one shared 14-day scenario
    store/                 Dexie database
    ui/                    BodyMap, TrendChart, AlertCard, HelpPanel, StatusBadge
    report/                one-page ground report
    modules/
      radiation/           radiation-engine.js (teammate), index.js, rules.json
      isolation/           teammate code, index.js, rules.json
      gravity/             rules.json, forms
      environment/         rules.json, forms
      nutrition/           rules.json, forms
  tests/
  AI_DISCLOSURE.md
```

## Names (final)

| Module | `domain` value and folder |
| --- | --- |
| Radiation | `radiation` |
| Isolation | `isolation` |
| Altered gravity | `gravity` |
| Closed environment | `environment` |
| Nutrition (cross-cutting) | `nutrition` |
| Offline mode and ground report | `system` |

Status values and band keys are the same three lower-case words: `normal`, `watch`, `act`. The UI capitalises them for display and always shows the word as well as the colour.

## Alert contract

Each module returns one object per indicator plus one overall object named `<domain>_overall`. Every object has exactly these fields:

```json
{
  "domain": "environment",
  "indicator": "cabin_co2_mmHg",
  "value": 2.7,
  "baseline": 1.9,
  "status": "watch",
  "urgency": 42,
  "why": "7-day average is above 2.5 mmHg and a headache was logged.",
  "action": "Move to open airflow, check fans, re-test in an hour.",
  "escalate": false,
  "source": "NASA OCHMO-TB-004 (CO2 technical brief)"
}
```

Shared urgency cut-offs for every module (from the Radiation prototype, design values): `normal` below 30, `watch` 30 to 59, `act` 60 and above. An alert with `urgency` in the act band sets `escalate` to true.

## rules.json shape

Limits are data, not code. Every limit has a `source`, or the value `"design value"` when it is our own rule.

```json
{
  "module": "isolation",
  "urgency": { "watch_from": 30, "act_from": 60, "source": "design value" },
  "indicators": {
    "sleep_hours": {
      "label": "Sleep", "unit": "h", "bad_direction": "low",
      "bands": {
        "normal": { "z_min": -1.0 },
        "watch":  { "z_min": -2.0, "z_max": -1.0 },
        "act":    { "z_max": -2.0 }
      },
      "why": "Sleep is {delta} {unit} below your usual.",
      "action": "Protect a full sleep period tonight.",
      "howToMeasure": "Log the hours you slept this morning.",
      "whyItMatters": "Short sleep slows reactions and lowers mood.",
      "source": "design value"
    }
  },
  "patterns": {
    "combined_strain": {
      "needs": ["sleep_hours", "mood", "reaction_ms", "social_contact"],
      "min_in_watch": 2, "for_days": 2,
      "result": "act", "escalate": true,
      "why": "Several signs of strain together for 2 days.",
      "action": "Contact the flight surgeon or crew support.",
      "source": "design value"
    }
  }
}
```

## Engine functions

- `computeBaseline(readings, windowDays)` returns mean and standard deviation (needs at least 5 readings).
- `evaluate(rule, readings)` returns a status using z-scores, EWMA or CUSUM drift, and the fixed bands.
- `urgency(alert, context)` returns 0 to 100 using the shared cut-offs.
- `patterns(alerts)` raises combined alerts defined in rules.json.

A module can also be a plain function that returns the alert contract (the Radiation and Isolation teammates' code is wrapped this way, not rewritten).

## Milestones (solo, from Saturday 19:00 Pakistan time)

| Milestone | When | What | Done when |
| --- | --- | --- | --- |
| M1 Foundations | Sat 19:00 to 24:00 | Repo, steering files, core spec, engine, store, shared UI skeleton | `npm run dev` runs; an engine test passes |
| M2 Modules | Sun 08:00 to 12:00 | Wrap Radiation and Isolation; rules for environment, gravity, nutrition | Each module returns a status, why and action |
| M3 Screens | Sun 12:00 to 15:00 | Body map, trend charts, alert cards, check-ins, help panel, ground report | Clicking a region shows why and what to do |
| M4 Offline and data | Sun 15:00 to 17:00 | PWA offline, NASA data, shared scenario, tests, deploy | Works with the network off; live link |
| M5 Submit | Sun 17:00 to 20:00 | AI disclosure, README, demo, project page, Submit for Judging | Confirmation banner |

Cut in this order if behind: live DONKI feed, gravity and nutrition screens (keep their rules), offline install step. Never cut the demo, the AI disclosure or the submission.

## Module task lists

**Shared core**
- [ ] Freeze the reading, rule and alert shapes
- [ ] Engine with baseline, bands, urgency and patterns
- [ ] Body map with clickable regions and Normal, Watch, Act colours plus text
- [ ] Trend chart with baseline band, alert card, help panel
- [ ] Dexie store, offline mode, ground report

**Radiation** (teammate's `radiation-engine.js`, wrapped)
- [ ] ES-module wrapper only; keep numbers and logic
- [ ] Rename `speLimit_mSv` to `speDesignRef_mSv`; describe 250 mSv as a NASA design requirement for a reference solar particle event
- [ ] One action text per indicator
- [ ] Tests: day 11 gives urgency 63, status `act`, escalate true

**Isolation** (teammate's module, wrapped)
- [ ] Return the contract with domain `isolation` plus `isolation_overall`
- [ ] rules.json with sleep, mood, reaction, social contact and the combined strain pattern
- [ ] Wording says "strain" and suggests the flight surgeon or crew support; no diagnostic words

**Altered gravity**
- [ ] Exercise log against the 6 to 7 sessions a week target
- [ ] Heart rate and blood pressure sitting and standing, orthostatic symptom check
- [ ] Bone and muscle risk indicator shown as a risk, never a measurement

**Closed environment**
- [ ] CO2 input and trend with the NASA bands
- [ ] Symptom check (headache, vision, cough, fatigue)
- [ ] Infection-like pattern (temperature up, sleep down)

**Nutrition**
- [ ] Intake as a percentage of the planned menu, fluids, supplements taken
- [ ] Low intake feeds the gravity bone note and the isolation and environment alerts as an extra reason

## Shared 14-day scenario

One file, `sim/scenario.js`, read by every module. Reuse the teammates' day-by-day inputs.

| Day | What happens | Expected alert |
| --- | --- | --- |
| 1 to 3 | Baselines form; all readings normal | All normal |
| 4 | CO2 creeps up; exercise sessions drop | Trends bend, no alert |
| 6 | Headache logged, reaction slows, sleep shortens | Environment and Isolation watch |
| 8 | Intake falls below plan | Nutrition watch, bone note in gravity |
| 9 | Temperature up, sleep stays low; proton flux 60 pfu (S1) | Infection-like pattern flagged |
| 10 | Flux 400 pfu (S2); fatigue logged | Radiation score rising |
| 11 | Flux 1,500 pfu (S3); nausea, skin redness, vomiting | Radiation act, urgency 63, escalate |
| 12 | Storm eases to 300 pfu; strain signs for 2 days | Isolation combined strain, escalate |
| 13 to 14 | Flux 40 then 12 pfu; nausea and fatigue persist; link opens on day 14 | One-page ground report |

## Working agreements

- Commit after every finished task; keep `main` working.
- Each module edits only its own `modules/<name>/` folder; shared folders change only on purpose.
- Tests: Vitest for the engine and each module; a scenario test for the 14-day run; a manual check with the network off.
- Every alert and action wording is reviewed so nothing reads as a diagnosis.

## Definition of done

- [ ] Loads, takes input and shows alerts with the network off
- [ ] Each of the four hazard modules has an input, a chart and an alert with a why and an action
- [ ] Body map changes colour with a text label for each state
- [ ] Nutrition feeds at least one other module's alert
- [ ] One-page ground report exports
- [ ] Help text explains how to measure and why it matters for each indicator
- [ ] Every limit shows its source; disclaimer says decision support, simulated data
- [ ] AI disclosure, README and demo (30 seconds of video or 7 slides) published; project page submitted
