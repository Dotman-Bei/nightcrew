import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Verdict } from "@/crew/lib/contracts";
import { verifyFloor } from "@/crew/lib/verify-floor";
import { launchChrome } from "./helpers/chrome";

const GOOD_HTML = readFileSync("tests/fixtures/good-floor/index.html", "utf8");
const GOOD_JSON = readFileSync("tests/fixtures/good-floor/floor.json", "utf8");

describe("verifyFloor", () => {
  it("passes a good floor, gives the assembled file and takes screenshots", async () => {
    const output = await verifyFloor(GOOD_HTML, GOOD_JSON, '{"a":1}', launchChrome);
    expect(output.verdict.pass).toBe(true);
    expect(Verdict.safeParse(output.verdict).success).toBe(true);
    expect(output.verdict.floorHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(output.assembledHtml).toContain('{"a":1}');
    expect(output.screenshots?.wide.length).toBeGreaterThan(1000);
    expect(output.verdict.tests.map((test) => test.pass)).toEqual([true, true, true]);
  });
  it("fails a floor that breaks a static rule, even if it runs", async () => {
    const output = await verifyFloor(GOOD_HTML.replace("function work()", 'const d = document; function work()'), GOOD_JSON, "{}", launchChrome);
    expect(output.verdict.pass).toBe(false);
    expect(output.verdict.static.map((finding) => finding.rule)).toContain("document-alias");
  });
  it("fails a floor whose own test fails", async () => {
    const spec = JSON.parse(GOOD_JSON);
    spec.tests[1].steps[1].contains = "not what the tool says";
    const output = await verifyFloor(GOOD_HTML, JSON.stringify(spec), "{}", launchChrome);
    expect(output.verdict.pass).toBe(false);
    expect(output.verdict.tests[1].pass).toBe(false);
  });
  it("reports malformed floor.json instead of throwing", async () => {
    expect((await verifyFloor(GOOD_HTML, "not json", "{}", launchChrome)).verdict.floorJsonIssues).toEqual(["floor.json is not valid JSON"]);
    const tooFew = await verifyFloor(GOOD_HTML, JSON.stringify({ name: "x", oneLiner: "x", howToUse: "x", tests: [] }), "{}", launchChrome);
    expect(tooFew.verdict.pass).toBe(false);
    expect(tooFew.verdict.floorJsonIssues.length).toBeGreaterThan(0);
  });
});
