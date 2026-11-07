import { parseStructuredMode } from "@/crew/lib/model";
import { openRouterClient, parseTransport } from "@/crew/lib/openrouter";
import { readCredit, runProbe } from "@/crew/lib/probe";

const key = process.env.OPENROUTER_API_KEY?.trim();
if (!key) {
  console.log("OPENROUTER_API_KEY is not set");
  console.log("PROBE RESULT: key-invalid");
  process.exit(1);
}
const client = openRouterClient(key);

// Spends nothing. Reads the key's remaining credit, for the Monday decision or after a top-up.
if (process.argv.includes("--credit-only")) {
  const credit = await readCredit(client);
  console.log(`REMAINING CREDIT: ${credit.remaining === null ? "unknown: this key has no credit limit" : `$${credit.remaining.toFixed(2)}`}`);
  console.log(`USED BY THIS KEY: $${credit.used.toFixed(2)}`);
  process.exit(0);
}

const report = await runProbe({
  client,
  mode: parseStructuredMode(process.env.CREW_STRUCTURED_MODE),
  transport: parseTransport(process.env.CREW_BUILD_TRANSPORT),
});

console.log(report.detail);
console.log(`PROBE SPENT: ${report.spentCents.toFixed(3)} cents`);
if (report.remaining !== null) console.log(`REMAINING CREDIT: $${report.remaining.toFixed(2)}`);
if (report.suggestedTotalCents !== null) console.log(`SET CREW_TOTAL_BUDGET_CENTS TO: ${report.suggestedTotalCents}`);
if (report.streamCost !== null) console.log(`STREAMED COST COMES FROM: ${report.streamCost}`);
console.log(`PROBE RESULT: ${report.result}`);
process.exit(report.result === "ok" ? 0 : 1);
