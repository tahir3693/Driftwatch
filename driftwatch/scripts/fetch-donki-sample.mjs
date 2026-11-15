import { writeFileSync, mkdirSync } from "node:fs";
const key = process.env.NASA_API_KEY || "DEMO_KEY";
const url = `https://api.nasa.gov/DONKI/SEP?startDate=2024-05-01&endDate=2024-06-
30&api_key=${key}`;
const res = await fetch(url);
if (!res.ok) throw new Error("DONKI request failed: " + res.status);
const events = await res.json();
mkdirSync("data/nasa", { recursive: true });
const safeUrl = url.replace(/api_key=[^&]+/, "api_key=REDACTED");
writeFileSync("data/nasa/donki-sep-sample.json", JSON.stringify({
source: "NASA DONKI SEP (solar energetic particle events)",
url: safeUrl, downloaded: new Date().toISOString(), events }, null, 2));
console.log("Saved", Array.isArray(events) ? events.length : 0, "events");
