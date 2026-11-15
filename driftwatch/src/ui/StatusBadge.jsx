import { styleFor } from './statusStyle.js'

/** Small inline SVG shape: circle, triangle, square or dash. Decorative, so hidden from assistive tech. */
export function StatusIcon({ status, size = 16 }) {
  const { icon, color } = styleFor(status)
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable="false" data-icon={icon}>
      {icon === 'circle' ? <circle cx="8" cy="8" r="6" fill={color} /> : null}
      {icon === 'triangle' ? <polygon points="8,2 14.5,14 1.5,14" fill={color} /> : null}
      {icon === 'square' ? <rect x="2" y="2" width="12" height="12" fill={color} /> : null}
      {icon === 'dash' ? <rect x="2" y="7" width="12" height="2" fill={color} /> : null}
    </svg>
  )
}

export default function StatusBadge({ status }) {
  const s = styleFor(status)
  return (
    <span className={`inline-flex items-center gap-2 rounded border px-2 py-1 text-base font-semibold ${s.classes}`}>
      <StatusIcon status={status} />
      <span>{s.label}</span>
    </span>
  )
}
