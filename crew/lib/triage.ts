import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TriageDecision, TriageCategory } from "@/crew/lib/contracts";
import type { JsonSchema, StructuredModel } from "@/crew/lib/model";

export const CREW_SUPPORT_MODEL = "claude-haiku-5-5";

const TRIAGE_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["decision", "category", "reason", "buildBrief"],
  properties: {
    decision: { type: "string", enum: ["accept", "reject"] },
    category: { type: "string", enum: TriageCategory.options },
    reason: { type: "string" },
    buildBrief: { type: ["string", "null"] },
  },
};

export function triageSystemPrompt(): string {
  return readFileSync(join(process.cwd(), "crew", "prompts", "triage.md"), "utf8");
}

/** JSON-encodes the proposal, so it cannot close the block it sits in. */
export function triageUserMessage(text: string): string {
  return `<proposal>${JSON.stringify(text).replace(/</g, "\\u003c")}</proposal>`;
}

export type TriageOutcome = { decision: TriageDecision; costCents: number };

export async function triageProposal(model: StructuredModel, proposalId: number, text: string): Promise<TriageOutcome> {
  const result = await model({ model: CREW_SUPPORT_MODEL, system: triageSystemPrompt(), user: triageUserMessage(text), schema: TRIAGE_SCHEMA, maxTokens: 2000 });
  const reject = (category: TriageCategory, reason: string): TriageOutcome => ({
    decision: { proposalId, decision: "reject", category, reason, buildBrief: null },
    costCents: result.costCents,
  });
  if (result.refused) return reject("model-refusal", "The model declined to assess this proposal.");
  const value = result.value as { reason?: unknown; buildBrief?: unknown } | null;
  const parsed = TriageDecision.safeParse({
    ...(value ?? {}),
    proposalId,
    reason: typeof value?.reason === "string" ? value.reason.slice(0, 200) : value?.reason,
    buildBrief: typeof value?.buildBrief === "string" ? value.buildBrief.slice(0, 800) : value?.buildBrief,
  });
  if (!parsed.success) throw new Error("triage returned an invalid decision");
  const decision = parsed.data;
  if (decision.decision === "accept" && (!decision.buildBrief || decision.category !== "ok")) throw new Error("triage accepted without a brief");
  return { decision, costCents: result.costCents };
}
