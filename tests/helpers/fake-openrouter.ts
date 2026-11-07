/** A scripted stand-in for OpenRouter, passed to the real SDK as its fetch. No test spends or needs a key. */
export type FakeReply = {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
  /** Server-sent events, for a streamed reply. */
  events?: { event: string; data: unknown }[];
};

export type FakeRequest = { url: string; method: string; headers: Headers; body: Record<string, unknown> };

export function fakeOpenRouter(script: FakeReply[] | ((request: FakeRequest) => FakeReply)) {
  const requests: FakeRequest[] = [];
  const queue = Array.isArray(script) ? [...script] : null;
  const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof init?.body === "string" ? init.body : null;
    const request: FakeRequest = {
      url: String(input),
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      body: raw ? (JSON.parse(raw) as Record<string, unknown>) : {},
    };
    requests.push(request);
    const reply = queue ? queue.shift() : (script as (request: FakeRequest) => FakeReply)(request);
    if (!reply) throw new Error(`no scripted reply left for ${request.url}`);
    if (reply.events) {
      const text = reply.events.map((item) => `event: ${item.event}\ndata: ${JSON.stringify(item.data)}\n\n`).join("");
      return new Response(text, { status: 200, headers: { "content-type": "text/event-stream", ...reply.headers } });
    }
    return new Response(JSON.stringify(reply.body ?? {}), { status: reply.status ?? 200, headers: { "content-type": "application/json", ...reply.headers } });
  }) as typeof fetch;
  return { fetch: fakeFetch, requests };
}

type Block = Record<string, unknown>;

export function messageReply(content: Block[], options: { cost?: number | null; stop?: string; id?: string; inputTokens?: number; outputTokens?: number } = {}): FakeReply {
  const usage: Record<string, unknown> = { input_tokens: options.inputTokens ?? 100, output_tokens: options.outputTokens ?? 50 };
  if (options.cost !== null) usage.cost = options.cost ?? 0.01;
  const stop = options.stop ?? (content.some((block) => block.type === "tool_use") ? "tool_use" : "end_turn");
  return { body: { id: options.id ?? "gen-1", type: "message", role: "assistant", model: "m", content, stop_reason: stop, stop_sequence: null, usage } };
}

export const textBlock = (text: string): Block => ({ type: "text", text });
export const toolBlock = (name: string, input: unknown, id = `toolu_${name}`): Block => ({ type: "tool_use", id, name, input });
export const thinkingBlock = (signature = "sig-1"): Block => ({ type: "thinking", thinking: "", signature });

/** The events of one streamed tool call, sent as the SDK expects: a start, then its input as JSON pieces. */
export function streamToolReply(name: string, input: unknown, id: string, cost: number | null): FakeReply {
  const usage: Record<string, unknown> = { input_tokens: 10, output_tokens: 5 };
  if (cost !== null) usage.cost = cost;
  return {
    events: [
      { event: "message_start", data: { type: "message_start", message: { id: "msg_1", type: "message", role: "assistant", model: "m", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } } } },
      { event: "content_block_start", data: { type: "content_block_start", index: 0, content_block: { type: "tool_use", id, name, input: {} } } },
      { event: "content_block_delta", data: { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: JSON.stringify(input) } } },
      { event: "content_block_stop", data: { type: "content_block_stop", index: 0 } },
      { event: "message_delta", data: { type: "message_delta", delta: { stop_reason: "tool_use", stop_sequence: null }, usage } },
      { event: "message_stop", data: { type: "message_stop" } },
    ],
  };
}

/** The events of one streamed text reply. Set cost to null to leave it out, as the published schema does. */
export function streamReply(text: string, cost: number | null, headers: Record<string, string> = {}): FakeReply {
  const usage: Record<string, unknown> = { input_tokens: 10, output_tokens: 5 };
  if (cost !== null) usage.cost = cost;
  return {
    headers,
    events: [
      { event: "message_start", data: { type: "message_start", message: { id: "msg_1", type: "message", role: "assistant", model: "m", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } } } },
      { event: "content_block_start", data: { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } } },
      { event: "content_block_delta", data: { type: "content_block_delta", index: 0, delta: { type: "text_delta", text } } },
      { event: "content_block_stop", data: { type: "content_block_stop", index: 0 } },
      { event: "message_delta", data: { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage } },
      { event: "message_stop", data: { type: "message_stop" } },
    ],
  };
}
