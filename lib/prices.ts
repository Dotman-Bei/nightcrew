/** Dollars per 1M tokens, read from Anthropic's pricing page on 2026-11-06. */
const PRICES: Record<string, { input: number; cacheWrite: number; cacheRead: number; output: number }> = {
  "claude-opus-5-5": { input: 4, cacheWrite: 5, cacheRead: 0.2, output: 20 },
  "claude-sonnet-5-5": { input: 2, cacheWrite: 2.5, cacheRead: 0.1, output: 10 },
  "claude-haiku-5-5": { input: 0.1, cacheWrite: 0.125, cacheRead: 0.01, output: 0.5 },
};

export type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

/** The cost of one Messages API call in cents, as a fraction. Sum these and round up once. */
export function usageCents(model: string, usage: TokenUsage): number {
  const price = PRICES[model];
  if (!price) throw new Error(`no price for ${model}`);
  const dollars =
    (usage.input_tokens * price.input +
      (usage.cache_creation_input_tokens ?? 0) * price.cacheWrite +
      (usage.cache_read_input_tokens ?? 0) * price.cacheRead +
      usage.output_tokens * price.output) /
    1_000_000;
  return dollars * 100;
}
