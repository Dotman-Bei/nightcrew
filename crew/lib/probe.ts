export const PROBE_MODEL = "claude-haiku-5-5";
export const PROBE_CAP_CENTS = 5;

export const PROBE_PROMPT = `Run these three things with bash, then reply with one JSON object and nothing else.

1. node --version
2. curl -s -m 8 -o /dev/null -w "%{http_code}" https://example.com; echo " exit=$?"
3. Write this to /tmp/pw.mjs and run it with node, capturing its output and any error:

import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const root = execSync("npm root -g", { encoding: "utf8" }).trim();
const require = createRequire(root + "/noop.js");
const { chromium } = require("playwright");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent("<h1>ok</h1>");
console.log(await page.textContent("h1"));
await browser.close();

Reply exactly in this shape:
{"node":"<output of step 1>","curl":"<output of step 2>","chromium":"<output of step 3, or the error message>"}`;

export type ProbeReport = { node: string; curl: string; chromium: string };

export type ProbeDecision = "managed-agents" | "managed-agents-no-chromium" | "fallback";

export type ProbeVerdict = {
  decision: ProbeDecision;
  sessionRan: boolean;
  networkSealed: boolean;
  chromiumLaunched: boolean;
  detail: string;
};

/** Pulls the JSON report out of the agent's final message, tolerating a code fence. */
export function parseProbeReport(text: string): ProbeReport | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const value = JSON.parse(match[0]) as Partial<ProbeReport>;
    if (typeof value.node !== "string" || typeof value.curl !== "string" || typeof value.chromium !== "string") return null;
    return { node: value.node, curl: value.curl, chromium: value.chromium };
  } catch {
    return null;
  }
}

/** Applies the decision table in the spec, section 5. */
export function decideProbe(report: ProbeReport | null, failure: string | null = null): ProbeVerdict {
  if (!report) {
    return { decision: "fallback", sessionRan: false, networkSealed: false, chromiumLaunched: false, detail: failure ?? "The session did not return a report." };
  }
  const reachedInternet = /^[1-5]\d\d\b/.test(report.curl.trim()) && !report.curl.trim().startsWith("000");
  const networkSealed = !reachedInternet;
  const chromiumLaunched = report.chromium.trim().toLowerCase() === "ok";
  if (!networkSealed) {
    return { decision: "fallback", sessionRan: true, networkSealed, chromiumLaunched, detail: `The sandbox reached the internet: ${report.curl}` };
  }
  if (!chromiumLaunched) {
    return { decision: "managed-agents-no-chromium", sessionRan: true, networkSealed, chromiumLaunched, detail: `Chromium did not launch: ${report.chromium.slice(0, 300)}` };
  }
  return { decision: "managed-agents", sessionRan: true, networkSealed, chromiumLaunched, detail: `Node ${report.node}, network sealed, Chromium launched.` };
}
