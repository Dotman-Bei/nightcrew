import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runStaticGate } from "@/lib/floor-gate/static";

describe("the floor kit", () => {
  it("ships a blank template that passes the static gate", () => {
    expect(runStaticGate(readFileSync("floor-kit/template.html", "utf8"))).toEqual([]);
  });
  it("tells the agent to use its tools, with no path or command from another runtime", () => {
    const rules = readFileSync("floor-kit/RULES.md", "utf8");
    expect(rules).toContain("write_file");
    expect(rules).toContain("run_floor_check");
    for (const stale of ["/mnt/session", "check.mjs", "sealed"]) expect(rules).not.toContain(stale);
  });
  it("tells the agent the check does not run the floor", () => {
    expect(readFileSync("floor-kit/RULES.md", "utf8")).toContain("does not run them");
  });
  it("has no script left that bundles the old check", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string>; devDependencies: Record<string, string> };
    expect(pkg.scripts.kit).toBeUndefined();
    expect(pkg.devDependencies.esbuild).toBeUndefined();
  });
});
