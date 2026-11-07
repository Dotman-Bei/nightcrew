import { readFileSync } from "node:fs";
import { join } from "node:path";
import { neonDb } from "@/lib/db";
import { attesterFromEnv } from "@/lib/eas";
import { publishShift } from "@/crew/lib/publish-shift";
import { readWork } from "@/crew/lib/work-dir";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const shiftInput = readWork("shift-input.json");
if (shiftInput === null) throw new Error("publish: shift-input.json is missing");

const result = await publishShift({
  db: neonDb(required("DATABASE_URL")),
  attester: attesterFromEnv(process.env),
  work: {
    shiftInput,
    crewResult: readWork("crew-output/crew-result.json"),
    transcript: readWork("crew-output/transcript.json"),
    floorHtml: readWork("crew-output/floor/index.html"),
    floorJson: readWork("crew-output/floor/floor.json"),
    verdict: readWork("verify-output/verdict.json"),
    screenshotWide: readWork("verify-output/wide.b64"),
    screenshotNarrow: readWork("verify-output/narrow.b64"),
  },
  template: readFileSync(join(process.cwd(), "floor-kit", "template.html"), "utf8"),
  founder: required("VETO_ADDRESS"),
  now: new Date(),
});
console.log(JSON.stringify(result));
