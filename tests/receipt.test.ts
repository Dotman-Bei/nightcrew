import { describe, expect, it } from "vitest";
import { keccak256, toBytes } from "viem";
import { canonicalJson } from "@/lib/canonical";
import { buildReceipt } from "@/lib/receipt";

const fields = {
  shift: { slug: "3", label: "scheduled" as const, closes_at: "c", started_at: "s", finished_at: "f", snapshot_block: "9" },
  proposal: { id: 12, text: "A calculator", author: "0xabc", seeded: false },
  outcome: "shipped" as const,
  failure: null,
  dark_reason: null,
  models: { triage: "claude-haiku-5-5", build: "claude-sonnet-5-5", review: "claude-haiku-5-5" },
  founder_address: "0x0000000000000000000000000000000000000001",
  cost_cents: 41,
  timestamp: "t",
};
const parts = {
  tally: { entries: [] },
  triage: [{ proposalId: 12 }],
  transcript: [{ text: "hi" }],
  floorHtml: "<html></html>",
  diff: "--- a\n+++ b\n",
  tests: [{ name: "a", pass: true, detail: null }, { name: "b", pass: false, detail: "x" }],
};

describe("buildReceipt", () => {
  const receipt = buildReceipt(fields, parts);

  it("uses the Origin Capsule field names", () => {
    expect(receipt.bundle).toMatchObject({ standard: "nightcrew-receipt/1", agent_identity: "night-crew", model_provider: "Anthropic", founder_address: fields.founder_address });
  });
  it("hashes each part as keccak256 of the exact bytes it serves", () => {
    expect(receipt.bundle.transcript_hash).toBe(keccak256(toBytes(receipt.parts["transcript.json"])));
    expect(receipt.bundle.floor_hash).toBe(keccak256(toBytes("<html></html>")));
    expect(receipt.bundle.diff_hash).toBe(keccak256(toBytes(receipt.parts["diff.patch"])));
    expect(receipt.bundle.tally_hash).toBe(keccak256(toBytes(canonicalJson(parts.tally))));
  });
  it("counts tests and hashes them", () => {
    expect(receipt.bundle.tests).toMatchObject({ passed: 1, total: 2 });
  });
  it("hashes the canonical bundle into the receipt hash, and serves that exact text", () => {
    expect(receipt.receiptHash).toBe(keccak256(toBytes(receipt.parts["bundle.json"])));
    expect(receipt.parts["bundle.json"]).toBe(canonicalJson(receipt.bundle));
  });
  it("is deterministic", () => {
    expect(buildReceipt(fields, parts).receiptHash).toBe(receipt.receiptHash);
  });
  it("changes the hash when any part changes", () => {
    expect(buildReceipt(fields, { ...parts, transcript: [{ text: "tampered" }] }).receiptHash).not.toBe(receipt.receiptHash);
  });
  it("has null hashes for a dark shift with no floor", () => {
    const dark = buildReceipt({ ...fields, outcome: "dark", dark_reason: "no proposals", proposal: null }, { tally: {}, triage: [], transcript: null, floorHtml: null, diff: null, tests: null });
    expect(dark.bundle).toMatchObject({ transcript_hash: null, floor_hash: null, diff_hash: null, tests: null });
    expect(Object.keys(dark.parts).sort()).toEqual(["bundle.json", "tally.json", "triage.json"]);
  });
});
