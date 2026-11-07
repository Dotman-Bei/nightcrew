import type Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages/messages";
import { openRouterStructuredModel, type StructuredMode } from "@/crew/lib/model";
import { BUILD_MAX_TOKENS, BUILD_MIN_MAX_TOKENS, classifyFailure, HAIKU_SLUG, PINNED_PROVIDER, sendMessage, SONNET_SLUG, type OpenRouterBody, type Transport } from "@/crew/lib/openrouter";

/** CREW_TOTAL_BUDGET_CENTS never goes above this until a top-up. */
export const PLANNED_TOTAL_CENTS = 440;
/** Keeps the last allowed shift, which can pass its cap by one call, inside the real balance. */
const BUDGET_MARGIN_CENTS = 30;
const NONCE = "NC-7319";
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["decision", "note"],
  properties: { decision: { type: "string", enum: ["accept", "reject"] }, note: { type: ["string", "null"] } },
};

export type ProbeResult = "ok" | "key-invalid" | "no-credit-figure" | "no-credit" | "too-large" | "model-missing" | "tools-failed" | "structured-output-unsupported" | "no-cost" | "long-call-dropped";
export type StreamCost = "response" | "lookup" | "none";

export type Credit = { limit: number | null; remaining: number | null; used: number; freeTier: boolean };

export type ProbeReport = {
  result: ProbeResult;
  detail: string;
  remaining: number | null;
  suggestedTotalCents: number | null;
  streamCost: StreamCost | null;
  spentCents: number;
};

export type ProbeDeps = {
  client: Anthropic;
  mode: StructuredMode;
  transport: Transport;
  log?: (line: string) => void;
};

/** Reads what a normal key can see of its own credit. Spends nothing. */
export async function readCredit(client: Anthropic): Promise<Credit> {
  const { data } = await client.get<{ data: { limit: number | null; limit_remaining: number | null; usage: number; is_free_tier: boolean } }>("/v1/key");
  return { limit: data.limit, remaining: data.limit_remaining, used: data.usage, freeTier: data.is_free_tier };
}

export function suggestedTotal(remainingDollars: number): number {
  return Math.min(PLANNED_TOTAL_CENTS, Math.floor(remainingDollars * 100) - BUDGET_MARGIN_CENTS);
}

class ProbeStop extends Error {
  constructor(readonly result: ProbeResult, detail: string) {
    super(detail);
  }
}

function stopFor(error: unknown, otherwise: ProbeResult): ProbeStop {
  if (error instanceof ProbeStop) return error;
  const failure = classifyFailure(error);
  if (failure.reason.includes("no cost")) return new ProbeStop("no-cost", failure.reason);
  if (failure.kind === "no-credit") return new ProbeStop("no-credit", failure.reason);
  if (failure.kind === "too-large" || failure.kind === "in-flight") return new ProbeStop("too-large", failure.reason);
  return new ProbeStop(otherwise, failure.reason);
}

async function checkModel(client: Anthropic, slug: string): Promise<string> {
  let endpoints: { tag?: string; supported_parameters?: string[]; pricing?: { prompt?: string; completion?: string } }[];
  try {
    const found = await client.get<{ data?: { endpoints?: typeof endpoints } }>(`/v1/models/${slug}/endpoints`);
    endpoints = found.data?.endpoints ?? [];
  } catch {
    throw new ProbeStop("model-missing", `${slug} did not resolve.`);
  }
  const anthropic = endpoints.find((endpoint) => endpoint.tag === "anthropic");
  if (!anthropic) throw new ProbeStop("model-missing", `${slug} has no endpoint from Anthropic itself.`);
  const params = anthropic.supported_parameters ?? [];
  if (!params.includes("tools")) throw new ProbeStop("model-missing", `${slug} does not list tools on Anthropic's endpoint.`);
  const perMillion = (value: string | undefined) => (Number(value ?? 0) * 1_000_000).toFixed(2);
  return `$${perMillion(anthropic.pricing?.prompt)}/M in, $${perMillion(anthropic.pricing?.completion)}/M out`;
}

const PROBE_TOOL: Tool = {
  name: "read_nonce",
  description: "Returns a short code. Call it once.",
  input_schema: { type: "object", additionalProperties: false, properties: {} },
};

/** A real tool round trip, at the build's token limit, sending any thinking blocks back unchanged. */
async function toolRoundTrip(client: Anthropic, model: string, transport: Transport, maxTokens: number): Promise<number> {
  const messages: MessageParam[] = [{ role: "user", content: "Call read_nonce once, then reply with only the code it returned." }];
  const body = (): OpenRouterBody => ({ model, max_tokens: maxTokens, messages, tools: [PROBE_TOOL], output_config: { effort: "low" }, provider: PINNED_PROVIDER });
  const first = await sendMessage(client, body(), { transport });
  const use = first.message.content.find((block) => block.type === "tool_use");
  if (use?.type !== "tool_use") throw new ProbeStop("tools-failed", `${model} did not call the tool.`);
  messages.push({ role: "assistant", content: first.message.content as MessageParam["content"] });
  messages.push({ role: "user", content: [{ type: "tool_result", tool_use_id: use.id, content: NONCE }] });
  const second = await sendMessage(client, body(), { transport });
  const text = second.message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
  if (!text.includes(NONCE)) throw new ProbeStop("tools-failed", `${model} did not use the tool's result.`);
  return first.costCents + second.costCents;
}

async function schemaWorks(client: Anthropic, mode: StructuredMode): Promise<{ works: boolean; costCents: number }> {
  try {
    const model = openRouterStructuredModel(client, mode);
    const reply = await model({ model: HAIKU_SLUG, system: "Answer in the required shape.", user: 'Decide "accept", with a null note.', schema: SCHEMA, maxTokens: 500 });
    const value = reply.value as { decision?: unknown; note?: unknown } | null;
    return { works: value?.decision === "accept" && value.note === null, costCents: reply.costCents };
  } catch (error) {
    const stop = stopFor(error, "structured-output-unsupported");
    if (stop.result !== "structured-output-unsupported") throw stop;
    return { works: false, costCents: 0 };
  }
}

/** The one long call the probe makes: on Haiku, because it costs under a cent there. */
async function longCall(client: Anthropic, transport: Transport): Promise<{ seconds: number; costCents: number; tokens: number }> {
  const started = Date.now();
  const { message, costCents } = await sendMessage(
    client,
    { model: HAIKU_SLUG, max_tokens: BUILD_MAX_TOKENS, messages: [{ role: "user", content: "Write every whole number from 1 to 6000, one per line, and nothing else." }], output_config: { effort: "low" }, provider: PINNED_PROVIDER },
    { transport },
  );
  return { seconds: Math.round((Date.now() - started) / 1000), costCents, tokens: message.usage.output_tokens };
}

/** Is usage.cost on a streamed reply? Only a live call can answer: the published schema leaves it out. */
async function streamCost(client: Anthropic): Promise<{ source: StreamCost; costCents: number }> {
  try {
    const { costSource, costCents } = await sendMessage(client, { model: HAIKU_SLUG, max_tokens: 50, messages: [{ role: "user", content: "Reply with the word ok." }], output_config: { effort: "low" }, provider: PINNED_PROVIDER }, { transport: "stream" });
    return { source: costSource, costCents };
  } catch {
    return { source: "none", costCents: 0 };
  }
}

/** Runs every check in order and stops at the first that decides the result. See the spec, section 5. */
export async function runProbe({ client, mode, transport, log = console.log }: ProbeDeps): Promise<ProbeReport> {
  const report: ProbeReport = { result: "ok", detail: "All checks passed.", remaining: null, suggestedTotalCents: null, streamCost: null, spentCents: 0 };
  try {
    let credit: Credit;
    try {
      credit = await readCredit(client);
    } catch {
      throw new ProbeStop("key-invalid", "OpenRouter refused the key.");
    }
    log(`key: limit ${credit.limit ?? "none"}, remaining ${credit.remaining ?? "unknown"}, used ${credit.used}`);
    if (credit.remaining === null) throw new ProbeStop("no-credit-figure", "This key has no credit limit, so OpenRouter does not report what remains. Set a limit on the key, no higher than your balance.");

    for (const slug of [SONNET_SLUG, HAIKU_SLUG]) log(`model ${slug}: ${await checkModel(client, slug)}`);

    for (const slug of [SONNET_SLUG, HAIKU_SLUG]) {
      try {
        let cost: number;
        try {
          cost = await toolRoundTrip(client, slug, transport, BUILD_MAX_TOKENS);
        } catch (error) {
          if (classifyFailure(error).kind !== "too-large") throw error;
          log(`${slug} is too large for the in-flight budget at ${BUILD_MAX_TOKENS} tokens, so trying ${BUILD_MIN_MAX_TOKENS}, which the build drops to by itself.`);
          cost = await toolRoundTrip(client, slug, transport, BUILD_MIN_MAX_TOKENS);
        }
        report.spentCents += cost;
        log(`tools on ${slug}: round trip ok, ${cost.toFixed(3)} cents`);
      } catch (error) {
        throw stopFor(error, "tools-failed");
      }
    }

    const schema = await schemaWorks(client, mode);
    report.spentCents += schema.costCents;
    if (!schema.works) {
      const other = mode === "json-schema" ? await schemaWorks(client, "forced-tool") : { works: false, costCents: 0 };
      report.spentCents += other.costCents;
      throw new ProbeStop("structured-output-unsupported", other.works ? "Schema output failed, but a forced tool call works. Set CREW_STRUCTURED_MODE to forced-tool in your shell and as a repo variable, and run this again." : "Neither schema output nor a forced tool call worked.");
    }
    log(`schema output: ok in ${mode} mode, ${schema.costCents.toFixed(3)} cents`);

    const stream = await streamCost(client);
    report.spentCents += stream.costCents;
    report.streamCost = stream.source;
    log(`streamed cost: ${stream.source}`);
    if (transport === "stream" && stream.source === "none") throw new ProbeStop("no-cost", "A streamed call reported no cost by either route, so the build cannot stream.");

    try {
      const long = await longCall(client, transport);
      report.spentCents += long.costCents;
      log(`long call on ${transport}: ${long.tokens} tokens in ${long.seconds} seconds, ${long.costCents.toFixed(3)} cents`);
    } catch (error) {
      const stop = stopFor(error, "long-call-dropped");
      if (stop.result !== "long-call-dropped") throw stop;
      throw new ProbeStop("long-call-dropped", transport === "non-stream" ? "A long non-streamed call failed. Set CREW_BUILD_TRANSPORT to stream in your shell and as a repo variable, and run this again." : "A long streamed call failed too.");
    }

    const after = await readCredit(client);
    report.remaining = after.remaining;
    report.suggestedTotalCents = after.remaining === null ? null : suggestedTotal(after.remaining);
  } catch (error) {
    const stop = error instanceof ProbeStop ? error : stopFor(error, "tools-failed");
    report.result = stop.result;
    report.detail = stop.message;
  }
  return report;
}
