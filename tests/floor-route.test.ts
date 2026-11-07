import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/f/[hash]/route";
import { memoryDb, setDb, type Db } from "@/lib/db";
import { floorFrameAncestors } from "@/lib/floor-gate/headers";
import { routeByHost } from "@/proxy";

const call = (hash: string) => GET(new Request(`http://x/f/${hash}`), { params: Promise.resolve({ hash }) });

describe("the floor document route", () => {
  let db: Db;
  beforeEach(async () => {
    db = await memoryDb();
    setDb(db);
    await db.query("insert into shifts (id, slug, label, status, closes_at) values (1, '1', 'scheduled', 'shipped', now())");
    await db.query("insert into floors (shift_id, name, one_liner, how_to_use, html, hash, script_hashes) values (1, 'n', 'o', 'h', '<!doctype html><p>floor</p>', '0xabc', '''sha256-xyz''')");
  });
  afterEach(() => setDb(null));

  it("serves the floor with the sandbox CSP and its script hashes", async () => {
    process.env.NEXT_PUBLIC_SITE_ORIGIN = "https://main.example";
    const response = await call("0xabc");
    delete process.env.NEXT_PUBLIC_SITE_ORIGIN;
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("<p>floor</p>");
    const csp = response.headers.get("Content-Security-Policy") ?? "";
    expect(csp.startsWith("sandbox allow-scripts;")).toBe(true);
    expect(csp).not.toContain("allow-same-origin");
    expect(csp).toContain("script-src 'sha256-xyz';");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp.endsWith("frame-ancestors https://main.example 'self'")).toBe(true);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Content-Type")).toContain("text/html");
  });
  it("is never stored by a browser or a shared cache, so a veto reaches the next load", async () => {
    expect((await call("0xabc")).headers.get("Cache-Control")).toBe("no-store");
  });
  it("lets only the floor's own origin frame it when no site origin is set", async () => {
    const response = await GET(new Request("http://127.0.0.1:4300/f/0xabc"), { params: Promise.resolve({ hash: "0xabc" }) });
    expect(response.headers.get("Content-Security-Policy")?.endsWith("frame-ancestors 'self'")).toBe(true);
  });
  it("never builds the framing origin from request headers", async () => {
    const forged = { host: "evil.example", "x-forwarded-host": "evil.example", "x-forwarded-proto": "https" };
    const unset = await GET(new Request("http://127.0.0.1:4300/f/0xabc", { headers: forged }), { params: Promise.resolve({ hash: "0xabc" }) });
    process.env.NEXT_PUBLIC_SITE_ORIGIN = "https://main.example";
    const set = await GET(new Request("http://127.0.0.1:4300/f/0xabc", { headers: forged }), { params: Promise.resolve({ hash: "0xabc" }) });
    delete process.env.NEXT_PUBLIC_SITE_ORIGIN;
    for (const response of [unset, set]) expect(response.headers.get("Content-Security-Policy")).not.toContain("evil.example");
  });
  it("uses the site origin only when it is a plain http(s) origin", () => {
    expect(floorFrameAncestors(undefined)).toBe("'self'");
    expect(floorFrameAncestors("")).toBe("'self'");
    expect(floorFrameAncestors("https://Main.Example/some/path/")).toBe("https://main.example 'self'");
    expect(floorFrameAncestors("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000 'self'");
    expect(floorFrameAncestors("https://main.example;script-src *")).toBe("'self'");
    expect(floorFrameAncestors("javascript:alert(1)")).toBe("'self'");
    expect(floorFrameAncestors("not a url")).toBe("'self'");
  });
  it("returns 404 for an unknown floor", async () => {
    expect((await call("0xdead")).status).toBe(404);
  });
  it("returns 410 for a vetoed floor", async () => {
    await db.query("update floors set status = 'vetoed' where shift_id = 1");
    expect((await call("0xabc")).status).toBe(410);
  });
});

describe("routeByHost", () => {
  const floors = "https://floors.example";
  it("lets everything through when no floors hostname is set", () => {
    expect(routeByHost("/f/0xabc", "main.example", undefined)).toBe("next");
    expect(routeByHost("/", "main.example", undefined)).toBe("next");
  });
  it("serves floors only from the floors hostname", () => {
    expect(routeByHost("/f/0xabc", "floors.example", floors)).toBe("next");
    expect(routeByHost("/f/0xabc", "main.example", floors)).toBe("not-found");
  });
  it("serves nothing else from the floors hostname", () => {
    expect(routeByHost("/", "floors.example", floors)).toBe("not-found");
    expect(routeByHost("/vote", "floors.example", floors)).toBe("not-found");
    expect(routeByHost("/", "main.example", floors)).toBe("next");
  });
});
