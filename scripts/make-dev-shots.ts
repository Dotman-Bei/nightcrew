// Runs the real verify step on the fixture floor, and keeps its screenshots for local pages.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";
import { verifyFloor } from "@/crew/lib/verify-floor";

const executablePath = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const output = await verifyFloor(
  readFileSync("tests/fixtures/good-floor/index.html", "utf8"),
  readFileSync("tests/fixtures/good-floor/floor.json", "utf8"),
  '{"totalStaked":"1"}',
  () => chromium.launch({ executablePath, headless: true }),
);
if (!output.screenshots) throw new Error("no screenshots");
mkdirSync("db/dev-shots", { recursive: true });
writeFileSync("db/dev-shots/wide.b64", output.screenshots.wide);
writeFileSync("db/dev-shots/narrow.b64", output.screenshots.narrow);
console.log("dev shots written");
