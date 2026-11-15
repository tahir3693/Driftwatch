import { computeRegionStatus, regionAccessibleName } from './regionStatus.js'
import { styleFor, SURFACE } from './statusStyle.js'

// Drawn shapes per region, inside a figure centred at x = 120. No raster images.
const SHAPES = {
  head_and_lungs: [
    { type: 'circle', cx: 120, cy: 50, r: 32 },
    { type: 'rect', x: 78, y: 92, width: 84, height: 86, rx: 18 },
  ],
  bones_and_muscles: [
    { type: 'rect', x: 36, y: 96, width: 30, height: 150, rx: 14 },
    { type: 'rect', x: 174, y: 96, width: 30, height: 150, rx: 14 },
    { type: 'rect', x: 82, y: 268, width: 34, height: 140, rx: 14 },
    { type: 'rect', x: 124, y: 268, width: 34, height: 140, rx: 14 },
  ],
  whole_body: [{ type: 'rect', x: 78, y: 184, width: 84, height: 78, rx: 16 }],
}
// Label anchor (right of the figure) per region.
const LABEL_Y = { head_and_lungs: 90, bones_and_muscles: 230, whole_body: 330 }

function Shape({ shape }) {
  const { type, ...p } = shape
  return type === 'circle' ? <circle {...p} /> : <rect {...p} />
}

/** Clickable body map. Props: { alertsByRegion, regions, selectedRegion, onSelect }. */
export default function BodyMap({ alertsByRegion, regions, selectedRegion, onSelect }) {
  return (
    <figure className="m-0">
      <svg
        viewBox="0 0 380 420"
        className="h-auto w-full max-w-md"
        style={{ minHeight: 360 }}
        role="group"
        aria-label="Body map"
      >
        {regions.map((region) => {
          const summary = computeRegionStatus(alertsByRegion?.[region.id] ?? [])
          const style = styleFor(summary.status)
          const selected = selectedRegion === region.id
          const labelY = LABEL_Y[region.id] ?? 40
          const choose = () => onSelect(region.id)
          return (
            <g
              key={region.id}
              role="button"
              tabIndex={0}
              aria-label={regionAccessibleName(region.name, summary.status)}
              aria-pressed={selected}
              onClick={choose}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  choose()
                }
              }}
              style={{ cursor: 'pointer' }}
              data-region={region.id}
            >
              <g fill={style.color} fillOpacity="0.85" stroke={SURFACE.text} strokeWidth={selected ? 6 : 2}>
                {(SHAPES[region.id] ?? []).map((s, i) => (
                  <Shape key={i} shape={s} />
                ))}
              </g>
              <g aria-hidden="true" fill={SURFACE.text} fontSize="15">
                <text x="212" y={labelY} fontWeight="700">
                  {region.name}
                </text>
                <text x="212" y={labelY + 20}>
                  {style.label}
                </text>
                {summary.escalate ? (
                  <text x="212" y={labelY + 40} fontWeight="700">
                    Escalate
                  </text>
                ) : null}
              </g>
            </g>
          )
        })}
      </svg>
      <figcaption className="text-base text-slate-300">Simulated</figcaption>
    </figure>
  )
}
