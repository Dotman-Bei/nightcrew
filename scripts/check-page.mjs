// The gate for a page task: starts the app, runs the skill's layout checker, stops the app.
// Usage: node scripts/check-page.mjs <route> [--dev]   e.g. home, vote, shifts/1 (no leading slash)
// --expect-floor also proves the floor really runs in its sandboxed frame: the layout checker
// cannot see inside the frame, so a broken frame would otherwise pass.
// Exits with the checker's code: 0 clean, 1 findings, 2 tool failure.
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const SKILL = process.env.TASTE_SKILL_DIR || "C:/Users/bamig/Documents/VIBE CODE/Hackathons/.claude/skills/design-taste-frontend";
const SIZES = "1440x900,1024x768,820x1180,768x1024,390x844";
const PORT = process.env.CHECK_PORT || "4300";
const arg = process.argv[2];
const useDev = process.argv.includes("--dev");
const expectFloor = process.argv.includes("--expect-floor");
const route = arg === "home" ? "/" : `/${arg}`;
if (!arg) {
  console.error("usage: node scripts/check-page.mjs <route> [--dev]");
  process.exit(2);
}
const checker = join(SKILL, "assets", "layout", "check.mjs");
if (!existsSync(checker)) {
  console.error(`no checker at ${checker}`);
  process.exit(2);
}
const next = join("node_modules", "next", "dist", "bin", "next");
if (!useDev) {
  const built = spawnSync(process.execPath, [next, "build"], { stdio: "inherit" });
  if (built.status !== 0) process.exit(2);
}
const server = spawn(process.execPath, [next, useDev ? "dev" : "start", "-H", "127.0.0.1", "-p", PORT], { stdio: "ignore" });
const stop = () => {
  try {
    if (process.platform === "win32") execFileSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    else server.kill();
  } catch {
    // already gone
  }
};
const url = `http://127.0.0.1:${PORT}${route}`;
let ready = false;
for (let attempt = 0; attempt < 120 && !ready; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  try {
    ready = (await fetch(url)).status < 500;
  } catch {
    // not up yet
  }
}
if (!ready) {
  stop();
  console.error(`the app did not answer at ${url}`);
  process.exit(2);
}
const label = route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
const profile = join(".taste-skill", "profile");
const shots = join(".taste-skill", "shots", label);
rmSync(profile, { recursive: true, force: true }); // a fresh profile, so no stale CSS is cached between runs
mkdirSync(shots, { recursive: true });
const check = spawnSync(process.execPath, [checker, "--url", url, "--profile", profile, "--sizes", SIZES, "--shots", shots], { stdio: "inherit" });
let status = check.status ?? 2;
if (status === 0 && expectFloor) status = await floorRuns();
stop();
console.log(status === 0 ? "PAGE CHECK PASS" : "PAGE CHECK FAIL");
process.exit(status);

async function floorRuns() {
  const { chromium } = await import("playwright-core");
  const candidates = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome"];
  const browser = await chromium.launch({ executablePath: candidates.find((path) => path && existsSync(path)), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    const sandbox = await page.locator("iframe").first().getAttribute("sandbox");
    const frame = page.frames().find((candidate) => candidate.url().includes("/f/"));
    const text = frame ? (await frame.locator("body").textContent({ timeout: 5000 }))?.trim() : "";
    const origin = frame ? await frame.evaluate(() => self.origin) : "";
    console.log(`floor frame: sandbox="${sandbox}", origin=${origin}, ${text?.length ?? 0} characters of text`);
    if (sandbox !== "allow-scripts") throw new Error("the frame must be sandboxed with allow-scripts only");
    if (!frame || !text) throw new Error("the floor did not render in its frame");
    if (origin !== "null") throw new Error("the floor must have an opaque origin");
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return 1;
  } finally {
    await browser.close();
  }
}
