import sources from '../data/sources.json'
import SimulatedBanner from './SimulatedBanner.jsx'

/** Lists every NASA document and dataset Driftwatch cites, with NOAA space weather sources labelled NOAA. */
export default function SourcesPanel({ data = sources }) {
  return (
    <div className="overflow-x-hidden text-base">
      <SimulatedBanner />
      <section aria-labelledby="sources-title" className="mt-4 max-w-3xl">
        <h2 id="sources-title" className="text-2xl font-semibold">
          Sources
        </h2>
        <p className="mt-1">{data.note}</p>
        {data.groups.map((group) => (
          <section key={group.id} aria-labelledby={`sources-${group.id}`} className="mt-4">
            <h3 id={`sources-${group.id}`} className="text-xl font-semibold">
              {group.heading}
            </h3>
            <ul className="mt-2 space-y-3">
              {group.items.map((item) => (
                <li key={item.id} className="rounded border border-slate-500 p-3" data-publisher={group.publisher}>
                  <p>
                    <span className="mr-2 rounded border border-slate-400 px-2 text-sm font-semibold">{group.publisher}</span>
                    <span className="font-semibold">{item.id}</span> <span className="text-slate-300">({item.kind})</span>
                  </p>
                  <p className="mt-1">{item.title}</p>
                  <p className="mt-1">
                    <span className="font-semibold">Used for:</span> {item.usedFor}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </section>
    </div>
  )
}
