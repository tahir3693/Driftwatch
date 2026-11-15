import { useEffect, useState } from "react";

// Daily check-in. On save it calls onSubmit(record) with one day record:
// { sleep_hours, mood, reaction_ms, social_contact, rest }
// reactionMs (optional) is filled in by the ReactionTest.

export default function CheckinForm({ onSubmit, reactionMs = null }) {
  const [stress, setStress] = useState(3);
  const [sleep, setSleep] = useState(7);
  const [rest, setRest] = useState(3); // 1 to 5, kept for the record, not judged yet
  const [social, setSocial] = useState(60);
  const [reaction, setReaction] = useState(reactionMs ?? "");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (reactionMs !== null) setReaction(reactionMs);
  }, [reactionMs]);

  const reactionOk = reaction !== "" && Number(reaction) >= 100 && Number(reaction) <= 2000;

  function handleSubmit() {
    onSubmit({
      sleep_hours: Number(sleep),
      mood: Number(stress),
      reaction_ms: Number(reaction),
      social_contact: Number(social),
      rest: Number(rest),
    });
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  }

  return (
    <section className="space-y-4 rounded-lg border border-slate-300 p-4" aria-label="Daily check-in">
      <h2 className="text-lg font-semibold">Daily check-in</h2>

      <label className="block text-sm">
        Mood and stress today: <strong>{stress}</strong> (0 calm, 10 very stressed)
        <input type="range" min="0" max="10" step="1" value={stress}
          onChange={(e) => setStress(e.target.value)} className="mt-1 w-full" />
      </label>

      <label className="block text-sm">
        Hours slept last night
        <input type="number" min="0" max="14" step="0.1" value={sleep}
          onChange={(e) => setSleep(e.target.value)}
          className="mt-1 block w-32 rounded border border-slate-300 px-2 py-1" />
      </label>

      <label className="block text-sm">
        How rested do you feel: <strong>{rest}</strong> (1 not at all, 5 fully)
        <input type="range" min="1" max="5" step="1" value={rest}
          onChange={(e) => setRest(e.target.value)} className="mt-1 w-full" />
      </label>

      <label className="block text-sm">
        Minutes talking with crew, ground or family today
        <input type="number" min="0" max="600" step="5" value={social}
          onChange={(e) => setSocial(e.target.value)}
          className="mt-1 block w-32 rounded border border-slate-300 px-2 py-1" />
      </label>

      <label className="block text-sm">
        Reaction time in ms (run the reaction test, or type it)
        <input type="number" min="0" max="2000" value={reaction}
          onChange={(e) => setReaction(e.target.value)}
          className="mt-1 block w-32 rounded border border-slate-300 px-2 py-1" />
      </label>

      <button onClick={handleSubmit} disabled={!reactionOk}
        className="rounded-md bg-sky-600 px-4 py-2 font-medium text-white hover:bg-sky-700 disabled:opacity-40">
        Save check-in
      </button>
      {sent && <p className="text-sm text-emerald-700" aria-live="polite">Saved.</p>}
      {reaction !== "" && !reactionOk && (
        <p className="text-sm text-red-700">Reaction time should be between 100 and 2000 ms. Run the test again.</p>
      )}
      <p className="text-xs text-slate-500">Decision support using simulated data. It does not diagnose.</p>
    </section>
  );
}
