# AI disclosure

Driftwatch was built for the NASA Space Apps Challenge 2026 with the help of AI tools. This file states what was made with AI assistance, what the team wrote, and what is simulated.

## Made with AI assistance

- **App code, specs and tests.** Most of the Driftwatch app in `driftwatch/` was generated with AI assistance from [Kiro](https://kiro.dev) and Claude (Anthropic). This covers the core engine, the dashboard, the check-in, the ground report, the scenario player, the Sources view and the test suite. It also covers the specs in `.kiro/specs/` and the steering files in `.kiro/steering/`. The team reviewed, ran and tested this code.
- **Wiring of the teammates' modules.** The adapters that connect the teammates' modules to the shared alert contract were also written with AI assistance. These are `modules/isolation/index.js`, `modules/gravity/index.js` and `modules/bmd-strength/`. The teammates' own scoring logic was not rewritten.

## Written by teammates

- **Radiation engine.** `driftwatch/src/modules/radiation/radiation-engine.js` and its `rules.json` were written by a teammate. AI-assisted changes were limited to wording: the actions refer to the flight surgeon, and one comment and one data key were renamed. Scores and rules are unchanged.
- **Isolation module.** The engine, `rules.json`, scenario inputs, reaction test and check-in form were written by Sunaina Babar. They are in `driftwatch/src/modules/isolation/`. Her own disclosure is in [docs/AI_DISCLOSURE.md](docs/AI_DISCLOSURE.md): the module was written with help from Claude (Anthropic), then run, tested and reviewed by her.
- **BMD and strength tracker.** The standalone tracker in `bmd-strength-tracker/`, and its copy in `driftwatch/public/bmd-strength/`, was written by Luis. That covers its HTML, CSS and JavaScript, plus `BMD_and_strength_engine.js` and `rules.json` in `bmd-strength-tracker/`. Three small changes were made to the copy:
  - a one-time data reset was removed;
  - system fonts replace Google Fonts;
  - the training alarm counts only days up to today.

  A disclaimer bar was also added.

## Simulated data

All health data in the demo is simulated. This includes the shared 14-day scenario, the radiation inputs and every value on the dashboard and in the ground report. None of it is a real measurement of a real person. The app labels it "Simulated" wherever it is shown.

The saved NASA DONKI file in `driftwatch/data/nasa/` holds real space weather event records from 2024. It is not health data, and the app does not use it yet.

## AI-generated images and video

- **Images:** the only images in the repository are the app icons: `driftwatch/public/favicon.svg` and the three PNG icons in `driftwatch/public/icons/`. They are simple geometric shapes, made as part of the AI-assisted app code. There are no photos of people and no NASA logos.
- **Video:** there is no AI-generated video in the repository. If a demo video is made with AI tools, it will be listed here.
