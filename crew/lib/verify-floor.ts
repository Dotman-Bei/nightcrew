import type { Browser } from "playwright-core";
import { assembleFloor } from "@/lib/floor-gate/assemble";
import { gatePassed, runBrowserGate } from "@/lib/floor-gate/browser";
import { FloorSpec } from "@/lib/floor-gate/floor-spec";
import { runStaticGate } from "@/lib/floor-gate/static";
import type { Verdict } from "@/crew/lib/contracts";

export type VerifyOutput = {
  verdict: Verdict;
  assembledHtml: string | null;
  screenshots: { wide: string; narrow: string } | null;
};

/** The authoritative gate. Runs on a machine with no secrets; the publish job trusts only its verdict. */
export async function verifyFloor(rawHtml: string, floorJsonText: string, snapshotJson: string, launch: () => Promise<Browser>): Promise<VerifyOutput> {
  const findings = runStaticGate(rawHtml);
  let spec: FloorSpec | null = null;
  let floorJsonIssues: string[] = [];
  try {
    const parsed = FloorSpec.safeParse(JSON.parse(floorJsonText));
    if (parsed.success) spec = parsed.data;
    else floorJsonIssues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  } catch {
    floorJsonIssues = ["floor.json is not valid JSON"];
  }
  const base = { static: findings, floorJsonIssues, violations: [], errors: [], tests: [], floorHash: null, scriptHashes: null };
  if (!spec) return { verdict: { ...base, pass: false }, assembledHtml: null, screenshots: null };

  let assembled;
  try {
    assembled = assembleFloor(rawHtml, snapshotJson);
  } catch (error) {
    const message = error instanceof Error ? error.message : "assembly failed";
    return { verdict: { ...base, pass: false, errors: [message] }, assembledHtml: null, screenshots: null };
  }
  const result = await runBrowserGate({ html: assembled.html, scriptHashes: assembled.scriptHashes, spec, launch, screenshots: true });
  const pass = findings.length === 0 && gatePassed(result);
  return {
    verdict: {
      pass,
      static: findings,
      floorJsonIssues,
      violations: result.violations,
      errors: result.errors,
      tests: result.tests,
      floorHash: assembled.hash,
      scriptHashes: assembled.scriptHashes,
    },
    assembledHtml: assembled.html,
    screenshots: result.screenshots,
  };
}
