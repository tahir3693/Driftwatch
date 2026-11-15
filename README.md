# Driftwatch

**Catch the drift before it becomes a problem.**

Driftwatch is an offline-first early-warning health copilot for astronauts on long missions. It learns each astronaut's personal baseline, watches for slow drift away from it, and raises explainable alerts with one of three statuses: Normal, Watch or Act. Every alert says why it was raised, what to do, and where the limit comes from.

Driftwatch is decision support, not a medical device. All demo data is simulated.

## The challenge

Driftwatch answers the NASA Space Apps Challenge 2026 problem "Create Health Monitoring Software for Astronauts on Space Missions" (brief saved in [docs/nasa-challenge-brief.md](docs/nasa-challenge-brief.md)).

On long missions astronauts face the five hazards of human spaceflight that NASA's Human Research Program describes:

- space radiation
- isolation and confinement
- distance from Earth
- altered gravity
- hostile closed environments

These hazards can lead to bone loss, cardiovascular changes, immune changes, poor nutrition and behavioural health problems. Far from Earth, crews must spot these changes themselves and decide when a result needs the flight surgeon. The challenge asks for a visual tool that helps astronauts assess their own health and act on it.

## Features by hazard

| Hazard | What Driftwatch watches | Notes |
|---|---|---|
| **Radiation** | Career dose as a share of the NASA career effective dose requirement; possible radiation symptoms from the check-in; solar proton flux | Proton flux steps follow the **NOAA** S-scale. The radiation engine was written by a teammate. |
| **Isolation and confinement** | Sleep, mood and stress (0 to 10), a 60-second reaction check, and social contact | Two or more signs at Watch for 2 days raise a combined strain alert at Act, with escalation. The Isolation module was written by a teammate. |
| **Altered gravity** | Exercise sessions per week, resting heart rate, blood pressure drop on standing, orthostatic symptoms, and a bone note when food intake is low | The **BMD and strength tracker** (written by a teammate) adds hip and spine BMD and lift strength as a share of baseline, plus missed training days. It opens from the Bones and muscles view. |
| **Hostile closed environment** | Cabin CO2 (1-hour and 7-day averages), a CO2 symptom check, body temperature and sleep | A temperature rise together with short sleep for 3 days raises a possible infection-like pattern. |
| **Nutrition** | Food intake against plan and vitamin D | Driftwatch never tells anyone to take supplements. |
| **Distance from Earth** | Works with no network | All data stays on the device. A daily check-in with a streak keeps the routine going. A one-page ground report, printable to PDF, is ready for the next contact with the ground. |

Screens:

- **Dashboard:** a drawn body map with three clickable regions: Head and lungs, Bones and muscles, Whole body. Each region shows a status word, a colour and a shape. Its detail view shows each alert's why, action, how to measure, why it matters, source and a trend chart.
- **Scenario player:** plays a shared, simulated 14-day mission day by day. For example, Radiation reaches Act at urgency 63 on day 11, and Isolation shows combined strain on day 12.
- **Check-in:** one short form per module.
- **Ground report:** one printed page.
- **Sources:** every NASA and NOAA source the app uses.

## How it works

1. **Personal baseline.** For each indicator Driftwatch computes the astronaut's own mean and spread from earlier readings. It never includes the reading being judged. A new value is compared with that baseline as a z-score. Slow drift is caught even inside the normal range.
2. **Bands as data.** Each module keeps its limits in `rules.json`, with `normal`, `watch` and `act` bands. Every limit names its source, or says `"design value"` when the team chose it.
3. **Urgency and status.** Each alert gets an urgency from 0 to 100. Shared cut-offs turn urgency into a status: Watch from 30, Act from 60. An alert escalates at 60 or more, and the app then says "Escalate: contact the flight surgeon or crew support."
4. **The alert contract.** Every module returns the same ten fields for every alert:

   | Field | Meaning |
   |---|---|
   | `domain`, `indicator` | Which module and which measurement |
   | `value`, `baseline` | The current value and the astronaut's own baseline |
   | `status`, `urgency` | `normal`, `watch` or `act`, and 0 to 100 |
   | `why` | The reason, in plain words. A health effect is always called "possible". |
   | `action` | What to do. Act alerts always refer to the flight surgeon. |
   | `escalate` | Whether to contact the flight surgeon or crew support now |
   | `source` | The NASA or NOAA document behind the limit, or `"design value"` |

   Each module also returns one `<domain>_overall` alert, which the body map uses for its region colours.

## NASA data and sources

| Source | Publisher | Used for |
|---|---|---|
| [NASA-STD-3001 Volume 1, Crew Health](https://www.nasa.gov/reference/nasa-std-3001v1/) (cited as Rev B; Rev C is now current) | NASA | Career effective dose requirement (V1 4030). The reference solar particle event design requirement (V1 4031) is shown as context only. |
| [OCHMO-TB-020 Radiation Protection](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf) | NASA | NASA-STD-3001 career dose requirement, as summarised in the technical brief |
| [OCHMO-TB-004 Carbon Dioxide](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf) | NASA | 3 mmHg 1-hour average and 2.5 mmHg 7-day average for cabin CO2 |
| [OCHMO-TB-030 Bone Loss](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-030-bone-loss.pdf) | NASA | 6 to 7 exercise sessions a week, the 95% of baseline hip and spine BMD limit, and the vitamin D range |
| [Behavioral Challenges of a Mars Mission (NTRS)](https://ntrs.nasa.gov/citations/20240010442) | NASA | Context for sleep, stress ratings, the reaction check and scheduled contact. The Isolation limits are design values. |
| [DONKI, Space Weather Database Of Notifications, Knowledge, Information](https://kauai.ccmc.gsfc.nasa.gov/DONKI/) | NASA (CCMC) | A saved sample of solar energetic particle events from May to June 2024, in `driftwatch/data/nasa/donki-sep-sample.json`. The app shows it as a space weather context line (Head and lungs detail, Ground report under Radiation) and adds the latest event to the why text of the solar proton flux alert. DONKI SEP gives no flux or dose, so it is context only and never scored. The saved file holds the plain address, with no api_key. |
| [Space Weather Scales: Solar Radiation Storms (S-scale)](https://www.swpc.noaa.gov/noaa-scales-explanation) | **NOAA** | Solar proton flux steps S1 to S5. How the steps map to points is a Driftwatch prototype, not a NOAA value. |
| [GOES Proton Flux](https://www.swpc.noaa.gov/products/goes-proton-flux) | **NOAA** | The flux indicator uses the same quantity and unit (pfu). Scenario flux values are simulated. |

More NASA technical briefs are listed on the [OCHMO technical briefs page](https://www.nasa.gov/ochmo/hsa-standards/ochmo-technical-briefs/). The same list is in the app under **Sources**.

## Run it

You need a current Node.js LTS release. From the repository root:

```bash
cd driftwatch
npm install
npm run dev        # development server
npm run test:run   # full test suite, once
npm run build      # production build in driftwatch/dist
```

No key is needed. The deployed build uses no key and always uses the saved DONKI sample. driftwatch/.env.example shows the one optional setting, `VITE_NASA_API_KEY`. Copy it to `.env` only if you want a live DONKI request: it is made only when a key is set and the browser is online, stops after 5 seconds, and falls back to the saved sample on any failure. Never commit a `.env` file. Any `VITE_` value is built into the browser code, so anyone using the site can read it.

## Offline use

The production build is a Progressive Web App. Rules, the scenario and every screen are cached on the device.

1. Run `npm run build`, then `npm run preview`, or deploy `driftwatch/dist`.
2. Open the app once while online and wait for the indicator to say **Offline ready**.
3. From then on, Driftwatch works with no network, including after a reload. Readings and check-ins are stored in the browser (IndexedDB). The BMD and strength tracker keeps its own data in the browser too (localStorage).

The development server (`npm run dev`) does not register the service worker, so it is not offline-ready.

## Limits

- **Decision support, not a medical device.** Driftwatch does not diagnose. It points to possible problems and tells the astronaut when to contact the flight surgeon.
- **Simulated data.** Every value in the demo is simulated and labelled "Simulated".
- **Design values.** Many limits and all scoring weights are design values chosen by the team, not clinical thresholds. Each one is marked in its `rules.json`.
- **One device.** Data is stored on one device and in one browser. There is no backend and no sync.

## Team

- Muhammad Tahir (core engine, dashboard, check-in, ground report and integration)
- Sunaina Babar (Isolation module)
- Luis (BMD and strength tracker)

The radiation engine was written by a teammate. See [AI_DISCLOSURE.md](AI_DISCLOSURE.md) for what was made with AI assistance.

## Licence

No licence has been chosen yet. Until a `LICENSE` file is added, the code is not open for reuse. NASA documents and data linked above remain under their own terms. Most NASA material is in the US public domain.
