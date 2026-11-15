import { useRef, useState } from 'react'
import OfflineIndicator from './ui/OfflineIndicator.jsx'
import Dashboard from './ui/Dashboard.jsx'
import CheckInScreen from './ui/CheckInScreen.jsx'
import GroundReport from './ui/GroundReport.jsx'
import BmdTrackerScreen from './ui/BmdTrackerScreen.jsx'
import SourcesPanel from './ui/SourcesPanel.jsx'
import ScenarioControls from './ui/ScenarioControls.jsx'
import AppNav from './ui/AppNav.jsx'
import { useDashboardData } from './store/dashboardData.js'
import { useCheckIn } from './store/useCheckIn.js'
import { useScenarioPlayer } from './store/scenarioPlayer.js'
import { useSpaceWeather } from './store/spaceWeather.js'

export default function App() {
  const { data: stored, refresh } = useDashboardData()
  const { streak, submit } = useCheckIn(refresh)
  const scenario = useScenarioPlayer()
  const spaceWeather = useSpaceWeather(refresh)
  const [view, setView] = useState('dashboard') // 'dashboard' | 'checkin' | 'report' | 'sources' | 'bmd'
  const [reportNow, setReportNow] = useState(null)
  const [preparing, setPreparing] = useState(false)
  const openCount = useRef(0)

  // While the scenario plays, every screen shows the scenario day; otherwise the stored data.
  const data = scenario.data ?? stored

  // Opening the report reads the clock once, so the alerts and the 7-day window share one `now`.
  // During the scenario the report uses the scenario day's time and needs no refresh.
  function changeView(next) {
    if (next !== 'report' || scenario.data) {
      // Leaving the BMD and strength screen: the tracker saved to localStorage, so reload the alerts.
      if (view === 'bmd' && next !== 'bmd' && !scenario.data) Promise.resolve(refresh?.()).catch(() => {})
      setView(next)
      return
    }
    const now = Date.now()
    const ticket = ++openCount.current
    setReportNow(now)
    setPreparing(true)
    setView('report')
    // A failed refresh is ignored: the report then shows the data already in memory.
    Promise.resolve()
      .then(() => refresh?.(now))
      .catch(() => {})
      .finally(() => {
        if (ticket === openCount.current) setPreparing(false)
      })
  }

  const controls = (
    <ScenarioControls
      day={scenario.day}
      playing={scenario.playing}
      finished={scenario.finished}
      onPlay={scenario.play}
      onPause={scenario.pause}
      onNext={scenario.next}
      onReset={scenario.reset}
    />
  )

  return (
    <main className="min-h-screen overflow-x-hidden bg-bg px-4 py-4 text-base text-ink sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
      <header className="no-print flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold sm:text-4xl">Driftwatch</h1>
        <OfflineIndicator />
      </header>
      <p className="no-print mb-4 mt-1 text-lg text-ink-2">Catch the drift before it becomes a problem.</p>
      <AppNav view={view} onChange={changeView} />
      <div key={view} className="dw-fade-in">
      {view === 'checkin' ? (
        <CheckInScreen onSubmit={submit} streak={streak} onShowDashboard={() => changeView('dashboard')} />
      ) : view === 'report' ? (
        <GroundReport data={data} now={scenario.data ? scenario.now : reportNow} refreshing={scenario.data ? false : preparing} spaceWeather={spaceWeather} onBack={() => changeView('dashboard')} />
      ) : view === 'sources' ? (
        <SourcesPanel onBack={() => changeView('dashboard')} />
      ) : view === 'bmd' ? (
        <BmdTrackerScreen onBack={() => changeView('dashboard')} />
      ) : (
        <Dashboard
          data={data}
          onShowCheckIn={() => changeView('checkin')}
          onShowBmd={() => changeView('bmd')}
          spaceWeather={spaceWeather}
          scenarioControls={controls}
        />
      )}
      </div>
      </div>
    </main>
  )
}
