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
