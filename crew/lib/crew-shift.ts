import type { CrewResult, ReviewDecision, ShiftInput, TranscriptEntry, TriageDecision } from "@/crew/lib/contracts";
import type { StructuredModel } from "@/crew/lib/model";
import { reviewFloor } from "@/crew/lib/review";
import type { CrewRuntime, KitFile } from "@/crew/lib/runtime";
import { CREW_SUPPORT_MODEL, triageProposal } from "@/crew/lib/triage";

const MAX_TRIAGE = 5;

export type CrewOutput = {
  result: CrewResult;
  transcript: TranscriptEntry[];
  html: string | null;
  floorJson: string | null;
};

export type CrewDeps = {
  input: ShiftInput;
  model: StructuredModel;
  runtime: CrewRuntime;
  kitFiles: KitFile[];
  buildModel: string;
};

/** Triage, build, review. Never throws: every failure becomes a published result. */
export async function crewShift({ input, model, runtime, kitFiles, buildModel }: CrewDeps): Promise<CrewOutput> {
  const triage: TriageDecision[] = [];
  const reviews: ReviewDecision[] = [];
  let cost = 0;
  let sessionId: string | null = null;
  let transcript: TranscriptEntry[] = [];
  let proposalId: number | null = null;
  const models = { triage: CREW_SUPPORT_MODEL, build: null as string | null, review: null as string | null };

  const finish = (partial: Pick<CrewResult, "outcome" | "failure" | "darkReason">, html: string | null = null, floorJson: string | null = null): CrewOutput => ({
    result: { ...partial, proposalId, triage, reviews, models, sessionId, costCents: Math.ceil(cost) },
    transcript,
    html,
    floorJson,
  });
  const fail = (stage: "triage" | "build" | "review", reason: string): CrewOutput =>
    finish({ outcome: "failed", failure: { stage, reason: reason.slice(0, 500) }, darkReason: null });

  let accepted: { id: number; text: string; brief: string } | null = null;
  try {
    for (const entry of (input.tally?.entries ?? []).slice(0, MAX_TRIAGE)) {
      const { decision, costCents } = await triageProposal(model, entry.proposalId, entry.text);
      cost += costCents;
      triage.push(decision);
      if (decision.decision === "accept") {
        accepted = { id: entry.proposalId, text: entry.text, brief: decision.buildBrief ?? "" };
        break;
      }
    }
  } catch (error) {
    return fail("triage", error instanceof Error ? error.message : "triage failed");
  }
  if (!accepted) return finish({ outcome: "dark", failure: null, darkReason: "no proposal passed triage" });
  proposalId = accepted.id;
  models.build = buildModel;

  const attempt = async (run: () => ReturnType<CrewRuntime["build"]>): Promise<{ html: string; floorJson: string } | CrewOutput> => {
    let build;
    try {
      build = await run();
    } catch (error) {
      return fail("build", error instanceof Error ? error.message : "the build failed");
    }
    sessionId = build.sessionId;
    cost += build.costCents;
    transcript = build.transcript;
    if (build.status !== "done") return fail("build", build.reason ?? "the build did not finish");
    if (!build.html || !build.floorJson) return fail("build", "The agent did not write index.html and floor.json.");
    return { html: build.html, floorJson: build.floorJson };
  };

  const brief = accepted.brief;
  const text = accepted.text;
  const shiftSlug = input.shift.slug;
  let files = await attempt(() => runtime.build({ shiftSlug, brief, proposalText: text, kitFiles }));
  if ("result" in files) return files;

  models.review = CREW_SUPPORT_MODEL;
  try {
    const first = await reviewFloor(model, brief, files.html, files.floorJson);
    cost += first.costCents;
    reviews.push(first.decision);
    if (first.decision.decision === "send-back") {
      const id = sessionId ?? "";
      const reasons = first.decision.reasons;
      files = await attempt(() => runtime.sendBack(id, reasons));
      if ("result" in files) return files;
      const second = await reviewFloor(model, brief, files.html, files.floorJson);
      cost += second.costCents;
      reviews.push(second.decision);
      if (second.decision.decision === "send-back") return fail("review", `The review agent sent the floor back twice: ${second.decision.reasons.join(" ")}`);
    }
  } catch (error) {
    return fail("review", error instanceof Error ? error.message : "review failed");
  }
  return finish({ outcome: "built", failure: null, darkReason: null }, files.html, files.floorJson);
}
