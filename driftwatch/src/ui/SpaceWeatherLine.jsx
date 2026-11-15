/**
 * The NASA DONKI space weather line and a plain note on what the data is.
 * Props: { spaceWeather } (from data/donki.js buildSpaceWeather). Shows nothing without it.
 * It shows no address and no event size: DONKI SEP gives no flux or dose.
 */
export default function SpaceWeatherLine({ spaceWeather, className = '' }) {
  if (!spaceWeather?.line) return null
  return (
    <div data-testid="space-weather" className={className}>
      <p className="font-semibold">{spaceWeather.line}</p>
      <p>{spaceWeather.latestText}</p>
      <p className="text-slate-300">{spaceWeather.note}</p>
    </div>
  )
}
