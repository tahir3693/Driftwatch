/** "Back to dashboard" for the sub screens. Hidden in print. Props: { onClick }. */
export default function BackButton({ onClick }) {
  return (
    <button type="button" onClick={() => onClick?.()} className="dw-btn no-print min-h-11 min-w-11">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back to dashboard
    </button>
  )
}
