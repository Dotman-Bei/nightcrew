import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { build } from "esbuild";
import type { Browser, Page } from "playwright-core";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FloorFrame } from "@/components/floor-frame";
import { assembleFloor } from "@/lib/floor-gate/assemble";
import { runBrowserGate } from "@/lib/floor-gate/browser";
import { floorFrameAncestors, floorHeaders } from "@/lib/floor-gate/headers";
import { launchChrome } from "./helpers/chrome";

const LEFT_LINE = "This floor tried to leave its sandbox, so it was removed from the page.";
const floorWith = (script: string): string =>
  `<!doctype html><html><head><meta charset="utf-8"><title>t</title></head><body><p id="floor">floor</p><script>${script}</script></body></html>`;
const FLOORS: Record<string, string> = {
  stays: floorWith("const a = 1 + 1;"),
  "leaves-soon": floorWith('setTimeout(function () { document.location = "/left"; }, 100);'),
  "leaves-later": floorWith('setTimeout(function () { document.location = "/left"; }, 1500);'),
  "leaves-while-parsing": floorWith('document.location = "/left";'),
};
const HYDRATE = 'import { createElement } from "react"; import { hydrateRoot } from "react-dom/client"; import { FloorFrame } from "./components/floor-frame"; const root = document.getElementById("root"); hydrateRoot(root, createElement(FloorFrame, { src: root.dataset.src, title: "t" }));';

/** The real component in the real page's order: server HTML first, then the script that hydrates it, whenever the test lets it through. */
describe("the floor frame in real Chrome", () => {
  let browser: Browser;
  let server: Server;
  let origin: string;
  let client: string;
  let release: () => void = () => undefined;
  let held: Promise<void> = Promise.resolve();
  const requested: string[] = [];

  beforeAll(async () => {
    const bundle = await build({
      stdin: { contents: HYDRATE, resolveDir: process.cwd(), loader: "ts" },
      bundle: true,
      write: false,
      format: "iife",
      jsx: "automatic",
      define: { "process.env.NODE_ENV": '"production"' },
    });
    client = bundle.outputFiles[0].text;
    server = createServer((request, response) => {
      const path = request.url ?? "/";
      if (path.startsWith("/page/")) {
        const src = `/f/${path.slice("/page/".length)}`;
        const html = renderToString(createElement(FloorFrame, { src, title: "t" }));
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(`<!doctype html><html><head><meta charset="utf-8"><title>p</title></head><body><div id="root" data-src="${src}">${html}</div><script src="/client.js"></script></body></html>`);
      } else if (path === "/client.js") {
        void held.then(() => {
          response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
          response.end(client);
        });
      } else if (path.startsWith("/f/")) {
        requested.push(path);
        const assembled = assembleFloor(FLOORS[path.slice("/f/".length)], null);
        response.writeHead(200, floorHeaders(assembled.scriptHashes, floorFrameAncestors(undefined)));
        response.end(assembled.html);
      } else if (path === "/favicon.ico") {
        response.writeHead(404);
        response.end();
      } else {
        requested.push(path);
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end('<!doctype html><html><head><meta charset="utf-8"><title>l</title></head><body><p id="left">somewhere else</p></body></html>');
      }
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    browser = await launchChrome();
  });
  afterAll(async () => {
    await browser.close();
    server.close();
  });

  /** Opens the page with hydration held back for holdMs: long enough for a frame in the server's HTML to load and navigate. */
  async function open(name: string, holdMs: number): Promise<{ page: Page; requestedWhileHeld: string[] }> {
    requested.length = 0;
    held = new Promise((resolve) => {
      release = resolve;
    });
    const page = await browser.newPage();
    await page.goto(`${origin}/page/${name}`, { waitUntil: "commit" });
    await page.waitForTimeout(holdMs);
    const requestedWhileHeld = [...requested];
    release();
    return { page, requestedWhileHeld };
  }

  it("removes a floor that would navigate before the page hydrates", async () => {
    const { page, requestedWhileHeld } = await open("leaves-soon", 1500);
    await page.getByText(LEFT_LINE).waitFor({ timeout: 5000 });
    expect(await page.locator("iframe").count()).toBe(0);
    expect(requestedWhileHeld).toEqual([]);
    await page.close();
  });

  it("removes a floor that navigates after the page hydrates", async () => {
    const { page } = await open("leaves-later", 0);
    await page.locator("iframe").waitFor({ timeout: 5000 });
    await page.getByText(LEFT_LINE).waitFor({ timeout: 8000 });
    expect(await page.locator("iframe").count()).toBe(0);
    await page.close();
  });

  it("keeps a floor that stays where it is, in its sandbox", async () => {
    const { page } = await open("stays", 500);
    const frame = page.locator("iframe");
    await frame.waitFor({ timeout: 5000 });
    await page.waitForTimeout(1500);
    expect(await frame.getAttribute("sandbox")).toBe("allow-scripts");
    expect(await page.frameLocator("iframe").locator("#floor").textContent()).toBe("floor");
    expect(await page.getByText(LEFT_LINE).count()).toBe(0);
    expect(requested).toEqual(["/f/stays"]);
    await page.close();
  });

  it("sends no frame in the server's HTML, and says why to a browser without JavaScript", () => {
    const html = renderToString(createElement(FloorFrame, { src: "/f/stays", title: "t" }));
    expect(html).not.toContain("<iframe");
    expect(html).toContain("needs JavaScript");
  });

  it("leaves a floor that navigates while parsing to the browser gate, because it fires only one load", async () => {
    const assembled = assembleFloor(FLOORS["leaves-while-parsing"], null);
    const gate = await runBrowserGate({ html: assembled.html, scriptHashes: assembled.scriptHashes, spec: { tests: [] }, launch: launchChrome });
    expect(gate.violations.map((violation) => violation.kind)).toContain("navigation");
  });
});
