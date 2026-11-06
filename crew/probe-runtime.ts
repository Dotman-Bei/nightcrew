import Anthropic from "@anthropic-ai/sdk";
import { decideProbe, parseProbeReport, PROBE_CAP_CENTS, PROBE_MODEL, PROBE_PROMPT, type ProbeVerdict } from "@/crew/lib/probe";
import { createCrewResources } from "@/crew/lib/provisioning";

const POLL_MS = 3000;
const DEADLINE_MS = 5 * 60 * 1000;

type Event = { type: string; stop_reason?: { type?: string }; content?: { type?: string; text?: string }[] };

async function runProbe(client: Anthropic): Promise<{ text: string | null; seconds: number; costCents: number }> {
  const started = Date.now();
  const { agentId, environmentId } = await createCrewResources(client, "night-crew-probe", PROBE_MODEL);
  const session = await client.beta.sessions.create({
    agent: agentId,
    environment_id: environmentId,
    title: "Night Crew runtime probe",
    budget: { type: "limit", max_list_cost: { amount: String(PROBE_CAP_CENTS), currency: "USD" } },
    initial_events: [{ type: "user.message", content: [{ type: "text", text: PROBE_PROMPT }] }],
  });
  console.log(`session ${session.id}`);
  for (;;) {
    const events: Event[] = [];
    for await (const event of client.beta.sessions.events.list(session.id)) events.push(event as unknown as Event);
    const ended = events.some((event) => event.type === "session.status_idle" || event.type === "session.status_terminated");
    if (ended) {
      const messages = events.filter((event) => event.type === "agent.message");
      const last = messages[messages.length - 1];
      const text = last?.content?.flatMap((block) => (block.type === "text" ? [block.text ?? ""] : [])).join("") ?? null;
      const finished = await client.beta.sessions.retrieve(session.id);
      return { text, seconds: Math.round((Date.now() - started) / 1000), costCents: Number(finished.usage?.list_cost?.amount ?? 0) };
    }
    if (Date.now() - started > DEADLINE_MS) return { text: null, seconds: Math.round((Date.now() - started) / 1000), costCents: 0 };
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

let verdict: ProbeVerdict;
try {
  const { text, seconds, costCents } = await runProbe(new Anthropic());
  console.log(`agent reply: ${text}`);
  console.log(`took ${seconds} seconds, cost ${costCents} cents`);
  verdict = decideProbe(text ? parseProbeReport(text) : null, "The session did not return a report in time.");
} catch (error) {
  verdict = decideProbe(null, error instanceof Error ? error.message : String(error));
}

console.log(verdict.detail);
console.log(`PROBE RESULT: ${verdict.decision}`);
process.exit(verdict.decision === "managed-agents" ? 0 : 1);
