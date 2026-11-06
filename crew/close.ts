import { viemChainReader } from "@/lib/chain";
import { neonDb } from "@/lib/db";
import { apiStakeReader } from "@/lib/stake";
import { closeShift, type Trigger } from "@/crew/lib/close-shift";
import { fetchFloorData } from "@/crew/lib/floor-data";
import { setOutput, writeWork } from "@/crew/lib/work-dir";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function readTrigger(): Trigger {
  const label = process.env.SHIFT_LABEL || "scheduled";
  const reason = process.env.SHIFT_REASON || "";
  if (label === "off-schedule") {
    if (!reason) throw new Error("an off-schedule shift needs a reason");
    return { kind: "off-schedule", reason };
  }
  if (label === "rehearsal") {
    const proposal = process.env.REHEARSAL_PROPOSAL || "";
    if (!reason || !proposal) throw new Error("a rehearsal needs a reason and a proposal");
    return { kind: "rehearsal", reason, proposal, author: required("VETO_ADDRESS") };
  }
  return { kind: "scheduled" };
}

const input = await closeShift({
  db: neonDb(required("DATABASE_URL")),
  chain: viemChainReader(),
  stakes: apiStakeReader(),
  floorData: () => fetchFloorData(),
  now: new Date(),
  trigger: readTrigger(),
  capCents: Number(required("CREW_SHIFT_CAP_CENTS")),
  totalBudgetCents: Number(required("CREW_TOTAL_BUDGET_CENTS")),
});

if (!input) {
  console.log("nothing to claim");
  setOutput("claimed", "false");
  setOutput("run_crew", "false");
} else {
  writeWork("shift-input.json", JSON.stringify(input, null, 2));
  const runCrew = !input.darkReason && !input.failure;
  console.log(`claimed shift ${input.shift.slug}, run crew: ${runCrew}`);
  setOutput("claimed", "true");
  setOutput("run_crew", String(runCrew));
}
