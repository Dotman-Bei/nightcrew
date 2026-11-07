import type Anthropic from "@anthropic-ai/sdk";
import { classifyFailure, PINNED_PROVIDER, sendMessage, type OpenRouterBody } from "@/crew/lib/openrouter";

export type JsonSchema = Record<string, unknown>;

export type StructuredCall = {
  model: string;
  system: string;
  user: string;
  schema: JsonSchema;
  maxTokens: number;
};

export type StructuredResult = {
  /** Null when the model refused or returned nothing parseable. */
  value: unknown;
  refused: boolean;
  costCents: number;
};

/** A single call with no working tools, whose reply is constrained to a schema. */
export type StructuredModel = (call: StructuredCall) => Promise<StructuredResult>;

/** forced-tool is the fallback if the probe finds structured output unsupported. Callers validate either way. */
export type StructuredMode = "json-schema" | "forced-tool";

const ANSWER_TOOL = "answer";

export function parseStructuredMode(value: string | undefined): StructuredMode {
  if (!value || value === "json-schema") return "json-schema";
  if (value === "forced-tool") return "forced-tool";
  throw new Error(`CREW_STRUCTURED_MODE must be json-schema or forced-tool, not ${value}`);
}

function structuredBody({ model, system, user, schema, maxTokens }: StructuredCall, mode: StructuredMode): OpenRouterBody {
  const base = {
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user" as const, content: user }],
    provider: { ...PINNED_PROVIDER, require_parameters: true },
  };
  if (mode === "json-schema") return { ...base, output_config: { effort: "low", format: { type: "json_schema", schema } } };
  // A forced tool only shapes the reply. Nothing runs it. Claude Sonnet 5.5 rejects this, so it stays on Haiku.
  return {
    ...base,
    output_config: { effort: "low" },
    tools: [{ name: ANSWER_TOOL, description: "Give your answer.", input_schema: { type: "object", ...schema } }],
    tool_choice: { type: "tool", name: ANSWER_TOOL },
  };
}

export function openRouterStructuredModel(client: Anthropic, mode: StructuredMode = "json-schema"): StructuredModel {
  return async (call) => {
    let sent;
    try {
      sent = await sendMessage(client, structuredBody(call, mode));
    } catch (error) {
      const failure = classifyFailure(error);
      if (failure.kind === "blocked") return { value: null, refused: true, costCents: 0 };
      throw new Error(failure.reason);
    }
    const { message, costCents } = sent;
    if (message.stop_reason === "refusal") return { value: null, refused: true, costCents };
    if (mode === "forced-tool") {
      const block = message.content.find((item) => item.type === "tool_use" && item.name === ANSWER_TOOL);
      return { value: block?.type === "tool_use" ? block.input : null, refused: false, costCents };
    }
    const text = message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
    try {
      return { value: JSON.parse(text), refused: false, costCents };
    } catch {
      return { value: null, refused: false, costCents };
    }
  };
}
