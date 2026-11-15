// One place for status colours, icon shapes and labels. Hex colours appear only in this file.
export const STATUS_STYLE = Object.freeze({
  normal: { label: 'Normal', color: '#4ade80', icon: 'circle', classes: 'border-green-400 text-green-400' },
  watch: { label: 'Watch', color: '#fbbf24', icon: 'triangle', classes: 'border-amber-400 text-amber-400' },
  act: { label: 'Act', color: '#f87171', icon: 'square', classes: 'border-red-400 text-red-400' },
  nodata: { label: 'No data', color: '#94a3b8', icon: 'dash', classes: 'border-slate-400 text-slate-400' },
})

export const SURFACE = Object.freeze({ background: '#0f172a', text: '#f1f5f9' })

/** 'normal' -> 'Normal'. null, undefined or an unknown value -> 'No data'. */
export function statusLabel(status) {
  return Object.prototype.hasOwnProperty.call(STATUS_STYLE, status) ? STATUS_STYLE[status].label : STATUS_STYLE.nodata.label
}

/** Style for a status; null, undefined or an unknown value gives the no-data style. */
export function styleFor(status) {
  return Object.prototype.hasOwnProperty.call(STATUS_STYLE, status) ? STATUS_STYLE[status] : STATUS_STYLE.nodata
}
