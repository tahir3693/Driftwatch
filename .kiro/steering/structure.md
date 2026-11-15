# Structure

## Folders (under `src/`)
- `engine/`: pure functions with no UI code. Every function in `engine/` needs a unit test.
- `modules/<name>/rules.json`: bands, patterns, actions and sources as data. Band keys are `normal`, `watch`, `act`.
- `sim/`: the shared scenario.
- `ui/`: `BodyMap`, `TrendChart`, `AlertCard`, `HelpPanel`.
- `store/`, `data/`: state and static data.

## Alert contract
Every alert returned by any module must have exactly these fields:

| Field | Type / values |
|---|---|
| `domain` | string, one of the domain values in product.md |
| `indicator` | string |
| `value` | current value |
| `baseline` | the astronaut's baseline for this indicator |
| `status` | lower case: `normal`, `watch` or `act` (the UI capitalises it) |
| `urgency` | number, 0 to 100 |
| `why` | string, explanation |
| `action` | string, recommended action |
| `escalate` | boolean (`true` or `false`) |
| `source` | string, citation or `"design value"` |

## Module output
Each module returns one alert object per indicator, plus one overall object named `<domain>_overall` (for example `radiation_overall`).

## Sources
Every limit needs a `source`, or the value `"design value"`.
