import { computeRegionStatus, regionAccessibleName } from './regionStatus.js'
import { styleFor } from './statusStyle.js'
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
// Top of each region's label card (right of the figure).
const CARD_Y = { head_and_lungs: 24, bones_and_muscles: 150, whole_body: 276 }
const CARD = { x: 248, width: 236, height: 108 }
function Shape({ shape }) {
  const { type, ...p } = shape
  return type === 'circle' ? <circle {...p} /> : <rect {...p} />
}
// The status icon at (x, y), same shapes as StatusBadge: circle, triangle, square, dash.
function Icon({ icon, color, x, y }) {
  return (
    <g transform={`translate(${x} ${y})`} fill={color} aria-hidden="true">
      {icon === 'circle' ? <circle cx="9" cy="9" r="7" /> : null}
      {icon === 'triangle' ? <polygon points="9,2 16.5,16 1.5,16" /> : null}
      {icon === 'square' ? <rect x="2" y="2" width="14" height="14" /> : null}
      {icon === 'dash' ? <rect x="2" y="8" width="14" height="2" /> : null}
    </g>
  )
}
/**
 * Clickable body map. Props: { alertsByRegion, regions, selectedRegion, onSelect }.
 * Each region is one large button: the body part and a label card with the region name and its status
 * in words, an icon shape and a colour. The whole card is clickable.
 */
export default function BodyMap({ alertsByRegion, regions, selectedRegion, onSelect }) {
  return (
    <figure className="dw-card m-0 p-3">
      <svg viewBox="0 0 488 420" className="h-auto w-full" style={{ minHeight: 320 }} role="group" aria-label="Body map">
        {regions.map((region) => {
          const summary = computeRegionStatus(alertsByRegion?.[region.id] ?? [])
          const style = styleFor(summary.status)
          const selected = selectedRegion === region.id
          const top = CARD_Y[region.id] ?? 24
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
              className="bm-region"
              data-region={region.id}
            >
              <g fill={style.color} fillOpacity="0.85" className="bm-shape-group">
                {(SHAPES[region.id] ?? []).map((s, i) => (
                  <g key={i} className="bm-shape">
                    <Shape shape={s} />
                  </g>
                ))}
              </g>
              <rect className="bm-card" x={CARD.x} y={top} width={CARD.width} height={CARD.height} rx="12" />
              <rect x={CARD.x} y={top} width="10" height={CARD.height} rx="5" fill={style.color} />
              <g aria-hidden="true" className="fill-ink">
                <text x={CARD.x + 26} y={top + 34} fontSize="23" fontWeight="700">
                  {region.name}
                </text>
                <Icon icon={style.icon} color={style.color} x={CARD.x + 24} y={top + 48} />
                <text x={CARD.x + 52} y={top + 66} fontSize="22" fontWeight="bold">
                  {style.label}
                </text>
                {summary.escalate ? (
                  <text x={CARD.x + 26} y={top + 96} fontSize="21" fontWeight="700" style={{ fill: style.color }}>
                    Escalate
                  </text>
                ) : null}
              </g>
            </g>
          )
        })}
      </svg>
      <figcaption className="mt-2 text-base text-ink-2">
        <span className="font-semibold">Simulated</span>
        <p className="mt-1">Click a region to see details</p>
      </figcaption>
    </figure>
  )
}
