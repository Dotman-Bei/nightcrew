import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assembleFloor, wrapFloorScript } from "@/lib/floor-gate/assemble";
import { WALLET_GUARD } from "@/lib/floor-gate/guard";
import { floorCsp, floorHeaders } from "@/lib/floor-gate/headers";
import { cspScriptHash } from "@/lib/hash";

const goodHtml = readFileSync("tests/fixtures/good-floor/index.html", "utf8");
const floorWith = (script: string, extraHead = "", extraBody = ""): string =>
  `<!doctype html><html><head><meta charset="utf-8"><title>t</title>${extraHead}</head><body>${extraBody}<script>${script}</script></body></html>`;

describe("assembleFloor", () => {
  const assembled = assembleFloor(goodHtml, '{"a":1}');

  it("puts the guard first in the head", () => {
    const headStart = assembled.html.indexOf("<head>") + "<head>".length;
    expect(assembled.html.slice(headStart).startsWith(`<script>${WALLET_GUARD}</script>`)).toBe(true);
  });
  it("wraps the floor's script and hashes the guard and the wrapped script", () => {
    expect(assembled.html).toContain('"use strict";{');
    expect(assembled.scriptHashes.split(" ")).toHaveLength(2);
    expect(assembled.scriptHashes).toContain(cspScriptHash(WALLET_GUARD));
  });
  it("is deterministic", () => {
    expect(assembleFloor(goodHtml, '{"a":1}')).toEqual(assembled);
  });
  it("inserts the snapshot as data and escapes anything that could close the script", () => {
    const out = assembleFloor(goodHtml, '{"a":"</script><script>alert(1)</script>"}');
    expect(out.html).toContain('<script type="application/json" id="snapshot">');
    expect(out.html).not.toContain("</script><script>alert(1)");
  });
  it("replaces a snapshot block the agent left in the raw floor", () => {
    const raw = floorWith("1;", '<script type="application/json" id="snapshot">{"old":true}</script>');
    const out = assembleFloor(raw, '{"new":true}');
    expect(out.html).toContain('{"new":true}');
    expect(out.html).not.toContain('{"old":true}');
  });
  it("lets a floor declare its own variable named like a shadowed global", () => {
    expect(wrapFloorScript("const top = 1;")).toContain("{\nconst top = 1;\n}");
  });
});

describe("floor headers", () => {
  it("lists only hashes in script-src and sandboxes the document", () => {
    const csp = floorCsp("'sha256-abc'", "https://main.example");
    expect(csp.startsWith("sandbox allow-scripts;")).toBe(true);
    expect(csp).toContain("script-src 'sha256-abc';");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("frame-ancestors https://main.example");
    expect(floorHeaders("'sha256-abc'", "https://main.example")["X-Content-Type-Options"]).toBe("nosniff");
  });
});

describe("the wrapper", () => {
  it("refuses a script that would close it early", () => {
    expect(() => wrapFloorScript("}}).call();run();(function(){{")).toThrow(/complete program/);
  });
  it("accepts any complete program", () => {
    expect(wrapFloorScript("const a = 1;")).toContain("const a = 1;");
  });
});

describe("the guard", () => {
  it("takes what it needs before floor code runs and keeps no inherited allowlist", () => {
    expect(WALLET_GUARD).toContain("var apply = Reflect.apply;");
    expect(WALLET_GUARD).toContain("Object.create(null)");
    expect(WALLET_GUARD).not.toContain(".bind(window)");
    expect(WALLET_GUARD).not.toContain(".filter(");
  });
});
