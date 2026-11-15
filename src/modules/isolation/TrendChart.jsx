import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

// Line of daily values with a shaded "your normal" zone (baseline mean +/- 2 SD).
// Props: title, values (array), baseline ({ mean, sd }), unit
export default function TrendChart({ title, values, baseline, unit }) {
  const labels = values.map((_, i) => `Day ${i + 1}`);
  const low = values.map(() => baseline.mean - 2 * baseline.sd);
  const high = values.map(() => baseline.mean + 2 * baseline.sd);

  const data = {
    labels,
    datasets: [
      { label: "Normal zone (low)", data: low, borderWidth: 0, pointRadius: 0, fill: false },
      {
        label: "Your normal zone", data: high, borderWidth: 0, pointRadius: 0,
        fill: "-1", backgroundColor: "rgba(56, 189, 248, 0.2)",
      },
      {
        label: title, data: values, borderColor: "#0f172a", backgroundColor: "#0f172a",
        tension: 0.25, pointRadius: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { labels: { filter: (item) => item.text !== "Normal zone (low)" } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} ${unit}` } },
    },
    scales: { y: { title: { display: true, text: unit } } },
  };

  return (
    <div className="rounded-lg border border-slate-300 p-3">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <Line data={data} options={options} />
    </div>
  );
}
