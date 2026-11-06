import Anthropic from "@anthropic-ai/sdk";
import { usageCents } from "@/lib/prices";

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

/** A single call with no tools, whose reply is constrained to a schema. */
export type StructuredModel = (call: StructuredCall) => Promise<StructuredResult>;

export function anthropicStructuredModel(client: Anthropic = new Anthropic()): StructuredModel {
  return async ({ model, system, user, schema, maxTokens }) => {
    const message = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { effort: "low", format: { type: "json_schema", schema } },
    });
    const costCents = usageCents(model, message.usage);
    if (message.stop_reason === "refusal") return { value: null, refused: true, costCents };
    const text = message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
    try {
      return { value: JSON.parse(text), refused: false, costCents };
    } catch {
      return { value: null, refused: false, costCents };
    }
  };
}
