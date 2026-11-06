import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ReviewDecision } from "@/crew/lib/contracts";
import type { JsonSchema, StructuredModel } from "@/crew/lib/model";
import { CREW_SUPPORT_MODEL } from "@/crew/lib/triage";

const REVIEW_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["decision", "reasons"],
  properties: {
    decision: { type: "string", enum: ["ship", "send-back"] },
    reasons: { type: "array", items: { type: "string" } },
  },
};

const encode = (text: string): string => JSON.stringify(text).replace(/</g, "\\u003c");

export type ReviewOutcome = { decision: ReviewDecision; costCents: number };

export async function reviewFloor(model: StructuredModel, brief: string, html: string, floorJson: string): Promise<ReviewOutcome> {
  const user = `<brief>${encode(brief)}</brief>\n<floor_html>${encode(html)}</floor_html>\n<floor_json>${encode(floorJson)}</floor_json>`;
  const system = readFileSync(join(process.cwd(), "crew", "prompts", "review.md"), "utf8");
  const result = await model({ model: CREW_SUPPORT_MODEL, system, user, schema: REVIEW_SCHEMA, maxTokens: 3000 });
  if (result.refused) return { decision: { decision: "send-back", reasons: ["The review model declined to assess this floor."] }, costCents: result.costCents };
  const value = result.value as { decision?: unknown; reasons?: unknown } | null;
  const reasons = Array.isArray(value?.reasons) ? value.reasons.slice(0, 10).map((reason) => String(reason).slice(0, 300)) : [];
  const parsed = ReviewDecision.safeParse({ decision: value?.decision, reasons });
  if (!parsed.success) throw new Error("review returned an invalid decision");
  return { decision: parsed.data, costCents: result.costCents };
}
