import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(tsx|md)$/.test(name) ? [path] : [];
  });
}

const PAGES = [...sources("app").filter((path) => !path.includes(join("app", "api"))), ...sources("components"), "floor-kit/RULES.md"];
const INVESTMENT = /\b(invest(ment|ing|or|ors)?|returns|profits?|moon|pump|yield|apy|roi|price (target|prediction)|buy now|financial advice)\b/i;
const CONTEST = /\b(vibeathon|contest|holders?'? card|vote for (us|this entry)|back this entry)\b/i;
const VOTING_FLOW = ["app/vote/page.tsx", "components/wallet-actions.tsx", "lib/messages.ts"];
const BANNED_WORDS = /\b(seamless|effortless|cutting-edge|unlock|elevate|supercharge|reimagine|next-generation|game-changing|powerful|robust)\b/i;

describe("public copy", () => {
  it("makes no investment claims", () => {
    for (const path of PAGES) {
      const allowed = path.endsWith("RULES.md") ? readFileSync(path, "utf8").replace(/no claims about returns, value or investing/g, "") : readFileSync(path, "utf8");
      const text = allowed.replace(/claims about price or returns/g, "").replace(/investment: "Investment claims",/g, "");
      expect(text.match(INVESTMENT)?.[0] ?? null, path).toBeNull();
    }
  });
  it("never mentions the contest vote in the voting flow", () => {
    for (const path of VOTING_FLOW) expect(readFileSync(path, "utf8").match(CONTEST)?.[0] ?? null, path).toBeNull();
  });
  it("carries the not-affiliated line on every page", () => {
    expect(readFileSync("components/site-shell.tsx", "utf8")).toContain("Not affiliated with Vibestarter.");
    for (const path of sources("app").filter((item) => item.endsWith("page.tsx") && !item.includes("latest"))) {
      expect(readFileSync(path, "utf8"), path).toContain("PageShell");
    }
  });
  it("avoids the skill's banned filler words", () => {
    for (const path of PAGES) expect(readFileSync(path, "utf8").match(BANNED_WORDS)?.[0] ?? null, path).toBeNull();
  });
  it("loads no wallet code on the wallet-free pages", () => {
    for (const path of ["app/page.tsx", "app/shifts/[slug]/page.tsx", "app/floors/[slug]/page.tsx", "app/built/page.tsx", "app/rejected/page.tsx"]) {
      const text = readFileSync(path, "utf8");
      expect(text).not.toContain("wallet-root");
      expect(text).not.toContain("wagmi");
    }
  });
  it("embeds no floor on the pages that hold a wallet", () => {
    for (const path of ["app/vote/page.tsx", "app/veto/page.tsx"]) {
      expect(readFileSync(path, "utf8")).not.toMatch(/iframe|floor-frame/);
    }
  });
});
