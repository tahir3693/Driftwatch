import sources from '../data/sources.json'
import SimulatedBanner from './SimulatedBanner.jsx'
import BackButton from './BackButton.jsx'
/** Lists every NASA document and dataset Driftwatch cites, with NOAA space weather sources labelled NOAA. */
export default function SourcesPanel({ data = sources, onBack }) {
  return (
    <div className="overflow-x-hidden text-base">
      <SimulatedBanner />
      {onBack ? (
        <div className="mt-4">
          <BackButton onClick={onBack} />
        </div>
      ) : null}
      <section aria-labelledby="sources-title" className="mt-4 max-w-3xl">
        <h2 id="sources-title" className="text-2xl font-bold">
          Sources
        </h2>
        <p className="mt-1 text-ink-2">{data.note}</p>
        {data.groups.map((group) => (
          <section key={group.id} aria-labelledby={`sources-${group.id}`} className="mt-6">
            <h3 id={`sources-${group.id}`} className="text-xl font-bold">
              {group.heading}
            </h3>
            <ul className="mt-3 space-y-3">
              {group.items.map((item) => (
                <li key={item.id} className="dw-card p-4" data-publisher={group.publisher}>
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg border border-line-strong bg-raised px-2 text-sm font-bold">{group.publisher}</span>
                    <span className="font-semibold">{item.id}</span> <span className="text-ink-2">({item.kind})</span>
                  </p>
                  <p className="mt-1 text-ink-2">{item.title}</p>
                  <p className="mt-2">
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
