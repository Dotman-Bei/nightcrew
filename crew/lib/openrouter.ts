import Anthropic, { APIError } from "@anthropic-ai/sdk";
import type { Message, MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages/messages";

/** OpenRouter's Anthropic-compatible endpoint. The SDK adds /v1/messages. */
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api";
export const SONNET_SLUG = "anthropic/claude-sonnet-5.5";
export const HAIKU_SLUG = "anthropic/claude-haiku-5.5";
/** Thinking counts toward this. A request's up-front estimate on a low balance depends on it too. */
export const BUILD_MAX_TOKENS = 16_000;
/** Where the build drops to, once, if a request is too large for the in-flight budget. */
export const BUILD_MIN_MAX_TOKENS = 8_000;

const ALLOWED_MODELS: readonly string[] = [SONNET_SLUG, HAIKU_SLUG];
const MAX_WAITS = 3;
const MAX_WAIT_MS = 60_000;
const COST_LOOKUP_ATTEMPTS = 6;

/** Every request goes to Anthropic's own endpoint, so behaviour never changes with routing. */
export const PINNED_PROVIDER = { only: ["anthropic"], allow_fallbacks: false };

export type Transport = "non-stream" | "stream";

export type OpenRouterBody = MessageCreateParamsNonStreaming & {
  provider: { only: string[]; allow_fallbacks: boolean; require_parameters?: boolean };
  cache_control?: { type: "ephemeral" };
};

export type SentMessage = { message: Message; costCents: number; costSource: "response" | "lookup" };
export type SendOptions = { transport?: Transport; sleep?: (ms: number) => Promise<void> };

export type FailureKind = "in-flight" | "too-large" | "no-credit" | "blocked" | "transient" | "other";
export type ProviderFailure = { kind: FailureKind; reason: string; retryAfterMs: number | null };

/** A failure in words fit for a public receipt. */
export class ProviderError extends Error {}

const realSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export function openRouterClient(apiKey: string, options: { fetch?: typeof fetch } = {}): Anthropic {
  return new Anthropic({
    baseURL: OPENROUTER_BASE_URL,
    apiKey: null,
    authToken: apiKey,
    timeout: 6 * 60 * 1000,
    // sendMessage retries only an HTTP error, which is not billed. The SDK would also retry a timed-out call, which may be.
    maxRetries: 0,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });
}

/** Exact slugs only. A suffix such as :online would add web search, which the crew must never have. */
export function assertAllowedModel(model: string): string {
  if (!ALLOWED_MODELS.includes(model)) throw new Error(`${model} is not an allowed crew model. Use ${ALLOWED_MODELS.join(" or ")}.`);
  return model;
}

export function parseTransport(value: string | undefined): Transport {
  if (!value || value === "non-stream") return "non-stream";
  if (value === "stream") return "stream";
  throw new Error(`CREW_BUILD_TRANSPORT must be non-stream or stream, not ${value}`);
}

const retryAfterMs = (headers: Headers | undefined): number | null => {
  const seconds = Number(headers?.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null;
};

/** The named fields only. A moderation error echoes the flagged text, so the body as a whole is hostile. */
function errorFields(error: APIError): { reason: string; source: string; message: string } {
  const body = (error.error ?? {}) as { error?: unknown };
  const inner = (body.error ?? body) as { message?: unknown; metadata?: { reason?: unknown; limit_source?: unknown } };
  return { reason: String(inner.metadata?.reason ?? ""), source: String(inner.metadata?.limit_source ?? ""), message: String(inner.message ?? "") };
}

/** Sorts a failed request by what to do next. Never repeats a response body in public words. */
export function classifyFailure(error: unknown): ProviderFailure {
  if (error instanceof ProviderError) return { kind: "other", reason: error.message, retryAfterMs: null };
  if (!(error instanceof APIError)) return { kind: "other", reason: "The model request failed before a reply arrived.", retryAfterMs: null };
  const { reason, source, message } = errorFields(error);
  const wait = retryAfterMs(error.headers);
  if (error.status === 402) {
    if (reason === "in_flight_budget_exhausted" || source === "openrouter_in_flight_budget") return { kind: "in-flight", reason: "OpenRouter's in-flight budget stayed full.", retryAfterMs: wait };
    if (reason === "weight_exceeds_budget") return { kind: "too-large", reason: "One request was larger than OpenRouter's in-flight budget allows at this balance.", retryAfterMs: null };
    if (source === "openrouter_key_limit") return { kind: "no-credit", reason: "The OpenRouter key's credit limit is used up.", retryAfterMs: null };
    // The Messages endpoint wraps errors in Anthropic's shape, which may drop OpenRouter's metadata.
    if (/in[- ]flight/i.test(message)) {
      return wait === null ? { kind: "too-large", reason: "One request was larger than OpenRouter's in-flight budget allows at this balance.", retryAfterMs: null } : { kind: "in-flight", reason: "OpenRouter's in-flight budget stayed full.", retryAfterMs: wait };
    }
    return { kind: "no-credit", reason: "OpenRouter credit ran out.", retryAfterMs: null };
  }
  if (error.status === 403) {
    if (/budget|key_limit/.test(source) || /\$[\d.]+ of \$[\d.]+ used/.test(message)) return { kind: "no-credit", reason: "The OpenRouter key's budget is used up.", retryAfterMs: null };
    return { kind: "blocked", reason: "A content filter or a model refusal blocked the request.", retryAfterMs: null };
  }
  if (error.status === 401) return { kind: "other", reason: "OpenRouter refused the key.", retryAfterMs: null };
  if (error.status !== undefined && [429, 500, 502, 503, 529].includes(error.status)) return { kind: "transient", reason: `The model request failed with status ${error.status}.`, retryAfterMs: wait };
  return { kind: "other", reason: `The model request failed with status ${error.status ?? "unknown"}.`, retryAfterMs: null };
}

const readCost = (usage: unknown): number | null => {
  const cost = (usage as { cost?: unknown } | null | undefined)?.cost;
  return typeof cost === "number" && Number.isFinite(cost) ? cost : null;
};

/** The published stream schema has no cost, so a stream falls back to OpenRouter's generation record. */
async function lookupCost(client: Anthropic, id: string, sleep: (ms: number) => Promise<void>): Promise<number> {
  for (let attempt = 0; attempt < COST_LOOKUP_ATTEMPTS; attempt += 1) {
    if (attempt > 0) await sleep(2000);
    try {
      const found = await client.get<{ data?: { total_cost?: unknown } }>("/v1/generation", { query: { id } });
      const total = found.data?.total_cost;
      if (typeof total === "number" && Number.isFinite(total)) return total;
    } catch (error) {
      if (!(error instanceof APIError) || error.status !== 404) throw error;
    }
  }
  throw new ProviderError("OpenRouter reported no cost for a streamed call, so the run stopped rather than spend blind.");
}

async function sendOnce(client: Anthropic, body: OpenRouterBody, transport: Transport, sleep: (ms: number) => Promise<void>): Promise<SentMessage> {
  if (transport === "non-stream") {
    const message = await client.messages.create(body);
    if (!Array.isArray(message?.content)) throw new ProviderError("OpenRouter returned an error instead of a message.");
    const cost = readCost(message.usage);
    if (cost === null) throw new ProviderError("OpenRouter reported no cost for a call, so the run stopped rather than spend blind.");
    return { message, costCents: cost * 100, costSource: "response" };
  }
  const stream = client.messages.stream(body);
  const seen: { cost: number | null } = { cost: null };
  stream.on("streamEvent", (event) => {
    const usage = event.type === "message_delta" ? event.usage : event.type === "message_start" ? event.message.usage : null;
    seen.cost = readCost(usage) ?? seen.cost;
  });
  const message = await stream.finalMessage();
  if (seen.cost !== null) return { message, costCents: seen.cost * 100, costSource: "response" };
  const id = stream.response?.headers.get("x-generation-id") ?? message.id;
  return { message, costCents: (await lookupCost(client, id, sleep)) * 100, costSource: "lookup" };
}

/** One model call, priced from what OpenRouter reports. Waits out a full in-flight budget or a passing HTTP error. */
export async function sendMessage(client: Anthropic, body: OpenRouterBody, options: SendOptions = {}): Promise<SentMessage> {
  const sleep = options.sleep ?? realSleep;
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await sendOnce(client, body, options.transport ?? "non-stream", sleep);
    } catch (error) {
      const failure = classifyFailure(error);
      if ((failure.kind !== "in-flight" && failure.kind !== "transient") || attempt >= MAX_WAITS) throw error;
      await sleep(Math.min(failure.retryAfterMs ?? 5000, MAX_WAIT_MS));
    }
  }
}
