import { canonicalJson } from "@/lib/canonical";
import { keccakText } from "@/lib/hash";

export type ReceiptOutcome = "shipped" | "failed" | "dark";
export type ReceiptFailure = { stage: "close" | "triage" | "build" | "review" | "verify" | "publish"; reason: string };

/** Field names follow Vibestarter's Origin Capsule where they overlap. */
export type ReceiptBundle = {
  standard: "nightcrew-receipt/1";
  shift: { slug: string; label: "scheduled" | "off-schedule" | "rehearsal"; closes_at: string; started_at: string; finished_at: string; snapshot_block: string | null };
  proposal: { id: number; text: string; author: string; seeded: boolean } | null;
  outcome: ReceiptOutcome;
  failure: ReceiptFailure | null;
  dark_reason: string | null;
  agent_identity: "night-crew";
  agent_tool: "Night Crew tool loop on OpenRouter";
  model_provider: "Anthropic via OpenRouter";
  models: { triage: string; build: string | null; review: string | null };
  founder_address: string;
  tally_hash: string;
  triage_hash: string;
  transcript_hash: string | null;
  floor_hash: string | null;
  diff_hash: string | null;
  tests: { passed: number; total: number; hash: string } | null;
  cost_cents: number;
  timestamp: string;
};

export type ReceiptParts = {
  tally: unknown;
  triage: unknown;
  transcript: unknown | null;
  floorHtml: string | null;
  diff: string | null;
  tests: { name: string; pass: boolean; detail: string | null }[] | null;
};

export type BuiltReceipt = {
  bundle: ReceiptBundle;
  bundleText: string;
  receiptHash: `0x${string}`;
  /** Name to exact bytes, served at /api/receipts/[slug]/[part] so anyone can re-hash them. */
  parts: Record<string, string>;
};

export function buildReceipt(fields: Omit<ReceiptBundle, "standard" | "agent_identity" | "agent_tool" | "model_provider" | "tally_hash" | "triage_hash" | "transcript_hash" | "floor_hash" | "diff_hash" | "tests">, parts: ReceiptParts): BuiltReceipt {
  const out: Record<string, string> = {
    "tally.json": canonicalJson(parts.tally),
    "triage.json": canonicalJson(parts.triage),
  };
  if (parts.transcript !== null) out["transcript.json"] = canonicalJson(parts.transcript);
  if (parts.floorHtml !== null) out["floor.html"] = parts.floorHtml;
  if (parts.diff !== null) out["diff.patch"] = parts.diff;
  if (parts.tests !== null) out["tests.json"] = canonicalJson(parts.tests);

  const hashOf = (name: string): string | null => (out[name] === undefined ? null : keccakText(out[name]));
  const bundle: ReceiptBundle = {
    ...fields,
    standard: "nightcrew-receipt/1",
    agent_identity: "night-crew",
    agent_tool: "Night Crew tool loop on OpenRouter",
    model_provider: "Anthropic via OpenRouter",
    tally_hash: keccakText(out["tally.json"]),
    triage_hash: keccakText(out["triage.json"]),
    transcript_hash: hashOf("transcript.json"),
    floor_hash: hashOf("floor.html"),
    diff_hash: hashOf("diff.patch"),
    tests: parts.tests === null ? null : { passed: parts.tests.filter((test) => test.pass).length, total: parts.tests.length, hash: keccakText(out["tests.json"]) },
  };
  const bundleText = canonicalJson(bundle);
  out["bundle.json"] = bundleText;
  return { bundle, bundleText, receiptHash: keccakText(bundleText), parts: out };
}
