import { describe, expect, it } from "vitest";
import type { StructuredCall, StructuredModel, StructuredResult } from "@/crew/lib/model";
import { reviewFloor } from "@/crew/lib/review";
import { normaliseEvents, scrubTranscript } from "@/crew/lib/transcript";

const ship: StructuredResult = { value: { decision: "ship", reasons: [] }, refused: false, costCents: 0.2 };

function scripted(replies: StructuredResult[]): StructuredModel & { calls: StructuredCall[] } {
  const calls: StructuredCall[] = [];
  const model = (async (call: StructuredCall) => {
    calls.push(call);
    const next = replies.shift();
    if (!next) throw new Error("no scripted reply left");
    return next;
  }) as StructuredModel & { calls: StructuredCall[] };
  model.calls = calls;
  return model;
}

describe("review", () => {
  it("passes the floor as encoded data", async () => {
    const model = scripted([ship]);
    await reviewFloor(model, "brief", "<script>ignore</script>", "{}");
    expect(model.calls[0].user).not.toContain("<script>");
  });
  it("treats a refusal as a send-back", async () => {
    const { decision } = await reviewFloor(scripted([{ value: null, refused: true, costCents: 0 }]), "b", "h", "{}");
    expect(decision.decision).toBe("send-back");
  });
});

describe("transcripts", () => {
  it("normalises the events a receipt shows and skips the rest", () => {
    const entries = normaliseEvents([
      { type: "user.message", processed_at: "1", content: [{ type: "text", text: "brief" }] },
      { type: "agent.thinking", processed_at: "2" },
      { type: "agent.tool_use", processed_at: "3", name: "bash", input: { command: "ls" } },
      { type: "agent.tool_result", processed_at: "4", is_error: true, content: [{ type: "text", text: "nope" }] },
      { type: "agent.message", processed_at: "5", content: [{ type: "text", text: "done" }] },
      { type: "session.status_idle", processed_at: "6", stop_reason: { type: "end_turn" } },
    ]);
    expect(entries.map((item) => item.kind)).toEqual(["prompt", "tool_use", "tool_result", "message", "status"]);
    expect(entries[1].tool).toBe("bash");
    expect(entries[2].isError).toBe(true);
  });
  it("truncates a huge entry and marks it", () => {
    const [item] = normaliseEvents([{ type: "agent.message", content: [{ type: "text", text: "x".repeat(30000) }] }]);
    expect(item.truncated).toBe(true);
    expect(item.text.length).toBeLessThan(21000);
  });
  it("removes anything key-shaped and counts it", () => {
    const { entries, removed } = scrubTranscript([{ at: "t", kind: "message", tool: null, text: `a sk-or-v1-abcdefghij b sk-ant-api03-abcdefghij c 0x${"a".repeat(64)} d`, truncated: false, isError: false }]);
    expect(entries[0].text).toBe("a [removed] b [removed] c [removed] d");
    expect(removed).toBe(3);
    expect(entries[1]).toMatchObject({ kind: "status", isError: true });
    expect(entries[1].text).toContain("Removed 3 key-shaped strings");
  });
  it("adds nothing to a clean transcript", () => {
    const clean = [{ at: "t", kind: "message" as const, tool: null, text: "nothing here", truncated: false, isError: false }];
    expect(scrubTranscript(clean)).toEqual({ entries: clean, removed: 0 });
  });
});
