import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runCoreGate as runStaticGate } from "@/lib/floor-gate/static";

const goodHtml = readFileSync("tests/fixtures/good-floor/index.html", "utf8");
const floorWith = (script: string, extraHead = "", extraBody = ""): string =>
  `<!doctype html><html><head><meta charset="utf-8"><title>t</title>${extraHead}</head><body>${extraBody}<script>${script}</script></body></html>`;

describe("static gate, core rules", () => {
  const rulesOf = (html: string): string[] => runStaticGate(html).map((finding) => finding.rule);

  it("passes the good floor", () => {
    expect(runStaticGate(goodHtml)).toEqual([]);
  });
  it("rejects external scripts, links, frames and inline handlers", () => {
    expect(rulesOf(floorWith("1;", '<script src="https://x.test/a.js"></script>'))).toContain("script-src");
    expect(rulesOf(floorWith("1;", '<link rel="stylesheet" href="https://x.test/a.css">'))).toContain("element");
    expect(rulesOf(floorWith("1;", "", '<iframe src="https://x.test"></iframe>'))).toContain("element");
    expect(rulesOf(floorWith("1;", "", '<button onclick="go()">x</button>'))).toContain("inline-handler");
    expect(rulesOf(floorWith("1;", "", '<form action="https://x.test"></form>'))).toContain("form-action");
    expect(rulesOf(floorWith("1;", "", '<img src="https://x.test/a.png">'))).toContain("external-url");
    expect(rulesOf(floorWith("1;", '<script type="module">1;</script>'))).toContain("script-type");
    expect(rulesOf(floorWith("1;", '<style>body{background:url(https://x.test/a.png)}</style>'))).toContain("css-external");
  });
  it("allows data URLs and fragments", () => {
    expect(rulesOf(floorWith("1;", "", '<img alt="" src="data:image/png;base64,AAAA"><a href="#x">x</a>'))).toEqual([]);
  });
  it("rejects two scripts", () => {
    expect(rulesOf(floorWith("1;", "<script>2;</script>"))).toContain("one-script");
  });
  it("rejects every route to navigation", () => {
    expect(rulesOf(floorWith('location.href = "x";'))).toContain("banned-name");
    expect(rulesOf(floorWith('document.location = "x";'))).toContain("banned-name");
    expect(rulesOf(floorWith('document["location"] = "x";'))).toContain("document-alias");
    expect(rulesOf(floorWith("const d = document; d.title = 1;"))).toContain("document-alias");
    expect(rulesOf(floorWith('const k = "location"; document[k] = "x";'))).toContain("document-alias");
    expect(rulesOf(floorWith("document.body.ownerDocument.title = 1;"))).toContain("banned-name");
    expect(rulesOf(floorWith("document.body.getRootNode();"))).toContain("banned-name");
    expect(rulesOf(floorWith('import("data:text/javascript,1");'))).toContain("dynamic-import");
    expect(rulesOf(floorWith('document.write("x");'))).toContain("banned-name");
  });
  it("rejects dangerous createElement calls", () => {
    expect(rulesOf(floorWith('document.createElement("iframe");'))).toContain("create-element");
    expect(rulesOf(floorWith('document.createElement("SCRIPT");'))).toContain("create-element");
    expect(rulesOf(floorWith('const t = "div"; document.createElement(t);'))).toContain("create-element");
    expect(rulesOf(floorWith('document.createElement("div");'))).toEqual([]);
  });
  it("reports a syntax error instead of throwing", () => {
    expect(rulesOf(floorWith("function ("))).toContain("js-syntax");
  });
});
