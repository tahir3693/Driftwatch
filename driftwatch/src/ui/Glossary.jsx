const TERMS = [
  ['Urgency', 'A score from 0 to 100. A higher number means it needs attention sooner.'],
  ['Baseline', 'Your own usual value, worked out from your earlier readings. Alerts compare you with yourself.'],
  ['Escalate', 'Tell the flight surgeon or crew support now.'],
  ['Normal, Watch, Act', 'Normal: nothing to do. Watch: keep an eye on it. Act: follow the suggested action now.'],
]
/** Short plain-language meaning of the terms used on this screen. */
export default function Glossary() {
  return (
    <details className="dw-details dw-card px-4">
      <summary>What do these words mean?</summary>
      <dl className="space-y-2 pb-4">
        {TERMS.map(([term, meaning]) => (
          <div key={term}>
            <dt className="font-semibold">{term}</dt>
            <dd className="text-ink-2">{meaning}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
