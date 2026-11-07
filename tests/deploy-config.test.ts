import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("the deploy config", () => {
  const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as { buildCommand: string; framework: string };
  it("migrates the database before each build", () => {
    expect(vercel.framework).toBe("nextjs");
    expect(vercel.buildCommand).toBe("npx tsx db/migrate.ts && next build");
  });
  it("keeps secrets and local state out of git", () => {
    const ignore = readFileSync(".gitignore", "utf8");
    for (const entry of [".env", ".next/", "node_modules/", "shift-work/", ".taste-skill/"]) expect(ignore).toContain(entry);
  });
  it("lists every env var by name only", () => {
    const example = readFileSync(".env.example", "utf8");
    for (const name of ["OPENROUTER_API_KEY", "ATTESTER_PRIVATE_KEY", "DATABASE_URL", "FLOORS_ORIGIN", "RATE_LIMIT_SALT", "VETO_ADDRESS"]) expect(example).toContain(`${name}=\n`);
    expect(example).not.toContain("ANTHROPIC_API_KEY");
    expect(example).not.toMatch(/=\S/);
  });
});
