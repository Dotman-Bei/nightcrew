import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ShiftInput } from "@/crew/lib/contracts";
import { crewShift } from "@/crew/lib/crew-shift";
import { openRouterStructuredModel, parseStructuredMode } from "@/crew/lib/model";
import { assertAllowedModel, openRouterClient, parseTransport } from "@/crew/lib/openrouter";
import { OpenRouterRuntime } from "@/crew/lib/openrouter-runtime";
import { readWork, setOutput, writeWork } from "@/crew/lib/work-dir";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const input = ShiftInput.parse(JSON.parse(readWork("shift-input.json") ?? "null"));
const kit = join(process.cwd(), "floor-kit");
const kitFiles = [
  { name: "RULES.md", content: readFileSync(join(kit, "RULES.md"), "utf8") },
  { name: "template.html", content: readFileSync(join(kit, "template.html"), "utf8") },
  { name: "snapshot.json", content: input.snapshot },
];

const client = openRouterClient(required("OPENROUTER_API_KEY"));
const buildModel = assertAllowedModel(required("CREW_BUILD_MODEL"));
const runtime = new OpenRouterRuntime(client, {
  model: buildModel,
  capCents: Number(required("CREW_SHIFT_CAP_CENTS")),
  transport: parseTransport(process.env.CREW_BUILD_TRANSPORT),
});
const output = await crewShift({
  input,
  model: openRouterStructuredModel(client, parseStructuredMode(process.env.CREW_STRUCTURED_MODE)),
  runtime,
  kitFiles,
  buildModel,
});
runtime.dispose();

writeWork("crew-output/crew-result.json", JSON.stringify(output.result, null, 2));
writeWork("crew-output/transcript.json", JSON.stringify(output.transcript));
if (output.html) writeWork("crew-output/floor/index.html", output.html);
if (output.floorJson) writeWork("crew-output/floor/floor.json", output.floorJson);
console.log(`crew outcome: ${output.result.outcome}, cost ${output.result.costCents} cents`);
setOutput("has_floor", String(output.result.outcome === "built"));
