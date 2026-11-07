import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { Browser, Frame, Page } from "playwright-core";
import { FLOOR_FRAME_SANDBOX, floorHeaders } from "@/lib/floor-gate/headers";
import type { FloorSpec, FloorStep, FloorTest } from "@/lib/floor-gate/floor-spec";

export type ProviderMode = "configurable" | "non-configurable";
export type Violation = { kind: "provider-touched" | "network" | "navigation" | "dialog" | "new-window"; detail: string };
export type TestResult = { name: string; pass: boolean; detail: string | null };
export type BrowserGateResult = {
  violations: Violation[];
  errors: string[];
  tests: TestResult[];
  screenshots: { wide: string; narrow: string } | null;
};

const PROBE = "__NC_PROBE__";
const STEP_TIMEOUT_MS = 3000;

/** A stand-in for a wallet extension: installed before any page script, in every frame. */
export function fakeProviderScript(mode: ProviderMode): string {
  const install = mode === "configurable"
    ? "window.ethereum = provider;"
    : 'Object.defineProperty(window, "ethereum", { value: provider, configurable: false, writable: false, enumerable: true });';
  return `(function () {
    var touched = function (what) { console.log("${PROBE} " + what); };
    var provider = new Proxy({ isMetaMask: true, request: function () { touched("request"); return Promise.resolve([]); } }, {
      get: function (target, key) { touched("get:" + String(key)); return target[key]; }
    });
    ${install}
    // Held from before the guard runs, as a real extension could, so only the guard's listener stops it.
    var announce = window.dispatchEvent.bind(window);
    window.addEventListener("eip6963:requestProvider", function () {
      announce(new CustomEvent("eip6963:announceProvider", { detail: { info: { rdns: "test.wallet" }, provider: provider } }));
    });
  })();`;
}

function parentPage(floorPath: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>floor gate</title><style>html,body{margin:0;height:100%}iframe{display:block;width:100%;height:100vh;border:0}</style></head><body><iframe id="floor" title="floor" sandbox="${FLOOR_FRAME_SANDBOX}" allow="" referrerpolicy="no-referrer" src="${floorPath}"></iframe></body></html>`;
}

async function runStep(frame: Frame, step: FloorStep): Promise<void> {
  const locator = frame.locator(step.selector).first();
  switch (step.op) {
    case "fill":
      await locator.fill(step.value, { timeout: STEP_TIMEOUT_MS });
      return;
    case "click":
      await locator.click({ timeout: STEP_TIMEOUT_MS });
      return;
    case "select":
      await locator.selectOption(step.value, { timeout: STEP_TIMEOUT_MS });
      return;
    case "press":
      await locator.press(step.key, { timeout: STEP_TIMEOUT_MS });
      return;
    case "expectText": {
      const text = (await locator.textContent({ timeout: STEP_TIMEOUT_MS })) ?? "";
      if (!text.includes(step.contains)) throw new Error(`expected "${step.selector}" to contain "${step.contains}", found "${text.slice(0, 120)}"`);
      return;
    }
    case "expectValue": {
      const value = await locator.inputValue({ timeout: STEP_TIMEOUT_MS });
      if (value !== step.equals) throw new Error(`expected "${step.selector}" to equal "${step.equals}", found "${value.slice(0, 120)}"`);
      return;
    }
    case "expectVisible":
      await locator.waitFor({ state: "visible", timeout: STEP_TIMEOUT_MS });
      return;
    case "expectCount": {
      const count = await frame.locator(step.selector).count();
      if (count !== step.count) throw new Error(`expected ${step.count} of "${step.selector}", found ${count}`);
      return;
    }
  }
}

async function loadFloor(page: Page, origin: string, settleMs: number): Promise<Frame> {
  await page.goto(`${origin}/parent`, { waitUntil: "load" });
  await page.waitForTimeout(settleMs);
  const frame = page.frames().find((candidate) => candidate.url().endsWith("/f/floor"));
  if (!frame) throw new Error("the floor frame did not load");
  return frame;
}

async function runTest(page: Page, origin: string, settleMs: number, test: FloorTest): Promise<TestResult> {
  try {
    const frame = await loadFloor(page, origin, settleMs);
    for (const step of test.steps) await runStep(frame, step);
    return { name: test.name, pass: true, detail: null };
  } catch (error) {
    return { name: test.name, pass: false, detail: error instanceof Error ? error.message.slice(0, 300) : "test failed" };
  }
}

export type BrowserGateOptions = {
  html: string;
  scriptHashes: string;
  spec: Pick<FloorSpec, "tests">;
  launch: () => Promise<Browser>;
  providerMode?: ProviderMode;
  settleMs?: number;
  screenshots?: boolean;
};

/** Runs an assembled floor under production headers with a fake wallet. See the spec, section 6. */
export async function runBrowserGate(options: BrowserGateOptions): Promise<BrowserGateResult> {
  const { html, scriptHashes, spec, launch, providerMode = "non-configurable", settleMs = 600, screenshots = false } = options;
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", "http://x").pathname;
    if (path === "/parent") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(parentPage("/f/floor"));
    } else if (path === "/f/floor") {
      const { address, port } = server.address() as AddressInfo;
      response.writeHead(200, floorHeaders(scriptHashes, `http://${address}:${port}`));
      response.end(html);
    } else {
      response.writeHead(404);
      response.end("not found");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const origin = `http://127.0.0.1:${port}`;

  const violations: Violation[] = [];
  const errors: string[] = [];
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    await context.addInitScript(fakeProviderScript(providerMode));
    const page = await context.newPage();
    context.on("page", (opened) => {
      if (opened !== page) violations.push({ kind: "new-window", detail: opened.url() });
    });
    page.on("console", (message) => {
      const text = message.text();
      if (text.startsWith(PROBE)) violations.push({ kind: "provider-touched", detail: text.slice(PROBE.length + 1) });
      else if (message.type() === "error" && !text.includes("favicon") && !text.includes("Failed to load resource")) errors.push(text.slice(0, 300));
    });
    page.on("pageerror", (error) => errors.push(error.message.slice(0, 300)));
    page.on("dialog", (dialog) => {
      violations.push({ kind: "dialog", detail: dialog.message().slice(0, 200) });
      void dialog.dismiss();
    });
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) return;
      const url = frame.url();
      if (url !== "about:blank" && !url.endsWith("/f/floor")) violations.push({ kind: "navigation", detail: url.slice(0, 200) });
    });
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      const own = url.origin === origin && ["/parent", "/f/floor", "/favicon.ico"].includes(url.pathname);
      if (own || url.protocol === "data:" || url.protocol === "about:") {
        await route.continue();
      } else {
        violations.push({ kind: "network", detail: route.request().url().slice(0, 200) });
        await route.abort();
      }
    });

    try {
      await loadFloor(page, origin, settleMs);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "the floor did not load");
      await context.close();
      return { violations, errors, tests: [], screenshots: null };
    }
    const tests: TestResult[] = [];
    for (const test of spec.tests) tests.push(await runTest(page, origin, settleMs, test));

    let shots: BrowserGateResult["screenshots"] = null;
    if (screenshots) {
      await loadFloor(page, origin, settleMs);
      const wide = await page.screenshot({ type: "png" });
      await page.setViewportSize({ width: 390, height: 844 });
      await loadFloor(page, origin, settleMs);
      const narrow = await page.screenshot({ type: "png" });
      shots = { wide: wide.toString("base64"), narrow: narrow.toString("base64") };
    }
    await context.close();
    return { violations, errors, tests, screenshots: shots };
  } finally {
    await browser.close();
    server.close();
  }
}

export function gatePassed(result: Pick<BrowserGateResult, "violations" | "errors" | "tests">): boolean {
  return result.violations.length === 0 && result.errors.length === 0 && result.tests.every((test) => test.pass);
}
