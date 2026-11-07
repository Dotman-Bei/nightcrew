import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const yaml = readFileSync(".github/workflows/shift.yml", "utf8").replace(/\r\n/g, "\n");

function job(name: string): string {
  const start = yaml.indexOf(`\n  ${name}:\n`);
  expect(start).toBeGreaterThan(-1);
  const rest = yaml.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[a-z]+:\n/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

describe("the shift workflow's trust boundaries", () => {
  it("gives the verify job no secrets at all", () => {
    expect(job("verify")).not.toContain("secrets.");
    expect(job("verify")).not.toContain("env:");
  });
  it("gives the crew job only the OpenRouter key", () => {
    expect(job("crew").match(/secrets\.[A-Z_]+/g)).toEqual(["secrets.OPENROUTER_API_KEY"]);
  });
  it("gives no other job the OpenRouter key", () => {
    for (const name of ["close", "verify", "publish"]) expect(job(name)).not.toContain("OPENROUTER_API_KEY");
  });
  it("runs only the crew script in the job holding the key, with no browser", () => {
    expect(job("crew").match(/run: .+$/gm)).toEqual(["run: npm ci", "run: npx tsx crew/crew.ts"]);
    expect(job("crew")).not.toMatch(/chrome|playwright|verify\.ts/i);
  });
  it("gives the close job only the database", () => {
    expect(new Set(job("close").match(/secrets\.[A-Z_]+/g))).toEqual(new Set(["secrets.DATABASE_URL"]));
  });
  it("gives only the publish job the attester key", () => {
    expect(job("publish")).toContain("secrets.ATTESTER_PRIVATE_KEY");
    for (const name of ["close", "crew", "verify"]) expect(job(name)).not.toContain("ATTESTER_PRIVATE_KEY");
  });
  it("gives no job write permission, and no default permissions", () => {
    expect(yaml).toContain("\npermissions: {}\n");
    expect(yaml).not.toMatch(/: write/);
    expect(yaml).not.toContain("GITHUB_TOKEN");
  });
  it("publishes even when earlier jobs failed", () => {
    expect(job("publish")).toContain("if: always() && needs.close.outputs.claimed == 'true'");
  });
  it("runs only when armed, unless started by hand", () => {
    expect(job("close")).toContain("if: vars.SHIFTS_ARMED == 'true' || github.event_name == 'workflow_dispatch'");
  });
  it("has three staggered schedules for a 22:00 UTC shift", () => {
    expect(yaml).toContain('cron: "0 22 * * *"');
    expect(yaml).toContain('cron: "20 22 * * *"');
    expect(yaml).toContain('cron: "40 22 * * *"');
  });
  it("never runs two shifts at once", () => {
    expect(yaml).toContain("concurrency:\n  group: shift");
  });
});
