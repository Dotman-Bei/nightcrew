import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assembleFloor } from "@/lib/floor-gate/assemble";
import { gatePassed, runBrowserGate } from "@/lib/floor-gate/browser";
import { FloorSpec } from "@/lib/floor-gate/floor-spec";
import { launchChrome } from "./helpers/chrome";

const goodHtml = readFileSync("tests/fixtures/good-floor/index.html", "utf8");
const goodSpec = FloorSpec.parse(JSON.parse(readFileSync("tests/fixtures/good-floor/floor.json", "utf8")));

describe("browser gate", () => {
  const assembled = assembleFloor(goodHtml, '{"a":1}');

  for (const providerMode of ["configurable", "non-configurable"] as const) {
    it(`passes the good floor with a ${providerMode} provider, runs its tests and leaves the provider alone`, async () => {
      const result = await runBrowserGate({ html: assembled.html, scriptHashes: assembled.scriptHashes, spec: goodSpec, launch: launchChrome, providerMode });
      expect(result.violations).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.tests.map((test) => test.pass)).toEqual([true, true, true]);
      expect(gatePassed(result)).toBe(true);
    });
  }

  it("fails a test whose expectation is wrong, with a reason", async () => {
    const spec = { tests: [{ name: "wrong", steps: [{ op: "click" as const, selector: "#go" }, { op: "expectText" as const, selector: "#result", contains: "nope" }] }] };
    const result = await runBrowserGate({ html: assembled.html, scriptHashes: assembled.scriptHashes, spec, launch: launchChrome });
    expect(result.tests[0].pass).toBe(false);
    expect(result.tests[0].detail).toContain("nope");
    expect(gatePassed(result)).toBe(false);
  });

  it("takes wide and narrow screenshots", async () => {
    const result = await runBrowserGate({ html: assembled.html, scriptHashes: assembled.scriptHashes, spec: { tests: [] }, launch: launchChrome, screenshots: true });
    expect(result.screenshots?.wide.length).toBeGreaterThan(1000);
    expect(result.screenshots?.narrow.length).toBeGreaterThan(1000);
  });
});
