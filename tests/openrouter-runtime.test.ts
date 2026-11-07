import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkFloor, checkReport } from "@/crew/lib/floor-check";
import { BUILD_MAX_TOKENS, BUILD_MIN_MAX_TOKENS, HAIKU_SLUG, openRouterClient, SONNET_SLUG } from "@/crew/lib/openrouter";
import { confine, CREW_TOOLS, OpenRouterRuntime, type RuntimeConfig } from "@/crew/lib/openrouter-runtime";
import { fakeOpenRouter, messageReply, streamReply, streamToolReply, textBlock, thinkingBlock, toolBlock, type FakeReply } from "./helpers/fake-openrouter";

const GOOD_HTML = readFileSync("tests/fixtures/good-floor/index.html", "utf8");
const GOOD_JSON = readFileSync("tests/fixtures/good-floor/floor.json", "utf8");
const input = {
  shiftSlug: "3",
  brief: "Build a tip calculator.",
  proposalText: "a tip calculator",
  kitFiles: [
    { name: "RULES.md", content: "the rules" },
    { name: "template.html", content: "<!doctype html>" },
    { name: "snapshot.json", content: '{"staked":"1"}' },
  ],
};

const write = (path: string, content: string, id = `w_${path}`) => toolBlock("write_file", { path, content }, id);
const check = (id = "c_1") => toolBlock("run_floor_check", {}, id);
const read = (path: unknown, id = "r_1") => toolBlock("read_file", { path }, id);
const CENT = 0.01;

function runtimeFor(script: FakeReply[], config: Partial<RuntimeConfig> = {}) {
  const fake = fakeOpenRouter(script);
  const runtime = new OpenRouterRuntime(openRouterClient("sk-or-test", { fetch: fake.fetch }), { model: SONNET_SLUG, capCents: 60, sleep: async () => {}, ...config });
  return { runtime, requests: fake.requests };
}

/** The tool results sent back on the request after a tool call. */
function resultsIn(request: { body: Record<string, unknown> }): { content: string; is_error: boolean }[] {
  const messages = request.body.messages as { role: string; content: unknown }[];
  return messages[messages.length - 1].content as { content: string; is_error: boolean }[];
}

const passingBuild: FakeReply[] = [
  messageReply([thinkingBlock("sig-a"), write("index.html", GOOD_HTML)], { cost: 10 * CENT }),
  messageReply([write("floor.json", GOOD_JSON)], { cost: 2 * CENT }),
  messageReply([check()], { cost: 1 * CENT }),
  messageReply([textBlock("Built a tip calculator.")], { cost: 1 * CENT }),
];

describe("what the model is given", () => {
  it("exposes exactly three tools, and no server tool of any kind", async () => {
    expect(CREW_TOOLS.map((tool) => tool.name)).toEqual(["write_file", "read_file", "run_floor_check"]);
    const { runtime, requests } = runtimeFor(passingBuild);
    await runtime.build(input);
    for (const request of requests) {
      expect((request.body.tools as { name: string }[]).map((tool) => tool.name)).toEqual(["write_file", "read_file", "run_floor_check"]);
      expect(request.body.plugins).toBeUndefined();
      expect(request.body.tool_choice).toBeUndefined();
      expect(request.body.model).toBe(SONNET_SLUG);
      expect(request.body.max_tokens).toBe(BUILD_MAX_TOKENS);
      expect(request.body.provider).toEqual({ only: ["anthropic"], allow_fallbacks: false });
    }
  });
  it("refuses any model outside the two exact slugs, so :online web search can never be turned on", () => {
    const fake = fakeOpenRouter([]);
    expect(() => new OpenRouterRuntime(openRouterClient("k", { fetch: fake.fetch }), { model: `${SONNET_SLUG}:online`, capCents: 60 })).toThrow("not an allowed");
  });
  it("carries the rules and template in its instructions, and the proposal only as quoted data", async () => {
    const { runtime, requests } = runtimeFor(passingBuild);
    await runtime.build(input);
    const system = requests[0].body.system as string;
    expect(system).toContain("the rules");
    expect(system).toContain("<!doctype html>");
    expect(system).not.toContain('{"staked":"1"}');
    expect(system).not.toContain("a tip calculator");
    expect((requests[0].body.messages as { content: string }[])[0].content).toContain(JSON.stringify("a tip calculator"));
  });
  it("keeps the system prompt, the tools and earlier messages unchanged, with thinking blocks sent back whole", async () => {
    const { runtime, requests } = runtimeFor(passingBuild);
    await runtime.build(input);
    const second = requests[1].body;
    expect(second.system).toBe(requests[0].body.system);
    expect(second.tools).toEqual(requests[0].body.tools);
    const messages = second.messages as { role: string; content: { type: string; signature?: string }[] }[];
    expect(messages[1].role).toBe("assistant");
    expect(messages[1].content[0]).toEqual({ type: "thinking", thinking: "", signature: "sig-a" });
  });
});

describe("a build", () => {
  it("writes the files, checks them, and returns them with what they cost", async () => {
    const { runtime } = runtimeFor(passingBuild);
    const result = await runtime.build(input);
    expect(result).toMatchObject({ status: "done", reason: null, html: GOOD_HTML, floorJson: GOOD_JSON });
    expect(result.costCents).toBeCloseTo(14);
    expect(result.sessionId).toBeTruthy();
    const kinds = result.transcript.map((entry) => entry.kind);
    expect(kinds[0]).toBe("prompt");
    expect(kinds).toContain("tool_use");
    expect(kinds).toContain("tool_result");
    expect(kinds).toContain("message");
    expect(kinds[kinds.length - 1]).toBe("status");
  });
  it("can stream every call, as a setting, with no other change to the build", async () => {
    const { runtime, requests } = runtimeFor(
      [
        streamToolReply("write_file", { path: "index.html", content: GOOD_HTML }, "w_1", 10 * CENT),
        streamToolReply("write_file", { path: "floor.json", content: GOOD_JSON }, "w_2", 2 * CENT),
        streamToolReply("run_floor_check", {}, "c_1", CENT),
        streamReply("Built it.", CENT),
      ],
      { transport: "stream" },
    );
    const result = await runtime.build(input);
    for (const request of requests) expect(request.body.stream).toBe(true);
    expect(result).toMatchObject({ status: "done", html: GOOD_HTML, floorJson: GOOD_JSON });
    expect(result.costCents).toBeCloseTo(14);
  });
  it("runs a check and returns findings as an error result, then lets the model fix them", async () => {
    const { runtime, requests } = runtimeFor([
      messageReply([write("index.html", GOOD_HTML.replace("function work()", "location.href = 'x'; function work()"))]),
      messageReply([write("floor.json", GOOD_JSON)]),
      messageReply([check()]),
      messageReply([write("index.html", GOOD_HTML)]),
      messageReply([check("c_2")]),
      messageReply([textBlock("Fixed.")]),
    ]);
    const result = await runtime.build(input);
    const firstCheck = resultsIn(requests[3])[0];
    expect(firstCheck.is_error).toBe(true);
    expect(firstCheck.content).toContain("CHECK FAIL");
    expect(firstCheck.content).toContain("location");
    const secondCheck = resultsIn(requests[5])[0];
    expect(secondCheck.is_error).toBe(false);
    expect(secondCheck.content).toContain("CHECK PASS");
    expect(result.status).toBe("done");
  });
  it("holds a model that stops early to the check, then gives up after two reminders", async () => {
    const { runtime, requests } = runtimeFor([messageReply([textBlock("Done.")]), messageReply([textBlock("Done.")]), messageReply([textBlock("Done.")])]);
    const result = await runtime.build(input);
    expect(requests).toHaveLength(3);
    expect((requests[1].body.messages as { content: string }[])[2].content).toContain("You are not done");
    expect(result).toMatchObject({ status: "done", html: null, floorJson: null });
  });
  it("runs every tool call in a reply, in order", async () => {
    const { runtime, requests } = runtimeFor([messageReply([write("index.html", GOOD_HTML), write("floor.json", GOOD_JSON)]), messageReply([check()]), messageReply([textBlock("Done.")])]);
    const result = await runtime.build(input);
    expect(resultsIn(requests[1])).toHaveLength(2);
    expect(result.floorJson).toBe(GOOD_JSON);
  });
  it("writes nothing when a reply is cut off by the token limit", async () => {
    const { runtime, requests } = runtimeFor([messageReply([write("index.html", "<html")], { stop: "max_tokens" }), messageReply([textBlock("x")]), messageReply([textBlock("x")]), messageReply([textBlock("x")])]);
    const result = await runtime.build(input);
    expect(resultsIn(requests[1])[0]).toMatchObject({ is_error: true });
    expect(result.html).toBeNull();
  });
  it("stops on a refusal", async () => {
    const { runtime } = runtimeFor([messageReply([], { stop: "refusal" })]);
    expect(await runtime.build(input)).toMatchObject({ status: "error", reason: "The model declined this build." });
  });
  it("drops to a smaller token limit once if a request is too large for the in-flight budget", async () => {
    const tooLarge: FakeReply = { status: 402, body: { error: { message: "m", metadata: { reason: "weight_exceeds_budget" } } } };
    const { runtime, requests } = runtimeFor([tooLarge, ...passingBuild]);
    expect((await runtime.build(input)).status).toBe("done");
    expect(requests[1].body.max_tokens).toBe(BUILD_MIN_MAX_TOKENS);
    const twice = runtimeFor([tooLarge, tooLarge]);
    expect((await twice.runtime.build(input)).status).toBe("error");
  });
  it("never throws after spending: a failed call returns what was already spent, in public words", async () => {
    const { runtime } = runtimeFor([messageReply([write("index.html", GOOD_HTML)], { cost: 5 * CENT }), { status: 402, body: { error: { message: "secret detail sk-or-v1-abcdefghijkl" } } }]);
    const result = await runtime.build(input);
    expect(result).toMatchObject({ status: "error", reason: "OpenRouter credit ran out." });
    expect(result.costCents).toBeCloseTo(5);
    expect(JSON.stringify(result)).not.toContain("secret detail");
  });
  it("stops rather than spend blind if a call reports no cost", async () => {
    const { runtime } = runtimeFor([messageReply([textBlock("x")], { cost: null })]);
    const result = await runtime.build(input);
    expect(result.status).toBe("error");
    expect(result.reason).toContain("no cost");
  });
  it("scrubs anything key-shaped from the transcript", async () => {
    const { runtime } = runtimeFor([messageReply([textBlock("my key is sk-or-v1-abcdefghijkl")]), messageReply([textBlock("x")]), messageReply([textBlock("x")])]);
    expect(JSON.stringify((await runtime.build(input)).transcript)).not.toContain("sk-or-v1-abcdefghijkl");
  });
});

describe("the caps", () => {
  it("stops at the spend cap, from real reported cost, and starts no further call", async () => {
    const { runtime, requests } = runtimeFor([messageReply([write("index.html", GOOD_HTML)], { cost: 40 * CENT }), messageReply([write("floor.json", GOOD_JSON)], { cost: 25 * CENT }), messageReply([check()])]);
    const result = await runtime.build(input);
    expect(result).toMatchObject({ status: "budget", reason: "spend cap reached" });
    expect(result.costCents).toBeCloseTo(65);
    expect(requests).toHaveLength(2);
  });
  it("still ships a floor that had passed its check when a limit stops the closing message", async () => {
    const { runtime } = runtimeFor([messageReply([write("index.html", GOOD_HTML), write("floor.json", GOOD_JSON)], { cost: 30 * CENT }), messageReply([check()], { cost: 31 * CENT })]);
    expect(await runtime.build(input)).toMatchObject({ status: "done", reason: null, html: GOOD_HTML });
  });
  it("does not count a passed check once the file has changed", async () => {
    const { runtime } = runtimeFor([messageReply([write("index.html", GOOD_HTML), write("floor.json", GOOD_JSON)], { cost: 10 * CENT }), messageReply([check()], { cost: 10 * CENT }), messageReply([write("index.html", GOOD_HTML + "<!-- -->")], { cost: 45 * CENT })]);
    expect((await runtime.build(input)).status).toBe("budget");
  });
  it("stops at the token cap, counted across every call", async () => {
    const { runtime, requests } = runtimeFor([messageReply([read("kit/RULES.md")], { inputTokens: 100, outputTokens: 50 }), messageReply([read("kit/RULES.md", "r_2")], { inputTokens: 100, outputTokens: 50 }), messageReply([check()])], { tokenCap: 300 });
    expect(await runtime.build(input)).toMatchObject({ status: "budget", reason: "token cap reached" });
    expect(requests).toHaveLength(2);
  });
  it("stops once the conversation is too large, so one last call has a known bound", async () => {
    const { runtime, requests } = runtimeFor([messageReply([write("index.html", GOOD_HTML)], { inputTokens: 60_000, outputTokens: 10 }), messageReply([check()])]);
    expect(await runtime.build(input)).toMatchObject({ status: "budget", reason: "token cap reached" });
    expect(requests).toHaveLength(1);
  });
  it("stops at the turn cap", async () => {
    const replies = Array.from({ length: 20 }, () => messageReply([read("kit/RULES.md")], { cost: 0.0001 }));
    const { runtime, requests } = runtimeFor(replies, { maxTurns: 4 });
    expect(await runtime.build(input)).toMatchObject({ status: "error", reason: "The build passed its limit of 4 model turns." });
    expect(requests).toHaveLength(4);
  });
  it("stops at the deadline, shared between the build and the send-back", async () => {
    let clock = 0;
    const { runtime } = runtimeFor(passingBuild, { deadlineMs: 100, now: () => clock });
    const built = await runtime.build(input);
    expect(built.status).toBe("done");
    clock = 150;
    expect(await runtime.sendBack(built.sessionId as string, ["Fix it."])).toMatchObject({ status: "timeout" });
  });
});

describe("a send-back", () => {
  it("continues the same conversation, shares the cap, and reports only its own cost", async () => {
    const { runtime, requests } = runtimeFor([...passingBuild, messageReply([write("index.html", GOOD_HTML)], { cost: 3 * CENT }), messageReply([check()], { cost: CENT }), messageReply([textBlock("Fixed.")], { cost: CENT })]);
    const built = await runtime.build(input);
    const after = await runtime.sendBack(built.sessionId as string, ["Fix the total."]);
    expect(after.status).toBe("done");
    expect(after.costCents).toBeCloseTo(5);
    expect(built.costCents + after.costCents).toBeCloseTo(19);
    const messages = requests[4].body.messages as { role: string; content: unknown }[];
    expect(String(messages[messages.length - 1].content)).toContain("Fix the total.");
    expect(messages.length).toBe(9);
    expect(after.transcript.length).toBeGreaterThan(built.transcript.length);
  });
  it("refuses an id it does not know", async () => {
    const { runtime } = runtimeFor([]);
    await expect(runtime.sendBack("nope", ["x"])).rejects.toThrow("unknown build");
  });
});

describe("the work folder", () => {
  const ROOT = join(tmpdir(), "nightcrew-confine");
  it("resolves ordinary paths inside it", () => {
    expect(confine(ROOT, "index.html")).toBe(join(ROOT, "index.html"));
    expect(confine(ROOT, "kit/snapshot.json")).toBe(join(ROOT, "kit", "snapshot.json"));
  });
  it("refuses every way out of it", () => {
    const attacks: unknown[] = ["../secret", "kit/../../secret", "..", ".", "", "/etc/passwd", "/proc/self/environ", "C:\\Windows\\win.ini", "C:/Windows/win.ini", "kit\\..\\..\\secret", "\\\\server\\share", ".env", "kit/.env", "a\0b", "~/x", "kit//x", "kit/", "%2e%2e/x", null, 7, ["index.html"], { path: "index.html" }];
    for (const attack of attacks) expect(confine(ROOT, attack), String(attack)).toBeNull();
  });
  it("reads a kit file and its own files, cuts a huge one, and refuses the rest", async () => {
    const big = "x".repeat(30_000);
    const { runtime, requests } = runtimeFor([
      messageReply([read("kit/snapshot.json")]),
      messageReply([read("../../../../etc/passwd", "r_2")]),
      messageReply([read("/proc/self/environ", "r_3")]),
      messageReply([read("nothing.txt", "r_4")]),
      messageReply([read("kit/big.json", "r_5")]),
      messageReply([textBlock("x")]),
      messageReply([textBlock("x")]),
      messageReply([textBlock("x")]),
    ]);
    const result = await runtime.build({ ...input, kitFiles: [...input.kitFiles, { name: "big.json", content: big }] });
    expect(resultsIn(requests[1])[0]).toMatchObject({ content: '{"staked":"1"}', is_error: false });
    for (const index of [2, 3, 4]) expect(resultsIn(requests[index])[0].is_error).toBe(true);
    expect(resultsIn(requests[5])[0].content).toContain("[cut at 24000 characters]");
    expect(resultsIn(requests[5])[0].content.length).toBeLessThan(25_000);
    expect(result.status).toBe("done");
  });
  it("writes only the two files, within the size limit", async () => {
    const { runtime, requests } = runtimeFor([
      messageReply([write("kit/RULES.md", "changed")]),
      messageReply([write("../escape.html", "x", "w_2")]),
      messageReply([write("/tmp/x", "x", "w_3")]),
      messageReply([write("index.html", "x".repeat(256 * 1024 + 1), "w_4")]),
      messageReply([toolBlock("write_file", { path: "index.html", content: 7 }, "w_5")]),
      messageReply([textBlock("x")]),
      messageReply([textBlock("x")]),
      messageReply([textBlock("x")]),
    ]);
    const result = await runtime.build(input);
    for (const index of [1, 2, 3, 4, 5]) expect(resultsIn(requests[index])[0].is_error).toBe(true);
    expect(result.html).toBeNull();
    expect(existsSync(join(tmpdir(), "escape.html"))).toBe(false);
  });
  it("answers a tool it does not have with an error, and runs nothing", async () => {
    const { runtime, requests } = runtimeFor([messageReply([toolBlock("bash", { command: "cat /proc/self/environ" })]), messageReply([textBlock("x")]), messageReply([textBlock("x")]), messageReply([textBlock("x")])]);
    await runtime.build(input);
    expect(resultsIn(requests[1])[0]).toMatchObject({ content: "There is no tool called bash.", is_error: true });
  });
  it("removes the folder when disposed", async () => {
    const { runtime } = runtimeFor(passingBuild);
    await runtime.build(input);
    const folder = (runtime as unknown as { conversation: { dir: string } }).conversation.dir;
    expect(existsSync(folder)).toBe(true);
    runtime.dispose();
    expect(existsSync(folder)).toBe(false);
  });
});

describe("run_floor_check", () => {
  it("passes the good floor", () => {
    expect(checkFloor(GOOD_HTML, GOOD_JSON)).toEqual({ pass: true, findings: [] });
    expect(checkReport({ pass: true, findings: [] })).toContain("CHECK PASS");
  });
  it("says which files are missing", () => {
    expect(checkFloor(null, null).findings).toHaveLength(2);
  });
  it("reports a rule the floor breaks", () => {
    const check = checkFloor(GOOD_HTML.replace("function work()", "location.href = 'x'; function work()"), GOOD_JSON);
    expect(check.pass).toBe(false);
    expect(checkReport(check)).toContain("location");
  });
  it("reports a script that is not a complete program", () => {
    expect(checkFloor(GOOD_HTML.replace("function work()", "}}); function work()"), GOOD_JSON).pass).toBe(false);
  });
  it("reports bad floor.json", () => {
    expect(checkFloor(GOOD_HTML, "{nope").findings).toEqual(["floor.json is not valid JSON."]);
    expect(checkFloor(GOOD_HTML, "null").pass).toBe(false);
    expect(checkFloor(GOOD_HTML, JSON.stringify({ name: "x", oneLiner: "x", howToUse: "x", tests: [] })).pass).toBe(false);
  });
  it("reports a test whose id appears nowhere in the file, because it could never pass", () => {
    const spec = JSON.parse(GOOD_JSON) as { tests: { steps: { selector: string }[] }[] };
    spec.tests[0].steps[0].selector = "#nowhere";
    const check = checkFloor(GOOD_HTML, JSON.stringify(spec));
    expect(check.pass).toBe(false);
    expect(check.findings[0]).toContain('"nowhere" appears nowhere');
  });
});

describe("the boundary", () => {
  const SOURCES = ["crew/crew.ts", "crew/lib/crew-shift.ts", "crew/lib/floor-check.ts", "crew/lib/model.ts", "crew/lib/openrouter.ts", "crew/lib/openrouter-runtime.ts", "crew/lib/review.ts", "crew/lib/triage.ts"];
  it("never imports a browser, a shell or a way to run code into the job that holds the key", () => {
    for (const path of SOURCES) {
      const source = readFileSync(path, "utf8");
      for (const banned of ["playwright", "floor-gate/browser", "child_process", "node:vm", "worker_threads", "new Function", "eval("]) expect(source.includes(banned), `${path} holds ${banned}`).toBe(false);
    }
  });
  it("reads the key from one place, and hands it to nothing but the client", () => {
    for (const path of SOURCES) {
      const expected = path === "crew/crew.ts" ? 1 : 0;
      expect(readFileSync(path, "utf8").split("OPENROUTER_API_KEY").length - 1, path).toBe(expected);
    }
  });
  it("uses Haiku for triage and review", () => {
    expect(readFileSync("crew/lib/triage.ts", "utf8")).toContain("CREW_SUPPORT_MODEL = HAIKU_SLUG");
    expect(HAIKU_SLUG).toBe("anthropic/claude-haiku-5.5");
  });
});
