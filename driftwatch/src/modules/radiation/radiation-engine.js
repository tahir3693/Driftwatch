/* Baseline: Radiation module engine (plain JS, no dependencies).
   Every number is tagged OFFICIAL (NASA) or PROTOTYPE (our own rule). */
(function (root) {
  const RULES = {
    // OFFICIAL: NASA-STD-3001 Vol 1 (OCHMO-TB-020): career effective dose < 600 mSv; SPE < 250 mSv per event
    careerLimit_mSv: 600,
    speLimit_mSv: 250,
    // PROTOTYPE: max points each input can add; total is capped at 100
    maxPoints: { dose: 40, symptoms: 35, weather: 25 },
    // PROTOTYPE: symptom weights (ours). Symptom list echoes acute-radiation effects NASA describes (nausea, fatigue, skin injury)
    symptoms: {
      nausea:   { label: "Nausea",                    pts: 8 },
      vomiting: { label: "Vomiting",                  pts: 14 },
      fatigue:  { label: "Unusual fatigue",           pts: 6 },
      skin:     { label: "Skin redness or irritation", pts: 8 },
      fever:    { label: "Fever or chills",           pts: 8 },
      bruising: { label: "Easy bruising or bleeding", pts: 10 }
    },
    // OFFICIAL thresholds: NOAA S-scale for >=10 MeV protons (S1=10, S2=10^2, S3=10^3, S4=10^4, S5=10^5 pfu). PROTOTYPE: the points we give each level.
    weatherSteps: [ [1e5, 25, "S5"], [1e4, 22, "S4"], [1e3, 17, "S3"], [1e2, 10, "S2"], [10, 5, "S1"], [0, 0, "quiet"] ],
    // PROTOTYPE status bands on the 0-100 urgency score
    bands: { watch: 30, act: 60 },
    escalateAtFraction: 0.8,
    quietFlux_pfu: 1 // PROTOTYPE placeholder used as "baseline" for the flux indicator
  };

  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const statusOf = (u) => (u >= RULES.bands.act ? "act" : u >= RULES.bands.watch ? "watch" : "normal");
  const stormOf = (flux) => RULES.weatherSteps.find((s) => flux >= s[0]);

  function scoreDose(cumulative_mSv, premission_mSv) {
    const frac = cumulative_mSv / RULES.careerLimit_mSv;
    const pts = RULES.maxPoints.dose * clamp(frac, 0, 1);
    return { frac, pts, baseline: premission_mSv };
  }
  function scoreSymptoms(list) {
    let raw = 0;
    list.forEach((k) => { raw += RULES.symptoms[k] ? RULES.symptoms[k].pts : 0; });
    return { raw, pts: Math.min(raw, RULES.maxPoints.symptoms) };
  }
  function scoreWeather(flux) {
    const s = stormOf(flux);
    return { pts: s[1], level: s[2] };
  }

  const ACTIONS = {
    normal: "No action needed. Keep your routine check-ins.",
    watch: "Repeat the check-in in a few hours, review the radiation environment, and tell the crew medical officer if symptoms continue.",
    act: "Follow your mission's solar particle event and shelter procedure, and contact the flight surgeon on the ground now."
  };

  // MAIN: inputs -> array of shared-contract objects (3 indicators + 1 overall)
  function evaluate(inp) {
    const d = scoreDose(inp.cumulativeDose_mSv, inp.premissionDose_mSv || 0);
    const s = scoreSymptoms(inp.symptoms || []);
    const w = scoreWeather(inp.protonFlux_pfu);
    let total = Math.round(clamp(d.pts + s.pts + w.pts, 0, 100));

    const reasons = [];
    if (d.frac > 0) reasons.push(`career dose is ${(d.frac * 100).toFixed(0)}% of the 600 mSv limit`);
    if ((inp.symptoms || []).length) reasons.push(`possible radiation-related symptoms reported (${inp.symptoms.map((k) => RULES.symptoms[k].label.toLowerCase()).join(", ")})`);
    if (w.level !== "quiet") reasons.push(`solar proton activity at ${w.level} level (${inp.protonFlux_pfu} pfu)`);

    let escalate = false, escReason = "";
    if (d.frac >= 1) { total = Math.max(total, 90); escalate = true; escReason = "career dose limit reached"; }
    else if (d.frac >= RULES.escalateAtFraction) { escalate = true; escReason = "career dose above 80% of limit"; }
    const stormActive = ["S2", "S3", "S4", "S5"].includes(w.level);
    if ((inp.symptoms || []).includes("vomiting") && stormActive) { escalate = true; escReason = "vomiting during an active solar particle event"; total = Math.max(total, RULES.bands.act); }
    if (total >= RULES.bands.act) { escalate = true; escReason = escReason || "urgency score in the Act band"; }

    const status = statusOf(total);
    const why = reasons.length ? "Possible radiation concern: " + reasons.join("; ") + "." : "No radiation inputs above normal.";
    const pct = (pts, max) => Math.round((pts / max) * 100);
    const base = { domain: "radiation" };

    const out = [
      { ...base, indicator: "cumulative_dose", value: inp.cumulativeDose_mSv, baseline: d.baseline, status: statusOf(pct(d.pts, 40)),
        urgency: pct(d.pts, RULES.maxPoints.dose), why: `${(d.frac * 100).toFixed(0)}% of the 600 mSv career limit used.`,
        action: ACTIONS[statusOf(pct(d.pts, 40))], escalate: d.frac >= RULES.escalateAtFraction, source: "NASA-STD-3001 Vol 1 / OCHMO-TB-020 (600 mSv career limit)" },
      { ...base, indicator: "symptom_check_in", value: (inp.symptoms || []).length, baseline: 0, status: statusOf(pct(s.pts, 35)),
        urgency: pct(s.pts, RULES.maxPoints.symptoms), why: (inp.symptoms || []).length ? "Possible symptoms logged: " + inp.symptoms.join(", ") + "." : "No symptoms logged.",
        action: ACTIONS[statusOf(pct(s.pts, 35))], escalate: (inp.symptoms || []).includes("vomiting") && stormActive, source: "Prototype rule; symptom list based on NASA acute-radiation effects" },
      { ...base, indicator: "solar_proton_flux", value: inp.protonFlux_pfu, baseline: RULES.quietFlux_pfu, status: statusOf(pct(w.pts, 25)),
        urgency: pct(w.pts, RULES.maxPoints.weather), why: w.level === "quiet" ? "Quiet space weather." : `Proton flux at ${w.level} level.`,
        action: ACTIONS[statusOf(pct(w.pts, 25))], escalate: false, source: "NOAA SWPC S-scale for >=10 MeV protons (thresholds from NOAA; points per level are our prototype)" },
      { ...base, indicator: "radiation_overall", value: total, baseline: 0, status, urgency: total, why: why + (escReason ? ` Escalation: ${escReason}.` : ""),
        action: ACTIONS[status], escalate, source: "Prototype weighted score (dose 40 + symptoms 35 + weather 25); official limits from NASA-STD-3001" }
    ];
    // Component rows show each input's share of the overall score. Only radiation_overall is a real alert.
    const share = [d.pts, s.pts, w.pts].map(Math.round);
    for (let i = 0; i < 3; i++) {
      out[i].urgency = share[i]; out[i].status = status; out[i].escalate = false;
      out[i].action = "Part of the overall radiation status. See radiation_overall.";
    }
    out.parts = { dose: d.pts, symptoms: s.pts, weather: w.pts, level: w.level, frac: d.frac };
    return out;
  }

  // Seeded simulator: 14 days, solar storm builds from day 9
  function simulate(seed) {
    let a = seed || 7;
    const rnd = () => ((a = (a * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const days = []; let dose = 120;
    for (let i = 1; i <= 14; i++) {
      dose += 1 + rnd() * 0.4;
      let flux = 0.5 + rnd() * 1.5, sym = [];
      if (i >= 9) { flux = [60, 400, 1500, 300, 40, 12][i - 9] || 5; dose += flux > 100 ? 18 : 2; }
      if (i >= 10) sym.push("fatigue");
      if (i >= 11) sym.push("nausea");
      if (i === 11) sym.push("skin", "vomiting");
      days.push({ day: i, cumulativeDose_mSv: Math.round(dose), premissionDose_mSv: 120, protonFlux_pfu: Math.round(flux * 10) / 10, symptoms: sym });
    }
    return days;
  }

  const api = { RULES, evaluate, simulate };
  if (typeof module !== "undefined") module.exports = api; else root.RadiationEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
