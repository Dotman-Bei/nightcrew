# Foundation Implementation Plan

**Goal:** Scaffold the project, prove the OpenRouter crew runtime on the user's key tonight, and lay down hashing, the database and shift claiming.
**Architecture:** A Next.js 16 app in TypeScript strict. Postgres through one small query interface: Neon over HTTP in production, in-process PGlite in tests and local pages, so no Docker is needed. The OpenRouter probe comes early, so its answer lands on Fri 6 Nov.
**Tech Stack:** next 16.4.5, react 19.3.1, typescript 7.0.2, vitest 5.1.0, tsx 4.23.15, zod 4.6.7, viem 2.57.16, @anthropic-ai/sdk 1.6.0, @neondatabase/serverless 1.2.0, @electric-sql/pglite 0.5.15
**Source spec:** docs/superpowers/specs/2026-11-06-nightcrew-design.md

Task references use `<plan>:<task>`, across all six plans, in build order: `foundation`, `floor`, `pipeline`, `votes`, `frontend`, `launch`. The code here passed each task's gate in a reference build on 2026-11-06. Tasks marked as cut candidates can be skipped at the Sat 7 Nov 12:00 UTC checkpoint, through the architect, never by hand. Gates need the installed dependencies: a fresh worktree runs `npm ci` first, with a real `node_modules` folder and never a link to another one.

**Amended 2026-11-06: the crew runs on OpenRouter, not Managed Agents.** Tasks already built keep their original text, so some still name Managed Agents: `foundation:7`, `pipeline:14` and `pipeline:15` amend them. Tasks not yet built were edited in place, and every task id is unchanged.

---
### Task 1: Scaffold the project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `next.config.ts`
- Create: `.env.example`
- Create: `.gitattributes`
- Modify: `.gitignore`
- Test:   `tests/smoke.test.ts`

**Effort:** low
**Model tier:** fast
**Provides:** `package.json: pinned stack, tsconfig.json with the @/ alias, vitest.config.ts`
**Requires:** (nothing upstream)

Keep the dependency versions exactly as written. `package-lock.json` is an allowed side effect, and the build relies on it: GitHub Actions runs `npm ci`. `.gitattributes` keeps every checkout on LF: this machine's git otherwise rewrites files as CRLF on any checkout, retry or worktree.

- [ ] **Step 1: Write the project files**

`package.json`:

```json
{
  "name": "nightcrew",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "dev": "next dev -H 127.0.0.1 -p 3000",
    "build": "next build",
    "start": "next start -H 127.0.0.1 -p 3000",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "db:migrate": "tsx db/migrate.ts",
    "kit": "node scripts/build-floor-kit.mjs"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "1.6.0",
    "@coinbase/wallet-sdk": "4.3.7",
    "@electric-sql/pglite": "0.5.15",
    "@neondatabase/serverless": "1.2.0",
    "@tanstack/react-query": "5.106.1",
    "acorn": "8.19.0",
    "acorn-walk": "8.3.5",
    "diff": "9.0.0",
    "next": "16.4.5",
    "parse5": "8.1.0",
    "playwright-core": "1.65.0",
    "react": "19.3.1",
    "react-dom": "19.3.1",
    "viem": "2.57.16",
    "wagmi": "3.7.11",
    "zod": "4.6.7"
  },
  "devDependencies": {
    "@types/node": "22.19.0",
    "@types/react": "19.2.0",
    "@types/react-dom": "19.2.0",
    "esbuild": "0.28.2",
    "tsx": "4.23.15",
    "typescript": "7.0.2",
    "vitest": "5.1.0"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowJs": true,
    "jsx": "react-jsx",
    "incremental": true,
    "skipLibCheck": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules", "public", "floor-kit/dist"]
}
```

`vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)).replace(/[\\/]$/, "") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 120000,
    hookTimeout: 120000,
    pool: "forks",
  },
});
```

`next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
```

`.env.example`:

```text
# Names only. Values live in GitHub, Vercel or your shell, never in this repo.

# Shift pipeline (GitHub Actions)
ANTHROPIC_API_KEY=
ATTESTER_PRIVATE_KEY=
DATABASE_URL=
BASE_RPC_URL=
CREW_AGENT_ID=
CREW_ENVIRONMENT_ID=
CREW_BUILD_MODEL=
CREW_SHIFT_CAP_CENTS=
CREW_TOTAL_BUDGET_CENTS=
EAS_SCHEMA_UID=
SHIFTS_ARMED=
VETO_ADDRESS=

# App (Vercel)
NEXT_PUBLIC_SITE_ORIGIN=
FLOORS_ORIGIN=
RATE_LIMIT_SALT=

# Local tests
CHROME_PATH=
```

`.gitattributes`:

```text
# Every checkout uses LF, on Windows too. Gates and hashes read these files byte for byte.
* text=auto eol=lf
```

Append to `.gitignore`:

```text

# Local state
next-env.d.ts
tsconfig.tsbuildinfo
shift-work/
.taste-skill/
floor-kit/dist/
```

- [ ] **Step 2: Install**

Run: `npm install`
This creates `node_modules` and `package-lock.json`.

- [ ] **Step 3: Write the smoke test**

`tests/smoke.test.ts`:

```ts
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
```

- [ ] **Step 4: Run it**

Run: `npx vitest run tests/smoke.test.ts`
Expected: Test Files  1 passed (1)

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**

The orchestrator re-runs the gate, scope-checks the worktree against `Files:`, and commits exactly those paths. Executors never touch git.
Message: `chore: scaffold the Next.js project with the pinned stack`

---

### Task 2: Write the runtime probe

**Files:**
- Create: `crew/lib/probe.ts`
- Create: `crew/lib/provisioning.ts`
- Create: `crew/probe-runtime.ts`
- Test:   `tests/probe.test.ts`

**Depends on:** Task foundation:1
**Effort:** high
**Model tier:** top
**Provides:** `crew/lib/probe.ts: decideProbe(report: ProbeReport | null, failure?: string | null): ProbeVerdict`, `crew/lib/provisioning.ts: createCrewResources(client: Anthropic, name: string, model: string): Promise<CrewResources>`
**Requires:** `package.json: pinned stack, tsconfig.json with the @/ alias, vitest.config.ts`

This defines the sealed sandbox settings the whole security boundary rests on: no hosts, no package managers, no MCP, web tools off. Do not relax them. Do not run `crew/probe-runtime.ts`: it spends money, and the next task is the user's.

Upstream interfaces this task uses, exactly as their tasks provide them:

```text
package.json: pinned stack, tsconfig.json with the @/ alias, vitest.config.ts
```

- [ ] **Step 1: Write the failing test**

`tests/probe.test.ts`:

````ts
import { describe, expect, it } from "vitest";
import { decideProbe, parseProbeReport } from "@/crew/lib/probe";
import { SEALED_NETWORKING, SEALED_TOOLS } from "@/crew/lib/provisioning";

describe("the sandbox settings", () => {
  it("allow no hosts, no packages and no MCP", () => {
    expect(SEALED_NETWORKING).toEqual({ type: "limited", allowed_hosts: [], allow_package_managers: false, allow_mcp_servers: false });
  });
  it("turn the web tools off and never pause for approval", () => {
    const tools = SEALED_TOOLS[0];
    expect(tools.configs.map((config) => [config.name, config.enabled])).toEqual([["web_fetch", false], ["web_search", false]]);
    expect(tools.default_config.permission_policy.type).toBe("always_allow");
  });
});

describe("the runtime probe", () => {
  it("reads a report with or without a code fence", () => {
    expect(parseProbeReport('```json\n{"node":"v22","curl":"000 exit=6","chromium":"ok"}\n```')).toEqual({ node: "v22", curl: "000 exit=6", chromium: "ok" });
    expect(parseProbeReport("no json here")).toBeNull();
  });
  it("applies the decision table", () => {
    expect(decideProbe({ node: "v22", curl: "000 exit=6", chromium: "ok" }).decision).toBe("managed-agents");
    expect(decideProbe({ node: "v22", curl: "000 exit=6", chromium: "Error: no browser" }).decision).toBe("managed-agents-no-chromium");
    expect(decideProbe({ node: "v22", curl: "200 exit=0", chromium: "ok" }).decision).toBe("fallback");
    expect(decideProbe(null, "403 no access").decision).toBe("fallback");
  });
});
````

- [ ] **Step 2: Run to confirm it fails**

Run: `npx vitest run tests/probe.test.ts`
Expected: FAIL: Cannot find module "@/crew/lib/probe"

- [ ] **Step 3: Minimal implementation**

`crew/lib/probe.ts`:

```ts
export const PROBE_MODEL = "claude-haiku-5-5";
export const PROBE_CAP_CENTS = 5;

export const PROBE_PROMPT = `Run these three things with bash, then reply with one JSON object and nothing else.

1. node --version
2. curl -s -m 8 -o /dev/null -w "%{http_code}" https://example.com; echo " exit=$?"
3. Write this to /tmp/pw.mjs and run it with node, capturing its output and any error:

import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const root = execSync("npm root -g", { encoding: "utf8" }).trim();
const require = createRequire(root + "/noop.js");
const { chromium } = require("playwright");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent("<h1>ok</h1>");
console.log(await page.textContent("h1"));
await browser.close();

Reply exactly in this shape:
{"node":"<output of step 1>","curl":"<output of step 2>","chromium":"<output of step 3, or the error message>"}`;

export type ProbeReport = { node: string; curl: string; chromium: string };

export type ProbeDecision = "managed-agents" | "managed-agents-no-chromium" | "fallback";

export type ProbeVerdict = {
  decision: ProbeDecision;
  sessionRan: boolean;
  networkSealed: boolean;
  chromiumLaunched: boolean;
  detail: string;
};

/** Pulls the JSON report out of the agent's final message, tolerating a code fence. */
export function parseProbeReport(text: string): ProbeReport | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const value = JSON.parse(match[0]) as Partial<ProbeReport>;
    if (typeof value.node !== "string" || typeof value.curl !== "string" || typeof value.chromium !== "string") return null;
    return { node: value.node, curl: value.curl, chromium: value.chromium };
  } catch {
    return null;
  }
}

/** Applies the decision table in the spec, section 5. */
export function decideProbe(report: ProbeReport | null, failure: string | null = null): ProbeVerdict {
  if (!report) {
    return { decision: "fallback", sessionRan: false, networkSealed: false, chromiumLaunched: false, detail: failure ?? "The session did not return a report." };
  }
  const reachedInternet = /^[1-5]\d\d\b/.test(report.curl.trim()) && !report.curl.trim().startsWith("000");
  const networkSealed = !reachedInternet;
  const chromiumLaunched = report.chromium.trim().toLowerCase() === "ok";
  if (!networkSealed) {
    return { decision: "fallback", sessionRan: true, networkSealed, chromiumLaunched, detail: `The sandbox reached the internet: ${report.curl}` };
  }
  if (!chromiumLaunched) {
    return { decision: "managed-agents-no-chromium", sessionRan: true, networkSealed, chromiumLaunched, detail: `Chromium did not launch: ${report.chromium.slice(0, 300)}` };
  }
  return { decision: "managed-agents", sessionRan: true, networkSealed, chromiumLaunched, detail: `Node ${report.node}, network sealed, Chromium launched.` };
}
```

`crew/lib/provisioning.ts`:

```ts
import type Anthropic from "@anthropic-ai/sdk";

/** Deny by default: no hosts, no package managers, no MCP. */
export const SEALED_NETWORKING = {
  type: "limited",
  allowed_hosts: [],
  allow_package_managers: false,
  allow_mcp_servers: false,
} as const;

/** Tools run without approval: the sandbox holds nothing worth protecting, and a pause would hang an unattended shift. */
export const SEALED_TOOLS = [
  {
    type: "agent_toolset_20260401",
    default_config: { enabled: true, permission_policy: { type: "always_allow" } },
    configs: [
      { name: "web_fetch", enabled: false },
      { name: "web_search", enabled: false },
    ],
  },
] as const;

export type CrewResources = { agentId: string; environmentId: string };

export async function createCrewResources(client: Anthropic, name: string, model: string): Promise<CrewResources> {
  const environment = await client.beta.environments.create({
    name: `${name}-sandbox`,
    config: { type: "cloud", networking: { ...SEALED_NETWORKING, allowed_hosts: [] } },
  });
  const agent = await client.beta.agents.create({
    name,
    model,
    tools: SEALED_TOOLS as unknown as NonNullable<Parameters<typeof client.beta.agents.create>[0]["tools"]>,
  });
  return { agentId: agent.id, environmentId: environment.id };
}
```

`crew/probe-runtime.ts`:

```ts
import Anthropic from "@anthropic-ai/sdk";
import { decideProbe, parseProbeReport, PROBE_CAP_CENTS, PROBE_MODEL, PROBE_PROMPT, type ProbeVerdict } from "@/crew/lib/probe";
import { createCrewResources } from "@/crew/lib/provisioning";

const POLL_MS = 3000;
const DEADLINE_MS = 5 * 60 * 1000;

type Event = { type: string; stop_reason?: { type?: string }; content?: { type?: string; text?: string }[] };

async function runProbe(client: Anthropic): Promise<{ text: string | null; seconds: number; costCents: number }> {
  const started = Date.now();
  const { agentId, environmentId } = await createCrewResources(client, "night-crew-probe", PROBE_MODEL);
  const session = await client.beta.sessions.create({
    agent: agentId,
    environment_id: environmentId,
    title: "Night Crew runtime probe",
    budget: { type: "limit", max_list_cost: { amount: String(PROBE_CAP_CENTS), currency: "USD" } },
    initial_events: [{ type: "user.message", content: [{ type: "text", text: PROBE_PROMPT }] }],
  });
  console.log(`session ${session.id}`);
  for (;;) {
    const events: Event[] = [];
    for await (const event of client.beta.sessions.events.list(session.id)) events.push(event as unknown as Event);
    const ended = events.some((event) => event.type === "session.status_idle" || event.type === "session.status_terminated");
    if (ended) {
      const messages = events.filter((event) => event.type === "agent.message");
      const last = messages[messages.length - 1];
      const text = last?.content?.flatMap((block) => (block.type === "text" ? [block.text ?? ""] : [])).join("") ?? null;
      const finished = await client.beta.sessions.retrieve(session.id);
      return { text, seconds: Math.round((Date.now() - started) / 1000), costCents: Number(finished.usage?.list_cost?.amount ?? 0) };
    }
    if (Date.now() - started > DEADLINE_MS) return { text: null, seconds: Math.round((Date.now() - started) / 1000), costCents: 0 };
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

let verdict: ProbeVerdict;
try {
  const { text, seconds, costCents } = await runProbe(new Anthropic());
  console.log(`agent reply: ${text}`);
  console.log(`took ${seconds} seconds, cost ${costCents} cents`);
  verdict = decideProbe(text ? parseProbeReport(text) : null, "The session did not return a report in time.");
} catch (error) {
  verdict = decideProbe(null, error instanceof Error ? error.message : String(error));
}

console.log(verdict.detail);
console.log(`PROBE RESULT: ${verdict.decision}`);
process.exit(verdict.decision === "managed-agents" ? 0 : 1);
```

- [ ] **Step 4: Run to confirm it passes**

Run: `npx vitest run tests/probe.test.ts`
Expected: Test Files  1 passed (1)

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**

The orchestrator re-runs the gate, scope-checks the worktree against `Files:`, and commits exactly those paths. Executors never touch git.
Message: `feat: add the Managed Agents runtime probe and sealed sandbox settings`

---

### Task 3: Set the OpenRouter key and run the probe

**Files:**
(none: this task changes no files)

**Depends on:** Task foundation:7
**Effort:** low
**Model tier:** top
**Provides:** `Human result: PROBE RESULT line from crew/probe-openrouter.ts, with the remaining credit and the budget to set`
**Requires:** `crew/lib/probe.ts: runProbe(deps: ProbeDeps): Promise<ProbeReport>; readCredit(client): Promise<Credit>; suggestedTotal(remainingDollars): number; crew/probe-openrouter.ts: prints PROBE RESULT, exits 0 only on ok`

**HUMAN GATE: the user runs this. An executor never does. It uses a key, spends money or deploys.**

Upstream interfaces this task uses, exactly as their tasks provide them:

```text
crew/lib/probe.ts: runProbe(deps: ProbeDeps): Promise<ProbeReport>; readCredit(client): Promise<Credit>; suggestedTotal(remainingDollars): number; crew/probe-openrouter.ts: prints PROBE RESULT, exits 0 only on ok
```

- [ ] **Step 1: Do this yourself**

In OpenRouter's key settings, set a credit limit on the key, no higher than the balance on your Credits page. Without a limit OpenRouter does not report what remains, and the probe stops. The limit is also a hard stop: OpenRouter refuses requests past it.

- [ ] **Step 2: Do this yourself**

Set the key in your shell only, never in a file or a chat. Do not type it on a command line, because PowerShell keeps that line in a history file. This prompts and hides what you paste: `$env:OPENROUTER_API_KEY = [System.Net.NetworkCredential]::new('', (Read-Host 'OPENROUTER_API_KEY' -AsSecureString)).Password`.

- [ ] **Step 3: Do this yourself**

The next step runs the probe. It spends under 2 cents and takes a few minutes, because it makes one long call on purpose. Each run spends again, so run it only when something has changed. The target is Fri 6 Nov by 22:00 UTC, and the last safe moment is Sat 7 Nov 06:00 UTC.

- [ ] **Step 4: Prove it**

Run: `npx tsx crew/probe-openrouter.ts`
Expected: PROBE RESULT: ok

- [ ] **Step 5: Act on the result**

Apply the decision table in the spec, section 5. Write down the lines `REMAINING CREDIT`, `SET CREW_TOTAL_BUDGET_CENTS TO` and `STREAMED COST COMES FROM`: `launch:6` uses the budget figure. If the probe told you to set `CREW_STRUCTURED_MODE` or `CREW_BUILD_TRANSPORT`, set it in your shell, run the probe again, and keep the value for `launch:6`. Then clear the key: `Remove-Item Env:OPENROUTER_API_KEY`. Tell the orchestrator the result either way.

- [ ] **Step 6: Commit (kernel-performed — no agent runs this)**

The orchestrator re-runs the gate, scope-checks the worktree against `Files:`, and commits exactly those paths. Executors never touch git.
Message: `chore: record the OpenRouter probe result`

---

### Task 4: Canonical JSON, hashing and config

**Files:**
- Create: `lib/canonical.ts`
- Create: `lib/hash.ts`
- Create: `lib/config.ts`
- Test:   `tests/hashing.test.ts`

**Depends on:** Task foundation:1
**Effort:** low
**Provides:** `lib/canonical.ts: canonicalJson(value: unknown): string`, `lib/hash.ts: keccakText(text: string): Hex; cspScriptHash(script: string): string; sha256Hex(text: string): string`, `lib/config.ts: VIBES_ADDRESS, EAS_ADDRESS, SCHEMA_REGISTRY_ADDRESS, VIBESTARTER_API, BUILD_WINDOW_CLOSE, EASSCAN_ATTESTATION_URL, MAX_FLOOR_BYTES, baseRpcUrl(), siteOrigin(), floorsOrigin(), floorsOnOwnHost(), floorDocumentUrl(hash), vetoAddress()`
**Requires:** `package.json: pinned stack, tsconfig.json with the @/ alias, vitest.config.ts`

Upstream interfaces this task uses, exactly as their tasks provide them:

```text
package.json: pinned stack, tsconfig.json with the @/ alias, vitest.config.ts
```

- [ ] **Step 1: Write the failing test**

`tests/hashing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { canonicalJson } from "@/lib/canonical";
import { floorDocumentUrl, floorsOnOwnHost } from "@/lib/config";
import { cspScriptHash, keccakText } from "@/lib/hash";

describe("canonicalJson", () => {
  it("sorts keys at every depth, drops undefined and keeps array order", () => {
    expect(canonicalJson({ b: 1, a: { d: [2, 1], c: undefined, e: "x" } })).toBe('{"a":{"d":[2,1],"e":"x"},"b":1}');
  });
  it("gives the same text for the same data in a different key order", () => {
    expect(canonicalJson({ x: 1, y: 2 })).toBe(canonicalJson({ y: 2, x: 1 }));
  });
  it("refuses values that have no JSON form", () => {
    expect(() => canonicalJson({ a: Number.NaN })).toThrow();
    expect(() => canonicalJson({ a: 1n })).toThrow();
  });
});

describe("hashes", () => {
  it("keccakText matches a known vector", () => {
    expect(keccakText("")).toBe("0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470");
  });
  it("cspScriptHash has the CSP source form", () => {
    expect(cspScriptHash("x")).toMatch(/^'sha256-[A-Za-z0-9+/]+=*'$/);
  });
});

describe("floor URLs", () => {
  it("stay relative to the main host until FLOORS_ORIGIN is set", () => {
    delete process.env.FLOORS_ORIGIN;
    expect(floorsOnOwnHost()).toBe(false);
    expect(floorDocumentUrl("0xabc")).toBe("/f/0xabc");
    process.env.FLOORS_ORIGIN = "https://floors.example";
    expect(floorsOnOwnHost()).toBe(true);
    expect(floorDocumentUrl("0xabc")).toBe("https://floors.example/f/0xabc");
    delete process.env.FLOORS_ORIGIN;
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npx vitest run tests/hashing.test.ts`
Expected: FAIL: Cannot find module "@/lib/canonical"

- [ ] **Step 3: Minimal implementation**

`lib/canonical.ts`:

```ts
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function normalise(value: unknown): Json {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("canonicalJson: non-finite number");
    return value;
  }
  if (Array.isArray(value)) return value.map(normalise);
  if (typeof value === "object") {
    const out: { [key: string]: Json } = {};
    for (const key of Object.keys(value as object).sort()) {
      const item = (value as Record<string, unknown>)[key];
      if (item !== undefined) out[key] = normalise(item);
    }
    return out;
  }
  throw new Error(`canonicalJson: unsupported type ${typeof value}`);
}

/** JSON with sorted keys and no whitespace. Undefined object fields are dropped. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalise(value));
}
```

`lib/hash.ts`:

```ts
import { createHash } from "node:crypto";
import { keccak256, toBytes } from "viem";

/** keccak256 of a string's UTF-8 bytes, as 0x-prefixed hex. */
export function keccakText(text: string): `0x${string}` {
  return keccak256(toBytes(text));
}

/** The CSP source for an inline script: 'sha256-<base64>'. */
export function cspScriptHash(script: string): string {
  return `'sha256-${createHash("sha256").update(script, "utf8").digest("base64")}'`;
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
```

`lib/config.ts`:

```ts
export const VIBES_ADDRESS = "0xefFC8815487084a97edfdfF968b56Ea123421Acb" as const;
export const EAS_ADDRESS = "0x4200000000000000000000000000000000000021" as const;
export const SCHEMA_REGISTRY_ADDRESS = "0x4200000000000000000000000000000000000020" as const;
export const BASE_CHAIN_ID = 8453;
export const DEFAULT_BASE_RPC_URL = "https://mainnet.base.org";
export const VIBESTARTER_API = "https://app.vibestarter.xyz";
export const BUILD_WINDOW_CLOSE = "2026-11-09T22:00:00.000Z";
export const EASSCAN_ATTESTATION_URL = "https://base.easscan.org/attestation/view/";
export const MAX_FLOOR_BYTES = 256 * 1024;

export function baseRpcUrl(): string {
  return process.env.BASE_RPC_URL || DEFAULT_BASE_RPC_URL;
}

export function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_ORIGIN || "http://127.0.0.1:3000";
}

export function floorsOrigin(): string | null {
  return process.env.FLOORS_ORIGIN || null;
}

export function floorsOnOwnHost(): boolean {
  return floorsOrigin() !== null;
}

/** Relative on the main host, so it works on any port and any deployment URL. */
export function floorDocumentUrl(hash: string): string {
  return `${floorsOrigin() ?? ""}/f/${hash}`;
}

export function vetoAddress(): string {
  return (process.env.VETO_ADDRESS || "0x0000000000000000000000000000000000000000").toLowerCase();
}
```

- [ ] **Step 4: Run to confirm it passes**

Run: `npx vitest run tests/hashing.test.ts`
Expected: Test Files  1 passed (1)

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**

The orchestrator re-runs the gate, scope-checks the worktree against `Files:`, and commits exactly those paths. Executors never touch git.
Message: `feat: add canonical JSON, hashing and config`

---

### Task 5: Database schema and access

**Files:**
- Create: `db/migrations/001_init.sql`
- Create: `lib/db.ts`
- Create: `db/migrate.ts`
- Create: `lib/types.ts`
- Create: `db/dev-seed.ts`
- Test:   `tests/db.test.ts`

**Depends on:** Task foundation:1
**Effort:** medium
**Provides:** `lib/db.ts: type Statement = { sql: string; params?: unknown[] }; type Db = { query<T>(sql, params?): Promise<{ rows: T[] }>; batch(statements): Promise<void> }; memoryDb(): Promise<Db>; neonDb(url): Db; getDb(): Promise<Db>; setDb(db): void; applyMigrations(db): Promise<void>`, `db/migrations/001_init.sql: shifts, proposals, votes, floors, receipts, receipt_parts, vetoes, waitlist, rate_events`, `lib/types.ts: type Shift, ShiftLabel, ShiftStatus, FailureStage, Proposal, Vote`
**Requires:** `package.json: pinned stack, tsconfig.json with the @/ alias, vitest.config.ts`

`db/dev-seed.ts` is a stub here. `frontend:1` replaces it with fixture data for local pages.

Upstream interfaces this task uses, exactly as their tasks provide them:

```text
package.json: pinned stack, tsconfig.json with the @/ alias, vitest.config.ts
```

- [ ] **Step 1: Write the failing test**

`tests/db.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { applyMigrations, memoryDb } from "@/lib/db";

describe("the database", () => {
  it("applies the migrations once, and a second run changes nothing", async () => {
    const db = await memoryDb();
    await applyMigrations(db);
    const applied = await db.query<{ name: string }>("select name from schema_migrations");
    expect(applied.rows.map((row) => row.name)).toEqual(["001_init.sql"]);
  });
  it("has every table the spec names", async () => {
    const db = await memoryDb();
    const tables = await db.query<{ table_name: string }>("select table_name from information_schema.tables where table_schema = 'public' order by table_name");
    const names = tables.rows.map((row) => row.table_name);
    for (const name of ["floors", "proposals", "rate_events", "receipt_parts", "receipts", "shifts", "vetoes", "votes", "waitlist"]) expect(names).toContain(name);
  });
  it("allows only one open shift", async () => {
    const db = await memoryDb();
    await db.query("insert into shifts (slug, label, status, closes_at) values ('1', 'scheduled', 'open', now())");
    await expect(db.query("insert into shifts (slug, label, status, closes_at) values ('2', 'scheduled', 'open', now())")).rejects.toThrow();
  });
  it("runs a batch in one transaction: one bad statement undoes the rest", async () => {
    const db = await memoryDb();
    await expect(db.batch([
      { sql: "insert into shifts (slug, label, status, closes_at) values ('1', 'scheduled', 'closed', now())" },
      { sql: "insert into shifts (slug, label, status, closes_at) values ('1', 'scheduled', 'closed', now())" },
    ])).rejects.toThrow();
    expect((await db.query("select * from shifts")).rows).toEqual([]);
  });
  it("binds parameters, so text cannot become SQL", async () => {
    const db = await memoryDb();
    const hostile = "x'); drop table shifts; --";
    await db.query("insert into shifts (slug, label, status, closes_at) values ($1, 'scheduled', 'closed', now())", [hostile]);
    const rows = await db.query<{ slug: string }>("select slug from shifts");
    expect(rows.rows[0].slug).toBe(hostile);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npx vitest run tests/db.test.ts`
Expected: FAIL: Cannot find module "@/lib/db"

- [ ] **Step 3: Minimal implementation**

`db/migrations/001_init.sql`:

```sql
create table shifts (
  id             bigserial primary key,
  slug           text not null unique,
  label          text not null check (label in ('scheduled','off-schedule','rehearsal')),
  status         text not null check (status in ('open','closed','shipped','failed','dark')),
  closes_at      timestamptz not null,
  started_at     timestamptz,
  finished_at    timestamptz,
  reason         text,
  snapshot_block bigint,
  tally          jsonb,
  build_model    text,
  cost_cents     integer not null default 0,
  failure_stage  text,
  failure_reason text,
  created_at     timestamptz not null default now()
);

create unique index one_open_shift on shifts (status) where status = 'open';

create table proposals (
  id              bigserial primary key,
  text            text not null check (char_length(text) between 1 and 200),
  normalised      text not null,
  author          text not null,
  signature       text,
  signed_at       timestamptz,
  seeded          boolean not null default false,
  status          text not null default 'open' check (status in ('open','built','rejected','vetoed')),
  status_reason   text,
  status_category text,
  failed_attempts integer not null default 0,
  shift_opened    bigint not null references shifts(id),
  built_in        bigint references shifts(id),
  created_at      timestamptz not null default now()
);

create unique index one_proposal_per_wallet_per_shift on proposals (author, shift_opened) where seeded = false;

create unique index one_open_copy_of_a_proposal on proposals (normalised) where status = 'open';

create table votes (
  shift_id        bigint not null references shifts(id),
  voter           text not null,
  proposal_id     bigint not null references proposals(id),
  signature       text not null,
  signed_at       timestamptz not null,
  weight_estimate numeric,
  created_at      timestamptz not null default now(),
  primary key (shift_id, voter)
);

create table floors (
  shift_id          bigint primary key references shifts(id),
  name              text not null,
  one_liner         text not null,
  how_to_use        text not null,
  html              text not null,
  hash              text not null unique,
  script_hashes     text not null,
  status            text not null default 'lit' check (status in ('lit','vetoed')),
  dark_reason       text,
  screenshot_wide   text,
  screenshot_narrow text
);

create table receipts (
  shift_id           bigint primary key references shifts(id),
  bundle             text not null,
  receipt_hash       text not null,
  attestation_uid    text,
  attestation_tx     text,
  attestation_status text not null default 'pending' check (attestation_status in ('pending','attested'))
);

create table receipt_parts (
  shift_id bigint not null references shifts(id),
  part     text not null,
  content  text not null,
  primary key (shift_id, part)
);

create table vetoes (
  id          bigserial primary key,
  target_type text not null check (target_type in ('proposal','floor')),
  target_id   bigint not null,
  reason      text not null check (char_length(reason) between 1 and 300),
  signature   text not null,
  signed_at   timestamptz not null,
  created_at  timestamptz not null default now()
);

create table waitlist (
  id         bigserial primary key,
  community  text not null check (char_length(community) between 1 and 80),
  contact    text not null check (char_length(contact) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (community, contact)
);

create table rate_events (
  key text not null,
  at  timestamptz not null default now()
);

create index rate_events_key_at on rate_events (key, at);
```

`lib/db.ts`:

```ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

export type Statement = { sql: string; params?: unknown[] };

export type Db = {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  /** Runs the statements in order, in one transaction. */
  batch(statements: Statement[]): Promise<void>;
};

const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");

function splitStatements(sqlText: string): string[] {
  return sqlText
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

export async function applyMigrations(db: Db): Promise<void> {
  await db.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const applied = await db.query<{ name: string }>("select name from schema_migrations");
  const done = new Set(applied.rows.map((row) => row.name));
  for (const file of readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith(".sql")).sort()) {
    if (done.has(file)) continue;
    const statements = splitStatements(readFileSync(join(MIGRATIONS_DIR, file), "utf8")).map((sql) => ({ sql }));
    statements.push({ sql: `insert into schema_migrations (name) values ('${file}')` });
    await db.batch(statements);
  }
}

export function neonDb(url: string): Db {
  const sql = neon(url, { fullResults: true });
  return {
    async query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
      const result = await sql.query(text, params);
      return { rows: result.rows as T[] };
    },
    async batch(statements) {
      await sql.transaction(statements.map((statement) => sql.query(statement.sql, statement.params ?? [])));
    },
  };
}

/** A real in-process Postgres with migrations applied. Used by tests and local pages. */
export async function memoryDb(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite();
  const db: Db = {
    async query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
      const result = await pg.query<T>(text, params);
      return { rows: result.rows };
    },
    async batch(statements) {
      await pg.transaction(async (tx) => {
        for (const statement of statements) await tx.query(statement.sql, statement.params ?? []);
      });
    },
  };
  await applyMigrations(db);
  return db;
}

let current: Promise<Db> | null = null;

/** Tests inject their own database here. */
export function setDb(db: Db | null): void {
  current = db ? Promise.resolve(db) : null;
}

export function getDb(): Promise<Db> {
  if (!current) {
    const url = process.env.DATABASE_URL;
    current = url
      ? Promise.resolve(neonDb(url))
      : import("@/db/dev-seed").then(async ({ seedDevData }) => {
          const db = await memoryDb();
          await seedDevData(db);
          return db;
        });
  }
  return current;
}
```

`db/migrate.ts`:

```ts
import { applyMigrations, neonDb } from "@/lib/db";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("db:migrate skipped: DATABASE_URL is not set");
  process.exit(0);
}
await applyMigrations(neonDb(url));
console.log("db:migrate done");
```

`lib/types.ts`:

```ts
export type ShiftLabel = "scheduled" | "off-schedule" | "rehearsal";
export type ShiftStatus = "open" | "closed" | "shipped" | "failed" | "dark";
export type FailureStage = "close" | "triage" | "build" | "review" | "verify" | "publish";

export type Shift = {
  id: number;
  slug: string;
  label: ShiftLabel;
  status: ShiftStatus;
  closes_at: string;
  started_at: string | null;
  finished_at: string | null;
  reason: string | null;
  snapshot_block: string | null;
  cost_cents: number;
  failure_stage: FailureStage | null;
  failure_reason: string | null;
};

export type ProposalStatus = "open" | "built" | "rejected" | "vetoed";

export type Proposal = {
  id: number;
  text: string;
  author: string;
  seeded: boolean;
  status: ProposalStatus;
  status_reason: string | null;
  status_category: string | null;
  failed_attempts: number;
  shift_opened: number;
  created_at: string;
};

export type Vote = {
  shift_id: number;
  voter: string;
  proposal_id: number;
  signed_at: string;
  weight_estimate: string | null;
};
```

`db/dev-seed.ts`:

```ts
import type { Db } from "@/lib/db";

export async function seedDevData(_db: Db): Promise<void> {
  // Replaced by the frontend plan with fixture data for local pages.
}
```

- [ ] **Step 4: Run to confirm it passes**

Run: `npx vitest run tests/db.test.ts`
Expected: Test Files  1 passed (1)

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**

The orchestrator re-runs the gate, scope-checks the worktree against `Files:`, and commits exactly those paths. Executors never touch git.
Message: `feat: add the database schema and query layer`

---

### Task 6: Shift claiming and proposals

**Files:**
- Create: `lib/shifts.ts`
- Create: `lib/proposals.ts`
- Test:   `tests/shifts.test.ts`

**Depends on:** Task foundation:5
**Effort:** high
**Provides:** `lib/shifts.ts: nextCloseAfter(now): Date; getOpenShift(db); ensureOpenShift(db, now): Promise<Shift>; claimScheduled(db, now); claimOffSchedule(db, now, reason); createRehearsal(db, now, reason, proposalText, author); spentCents(db)`, `lib/proposals.ts: normaliseProposal(text): string; insertProposal(db, proposal: InsertProposal): Promise<number>`
**Requires:** `lib/db.ts: type Statement = { sql: string; params?: unknown[] }; type Db = { query<T>(sql, params?): Promise<{ rows: T[] }>; batch(statements): Promise<void> }; memoryDb(): Promise<Db>; neonDb(url): Db; getDb(): Promise<Db>; setDb(db): void; applyMigrations(db): Promise<void>`, `lib/types.ts: type Shift, ShiftLabel, ShiftStatus, FailureStage, Proposal, Vote`

Claiming is a single atomic UPDATE, so a backup cron firing twice does nothing. The clock decides the close, not when the job starts.

Upstream interfaces this task uses, exactly as their tasks provide them:

```text
lib/db.ts: type Statement = { sql: string; params?: unknown[] }; type Db = { query<T>(sql, params?): Promise<{ rows: T[] }>; batch(statements): Promise<void> }; memoryDb(): Promise<Db>; neonDb(url): Db; getDb(): Promise<Db>; setDb(db): void; applyMigrations(db): Promise<void>
lib/types.ts: type Shift, ShiftLabel, ShiftStatus, FailureStage, Proposal, Vote
```

- [ ] **Step 1: Write the failing test**

`tests/shifts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { memoryDb } from "@/lib/db";
import { insertProposal, normaliseProposal } from "@/lib/proposals";
import { claimOffSchedule, claimScheduled, createRehearsal, ensureOpenShift, nextCloseAfter, spentCents } from "@/lib/shifts";

describe("nextCloseAfter", () => {
  it("is 22:00 UTC the same day before the close", () => {
    expect(nextCloseAfter(new Date("2026-11-07T10:00:00Z")).toISOString()).toBe("2026-11-07T22:00:00.000Z");
  });
  it("is the next day at or after the close", () => {
    expect(nextCloseAfter(new Date("2026-11-07T22:00:00Z")).toISOString()).toBe("2026-11-08T22:00:00.000Z");
    expect(nextCloseAfter(new Date("2026-11-07T23:30:00Z")).toISOString()).toBe("2026-11-08T22:00:00.000Z");
  });
});

describe("shifts", () => {
  it("keeps exactly one open shift, numbers public shifts and claims only after the close", async () => {
    const db = await memoryDb();
    const open = await ensureOpenShift(db, new Date("2026-11-07T10:00:00Z"));
    expect(open.slug).toBe("1");
    expect((await ensureOpenShift(db, new Date("2026-11-07T11:00:00Z"))).id).toBe(open.id);

    expect(await claimScheduled(db, new Date("2026-11-07T21:59:00Z"))).toBeNull();
    const claimed = await claimScheduled(db, new Date("2026-11-07T22:00:30Z"));
    expect(claimed?.id).toBe(open.id);
    expect(claimed?.status).toBe("closed");
    expect(await claimScheduled(db, new Date("2026-11-07T22:20:00Z"))).toBeNull();

    const next = await ensureOpenShift(db, new Date("2026-11-07T22:00:30Z"));
    expect(next.slug).toBe("2");
    expect(new Date(next.closes_at).toISOString()).toBe("2026-11-08T22:00:00.000Z");
  });

  it("closes the open shift early for an off-schedule run and records why", async () => {
    const db = await memoryDb();
    await ensureOpenShift(db, new Date("2026-11-08T10:00:00Z"));
    const claimed = await claimOffSchedule(db, new Date("2026-11-08T15:00:00Z"), "extra evidence shift");
    expect(claimed?.label).toBe("off-schedule");
    expect(claimed?.reason).toBe("extra evidence shift");
    expect(new Date(claimed?.closes_at ?? "").toISOString()).toBe("2026-11-08T15:00:00.000Z");
  });

  it("gives a rehearsal its own slug and leaves the open shift alone", async () => {
    const db = await memoryDb();
    const open = await ensureOpenShift(db, new Date("2026-11-07T10:00:00Z"));
    const first = await createRehearsal(db, new Date("2026-11-07T11:00:00Z"), "dry run", "A tip calculator", "0xABC");
    const second = await createRehearsal(db, new Date("2026-11-07T11:30:00Z"), "dry run", "A tip calculator", "0xABC");
    expect(first.shift.slug).toBe("r1");
    expect(second.shift.slug).toBe("r2");
    expect(first.shift.label).toBe("rehearsal");
    expect((await ensureOpenShift(db, new Date("2026-11-07T12:00:00Z"))).id).toBe(open.id);
    expect((await ensureOpenShift(db, new Date("2026-11-07T12:00:00Z"))).slug).toBe("1");
  });

  it("sums spend across every shift", async () => {
    const db = await memoryDb();
    const a = await createRehearsal(db, new Date("2026-11-07T11:00:00Z"), "dry run", "One", "0xabc");
    await db.query("update shifts set cost_cents = 37 where id = $1", [a.shift.id]);
    expect(await spentCents(db)).toBe(37);
  });
});

describe("proposals", () => {
  it("ignores case and spacing when normalising", () => {
    expect(normaliseProposal("  A  Tip\tCalculator ")).toBe("a tip calculator");
  });
  it("refuses a second open copy of the same proposal", async () => {
    const db = await memoryDb();
    const shift = await ensureOpenShift(db, new Date("2026-11-07T10:00:00Z"));
    const base = { author: "0xA", shiftId: shift.id, seeded: true, signature: null, signedAt: null };
    expect(await insertProposal(db, { ...base, text: "A tip calculator" })).toBeGreaterThan(0);
    await expect(insertProposal(db, { ...base, text: "a  TIP calculator" })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npx vitest run tests/shifts.test.ts`
Expected: FAIL: Cannot find module "@/lib/shifts"

- [ ] **Step 3: Minimal implementation**

`lib/shifts.ts`:

```ts
import type { Db } from "@/lib/db";
import type { Shift } from "@/lib/types";

const SHIFT_COLUMNS = "id::int as id, slug, label, status, closes_at::text as closes_at, started_at::text as started_at, finished_at::text as finished_at, reason, snapshot_block::text as snapshot_block, cost_cents, failure_stage, failure_reason";

/** The next 22:00 UTC strictly after `now`. */
export function nextCloseAfter(now: Date): Date {
  const close = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 22, 0, 0, 0));
  if (close.getTime() <= now.getTime()) close.setUTCDate(close.getUTCDate() + 1);
  return close;
}

async function nextPublicSlug(db: Db): Promise<string> {
  const result = await db.query<{ next: number }>("select coalesce(max(slug::int), 0)::int + 1 as next from shifts where label <> 'rehearsal'");
  return String(result.rows[0].next);
}

export async function getOpenShift(db: Db): Promise<Shift | null> {
  const result = await db.query<Shift>(`select ${SHIFT_COLUMNS} from shifts where status = 'open'`);
  return result.rows[0] ?? null;
}

/** There is always exactly one open shift. Creates it when none exists. */
export async function ensureOpenShift(db: Db, now: Date): Promise<Shift> {
  const existing = await getOpenShift(db);
  if (existing) return existing;
  const slug = await nextPublicSlug(db);
  const result = await db.query<Shift>(
    `insert into shifts (slug, label, status, closes_at) values ($1, 'scheduled', 'open', $2) returning ${SHIFT_COLUMNS}`,
    [slug, nextCloseAfter(now).toISOString()],
  );
  return result.rows[0];
}

/** Claims the open shift if its close has passed. Returns null when there is nothing to claim. */
export async function claimScheduled(db: Db, now: Date): Promise<Shift | null> {
  const result = await db.query<Shift>(
    `update shifts set status = 'closed', started_at = $1 where status = 'open' and closes_at <= $1 returning ${SHIFT_COLUMNS}`,
    [now.toISOString()],
  );
  return result.rows[0] ?? null;
}

/** Closes the open shift now and labels it off-schedule. */
export async function claimOffSchedule(db: Db, now: Date, reason: string): Promise<Shift | null> {
  const result = await db.query<Shift>(
    `update shifts set status = 'closed', label = 'off-schedule', reason = $2, closes_at = $1, started_at = $1 where status = 'open' returning ${SHIFT_COLUMNS}`,
    [now.toISOString(), reason],
  );
  return result.rows[0] ?? null;
}

/** A rehearsal never touches the open shift. It gets its own shift and seeded proposal. */
export async function createRehearsal(db: Db, now: Date, reason: string, proposalText: string, author: string): Promise<{ shift: Shift; proposalId: number }> {
  const count = await db.query<{ n: number }>("select count(*)::int as n from shifts where label = 'rehearsal'");
  const slug = `r${count.rows[0].n + 1}`;
  const shift = await db.query<Shift>(
    `insert into shifts (slug, label, status, closes_at, started_at, reason) values ($1, 'rehearsal', 'closed', $2, $2, $3) returning ${SHIFT_COLUMNS}`,
    [slug, now.toISOString(), reason],
  );
  const proposal = await db.query<{ id: number }>(
    `insert into proposals (text, normalised, author, seeded, status, shift_opened) values ($1, $2, $3, true, 'built', $4) returning id::int as id`,
    [proposalText, `rehearsal:${slug}`, author.toLowerCase(), shift.rows[0].id],
  );
  return { shift: shift.rows[0], proposalId: proposal.rows[0].id };
}

export async function spentCents(db: Db): Promise<number> {
  const result = await db.query<{ total: number }>("select coalesce(sum(cost_cents), 0)::int as total from shifts");
  return result.rows[0].total;
}
```

`lib/proposals.ts`:

```ts
import type { Db } from "@/lib/db";

/** Case and whitespace do not make a proposal new. */
export function normaliseProposal(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

export type InsertProposal = {
  text: string;
  author: string;
  shiftId: number;
  seeded: boolean;
  signature: string | null;
  signedAt: string | null;
};

export async function insertProposal(db: Db, proposal: InsertProposal): Promise<number> {
  const result = await db.query<{ id: number }>(
    "insert into proposals (text, normalised, author, seeded, signature, signed_at, shift_opened) values ($1, $2, $3, $4, $5, $6, $7) returning id::int as id",
    [proposal.text.trim(), normaliseProposal(proposal.text), proposal.author.toLowerCase(), proposal.seeded, proposal.signature, proposal.signedAt, proposal.shiftId],
  );
  return result.rows[0].id;
}
```

- [ ] **Step 4: Run to confirm it passes**

Run: `npx vitest run tests/shifts.test.ts`
Expected: Test Files  1 passed (1)

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**

The orchestrator re-runs the gate, scope-checks the worktree against `Files:`, and commits exactly those paths. Executors never touch git.
Message: `feat: add shift claiming, the open shift and proposal inserts`

---

### Task 7: Amendment: the OpenRouter probe

**Files:**
- Create: `crew/probe-openrouter.ts`
- Modify: `crew/lib/probe.ts`
- Modify: `.env.example`
- Modify: `tests/deploy-config.test.ts`
- Modify: `crew/probe-runtime.ts`
- Modify: `crew/lib/provisioning.ts`
- Test:   `tests/probe.test.ts`

**Depends on:** Task foundation:2, Task pipeline:14, Task launch:1
**Effort:** high
**Model tier:** top
**Provides:** `crew/lib/probe.ts: runProbe(deps: ProbeDeps): Promise<ProbeReport>; readCredit(client): Promise<Credit>; suggestedTotal(remainingDollars): number; crew/probe-openrouter.ts: prints PROBE RESULT, exits 0 only on ok`
**Requires:** `crew/lib/openrouter.ts: OPENROUTER_BASE_URL, SONNET_SLUG, HAIKU_SLUG, BUILD_MAX_TOKENS, BUILD_MIN_MAX_TOKENS, PINNED_PROVIDER; openRouterClient(apiKey, options?): Anthropic; assertAllowedModel(model): string; parseTransport(value): Transport; classifyFailure(error): ProviderFailure; sendMessage(client, body, options?): Promise<SentMessage>; type OpenRouterBody, Transport, SentMessage, ProviderFailure; class ProviderError`, `crew/lib/model.ts: type StructuredModel; StructuredCall; StructuredResult; JsonSchema; StructuredMode; openRouterStructuredModel(client, mode?): StructuredModel; parseStructuredMode(value): StructuredMode`, `tests/helpers/fake-openrouter.ts: fakeOpenRouter(script); messageReply, textBlock, toolBlock, thinkingBlock, streamReply, streamToolReply; type FakeReply, FakeRequest`

This replaces the Managed Agents probe from `foundation:2`. It exits 0 only if the key is valid, both slugs resolve, a tool round trip works on both models, schema output works, cost is reported, and the remaining credit is printed. The test scripts every failure through the real SDK. Do not run `crew/probe-openrouter.ts`: it spends money, and `foundation:3` is the user's.

Upstream interfaces this task uses, exactly as their tasks provide them:

```text
crew/lib/openrouter.ts: OPENROUTER_BASE_URL, SONNET_SLUG, HAIKU_SLUG, BUILD_MAX_TOKENS, BUILD_MIN_MAX_TOKENS, PINNED_PROVIDER; openRouterClient(apiKey, options?): Anthropic; assertAllowedModel(model): string; parseTransport(value): Transport; classifyFailure(error): ProviderFailure; sendMessage(client, body, options?): Promise<SentMessage>; type OpenRouterBody, Transport, SentMessage, ProviderFailure; class ProviderError
crew/lib/model.ts: type StructuredModel; StructuredCall; StructuredResult; JsonSchema; StructuredMode; openRouterStructuredModel(client, mode?): StructuredModel; parseStructuredMode(value): StructuredMode
tests/helpers/fake-openrouter.ts: fakeOpenRouter(script); messageReply, textBlock, toolBlock, thinkingBlock, streamReply, streamToolReply; type FakeReply, FakeRequest
```

- [ ] **Step 1: Write the failing test**

`tests/probe.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { openRouterClient, BUILD_MAX_TOKENS, BUILD_MIN_MAX_TOKENS, type Transport } from "@/crew/lib/openrouter";
import { runProbe, suggestedTotal, type ProbeResult } from "@/crew/lib/probe";
import { fakeOpenRouter, messageReply, streamReply, streamToolReply, textBlock, thinkingBlock, toolBlock, type FakeReply, type FakeRequest } from "./helpers/fake-openrouter";

type World = {
  key?: FakeReply;
  endpoints?: FakeReply;
  /** Replaces the reply to a model call. Return undefined for the normal reply. */
  call?: (request: FakeRequest) => FakeReply | undefined;
  noCost?: boolean;
};

const KEY: FakeReply = { body: { data: { limit: 4.7, limit_remaining: 4.7, usage: 0, is_free_tier: false } } };
const ENDPOINTS: FakeReply = { body: { data: { endpoints: [{ tag: "anthropic", supported_parameters: ["tools", "tool_choice"], pricing: { prompt: "0.000002", completion: "0.00001" } }] } } };

/** A working OpenRouter, unless the world says otherwise. */
function world({ key = KEY, endpoints = ENDPOINTS, call, noCost }: World = {}) {
  const cost = noCost ? null : 0.001;
  return fakeOpenRouter((request) => {
    if (request.url.endsWith("/v1/key")) return key;
    if (request.url.includes("/endpoints")) return endpoints;
    if (request.url.includes("/v1/generation")) return { body: { data: { total_cost: 0.001 } } };
    const replaced = call?.(request);
    if (replaced) return replaced;
    const body = request.body as { stream?: boolean; messages: { content: unknown }[]; tools?: { name: string }[]; output_config?: { format?: unknown }; tool_choice?: unknown };
    if (body.stream && body.tools) return body.messages.length === 1 ? streamToolReply("read_nonce", {}, "toolu_1", null) : streamReply("NC-7319", null);
    if (body.stream) return streamReply("ok", null);
    if (body.tools?.[0]?.name === "read_nonce") {
      return body.messages.length === 1 ? messageReply([thinkingBlock(), toolBlock("read_nonce", {})], { cost }) : messageReply([textBlock("NC-7319")], { cost });
    }
    if (body.tools?.[0]?.name === "answer") return messageReply([toolBlock("answer", { decision: "accept", note: null })], { cost });
    if (body.output_config?.format) return messageReply([textBlock('{"decision":"accept","note":null}')], { cost });
    return messageReply([textBlock("1\n2\n3")], { cost, stop: "max_tokens", outputTokens: 16000 });
  });
}

async function probe(options: World = {}, settings: { mode?: "json-schema" | "forced-tool"; transport?: Transport } = {}) {
  const fake = world(options);
  const lines: string[] = [];
  const report = await runProbe({
    client: openRouterClient("sk-or-test", { fetch: fake.fetch }),
    mode: settings.mode ?? "json-schema",
    transport: settings.transport ?? "non-stream",
    log: (line) => lines.push(line),
  });
  return { report, lines, requests: fake.requests };
}

const modelCalls = (requests: FakeRequest[]) => requests.filter((request) => request.url.endsWith("/v1/messages"));
const expectResult = (result: ProbeResult, actual: ProbeResult) => expect(actual).toBe(result);

describe("the OpenRouter probe", () => {
  it("passes when everything works, and prints the credit and the budget to set", async () => {
    const { report } = await probe();
    expect(report.result).toBe("ok");
    expect(report.remaining).toBe(4.7);
    expect(report.suggestedTotalCents).toBe(440);
    expect(report.spentCents).toBeGreaterThan(0);
  });
  it("tries both models at the build's real token limit, through Anthropic only", async () => {
    const { requests } = await probe();
    const tools = modelCalls(requests).filter((request) => (request.body.tools as { name: string }[] | undefined)?.[0]?.name === "read_nonce");
    expect(tools.map((request) => request.body.model)).toEqual(["anthropic/claude-sonnet-5.5", "anthropic/claude-sonnet-5.5", "anthropic/claude-haiku-5.5", "anthropic/claude-haiku-5.5"]);
    for (const request of tools) {
      expect(request.body.max_tokens).toBe(BUILD_MAX_TOKENS);
      expect(request.body.provider).toEqual({ only: ["anthropic"], allow_fallbacks: false });
    }
  });
  it("sends thinking blocks back unchanged on the second turn", async () => {
    const { requests } = await probe();
    const second = modelCalls(requests)[1].body.messages as { role: string; content: { type: string; signature?: string }[] }[];
    expect(second[1].content[0]).toEqual({ type: "thinking", thinking: "", signature: "sig-1" });
  });
  it("reports where a streamed call's cost comes from", async () => {
    expect((await probe()).report.streamCost).toBe("lookup");
    const inline = await probe({ call: (request) => (request.body.stream ? streamReply("ok", 0.001) : undefined) });
    expect(inline.report.streamCost).toBe("response");
    const none = await probe({ call: (request) => (request.body.stream && !request.body.tools ? { status: 400, body: {} } : undefined) });
    expect(none.report.streamCost).toBe("none");
    expect(none.report.result).toBe("ok");
  });
  it("fails on a bad key", async () => {
    expectResult("key-invalid", (await probe({ key: { status: 401, body: { error: { message: "User not found." } } } })).report.result);
  });
  it("fails when the key has no credit limit, because nothing then reports what remains", async () => {
    const { report } = await probe({ key: { body: { data: { limit: null, limit_remaining: null, usage: 0, is_free_tier: false } } } });
    expectResult("no-credit-figure", report.result);
    expect(report.detail).toContain("Set a limit on the key");
  });
  it("fails when a slug does not resolve or Anthropic does not serve it", async () => {
    expectResult("model-missing", (await probe({ endpoints: { status: 404, body: {} } })).report.result);
    expectResult("model-missing", (await probe({ endpoints: { body: { data: { endpoints: [{ tag: "azure", supported_parameters: ["tools"] }] } } } })).report.result);
  });
  it("fails when the model will not use the tool", async () => {
    expectResult("tools-failed", (await probe({ call: (request) => ((request.body.tools as { name: string }[] | undefined)?.[0]?.name === "read_nonce" ? messageReply([textBlock("no")]) : undefined) })).report.result);
  });
  it("fails when no cost is reported", async () => {
    expectResult("no-cost", (await probe({ noCost: true })).report.result);
  });
  it("fails with no credit", async () => {
    expectResult("no-credit", (await probe({ call: () => ({ status: 402, body: { error: { message: "m", metadata: { limit_source: "openrouter_key_limit" } } } }) })).report.result);
  });
  it("drops to the build's smaller token limit if the larger will not fit the in-flight budget", async () => {
    const tooLarge = { status: 402, body: { error: { message: "m", metadata: { reason: "weight_exceeds_budget" } } } };
    const fits = await probe({ call: (request) => (request.body.max_tokens === BUILD_MAX_TOKENS && (request.body.tools as unknown[] | undefined) ? tooLarge : undefined) });
    expect(fits.report.result).toBe("ok");
    expect(modelCalls(fits.requests).some((request) => request.body.max_tokens === BUILD_MIN_MAX_TOKENS)).toBe(true);
    expectResult("too-large", (await probe({ call: () => tooLarge })).report.result);
  });
  it("says to use a forced tool when schema output fails but that works", async () => {
    const failing = { call: (request: FakeRequest) => ((request.body.output_config as { format?: unknown } | undefined)?.format ? messageReply([textBlock("prose")]) : undefined) };
    const { report } = await probe(failing);
    expectResult("structured-output-unsupported", report.result);
    expect(report.detail).toContain("forced-tool");
    expect((await probe(failing, { mode: "forced-tool" })).report.result).toBe("ok");
  });
  it("says to stream when a long non-streamed call drops", async () => {
    const dropped = { call: (request: FakeRequest) => (!request.body.stream && !request.body.tools && !(request.body.output_config as { format?: unknown }).format ? { status: 400, body: {} } : undefined) };
    const { report } = await probe(dropped);
    expectResult("long-call-dropped", report.result);
    expect(report.detail).toContain("CREW_BUILD_TRANSPORT");
    expect((await probe(dropped, { transport: "stream" })).report.result).toBe("ok");
  });
  it("refuses to pass in stream mode if a stream reports no cost by either route", async () => {
    expectResult("no-cost", (await probe({ call: (request) => (request.body.stream && !request.body.tools ? { status: 400, body: {} } : undefined) }, { transport: "stream" })).report.result);
  });
  it("suggests a total that leaves the margin, and never above the plan", () => {
    expect(suggestedTotal(4.7)).toBe(440);
    expect(suggestedTotal(4.68)).toBe(438);
    expect(suggestedTotal(4.5)).toBe(420);
    expect(suggestedTotal(9.2)).toBe(440);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npx vitest run tests/probe.test.ts tests/deploy-config.test.ts`
Expected: FAIL: runProbe is not exported from "@/crew/lib/probe"

- [ ] **Step 3: Minimal implementation**

`crew/lib/probe.ts`:

```ts
import type Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages/messages";
import { openRouterStructuredModel, type StructuredMode } from "@/crew/lib/model";
import { BUILD_MAX_TOKENS, BUILD_MIN_MAX_TOKENS, classifyFailure, HAIKU_SLUG, PINNED_PROVIDER, sendMessage, SONNET_SLUG, type OpenRouterBody, type Transport } from "@/crew/lib/openrouter";

/** CREW_TOTAL_BUDGET_CENTS never goes above this until a top-up. */
export const PLANNED_TOTAL_CENTS = 440;
/** Keeps the last allowed shift, which can pass its cap by one call, inside the real balance. */
const BUDGET_MARGIN_CENTS = 30;
const NONCE = "NC-7319";
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["decision", "note"],
  properties: { decision: { type: "string", enum: ["accept", "reject"] }, note: { type: ["string", "null"] } },
};

export type ProbeResult = "ok" | "key-invalid" | "no-credit-figure" | "no-credit" | "too-large" | "model-missing" | "tools-failed" | "structured-output-unsupported" | "no-cost" | "long-call-dropped";
export type StreamCost = "response" | "lookup" | "none";

export type Credit = { limit: number | null; remaining: number | null; used: number; freeTier: boolean };

export type ProbeReport = {
  result: ProbeResult;
  detail: string;
  remaining: number | null;
  suggestedTotalCents: number | null;
  streamCost: StreamCost | null;
  spentCents: number;
};

export type ProbeDeps = {
  client: Anthropic;
  mode: StructuredMode;
  transport: Transport;
  log?: (line: string) => void;
};

/** Reads what a normal key can see of its own credit. Spends nothing. */
export async function readCredit(client: Anthropic): Promise<Credit> {
  const { data } = await client.get<{ data: { limit: number | null; limit_remaining: number | null; usage: number; is_free_tier: boolean } }>("/v1/key");
  return { limit: data.limit, remaining: data.limit_remaining, used: data.usage, freeTier: data.is_free_tier };
}

export function suggestedTotal(remainingDollars: number): number {
  return Math.min(PLANNED_TOTAL_CENTS, Math.floor(remainingDollars * 100) - BUDGET_MARGIN_CENTS);
}

class ProbeStop extends Error {
  constructor(readonly result: ProbeResult, detail: string) {
    super(detail);
  }
}

function stopFor(error: unknown, otherwise: ProbeResult): ProbeStop {
  if (error instanceof ProbeStop) return error;
  const failure = classifyFailure(error);
  if (failure.reason.includes("no cost")) return new ProbeStop("no-cost", failure.reason);
  if (failure.kind === "no-credit") return new ProbeStop("no-credit", failure.reason);
  if (failure.kind === "too-large" || failure.kind === "in-flight") return new ProbeStop("too-large", failure.reason);
  return new ProbeStop(otherwise, failure.reason);
}

async function checkModel(client: Anthropic, slug: string): Promise<string> {
  let endpoints: { tag?: string; supported_parameters?: string[]; pricing?: { prompt?: string; completion?: string } }[];
  try {
    const found = await client.get<{ data?: { endpoints?: typeof endpoints } }>(`/v1/models/${slug}/endpoints`);
    endpoints = found.data?.endpoints ?? [];
  } catch {
    throw new ProbeStop("model-missing", `${slug} did not resolve.`);
  }
  const anthropic = endpoints.find((endpoint) => endpoint.tag === "anthropic");
  if (!anthropic) throw new ProbeStop("model-missing", `${slug} has no endpoint from Anthropic itself.`);
  const params = anthropic.supported_parameters ?? [];
  if (!params.includes("tools")) throw new ProbeStop("model-missing", `${slug} does not list tools on Anthropic's endpoint.`);
  const perMillion = (value: string | undefined) => (Number(value ?? 0) * 1_000_000).toFixed(2);
  return `$${perMillion(anthropic.pricing?.prompt)}/M in, $${perMillion(anthropic.pricing?.completion)}/M out`;
}

const PROBE_TOOL: Tool = {
  name: "read_nonce",
  description: "Returns a short code. Call it once.",
  input_schema: { type: "object", additionalProperties: false, properties: {} },
};

/** A real tool round trip, at the build's token limit, sending any thinking blocks back unchanged. */
async function toolRoundTrip(client: Anthropic, model: string, transport: Transport, maxTokens: number): Promise<number> {
  const messages: MessageParam[] = [{ role: "user", content: "Call read_nonce once, then reply with only the code it returned." }];
  const body = (): OpenRouterBody => ({ model, max_tokens: maxTokens, messages, tools: [PROBE_TOOL], output_config: { effort: "low" }, provider: PINNED_PROVIDER });
  const first = await sendMessage(client, body(), { transport });
  const use = first.message.content.find((block) => block.type === "tool_use");
  if (use?.type !== "tool_use") throw new ProbeStop("tools-failed", `${model} did not call the tool.`);
  messages.push({ role: "assistant", content: first.message.content as MessageParam["content"] });
  messages.push({ role: "user", content: [{ type: "tool_result", tool_use_id: use.id, content: NONCE }] });
  const second = await sendMessage(client, body(), { transport });
  const text = second.message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
  if (!text.includes(NONCE)) throw new ProbeStop("tools-failed", `${model} did not use the tool's result.`);
  return first.costCents + second.costCents;
}

async function schemaWorks(client: Anthropic, mode: StructuredMode): Promise<{ works: boolean; costCents: number }> {
  try {
    const model = openRouterStructuredModel(client, mode);
    const reply = await model({ model: HAIKU_SLUG, system: "Answer in the required shape.", user: 'Decide "accept", with a null note.', schema: SCHEMA, maxTokens: 500 });
    const value = reply.value as { decision?: unknown; note?: unknown } | null;
    return { works: value?.decision === "accept" && value.note === null, costCents: reply.costCents };
  } catch (error) {
    const stop = stopFor(error, "structured-output-unsupported");
    if (stop.result !== "structured-output-unsupported") throw stop;
    return { works: false, costCents: 0 };
  }
}

/** The one long call the probe makes: on Haiku, because it costs under a cent there. */
async function longCall(client: Anthropic, transport: Transport): Promise<{ seconds: number; costCents: number; tokens: number }> {
  const started = Date.now();
  const { message, costCents } = await sendMessage(
    client,
    { model: HAIKU_SLUG, max_tokens: BUILD_MAX_TOKENS, messages: [{ role: "user", content: "Write every whole number from 1 to 6000, one per line, and nothing else." }], output_config: { effort: "low" }, provider: PINNED_PROVIDER },
    { transport },
  );
  return { seconds: Math.round((Date.now() - started) / 1000), costCents, tokens: message.usage.output_tokens };
}

/** Is usage.cost on a streamed reply? Only a live call can answer: the published schema leaves it out. */
async function streamCost(client: Anthropic): Promise<{ source: StreamCost; costCents: number }> {
  try {
    const { costSource, costCents } = await sendMessage(client, { model: HAIKU_SLUG, max_tokens: 50, messages: [{ role: "user", content: "Reply with the word ok." }], output_config: { effort: "low" }, provider: PINNED_PROVIDER }, { transport: "stream" });
    return { source: costSource, costCents };
  } catch {
    return { source: "none", costCents: 0 };
  }
}

/** Runs every check in order and stops at the first that decides the result. See the spec, section 5. */
export async function runProbe({ client, mode, transport, log = console.log }: ProbeDeps): Promise<ProbeReport> {
  const report: ProbeReport = { result: "ok", detail: "All checks passed.", remaining: null, suggestedTotalCents: null, streamCost: null, spentCents: 0 };
  try {
    let credit: Credit;
    try {
      credit = await readCredit(client);
    } catch {
      throw new ProbeStop("key-invalid", "OpenRouter refused the key.");
    }
    log(`key: limit ${credit.limit ?? "none"}, remaining ${credit.remaining ?? "unknown"}, used ${credit.used}`);
    if (credit.remaining === null) throw new ProbeStop("no-credit-figure", "This key has no credit limit, so OpenRouter does not report what remains. Set a limit on the key, no higher than your balance.");

    for (const slug of [SONNET_SLUG, HAIKU_SLUG]) log(`model ${slug}: ${await checkModel(client, slug)}`);

    for (const slug of [SONNET_SLUG, HAIKU_SLUG]) {
      try {
        let cost: number;
        try {
          cost = await toolRoundTrip(client, slug, transport, BUILD_MAX_TOKENS);
        } catch (error) {
          if (classifyFailure(error).kind !== "too-large") throw error;
          log(`${slug} is too large for the in-flight budget at ${BUILD_MAX_TOKENS} tokens, so trying ${BUILD_MIN_MAX_TOKENS}, which the build drops to by itself.`);
          cost = await toolRoundTrip(client, slug, transport, BUILD_MIN_MAX_TOKENS);
        }
        report.spentCents += cost;
        log(`tools on ${slug}: round trip ok, ${cost.toFixed(3)} cents`);
      } catch (error) {
        throw stopFor(error, "tools-failed");
      }
    }

    const schema = await schemaWorks(client, mode);
    report.spentCents += schema.costCents;
    if (!schema.works) {
      const other = mode === "json-schema" ? await schemaWorks(client, "forced-tool") : { works: false, costCents: 0 };
      report.spentCents += other.costCents;
      throw new ProbeStop("structured-output-unsupported", other.works ? "Schema output failed, but a forced tool call works. Set CREW_STRUCTURED_MODE to forced-tool in your shell and as a repo variable, and run this again." : "Neither schema output nor a forced tool call worked.");
    }
    log(`schema output: ok in ${mode} mode, ${schema.costCents.toFixed(3)} cents`);

    const stream = await streamCost(client);
    report.spentCents += stream.costCents;
    report.streamCost = stream.source;
    log(`streamed cost: ${stream.source}`);
    if (transport === "stream" && stream.source === "none") throw new ProbeStop("no-cost", "A streamed call reported no cost by either route, so the build cannot stream.");

    try {
      const long = await longCall(client, transport);
      report.spentCents += long.costCents;
      log(`long call on ${transport}: ${long.tokens} tokens in ${long.seconds} seconds, ${long.costCents.toFixed(3)} cents`);
    } catch (error) {
      const stop = stopFor(error, "long-call-dropped");
      if (stop.result !== "long-call-dropped") throw stop;
      throw new ProbeStop("long-call-dropped", transport === "non-stream" ? "A long non-streamed call failed. Set CREW_BUILD_TRANSPORT to stream in your shell and as a repo variable, and run this again." : "A long streamed call failed too.");
    }

    const after = await readCredit(client);
    report.remaining = after.remaining;
    report.suggestedTotalCents = after.remaining === null ? null : suggestedTotal(after.remaining);
  } catch (error) {
    const stop = error instanceof ProbeStop ? error : stopFor(error, "tools-failed");
    report.result = stop.result;
    report.detail = stop.message;
  }
  return report;
}
```

`crew/probe-openrouter.ts`:

```ts
import { parseStructuredMode } from "@/crew/lib/model";
import { openRouterClient, parseTransport } from "@/crew/lib/openrouter";
import { readCredit, runProbe } from "@/crew/lib/probe";

const key = process.env.OPENROUTER_API_KEY?.trim();
if (!key) {
  console.log("OPENROUTER_API_KEY is not set");
  console.log("PROBE RESULT: key-invalid");
  process.exit(1);
}
const client = openRouterClient(key);

// Spends nothing. Reads the key's remaining credit, for the Monday decision or after a top-up.
if (process.argv.includes("--credit-only")) {
  const credit = await readCredit(client);
  console.log(`REMAINING CREDIT: ${credit.remaining === null ? "unknown: this key has no credit limit" : `$${credit.remaining.toFixed(2)}`}`);
  console.log(`USED BY THIS KEY: $${credit.used.toFixed(2)}`);
  process.exit(0);
}

const report = await runProbe({
  client,
  mode: parseStructuredMode(process.env.CREW_STRUCTURED_MODE),
  transport: parseTransport(process.env.CREW_BUILD_TRANSPORT),
});

console.log(report.detail);
console.log(`PROBE SPENT: ${report.spentCents.toFixed(3)} cents`);
if (report.remaining !== null) console.log(`REMAINING CREDIT: $${report.remaining.toFixed(2)}`);
if (report.suggestedTotalCents !== null) console.log(`SET CREW_TOTAL_BUDGET_CENTS TO: ${report.suggestedTotalCents}`);
if (report.streamCost !== null) console.log(`STREAMED COST COMES FROM: ${report.streamCost}`);
console.log(`PROBE RESULT: ${report.result}`);
process.exit(report.result === "ok" ? 0 : 1);
```

`.env.example`:

```text
# Names only. Values live in GitHub, Vercel or your shell, never in this repo.

# Shift pipeline (GitHub Actions)
OPENROUTER_API_KEY=
ATTESTER_PRIVATE_KEY=
DATABASE_URL=
BASE_RPC_URL=
CREW_BUILD_MODEL=
CREW_BUILD_TRANSPORT=
CREW_STRUCTURED_MODE=
CREW_SHIFT_CAP_CENTS=
CREW_TOTAL_BUDGET_CENTS=
EAS_SCHEMA_UID=
SHIFTS_ARMED=
VETO_ADDRESS=

# App (Vercel)
NEXT_PUBLIC_SITE_ORIGIN=
FLOORS_ORIGIN=
RATE_LIMIT_SALT=

# Local tests
CHROME_PATH=
```

`tests/deploy-config.test.ts`:

```ts
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
```

- [ ] **Step 4: Delete what this replaces**

Delete these files, which nothing uses after this task:

- `crew/probe-runtime.ts`
- `crew/lib/provisioning.ts`

- [ ] **Step 5: Run to confirm it passes**

Run: `npx vitest run tests/probe.test.ts tests/deploy-config.test.ts`
Expected: Test Files  2 passed (2)

- [ ] **Step 6: Commit (kernel-performed — no agent runs this)**

The orchestrator re-runs the gate, scope-checks the worktree against `Files:`, and commits exactly those paths. Executors never touch git.
Message: `feat: replace the runtime probe with the OpenRouter probe`
