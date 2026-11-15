import OfflineIndicator from './ui/OfflineIndicator.jsx'
import ScenarioPlayer from './ui/ScenarioPlayer.jsx'
import { bundledSummary } from './data/bundled.js'

export default function App() {
  const bundled = bundledSummary()
  return (
    <main className="min-h-screen bg-slate-900 p-4 text-slate-100">
      <p role="note" className="mb-4 rounded border border-amber-300 p-3 text-base font-semibold">
        Simulated data. Decision support only, not a medical device.
      </p>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-bold">Driftwatch</h1>
        <OfflineIndicator />
      </header>
      <p className="mt-4 text-base text-slate-300" data-testid="bundled-summary">
        {bundled.rulesFiles} rules files, {bundled.moduleFiles} module files and {bundled.scenarioFiles} scenario files are bundled for offline use.
      </p>
      <ScenarioPlayer />
    </main>
  )
}
