// Saves a sample of NASA DONKI SEP (solar energetic particle events) to data/nasa/donki-sep-sample.json.
// Run: node --env-file=.env scripts/fetch-donki-sample.mjs   (the key is read from VITE_NASA_API_KEY)
// The saved file holds the plain DONKI address only: the api_key parameter is never written.
import { writeFileSync, mkdirSync } from "node:fs";
const key = process.env.VITE_NASA_API_KEY || "DEMO_KEY";
const plainUrl = "https://api.nasa.gov/DONKI/SEP?startDate=2024-05-01&endDate=2024-06-30";
const res = await fetch(`${plainUrl}&api_key=${encodeURIComponent(key)}`);
if (!res.ok) throw new Error("DONKI request failed: " + res.status);
const events = await res.json();
mkdirSync("data/nasa", { recursive: true });
writeFileSync("data/nasa/donki-sep-sample.json", JSON.stringify({
source: "NASA DONKI SEP (solar energetic particle events)",
url: plainUrl, downloaded: new Date().toISOString(), events }, null, 2));
console.log("Saved", Array.isArray(events) ? events.length : 0, "events");
