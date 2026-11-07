import type { TranscriptEntry } from "@/crew/lib/contracts";

const MAX_ENTRY_CHARS = 20_000;
const KEY_PATTERNS = [/sk-or-[A-Za-z0-9_-]{8,}/g, /sk-ant-[A-Za-z0-9_-]{8,}/g, /\b0x[a-fA-F0-9]{64}\b/g];

export type RawEvent = { type: string; [key: string]: unknown };

function blocksToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((block: { type?: string; text?: string }) => (block?.type === "text" ? (block.text ?? "") : `[${block?.type ?? "block"}]`)).join("\n");
}

function entry(event: RawEvent, kind: TranscriptEntry["kind"], text: string, tool: string | null = null, isError = false): TranscriptEntry {
  const truncated = text.length > MAX_ENTRY_CHARS;
  return {
    at: String(event.processed_at ?? event.created_at ?? ""),
    kind,
    tool,
    text: truncated ? `${text.slice(0, MAX_ENTRY_CHARS)}\n[truncated]` : text,
    truncated,
    isError,
  };
}

/** Turns session events into the public transcript. Thinking has no content, so it is left out. */
export function normaliseEvents(events: RawEvent[]): TranscriptEntry[] {
  const out: TranscriptEntry[] = [];
  for (const event of events) {
    switch (event.type) {
      case "user.message":
        out.push(entry(event, "prompt", blocksToText(event.content)));
        break;
      case "agent.message":
        out.push(entry(event, "message", blocksToText(event.content)));
        break;
      case "agent.tool_use":
        out.push(entry(event, "tool_use", JSON.stringify(event.input ?? {}), String(event.name ?? "tool")));
        break;
      case "agent.tool_result":
        out.push(entry(event, "tool_result", blocksToText(event.content), null, Boolean(event.is_error)));
        break;
      case "session.error":
        out.push(entry(event, "error", JSON.stringify(event.error ?? event)));
        break;
      case "session.status_idle":
        out.push(entry(event, "status", `idle: ${String((event.stop_reason as { type?: string } | undefined)?.type ?? "unknown")}`));
        break;
      default:
        break;
    }
  }
  return out;
}

/** Removes anything key-shaped. The agent's tools can reach no secrets, so a match is a defect worth seeing. */
export function scrubTranscript(entries: TranscriptEntry[]): { entries: TranscriptEntry[]; removed: number } {
  let removed = 0;
  const clean = entries.map((item) => {
    let text = item.text;
    for (const pattern of KEY_PATTERNS) {
      text = text.replace(pattern, () => {
        removed += 1;
        return "[removed]";
      });
    }
    return { ...item, text };
  });
  if (removed === 0) return { entries: clean, removed };
  const marker: TranscriptEntry = {
    at: clean[clean.length - 1]?.at ?? "",
    kind: "status",
    tool: null,
    text: `Removed ${removed} key-shaped string${removed === 1 ? "" : "s"} from this transcript. The agent's tools can reach no secrets, so this is a defect worth seeing.`,
    truncated: false,
    isError: true,
  };
  return { entries: [...clean, marker], removed };
}
