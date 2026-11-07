import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runCoreGate, runStaticGate } from "@/lib/floor-gate/static";
import { HOSTILE_FLOORS } from "./fixtures/hostile-floors";

const floorWith = (script: string): string => `<!doctype html><html><head><meta charset="utf-8"><title>t</title></head><body><script>${script}</script></body></html>`;
const rulesOf = (html: string): string[] => runStaticGate(html).map((finding) => finding.rule);

describe("the extended static rules", () => {
  it("reject every hostile floor they can see", () => {
    for (const floor of HOSTILE_FLOORS.filter((item) => item.caughtBy !== "runtime")) expect(runStaticGate(floor.html).length, floor.name).toBeGreaterThan(0);
  });
  it("still pass the good floor and the blank template", () => {
    expect(runStaticGate(readFileSync("tests/fixtures/good-floor/index.html", "utf8"))).toEqual([]);
    expect(runStaticGate(readFileSync("floor-kit/template.html", "utf8"))).toEqual([]);
  });
  it("keep the core rules", () => {
    expect(runCoreGate(floorWith('document.location = "x";')).length).toBeGreaterThan(0);
    expect(rulesOf(floorWith('document.location = "x";'))).toContain("banned-name");
  });
  it("catch names anywhere, including through a literal member", () => {
    expect(rulesOf(floorWith('fetch("x");'))).toContain("banned-name");
    expect(rulesOf(floorWith('navigator["sendBeacon"]("x");'))).toContain("banned-name");
    expect(rulesOf(floorWith('(function () {}).constructor("x");'))).toContain("banned-name");
  });
  it("allow a class's own constructor and member names like rect.top", () => {
    expect(rulesOf(floorWith("class A { constructor(x) { this.x = x; } } const r = new A(1);"))).toEqual([]);
    expect(rulesOf(floorWith('const rect = document.body.getBoundingClientRect(); document.body.style.top = rect.top + "px";'))).toEqual([]);
  });
  it("treat bare globals as banned only when not declared locally", () => {
    expect(rulesOf(floorWith("top.x = 1;"))).toContain("banned-global");
    expect(rulesOf(floorWith("const top = 1; const x = top + 1;"))).toEqual([]);
    expect(rulesOf(floorWith("function f(parent) { return parent; } f(1);"))).toEqual([]);
  });
  it("allow only listed window members", () => {
    expect(rulesOf(floorWith('window.addEventListener("resize", function () {});'))).toEqual([]);
    expect(rulesOf(floorWith("const w = window.innerWidth;"))).toEqual([]);
    expect(rulesOf(floorWith("window.name = 1;"))).toContain("window-member");
    expect(rulesOf(floorWith("const w = window;"))).toContain("window-member");
    expect(rulesOf(floorWith('const k = "a"; window[k];'))).toContain("window-member");
  });
  it("scan strings case-sensitively, so a label can say Ethereum", () => {
    expect(rulesOf(floorWith('const label = "Ethereum gas";'))).toEqual([]);
    expect(rulesOf(floorWith('const k = "ethereum";'))).toContain("banned-string");
    expect(rulesOf(floorWith('const u = "https://x.test";'))).toContain("banned-string");
    expect(rulesOf(floorWith("const u = `https://x.test`;"))).toContain("banned-string");
    expect(rulesOf(floorWith('const k = "\\u0065thereum";'))).toContain("banned-string");
  });
});
