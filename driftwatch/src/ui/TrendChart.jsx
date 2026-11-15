import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { buildTrendModel } from './trendModel.js'
import { styleFor, CHART } from './statusStyle.js'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler)

/** Trend with the personal baseline band. Props: { alert, rule, readings, stats }. */
export default function TrendChart({ alert, rule, readings, stats }) {
  const m = buildTrendModel({ alert, rule, readings, stats })
  const color = styleFor(alert.status).color
  const datasets = [
    {
      label: m.title,
      data: m.values,
      borderColor: color,
      backgroundColor: color,
      pointStyle: m.pointStyles,
      pointRadius: m.pointStyles.map((s) => (s === 'rectRot' ? 7 : 3)),
      tension: 0.2,
      fill: false,
    },
  ]
  if (m.band) {
    datasets.push(
      { label: 'Baseline lower', data: m.band.lower, borderWidth: 0, pointRadius: 0, fill: false },
      {
        label: 'Your baseline',
        data: m.band.upper,
        borderWidth: 0,
        pointRadius: 0,
        backgroundColor: CHART.band,
        fill: '-1',
      },
    )
  }
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: CHART.text, filter: (item) => item.text !== 'Baseline lower' },
      },
    },
    scales: {
      x: { ticks: { color: CHART.text, maxTicksLimit: 6 }, grid: { color: CHART.grid } },
      y: {
        title: { display: m.unit !== '', text: m.unit, color: CHART.text },
        ticks: { color: CHART.text },
        grid: { color: CHART.grid },
      },
    },
  }
  return (
    <section className="dw-card-raised mt-3 p-3" aria-label={`Trend: ${m.title}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-lg font-semibold">{m.title}</h4>
        <span className="text-base">
          {m.statusLabel} <span className="text-ink-2">(Simulated)</span>
        </span>
      </div>
      {m.empty ? (
        <p className="mt-2 text-base text-ink-2">No readings yet</p>
      ) : (
        <>
          {m.baselineNotReady ? <p className="mt-2 text-base text-ink-2">Baseline not ready</p> : null}
          <div className="mt-2 h-56 w-full">
            <Line data={{ labels: m.labels, datasets }} options={options} role="img" aria-label={m.altText} />
          </div>
        </>
      )}
    </section>
  )
}
