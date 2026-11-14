# Driftwatch: build plan, rules and data sources

Rules and limits for each hazard module. "NASA" means the value comes from the cited NASA document. "Design value" means it is our own rule, to be tuned with the simulator and never presented as NASA guidance. All alerts use the word "possible" and defer to the flight surgeon.

## Hazards to modules

| NASA hazard in the brief | Driftwatch module | Covers | `domain` |
| --- | --- | --- | --- |
| Space radiation | Radiation | Cumulative dose, symptoms, space weather | `radiation` |
| Isolation and confinement | Isolation | Sleep, mood, reaction, social contact | `isolation` |
| Gravity fields | Altered gravity | Bone and muscle, cardiovascular | `gravity` |
| Hostile closed environment | Closed environment | CO2, air, infection-like pattern | `environment` |
| Distance from Earth | Offline mode and ground report | Delayed help, crew autonomy | `system` |
| Inadequate nutrition (a health problem in the brief) | Nutrition log | Feeds bone, immune and mood alerts | `nutrition` |

## Closed environment: CO2 (NASA OCHMO-TB-004, CO2 technical brief)

NASA limits the average one-hour CO2 partial pressure in the habitable volume to no more than 3 mmHg, and a 7-day average below 2.5 mmHg keeps headache incidence under 1%. Earth indoor air is about 0.6 to 0.76 mmHg and ISS readings have ranged from about 1 to 9 mmHg. The Normal, Watch and Act bands below are our mapping of those numbers, not NASA wording.

| Indicator | normal | watch | act | Basis |
| --- | --- | --- | --- | --- |
| Cabin CO2, mmHg | 7-day average below 2.5 and 1-hour average at or below 3 | 7-day average at or above 2.5, or 1-hour average from 2.8 to 3 | 1-hour average above 3, or any reading above 4.5 | NASA numbers; band mapping and 4.5 are design values |
| Symptom check | None logged | Headache or vision change on 2 or more days | Persistent after the suggested action, or nausea with fatigue | Design value; symptoms from the NASA brief |
| Body temperature, sleep | Within your own baseline | More than 2 standard deviations from baseline for 3 days | Rising trend plus other symptoms | Design value |

Note: 3 mmHg is about 3,900 ppm at sea-level pressure. NASA's brief says most CO2 symptoms have not been confirmed in flight and that common in-flight headaches and vision changes are linked mainly to fluid shifts, so phrase alerts as "possible" and keep the escalation advice.

## Radiation (as built by the teammate; see `radiation-engine.js`)

| Item | Value | Source |
| --- | --- | --- |
| Career effective dose | Less than 600 mSv, same for all ages and sexes | NASA-STD-3001 Vol 1 Rev B, requirement V1 4030, via NASA OCHMO-TB-020 Rev E |
| Reference solar particle event | Design requirement: protect the crew from the design reference event to under 250 mSv effective dose. This is a design requirement, not a per-event monitoring limit. | NASA-STD-3001 Vol 1 Rev B, V1 4031 |
| Score weights | dose 40, symptoms 35, space weather 25, capped at 100 | Design value |
| Cut-offs | normal below 30, watch 30 to 59, act 60 and above; escalate at 80% of career dose | Design value |
| Flux steps (10 MeV and above) | 10, 100, 1,000, 10,000, 100,000 pfu for S1 to S5 | NOAA S-scale; verify at swpc.noaa.gov/noaa-scales-explanation |

Inputs are three simulated values (cumulative dose, symptom check-in, solar proton flux). There is no in-flight blood test. The mouse-blood dataset GLDS-156 is optional and cannot support claims about human astronauts.

## Isolation

NASA's Mars behavioral briefing expects isolation, confinement, a communication delay of about 19 minutes and highly autonomous operation, and notes that some crew report rising stress in the second half of missions. It lists subjective and objective monitoring tools, including the psychomotor vigilance task (PVT), and recommends mixing them.

| Indicator | How it is collected | Rule (design value; tune with the simulator) |
| --- | --- | --- |
| Mood and stress | Daily 1 to 5 self-report | watch: 2 standard deviations worse than own baseline for 3 days |
| Sleep hours | Morning check-in | watch: below own baseline for 3 nights. Use the baseline, not an 8-hour rule: ISS crews averaged just over 6 hours a night |
| Reaction | 1 to 2 minute tap test, called a "reaction check" | watch: median slower than own baseline by an agreed margin |
| Social contact | Minutes with crew or family | watch: falling trend over a week |

Combined strain pattern: several indicators in watch for 2 days gives act and escalate. Alert text says "strain" and suggests contacting the flight surgeon or crew support; no diagnostic words.

## Altered gravity (NASA OCHMO-TB-030 bone loss brief and the NASA HRP cardiovascular risk page)

NASA requires countermeasures to keep hip and spine bone density at or above 95% of pre-mission values and femoral neck at or above 90%. Exercise 6 to 7 sessions a week is effective in spaceflight versus 2 to 3 a week to maintain bone on Earth. Optimal vitamin D is 35 to 90 ng/mL, and excess calcium may cause kidney stones, so the app never tells anyone to take supplements. Orthostatic intolerance is the main in-mission cardiovascular risk.

| Indicator | How it is collected | Rule |
| --- | --- | --- |
| Exercise sessions per week | Exercise log | normal 6 to 7 (NASA); watch 4 to 5; act below 4 for two weeks (design values) |
| Resting heart rate | Manual entry | watch: more than 2 standard deviations from baseline for 3 days |
| Blood pressure, sitting and standing | Manual entry | watch: a clear drop on standing with dizziness |
| Orthostatic symptoms | Check-in | watch: lightheaded on standing; act: fainting or chest pain, escalate |
| Bone and muscle risk | Computed from exercise plus nutrition | Shown as a risk level, never a measurement (bone density needs DXA scans) |

## Nutrition (NASA HRP food and nutrition risk page)

Inadequate food and nutrition cause decrements in health and performance. NASA's bone brief quotes a requirement that in-mission nutrient programs provide 100% of calculated nutrient and energy requirements. The log tracks intake as a percentage of the planned menu, fluids and supplements taken. Starting rule (design value): watch below 90% of planned intake for 3 days, act below 75% for a week. Low intake becomes an extra reason in bone, immune and mood alerts.

## Distance from Earth

The app runs offline and builds a one-page ground report when the link opens: each module's latest status, alerts raised, actions taken and open escalations.

## Data sources

| Source | What it gives | Use | Access |
| --- | --- | --- | --- |
| NASA CO2 technical brief (OCHMO-TB-004) | CO2 limits, symptoms, ISS ranges | Environment rules | Free PDF |
| NASA bone loss technical brief (OCHMO-TB-030) | Bone targets, exercise frequency, vitamin D, 100% nutrient rule | Gravity and nutrition rules | Free PDF |
| NASA radiation brief (OCHMO-TB-020 Rev E) | 600 mSv career dose, 250 mSv design reference event | Radiation rules | Free PDF |
| NASA HRP cardiovascular and food/nutrition risk pages | Orthostatic intolerance, nutrition risk | Gravity and nutrition | Free web pages |
| Behavioral Challenges of a Mars Mission (NASA NTRS 20240010442) | Isolation risks, sleep, monitoring tools | Isolation rules | Free PDF |
| NASA OSDR, GLDS-156 (mouse blood, 0, 2, 8 Gy) | Optional proof-of-concept data | Optional | Public download |
| NASA DONKI (api.nasa.gov) | Solar flares, CMEs, solar energetic particle events | Optional live feed; save a sample and fall back to it offline | Free key; DEMO_KEY allows 30 requests an hour and 50 a day per IP; endpoint not opened by me, test it in your browser |
| NOAA SWPC GOES proton flux | Integral proton flux | Optional live feed; label it NOAA, not NASA | JSON, no key |

## Risks and fallbacks

| Risk | Fallback |
| --- | --- |
| Four modules in 2 days leaves each shallow | One indicator, one alert, one action per module first, then deepen |
| Advice sounds like medical fact | Label every limit with its source, say "possible", show the decision-support disclaimer, never tell anyone to take supplements |
| A live API fails during the demo | Cache one real response and replay it; the demo works offline anyway |
| Demo data looks fake | Label it simulated and shape it with NASA values where possible |
| Credits run out | Use short chats or GitHub Copilot Free; keep a manual fallback for the demo path |
