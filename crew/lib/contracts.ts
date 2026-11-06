import { z } from "zod";
import { Tally } from "@/lib/tally";

/** Every file that passes between shift jobs is validated against these before use. */

export const FailureStage = z.enum(["close", "triage", "build", "review", "verify", "publish"]);
export const Failure = z.object({ stage: FailureStage, reason: z.string().max(500) });
export type Failure = z.infer<typeof Failure>;

export const ShiftInput = z.object({
  shift: z.object({
    id: z.number(),
    slug: z.string().max(20),
    label: z.enum(["scheduled", "off-schedule", "rehearsal"]),
    closesAt: z.string(),
    startedAt: z.string(),
  }),
  tally: Tally.nullable(),
  snapshot: z.string().max(100_000),
  /** Set when the crew must not run: the shift goes dark for this reason. */
  darkReason: z.string().max(200).nullable(),
  failure: Failure.nullable(),
});
export type ShiftInput = z.infer<typeof ShiftInput>;

export const TriageCategory = z.enum(["ok", "offensive", "illegal", "impersonation", "investment", "contest-vote", "needs-backend", "needs-wallet", "too-large", "not-a-tool", "injection", "model-refusal"]);
export type TriageCategory = z.infer<typeof TriageCategory>;

export const TriageDecision = z.object({
  proposalId: z.number(),
  decision: z.enum(["accept", "reject"]),
  category: TriageCategory,
  reason: z.string().max(200),
  buildBrief: z.string().max(800).nullable(),
});
export type TriageDecision = z.infer<typeof TriageDecision>;

export const ReviewDecision = z.object({
  decision: z.enum(["ship", "send-back"]),
  reasons: z.array(z.string().max(300)).max(10),
});
export type ReviewDecision = z.infer<typeof ReviewDecision>;

export const CrewResult = z.object({
  outcome: z.enum(["built", "dark", "failed"]),
  failure: Failure.nullable(),
  darkReason: z.string().max(200).nullable(),
  proposalId: z.number().nullable(),
  triage: z.array(TriageDecision),
  reviews: z.array(ReviewDecision),
  models: z.object({ triage: z.string(), build: z.string().nullable(), review: z.string().nullable() }),
  sessionId: z.string().nullable(),
  costCents: z.number().int().min(0),
});
export type CrewResult = z.infer<typeof CrewResult>;

export const TranscriptEntry = z.object({
  at: z.string(),
  kind: z.enum(["prompt", "message", "tool_use", "tool_result", "error", "status"]),
  tool: z.string().nullable(),
  text: z.string(),
  truncated: z.boolean(),
  isError: z.boolean(),
});
export type TranscriptEntry = z.infer<typeof TranscriptEntry>;
export const Transcript = z.array(TranscriptEntry);

export const Verdict = z.object({
  pass: z.boolean(),
  static: z.array(z.object({ rule: z.string(), detail: z.string() })),
  floorJsonIssues: z.array(z.string()),
  violations: z.array(z.object({ kind: z.string(), detail: z.string() })),
  errors: z.array(z.string()),
  tests: z.array(z.object({ name: z.string(), pass: z.boolean(), detail: z.string().nullable() })),
  floorHash: z.string().nullable(),
  scriptHashes: z.string().nullable(),
});
export type Verdict = z.infer<typeof Verdict>;
