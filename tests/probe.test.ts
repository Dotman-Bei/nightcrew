import { describe, expect, it } from "vitest";
import { openRouterClient, BUILD_MAX_TOKENS, BUILD_MIN_MAX_TOKENS, type Transport } from "@/crew/lib/openrouter";
import { runProbe, suggestedTotal, type ProbeResult } from "@/crew/lib/probe";
import { fakeOpenRouter, messageReply, streamReply, streamToolReply, textBlock, thinkingBlock, toolBlock, type FakeReply, type FakeRequest } from "./helpers/fake-openrouter";

type World = {
  key?: FakeReply;
  endpoints?: FakeReply;
  /** Replaces the reply to a model call. Return undefined for the normal reply. */
  call?: (request: FakeRequest) => FakeReply | undefined;
  noCost?: boolean;
};

const KEY: FakeReply = { body: { data: { limit: 4.7, limit_remaining: 4.7, usage: 0, is_free_tier: false } } };
const ENDPOINTS: FakeReply = { body: { data: { endpoints: [{ tag: "anthropic", supported_parameters: ["tools", "tool_choice"], pricing: { prompt: "0.000002", completion: "0.00001" } }] } } };

/** A working OpenRouter, unless the world says otherwise. */
function world({ key = KEY, endpoints = ENDPOINTS, call, noCost }: World = {}) {
  const cost = noCost ? null : 0.001;
  return fakeOpenRouter((request) => {
    if (request.url.endsWith("/v1/key")) return key;
    if (request.url.includes("/endpoints")) return endpoints;
    if (request.url.includes("/v1/generation")) return { body: { data: { total_cost: 0.001 } } };
    const replaced = call?.(request);
    if (replaced) return replaced;
    const body = request.body as { stream?: boolean; messages: { content: unknown }[]; tools?: { name: string }[]; output_config?: { format?: unknown }; tool_choice?: unknown };
    if (body.stream && body.tools) return body.messages.length === 1 ? streamToolReply("read_nonce", {}, "toolu_1", null) : streamReply("NC-7319", null);
    if (body.stream) return streamReply("ok", null);
    if (body.tools?.[0]?.name === "read_nonce") {
      return body.messages.length === 1 ? messageReply([thinkingBlock(), toolBlock("read_nonce", {})], { cost }) : messageReply([textBlock("NC-7319")], { cost });
    }
    if (body.tools?.[0]?.name === "answer") return messageReply([toolBlock("answer", { decision: "accept", note: null })], { cost });
    if (body.output_config?.format) return messageReply([textBlock('{"decision":"accept","note":null}')], { cost });
    return messageReply([textBlock("1\n2\n3")], { cost, stop: "max_tokens", outputTokens: 16000 });
  });
}

async function probe(options: World = {}, settings: { mode?: "json-schema" | "forced-tool"; transport?: Transport } = {}) {
  const fake = world(options);
  const lines: string[] = [];
  const report = await runProbe({
    client: openRouterClient("sk-or-test", { fetch: fake.fetch }),
    mode: settings.mode ?? "json-schema",
    transport: settings.transport ?? "non-stream",
    log: (line) => lines.push(line),
  });
  return { report, lines, requests: fake.requests };
}

const modelCalls = (requests: FakeRequest[]) => requests.filter((request) => request.url.endsWith("/v1/messages"));
const expectResult = (result: ProbeResult, actual: ProbeResult) => expect(actual).toBe(result);

describe("the OpenRouter probe", () => {
  it("passes when everything works, and prints the credit and the budget to set", async () => {
    const { report } = await probe();
    expect(report.result).toBe("ok");
    expect(report.remaining).toBe(4.7);
    expect(report.suggestedTotalCents).toBe(440);
    expect(report.spentCents).toBeGreaterThan(0);
  });
  it("tries both models at the build's real token limit, through Anthropic only", async () => {
    const { requests } = await probe();
    const tools = modelCalls(requests).filter((request) => (request.body.tools as { name: string }[] | undefined)?.[0]?.name === "read_nonce");
    expect(tools.map((request) => request.body.model)).toEqual(["anthropic/claude-sonnet-5.5", "anthropic/claude-sonnet-5.5", "anthropic/claude-haiku-5.5", "anthropic/claude-haiku-5.5"]);
    for (const request of tools) {
      expect(request.body.max_tokens).toBe(BUILD_MAX_TOKENS);
      expect(request.body.provider).toEqual({ only: ["anthropic"], allow_fallbacks: false });
    }
  });
  it("sends thinking blocks back unchanged on the second turn", async () => {
    const { requests } = await probe();
    const second = modelCalls(requests)[1].body.messages as { role: string; content: { type: string; signature?: string }[] }[];
    expect(second[1].content[0]).toEqual({ type: "thinking", thinking: "", signature: "sig-1" });
  });
  it("reports where a streamed call's cost comes from", async () => {
    expect((await probe()).report.streamCost).toBe("lookup");
    const inline = await probe({ call: (request) => (request.body.stream ? streamReply("ok", 0.001) : undefined) });
    expect(inline.report.streamCost).toBe("response");
    const none = await probe({ call: (request) => (request.body.stream && !request.body.tools ? { status: 400, body: {} } : undefined) });
    expect(none.report.streamCost).toBe("none");
    expect(none.report.result).toBe("ok");
  });
  it("fails on a bad key", async () => {
    expectResult("key-invalid", (await probe({ key: { status: 401, body: { error: { message: "User not found." } } } })).report.result);
  });
  it("fails when the key has no credit limit, because nothing then reports what remains", async () => {
    const { report } = await probe({ key: { body: { data: { limit: null, limit_remaining: null, usage: 0, is_free_tier: false } } } });
    expectResult("no-credit-figure", report.result);
    expect(report.detail).toContain("Set a limit on the key");
  });
  it("fails when a slug does not resolve or Anthropic does not serve it", async () => {
    expectResult("model-missing", (await probe({ endpoints: { status: 404, body: {} } })).report.result);
    expectResult("model-missing", (await probe({ endpoints: { body: { data: { endpoints: [{ tag: "azure", supported_parameters: ["tools"] }] } } } })).report.result);
  });
  it("fails when the model will not use the tool", async () => {
    expectResult("tools-failed", (await probe({ call: (request) => ((request.body.tools as { name: string }[] | undefined)?.[0]?.name === "read_nonce" ? messageReply([textBlock("no")]) : undefined) })).report.result);
  });
  it("fails when no cost is reported", async () => {
    expectResult("no-cost", (await probe({ noCost: true })).report.result);
  });
  it("fails with no credit", async () => {
    expectResult("no-credit", (await probe({ call: () => ({ status: 402, body: { error: { message: "m", metadata: { limit_source: "openrouter_key_limit" } } } }) })).report.result);
  });
  it("drops to the build's smaller token limit if the larger will not fit the in-flight budget", async () => {
    const tooLarge = { status: 402, body: { error: { message: "m", metadata: { reason: "weight_exceeds_budget" } } } };
    const fits = await probe({ call: (request) => (request.body.max_tokens === BUILD_MAX_TOKENS && (request.body.tools as unknown[] | undefined) ? tooLarge : undefined) });
    expect(fits.report.result).toBe("ok");
    expect(modelCalls(fits.requests).some((request) => request.body.max_tokens === BUILD_MIN_MAX_TOKENS)).toBe(true);
    expectResult("too-large", (await probe({ call: () => tooLarge })).report.result);
  });
  it("says to use a forced tool when schema output fails but that works", async () => {
    const failing = { call: (request: FakeRequest) => ((request.body.output_config as { format?: unknown } | undefined)?.format ? messageReply([textBlock("prose")]) : undefined) };
    const { report } = await probe(failing);
    expectResult("structured-output-unsupported", report.result);
    expect(report.detail).toContain("forced-tool");
    expect((await probe(failing, { mode: "forced-tool" })).report.result).toBe("ok");
  });
  it("says to stream when a long non-streamed call drops", async () => {
    const dropped = { call: (request: FakeRequest) => (!request.body.stream && !request.body.tools && !(request.body.output_config as { format?: unknown }).format ? { status: 400, body: {} } : undefined) };
    const { report } = await probe(dropped);
    expectResult("long-call-dropped", report.result);
    expect(report.detail).toContain("CREW_BUILD_TRANSPORT");
    expect((await probe(dropped, { transport: "stream" })).report.result).toBe("ok");
  });
  it("refuses to pass in stream mode if a stream reports no cost by either route", async () => {
    expectResult("no-cost", (await probe({ call: (request) => (request.body.stream && !request.body.tools ? { status: 400, body: {} } : undefined) }, { transport: "stream" })).report.result);
  });
  it("suggests a total that leaves the margin, and never above the plan", () => {
    expect(suggestedTotal(4.7)).toBe(440);
    expect(suggestedTotal(4.68)).toBe(438);
    expect(suggestedTotal(4.5)).toBe(420);
    expect(suggestedTotal(9.2)).toBe(440);
  });
});
