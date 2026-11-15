import { useRef, useState } from 'react'
import OfflineIndicator from './ui/OfflineIndicator.jsx'
import Dashboard from './ui/Dashboard.jsx'
import CheckInScreen from './ui/CheckInScreen.jsx'
import GroundReport from './ui/GroundReport.jsx'
import AppNav from './ui/AppNav.jsx'
import { useDashboardData } from './store/dashboardData.js'
import { useCheckIn } from './store/useCheckIn.js'
export default function App() {
  const { data, refresh, loadScenario } = useDashboardData()
  const { streak, submit } = useCheckIn(refresh)
  const [view, setView] = useState('dashboard') // 'dashboard' | 'checkin' | 'report'
  const [reportNow, setReportNow] = useState(null)
  const [preparing, setPreparing] = useState(false)
  const openCount = useRef(0)

  // Opening the report reads the clock once, so the alerts and the 7-day window share one `now`.
  function changeView(next) {
    if (next !== 'report') {
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

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-900 p-4 text-base text-slate-100">
      <header className="no-print flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-bold">Driftwatch</h1>
        <OfflineIndicator />
      </header>
      <p className="no-print mt-1 mb-4 text-lg text-slate-300">Catch the drift before it becomes a problem.</p>
      <AppNav view={view} onChange={changeView} />
      {view === 'checkin' ? (
        <CheckInScreen onSubmit={submit} streak={streak} onShowDashboard={() => changeView('dashboard')} />
      ) : view === 'report' ? (
        <GroundReport data={data} now={reportNow} refreshing={preparing} />
      ) : (
        <Dashboard data={data} onLoadScenario={loadScenario} onShowCheckIn={() => changeView('checkin')} />
      )}
    </main>
  )
}
