import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("the scaffold", () => {
  it("runs on Node 22 or later", () => {
    expect(Number(process.versions.node.split(".")[0])).toBeGreaterThanOrEqual(22);
  });
  it("has TypeScript strict mode on", () => {
    expect(JSON.parse(readFileSync("tsconfig.json", "utf8")).compilerOptions.strict).toBe(true);
  });
  it("resolves the @/ path alias", async () => {
    const config = await import("@/vitest.config");
    expect(config.default).toBeDefined();
  });
});
