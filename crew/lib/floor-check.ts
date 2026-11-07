import { assembleFloor } from "@/lib/floor-gate/assemble";
import { FloorSpec } from "@/lib/floor-gate/floor-spec";
import { runStaticGate } from "@/lib/floor-gate/static";

export type FloorCheck = { pass: boolean; findings: string[] };

/** An id a test names has to appear somewhere in the file, or that test can never pass. */
function missingIds(html: string, spec: FloorSpec): string[] {
  const findings = new Set<string>();
  for (const test of spec.tests) {
    for (const step of test.steps) {
      for (const match of step.selector.matchAll(/#([A-Za-z][\w-]*)/g)) {
        if (!html.includes(match[1])) findings.add(`floor.json: the test "${test.name}" uses ${match[0]}, but "${match[1]}" appears nowhere in index.html.`);
      }
    }
  }
  return [...findings];
}

/**
 * What run_floor_check does. It parses the agent's files and never runs them: this runs in the job
 * that holds the OpenRouter key, so the browser gate stays in the secretless verify job.
 */
export function checkFloor(html: string | null, floorJson: string | null): FloorCheck {
  const findings: string[] = [];
  if (html === null) findings.push("index.html does not exist yet. Write it with write_file.");
  if (floorJson === null) findings.push("floor.json does not exist yet. Write it with write_file.");
  if (html !== null) {
    try {
      for (const finding of runStaticGate(html)) findings.push(`${finding.rule}: ${finding.detail}`);
      assembleFloor(html, null);
    } catch (error) {
      findings.push(`index.html could not be checked: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
  if (floorJson !== null) {
    let parsed: unknown;
    let isJson = true;
    try {
      parsed = JSON.parse(floorJson);
    } catch {
      isJson = false;
      findings.push("floor.json is not valid JSON.");
    }
    if (isJson) {
      const spec = FloorSpec.safeParse(parsed);
      if (!spec.success) for (const issue of spec.error.issues) findings.push(`floor.json: ${issue.path.join(".")}: ${issue.message}`);
      else if (html !== null) findings.push(...missingIds(html, spec.data));
    }
  }
  return { pass: findings.length === 0, findings };
}

export function checkReport(check: FloorCheck): string {
  const note = "This check reads your files and does not run them. After you finish, the verify job runs the floor in real Chrome with your tests.";
  if (check.pass) return `CHECK PASS\n${note}`;
  return ["CHECK FAIL", ...check.findings.map((finding) => `- ${finding}`), note].join("\n");
}
