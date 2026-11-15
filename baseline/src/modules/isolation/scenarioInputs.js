// Isolation module: day-by-day inputs for the shared 14-day scenario (ALL SIMULATED).
// Hand-written, so the story is exactly as in the plan:
//   Days 1-5   baseline forms, everything normal
//   Day 6      sleep shortens and reaction slows            -> Isolation Watch
//   Days 7-10  sleep stays low (day 9), the rest drifts      -> Watch, no strain yet
//   Day 11     stress and sleep both off                     -> two signs, first day
//   Day 12     strain signs for 2 days in a row              -> combined_strain, escalate
//   Days 13-14 easing but still off                          -> strain continues
export const isolationInputs = [
  { day: 1,  sleep_hours: 7.0, mood: 3.0, reaction_ms: 280, social_contact: 60 },
  { day: 2,  sleep_hours: 7.2, mood: 3.0, reaction_ms: 285, social_contact: 62 },
  { day: 3,  sleep_hours: 6.8, mood: 4.0, reaction_ms: 275, social_contact: 58 },
  { day: 4,  sleep_hours: 7.1, mood: 3.0, reaction_ms: 282, social_contact: 61 },
  { day: 5,  sleep_hours: 6.9, mood: 3.0, reaction_ms: 278, social_contact: 59 },
  { day: 6,  sleep_hours: 6.4, mood: 3.4, reaction_ms: 300, social_contact: 57 },
  { day: 7,  sleep_hours: 6.4, mood: 3.5, reaction_ms: 286, social_contact: 56 },
  { day: 8,  sleep_hours: 6.5, mood: 3.6, reaction_ms: 288, social_contact: 55 },
  { day: 9,  sleep_hours: 6.3, mood: 3.7, reaction_ms: 289, social_contact: 55 },
  { day: 10, sleep_hours: 6.4, mood: 3.6, reaction_ms: 290, social_contact: 54 },
  { day: 11, sleep_hours: 6.3, mood: 4.3, reaction_ms: 291, social_contact: 53 },
  { day: 12, sleep_hours: 6.1, mood: 5.2, reaction_ms: 322, social_contact: 46 },
  { day: 13, sleep_hours: 6.5, mood: 4.2, reaction_ms: 300, social_contact: 50 },
  { day: 14, sleep_hours: 6.7, mood: 3.9, reaction_ms: 296, social_contact: 54 },
];
