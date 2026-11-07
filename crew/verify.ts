import { chromium } from "playwright-core";
import { ShiftInput } from "@/crew/lib/contracts";
import { verifyFloor } from "@/crew/lib/verify-floor";
import { readWork, writeWork } from "@/crew/lib/work-dir";

const input = ShiftInput.parse(JSON.parse(readWork("shift-input.json") ?? "null"));
const html = readWork("crew-output/floor/index.html");
const floorJson = readWork("crew-output/floor/floor.json");
if (html === null || floorJson === null) throw new Error("verify: the crew output has no floor");

const executablePath = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const output = await verifyFloor(html, floorJson, input.snapshot, () => chromium.launch({ executablePath, headless: true }));

writeWork("verify-output/verdict.json", JSON.stringify(output.verdict, null, 2));
if (output.assembledHtml) writeWork("verify-output/assembled.html", output.assembledHtml);
if (output.screenshots) {
  writeWork("verify-output/wide.b64", output.screenshots.wide);
  writeWork("verify-output/narrow.b64", output.screenshots.narrow);
}
console.log(`verify: ${output.verdict.pass ? "pass" : "fail"}`);
