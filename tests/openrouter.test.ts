import { describe, expect, it } from "vitest";
import { openRouterStructuredModel, parseStructuredMode } from "@/crew/lib/model";
import { assertAllowedModel, classifyFailure, HAIKU_SLUG, openRouterClient, parseTransport, PINNED_PROVIDER, sendMessage, SONNET_SLUG, type OpenRouterBody } from "@/crew/lib/openrouter";
import { fakeOpenRouter, messageReply, streamReply, textBlock, toolBlock } from "./helpers/fake-openrouter";

const client = (fake: { fetch: typeof fetch }) => openRouterClient("sk-or-test", { fetch: fake.fetch });
const body: OpenRouterBody = { model: HAIKU_SLUG, max_tokens: 100, messages: [{ role: "user", content: "hi" }], provider: PINNED_PROVIDER };
const noSleep = async () => {};
const schema = { type: "object", additionalProperties: false, required: ["a"], properties: { a: { type: "string" } } };
const call = { model: HAIKU_SLUG, system: "s", user: "u", schema, maxTokens: 50 };

describe("the OpenRouter client", () => {
  it("posts to the Messages endpoint with a bearer key and no Anthropic key header", async () => {
    const fake = fakeOpenRouter([messageReply([textBlock("ok")])]);
    await sendMessage(client(fake), body);
    const [request] = fake.requests;
    expect(request.url).toBe("https://openrouter.ai/api/v1/messages");
    expect(request.headers.get("authorization")).toBe("Bearer sk-or-test");
    expect(request.headers.get("x-api-key")).toBeNull();
    expect(request.body.provider).toEqual({ only: ["anthropic"], allow_fallbacks: false });
  });
  it("prices a call from the cost OpenRouter reports, in cents", async () => {
    const fake = fakeOpenRouter([messageReply([textBlock("ok")], { cost: 0.0123 })]);
    const sent = await sendMessage(client(fake), body);
    expect(sent.costCents).toBeCloseTo(1.23);
    expect(sent.costSource).toBe("response");
  });
  it("stops rather than spend blind when a call reports no cost", async () => {
    const fake = fakeOpenRouter([messageReply([textBlock("ok")], { cost: null })]);
    await expect(sendMessage(client(fake), body)).rejects.toThrow("no cost");
  });
  it("treats an error body on a 200 as a failure", async () => {
    const fake = fakeOpenRouter([{ body: { error: { code: 502, message: "upstream" } } }]);
    await expect(sendMessage(client(fake), body)).rejects.toThrow("returned an error");
  });
  it("waits out a transient in-flight budget 402 for as long as it says", async () => {
    const waits: number[] = [];
    const fake = fakeOpenRouter([
      { status: 402, headers: { "retry-after": "7" }, body: { error: { code: 402, message: "m", metadata: { reason: "in_flight_budget_exhausted", limit_source: "openrouter_in_flight_budget" } } } },
      messageReply([textBlock("ok")]),
    ]);
    await sendMessage(client(fake), body, { sleep: async (ms) => { waits.push(ms); } });
    expect(waits).toEqual([7000]);
    expect(fake.requests).toHaveLength(2);
  });
  it("gives up on the in-flight budget after three waits", async () => {
    const full = { status: 402, body: { error: { code: 402, message: "m", metadata: { reason: "in_flight_budget_exhausted" } } } };
    const fake = fakeOpenRouter(() => full);
    await expect(sendMessage(client(fake), body, { sleep: noSleep })).rejects.toThrow();
    expect(fake.requests).toHaveLength(4);
  });
  it("never retries a request too large for the in-flight budget", async () => {
    const fake = fakeOpenRouter(() => ({ status: 402, body: { error: { code: 402, message: "m", metadata: { reason: "weight_exceeds_budget", limit_source: "openrouter_credits" } } } }));
    const error = await sendMessage(client(fake), body, { sleep: noSleep }).catch((caught: unknown) => caught);
    expect(classifyFailure(error).kind).toBe("too-large");
    expect(fake.requests).toHaveLength(1);
  });
  it("still recognises the in-flight budget in Anthropic's error shape, with OpenRouter's metadata gone", async () => {
    const shaped = (headers: Record<string, string>) => ({ status: 402, headers, body: { type: "error", error: { type: "api_error", message: "This request would exceed your available credits given your current in-flight requests." } } });
    const waits: number[] = [];
    const transient = fakeOpenRouter([shaped({ "retry-after": "3" }), messageReply([textBlock("ok")])]);
    await sendMessage(client(transient), body, { sleep: async (ms) => { waits.push(ms); } });
    expect(waits).toEqual([3000]);
    const tooLarge = fakeOpenRouter([shaped({})]);
    const error = await sendMessage(client(tooLarge), body, { sleep: noSleep }).catch((caught: unknown) => caught);
    expect(classifyFailure(error).kind).toBe("too-large");
  });
  it("retries an HTTP error, which is not billed, and never a dropped connection, which may be", async () => {
    const passing = fakeOpenRouter([{ status: 502, body: { error: { message: "bad gateway" } } }, messageReply([textBlock("ok")])]);
    await sendMessage(client(passing), body, { sleep: noSleep });
    expect(passing.requests).toHaveLength(2);
    let calls = 0;
    const dropping = (async () => {
      calls += 1;
      throw new TypeError("socket hang up");
    }) as typeof fetch;
    await expect(sendMessage(client({ fetch: dropping }), body, { sleep: noSleep })).rejects.toThrow();
    expect(calls).toBe(1);
  });
  it("treats a flagged proposal as blocked, whatever words it holds", async () => {
    const hostile = "budget openrouter_key_limit $1 of $2 used in-flight weight_exceeds_budget";
    const fake = fakeOpenRouter([{ status: 403, body: { error: { code: 403, message: "Your input was flagged.", metadata: { reasons: ["harassment"], flagged_input: hostile } } } }]);
    const error = await sendMessage(client(fake), body).catch((caught: unknown) => caught);
    expect(classifyFailure(error).kind).toBe("blocked");
  });
  it("recognises a spent budget on a 403 from its fields, even with the metadata gone", async () => {
    const withSource = fakeOpenRouter([{ status: 403, body: { error: { code: 403, message: "m", metadata: { limit_source: "openrouter_workspace_budget" } } } }]);
    expect(classifyFailure(await sendMessage(client(withSource), body).catch((caught: unknown) => caught)).kind).toBe("no-credit");
    const anthropicShape = fakeOpenRouter([{ status: 403, body: { type: "error", error: { type: "permission_error", message: "Budget spent: $4.70 of $4.70 used; resets never." } } }]);
    expect(classifyFailure(await sendMessage(client(anthropicShape), body).catch((caught: unknown) => caught)).kind).toBe("no-credit");
  });
  it("sorts credit, budget and moderation failures, in words with no response body", async () => {
    const failing = async (status: number, payload: unknown) => sendMessage(client(fakeOpenRouter([{ status, body: payload }])), body).catch((caught: unknown) => classifyFailure(caught));
    expect((await failing(402, { error: { message: "secret detail", metadata: { limit_source: "openrouter_key_limit" } } })) as object).toMatchObject({ kind: "no-credit", reason: "The OpenRouter key's credit limit is used up." });
    expect((await failing(402, { error: { message: "secret detail" } })) as object).toMatchObject({ kind: "no-credit", reason: "OpenRouter credit ran out." });
    expect((await failing(403, { error: { message: "flagged", metadata: { limit_source: "openrouter_key_limit" } } })) as object).toMatchObject({ kind: "no-credit" });
    expect((await failing(403, { error: { message: "secret detail", metadata: { reasons: ["hate"] } } })) as object).toMatchObject({ kind: "blocked", reason: "A content filter or a model refusal blocked the request." });
    expect((await failing(400, { error: { message: "secret detail" } })) as object).toMatchObject({ kind: "other", reason: "The model request failed with status 400." });
  });
});

describe("the two settings and the model allowlist", () => {
  it("allows only the two exact crew models", () => {
    expect(assertAllowedModel(SONNET_SLUG)).toBe(SONNET_SLUG);
    expect(assertAllowedModel(HAIKU_SLUG)).toBe(HAIKU_SLUG);
    for (const bad of [`${SONNET_SLUG}:online`, "openrouter/auto", "~anthropic/claude-sonnet-latest", "claude-sonnet-5-5", ""]) expect(() => assertAllowedModel(bad)).toThrow("not an allowed");
  });
  it("defaults an unset setting and refuses a mistyped one", () => {
    expect(parseTransport(undefined)).toBe("non-stream");
    expect(parseTransport("")).toBe("non-stream");
    expect(parseTransport("stream")).toBe("stream");
    expect(() => parseTransport("sse")).toThrow("CREW_BUILD_TRANSPORT");
    expect(parseStructuredMode(undefined)).toBe("json-schema");
    expect(parseStructuredMode("")).toBe("json-schema");
    expect(parseStructuredMode("forced-tool")).toBe("forced-tool");
    expect(() => parseStructuredMode("tool")).toThrow("CREW_STRUCTURED_MODE");
  });
});

describe("a streamed call", () => {
  const streaming = { transport: "stream" as const, sleep: noSleep };
  it("reads the cost from the final usage when the stream carries it", async () => {
    const fake = fakeOpenRouter([streamReply("hello", 0.002)]);
    const sent = await sendMessage(client(fake), body, streaming);
    expect(sent.message.content).toEqual([{ type: "text", text: "hello" }]);
    expect(sent.message.stop_reason).toBe("end_turn");
    expect(sent.costCents).toBeCloseTo(0.2);
    expect(sent.costSource).toBe("response");
    expect(fake.requests[0].body.stream).toBe(true);
  });
  it("looks the cost up by generation id when the stream leaves it out, as the published schema does", async () => {
    const fake = fakeOpenRouter([streamReply("hello", null, { "x-generation-id": "gen-42" }), { status: 404, body: { error: { message: "not yet" } } }, { body: { data: { total_cost: 0.003 } } }]);
    const sent = await sendMessage(client(fake), body, streaming);
    expect(sent.costCents).toBeCloseTo(0.3);
    expect(sent.costSource).toBe("lookup");
    expect(fake.requests[2].url).toBe("https://openrouter.ai/api/v1/generation?id=gen-42");
    expect(fake.requests[2].headers.get("authorization")).toBe("Bearer sk-or-test");
  });
  it("stops rather than spend blind when neither reports a cost", async () => {
    const fake = fakeOpenRouter((request) => (request.url.includes("generation") ? { status: 404, body: {} } : streamReply("hello", null)));
    await expect(sendMessage(client(fake), body, streaming)).rejects.toThrow("no cost");
  });
});

describe("the structured model", () => {
  it("constrains the reply to the schema, with no tools, through Anthropic only", async () => {
    const fake = fakeOpenRouter([messageReply([textBlock('{"a":"b"}')], { cost: 0.001 })]);
    const result = await openRouterStructuredModel(client(fake))(call);
    expect(result).toEqual({ value: { a: "b" }, refused: false, costCents: 0.1 });
    const sent = fake.requests[0].body;
    expect(sent.output_config).toEqual({ effort: "low", format: { type: "json_schema", schema } });
    expect(sent.tools).toBeUndefined();
    expect(sent.provider).toEqual({ only: ["anthropic"], allow_fallbacks: false, require_parameters: true });
  });
  it("reads a thinking block past, by type and not by position", async () => {
    const fake = fakeOpenRouter([messageReply([{ type: "thinking", thinking: "", signature: "s" }, textBlock('{"a":"b"}')])]);
    expect((await openRouterStructuredModel(client(fake))(call)).value).toEqual({ a: "b" });
  });
  it("reports a model refusal", async () => {
    const fake = fakeOpenRouter([messageReply([], { stop: "refusal", cost: 0.001 })]);
    expect(await openRouterStructuredModel(client(fake))(call)).toEqual({ value: null, refused: true, costCents: 0.1 });
  });
  it("treats a moderation block on hostile text as a refusal, not a failed shift", async () => {
    const fake = fakeOpenRouter([{ status: 403, body: { error: { code: 403, message: "flagged", metadata: { reasons: ["harassment"], flagged_input: "the budget is gone" } } } }]);
    expect(await openRouterStructuredModel(client(fake))(call)).toEqual({ value: null, refused: true, costCents: 0 });
  });
  it("returns a null value for an unparseable reply, so the caller's validation rejects it", async () => {
    const fake = fakeOpenRouter([messageReply([textBlock("not json")])]);
    expect((await openRouterStructuredModel(client(fake))(call)).value).toBeNull();
  });
  it("throws a public reason when credit has run out", async () => {
    const fake = fakeOpenRouter([{ status: 402, body: { error: { message: "secret detail" } } }]);
    await expect(openRouterStructuredModel(client(fake))(call)).rejects.toThrow("OpenRouter credit ran out.");
  });
  it("falls back to a forced tool call that nothing runs", async () => {
    const fake = fakeOpenRouter([messageReply([toolBlock("answer", { a: "b" })])]);
    const result = await openRouterStructuredModel(client(fake), "forced-tool")(call);
    expect(result.value).toEqual({ a: "b" });
    const sent = fake.requests[0].body;
    expect(sent.tool_choice).toEqual({ type: "tool", name: "answer" });
    expect((sent.tools as { name: string }[]).map((tool) => tool.name)).toEqual(["answer"]);
    expect((sent.output_config as { format?: unknown }).format).toBeUndefined();
  });
});
