import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assembleFloor } from "@/lib/floor-gate/assemble";
import { runBrowserGate, type ProviderMode } from "@/lib/floor-gate/browser";
import { runCoreGate } from "@/lib/floor-gate/static";
import { launchChrome } from "./helpers/chrome";
import { HOSTILE_FLOORS } from "./fixtures/hostile-floors";

const NO_TESTS = { tests: [] };

describe("the core static rules", () => {
  for (const floor of HOSTILE_FLOORS.filter((item) => item.caughtBy === "core")) {
    it(`reject ${floor.name}`, () => {
      expect(runCoreGate(floor.html).length).toBeGreaterThan(0);
    });
  }
  it("do not reject the good floor", () => {
    expect(runCoreGate(readFileSync("tests/fixtures/good-floor/index.html", "utf8"))).toEqual([]);
  });
});

describe("the runtime contains every hostile floor with the static gate switched off", () => {
  for (const providerMode of ["configurable", "non-configurable"] as ProviderMode[]) {
    for (const floor of HOSTILE_FLOORS) {
      it(`${floor.name}, ${providerMode} provider`, async () => {
        if (floor.runtime === "refused") {
          expect(() => assembleFloor(floor.html, null)).toThrow(/complete program/);
          return;
        }
        const assembled = assembleFloor(floor.html, null);
        const result = await runBrowserGate({ html: assembled.html, scriptHashes: assembled.scriptHashes, spec: NO_TESTS, launch: launchChrome, providerMode, settleMs: 500 });
        const reached = result.violations.filter((violation) => violation.kind === "provider-touched" || violation.kind === "new-window" || violation.kind === "dialog");
        expect(reached).toEqual([]);
        const external = result.violations.filter((violation) => violation.kind === "network" && !violation.detail.includes("/evil"));
        expect(external).toEqual([]);
        if (floor.runtime === "navigation") {
          expect(result.violations.map((violation) => violation.kind)).toContain("navigation");
        } else {
          expect(result.violations.map((violation) => violation.kind)).not.toContain("navigation");
        }
      });
    }
  }
});
