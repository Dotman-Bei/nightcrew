import { checkCoreScript, parseFloor, parseScript, type Finding, type JsNode } from "@/lib/floor-gate/static-core";

export type { Finding } from "@/lib/floor-gate/static-core";

type ScriptRule = (ast: JsNode) => Finding[];

const SCRIPT_RULES: ScriptRule[] = [checkCoreScript];

/** Runs every static rule on a raw floor. An empty list means it passed. */
export function runStaticGate(html: string): Finding[] {
  const { scripts, findings } = parseFloor(html);
  for (const code of scripts) {
    const ast = parseScript(code, findings);
    if (!ast) continue;
    for (const rule of SCRIPT_RULES) findings.push(...rule(ast));
  }
  return findings;
}

/** The core rules alone, for tests that prove which rule set catches what. */
export function runCoreGate(html: string): Finding[] {
  const { scripts, findings } = parseFloor(html);
  for (const code of scripts) {
    const ast = parseScript(code, findings);
    if (ast) findings.push(...checkCoreScript(ast));
  }
  return findings;
}
