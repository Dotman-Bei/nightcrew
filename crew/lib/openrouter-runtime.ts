import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import type { ContentBlock, MessageParam, Tool, ToolResultBlockParam, ToolUseBlock } from "@anthropic-ai/sdk/resources/messages/messages";
import { checkFloor, checkReport } from "@/crew/lib/floor-check";
import { assertAllowedModel, BUILD_MAX_TOKENS, BUILD_MIN_MAX_TOKENS, classifyFailure, PINNED_PROVIDER, sendMessage, type OpenRouterBody, type Transport } from "@/crew/lib/openrouter";
import { buildPrompt, sendBackPrompt, type BuildInput, type BuildResult, type CrewRuntime } from "@/crew/lib/runtime";
import { normaliseEvents, scrubTranscript, type RawEvent } from "@/crew/lib/transcript";
import { MAX_FLOOR_BYTES } from "@/lib/config";

const MAX_TURNS = 16;
const TOKEN_CAP = 300_000;
/** Bounds what one last call can cost, cached or not. A normal build stays well under it. */
const MAX_CONVERSATION_TOKENS = 60_000;
const DEADLINE_MS = 30 * 60 * 1000;
const MAX_READ_CHARS = 24_000;
const MAX_NUDGES = 2;
const WRITABLE: readonly string[] = ["index.html", "floor.json"];
/** The kit files the agent reads in its instructions. The snapshot can be large, so it stays a file. */
const KIT_IN_PROMPT: readonly string[] = ["RULES.md", "template.html"];

export type RuntimeConfig = {
  model: string;
  capCents: number;
  transport?: Transport;
  maxTurns?: number;
  tokenCap?: number;
  deadlineMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

/** The only tools the model ever gets. No shell, no network and nothing that runs what it writes. */
export const CREW_TOOLS: Tool[] = [
  {
    name: "write_file",
    description: "Write index.html or floor.json, replacing the whole file. Those are the only two files you can write.",
    input_schema: { type: "object", additionalProperties: false, required: ["path", "content"], properties: { path: { type: "string", enum: [...WRITABLE] }, content: { type: "string" } } },
  },
  {
    name: "read_file",
    description: "Read a file in your work folder: index.html, floor.json, or a kit file such as kit/snapshot.json.",
    input_schema: { type: "object", additionalProperties: false, required: ["path"], properties: { path: { type: "string" } } },
  },
  {
    name: "run_floor_check",
    description: "Check index.html and floor.json against the static floor rules. It reads them and does not run them.",
    input_schema: { type: "object", additionalProperties: false, properties: {} },
  },
];

/** Resolves a path the model gave, or returns null if it could leave the work folder in any way. */
export function confine(root: string, requested: unknown): string | null {
  if (typeof requested !== "string") return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/.test(requested)) return null;
  const full = resolve(root, requested);
  const inside = relative(root, full);
  if (inside === "" || inside.startsWith("..") || isAbsolute(inside)) return null;
  return full;
}

type ToolOutcome = { text: string; isError: boolean };

type Conversation = {
  id: string;
  dir: string;
  system: string;
  messages: MessageParam[];
  events: RawEvent[];
  costCents: number;
  reportedCents: number;
  tokens: number;
  conversationTokens: number;
  turns: number;
  nudges: number;
  maxTokens: number;
  shrunk: boolean;
  /** True when the current files passed the last check. Any write clears it. */
  checkPassed: boolean;
  deadlineAt: number;
};

const realSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** The build agent: a model call in a loop on the runner, with no authority. See the spec, section 5. */
export class OpenRouterRuntime implements CrewRuntime {
  private conversation: Conversation | null = null;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly client: Anthropic, private readonly config: RuntimeConfig) {
    assertAllowedModel(config.model);
    this.now = config.now ?? Date.now;
    this.sleep = config.sleep ?? realSleep;
  }

  async build(input: BuildInput): Promise<BuildResult> {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), "nightcrew-build-")));
    mkdirSync(join(dir, "kit"));
    for (const file of input.kitFiles) writeFileSync(join(dir, "kit", file.name), file.content);
    const instructions = readFileSync(join(process.cwd(), "crew", "prompts", "build.md"), "utf8");
    const kit = input.kitFiles.filter((file) => KIT_IN_PROMPT.includes(file.name)).map((file) => `<kit_file name="${file.name}">\n${file.content}\n</kit_file>`);
    const prompt = buildPrompt(input);
    this.conversation = {
      id: randomUUID(),
      dir,
      system: [instructions, ...kit].join("\n\n"),
      messages: [{ role: "user", content: prompt }],
      events: [{ type: "user.message", processed_at: this.stamp(), content: prompt }],
      costCents: 0,
      reportedCents: 0,
      tokens: 0,
      conversationTokens: 0,
      turns: 0,
      nudges: 0,
      maxTokens: BUILD_MAX_TOKENS,
      shrunk: false,
      checkPassed: false,
      deadlineAt: this.now() + (this.config.deadlineMs ?? DEADLINE_MS),
    };
    return this.run(this.conversation);
  }

  async sendBack(sessionId: string, reasons: string[]): Promise<BuildResult> {
    const conversation = this.conversation;
    if (!conversation || conversation.id !== sessionId) throw new Error("send-back for an unknown build");
    const prompt = sendBackPrompt(reasons);
    conversation.messages.push({ role: "user", content: prompt });
    conversation.events.push({ type: "user.message", processed_at: this.stamp(), content: prompt });
    conversation.checkPassed = false;
    conversation.nudges = 0;
    return this.run(conversation);
  }

  /** Removes the temp folder. The crew job calls this once the shift's output is safe. */
  dispose(): void {
    if (this.conversation) rmSync(this.conversation.dir, { recursive: true, force: true });
  }

  private stamp(): string {
    return new Date(this.now()).toISOString();
  }

  /** The stop that applies now, if any. Each is checked before a call, so no call starts past a limit. */
  private limitReached(conversation: Conversation): { status: BuildResult["status"]; reason: string } | null {
    if (this.now() > conversation.deadlineAt) return { status: "timeout", reason: "The build passed its 30-minute limit." };
    if (conversation.costCents >= this.config.capCents) return { status: "budget", reason: "spend cap reached" };
    if (conversation.tokens >= (this.config.tokenCap ?? TOKEN_CAP) || conversation.conversationTokens >= MAX_CONVERSATION_TOKENS) return { status: "budget", reason: "token cap reached" };
    const maxTurns = this.config.maxTurns ?? MAX_TURNS;
    if (conversation.turns >= maxTurns) return { status: "error", reason: `The build passed its limit of ${maxTurns} model turns.` };
    return null;
  }

  private async run(conversation: Conversation): Promise<BuildResult> {
    for (;;) {
      const limit = this.limitReached(conversation);
      if (limit) return this.finish(conversation, limit.status, limit.reason);
      // The system prompt, the tools and earlier messages never change: thinking blocks are bound to them.
      const body: OpenRouterBody = {
        model: this.config.model,
        max_tokens: conversation.maxTokens,
        system: conversation.system,
        messages: conversation.messages,
        tools: CREW_TOOLS,
        output_config: { effort: "medium" },
        provider: PINNED_PROVIDER,
        cache_control: { type: "ephemeral" },
      };
      let sent;
      try {
        sent = await sendMessage(this.client, body, { transport: this.config.transport, sleep: this.sleep });
      } catch (error) {
        const failure = classifyFailure(error);
        if (failure.kind === "too-large" && !conversation.shrunk) {
          conversation.shrunk = true;
          conversation.maxTokens = BUILD_MIN_MAX_TOKENS;
          continue;
        }
        return this.finish(conversation, "error", failure.reason);
      }
      const { message, costCents } = sent;
      const usage = message.usage;
      conversation.costCents += costCents;
      conversation.turns += 1;
      conversation.conversationTokens = usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
      conversation.tokens += conversation.conversationTokens + usage.output_tokens;
      conversation.messages.push({ role: "assistant", content: message.content as MessageParam["content"] });
      this.recordReply(conversation, message.content);

      const uses = message.content.filter((block): block is ToolUseBlock => block.type === "tool_use");
      if (message.stop_reason === "refusal") return this.finish(conversation, "error", "The model declined this build.");
      if (uses.length > 0) {
        const cutOff = message.stop_reason === "max_tokens";
        const results: ToolResultBlockParam[] = uses.map((use) => {
          const outcome = cutOff ? { text: "Your reply hit the token limit, so nothing ran. Write a smaller file.", isError: true } : this.runTool(conversation, use);
          conversation.events.push({ type: "agent.tool_result", processed_at: this.stamp(), is_error: outcome.isError, content: outcome.text });
          return { type: "tool_result", tool_use_id: use.id, content: outcome.text, is_error: outcome.isError };
        });
        conversation.messages.push({ role: "user", content: results });
        continue;
      }
      if (message.stop_reason === "max_tokens") {
        if (conversation.nudges >= MAX_NUDGES) return this.finish(conversation, "error", "The model kept hitting its token limit.");
        conversation.nudges += 1;
        this.nudge(conversation, "Your reply hit the token limit before you used a tool. Write a smaller floor.");
        continue;
      }
      if (message.stop_reason !== "end_turn" && message.stop_reason !== "stop_sequence") return this.finish(conversation, "error", `The model stopped with ${String(message.stop_reason)}.`);
      // It says it is done. Hold it to the same check once more, because that is free.
      const check = this.check(conversation);
      if (check.pass || conversation.nudges >= MAX_NUDGES) return this.finish(conversation, "done", null);
      conversation.nudges += 1;
      this.nudge(conversation, `You are not done. Fix these and call run_floor_check again.\n${checkReport(check)}`);
    }
  }

  private nudge(conversation: Conversation, text: string): void {
    conversation.messages.push({ role: "user", content: text });
    conversation.events.push({ type: "user.message", processed_at: this.stamp(), content: text });
  }

  private recordReply(conversation: Conversation, content: ContentBlock[]): void {
    const at = this.stamp();
    for (const block of content) {
      if (block.type === "text") conversation.events.push({ type: "agent.message", processed_at: at, content: block.text });
      if (block.type === "tool_use") conversation.events.push({ type: "agent.tool_use", processed_at: at, name: block.name, input: block.input });
    }
  }

  private fileText(conversation: Conversation, name: string): string | null {
    const path = join(conversation.dir, name);
    return existsSync(path) ? readFileSync(path, "utf8") : null;
  }

  private check(conversation: Conversation) {
    return checkFloor(this.fileText(conversation, "index.html"), this.fileText(conversation, "floor.json"));
  }

  private runTool(conversation: Conversation, use: ToolUseBlock): ToolOutcome {
    const input = (use.input ?? {}) as { path?: unknown; content?: unknown };
    if (use.name === "write_file") {
      if (typeof input.path !== "string" || !WRITABLE.includes(input.path)) return { text: `You can only write ${WRITABLE.join(" or ")}.`, isError: true };
      if (typeof input.content !== "string") return { text: "write_file needs the file's whole content as a string.", isError: true };
      if (Buffer.byteLength(input.content) > MAX_FLOOR_BYTES) return { text: `That is over the ${MAX_FLOOR_BYTES} byte limit, so nothing was written.`, isError: true };
      const target = confine(conversation.dir, input.path);
      if (!target) return { text: "That path is not allowed.", isError: true };
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, input.content);
      conversation.checkPassed = false;
      return { text: `Wrote ${input.path}, ${Buffer.byteLength(input.content)} bytes.`, isError: false };
    }
    if (use.name === "read_file") {
      const target = confine(conversation.dir, input.path);
      if (!target) return { text: "That path is not allowed. Paths are relative to your work folder.", isError: true };
      if (!existsSync(target) || !statSync(target).isFile()) return { text: "That file does not exist.", isError: true };
      const real = relative(conversation.dir, realpathSync(target));
      if (real.startsWith("..") || isAbsolute(real)) return { text: "That path is not allowed.", isError: true };
      const text = readFileSync(target, "utf8");
      return { text: text.length > MAX_READ_CHARS ? `${text.slice(0, MAX_READ_CHARS)}\n[cut at ${MAX_READ_CHARS} characters]` : text, isError: false };
    }
    if (use.name === "run_floor_check") {
      const check = this.check(conversation);
      conversation.checkPassed = check.pass;
      return { text: checkReport(check), isError: !check.pass };
    }
    return { text: `There is no tool called ${use.name}.`, isError: true };
  }

  private finish(conversation: Conversation, status: BuildResult["status"], reason: string | null): BuildResult {
    // A floor that already passed its check still ships if a limit stops the closing message.
    const stoppedAfterPassing = status !== "done" && conversation.checkPassed;
    const finalStatus = stoppedAfterPassing ? "done" : status;
    conversation.events.push({ type: "session.status_idle", processed_at: this.stamp(), stop_reason: { type: status === "done" ? "end_turn" : (reason ?? status) } });
    const { entries } = scrubTranscript(normaliseEvents(conversation.events));
    // crewShift adds each result's cost, so report only what this call spent.
    const costCents = conversation.costCents - conversation.reportedCents;
    conversation.reportedCents = conversation.costCents;
    return {
      sessionId: conversation.id,
      status: finalStatus,
      reason: stoppedAfterPassing ? null : reason,
      html: this.fileText(conversation, "index.html"),
      floorJson: this.fileText(conversation, "floor.json"),
      transcript: entries,
      costCents,
    };
  }
}
