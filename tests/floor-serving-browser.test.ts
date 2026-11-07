import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type { Browser, Page } from "playwright-core";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/f/[hash]/route";
import { memoryDb, setDb, type Db } from "@/lib/db";
import { launchChrome } from "./helpers/chrome";

const HASH = "0xabc";
const FLOOR_HTML = '<!doctype html><html><head><meta charset="utf-8"><title>f</title></head><body><p id="floor">floor</p></body></html>';
const parentPage = (src: string): string =>
  `<!doctype html><html><head><meta charset="utf-8"><title>p</title></head><body><iframe sandbox="allow-scripts" src="${src}"></iframe></body></html>`;

function listen(handler: (request: IncomingMessage, response: ServerResponse) => void): Promise<{ server: Server; origin: string }> {
  const server = createServer(handler);
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}` })));
}

/** Serves the real route, passing every request header through, as a proxy would. */
async function serveRoute(request: IncomingMessage, response: ServerResponse, origin: string): Promise<void> {
  const path = new URL(request.url ?? "/", origin).pathname;
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) if (typeof value === "string") headers.set(name, value);
  const floor = await GET(new Request(origin + path, { headers }), { params: Promise.resolve({ hash: path.slice("/f/".length) }) });
  response.writeHead(floor.status, Object.fromEntries(floor.headers));
  response.end(await floor.text());
}

async function floorShown(page: Page): Promise<boolean> {
  await page.waitForTimeout(500);
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    try {
      if ((await frame.locator("#floor").count()) > 0) return true;
    } catch {
      // a blocked frame holds an error page
    }
  }
  return false;
}

describe("floor serving in real Chrome", () => {
  let browser: Browser;
  let db: Db;
  let site: { server: Server; origin: string };
  let other: { server: Server; origin: string };

  beforeAll(async () => {
    delete process.env.NEXT_PUBLIC_SITE_ORIGIN;
    site = await listen((request, response) => {
      if (request.url === "/parent") {
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(parentPage(`/f/${HASH}`));
      } else {
        void serveRoute(request, response, site.origin);
      }
    });
    other = await listen((_request, response) => {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(parentPage(`${site.origin}/f/${HASH}`));
    });
    browser = await launchChrome();
  });
  afterAll(async () => {
    await browser.close();
    site.server.close();
    other.server.close();
  });
  beforeEach(async () => {
    db = await memoryDb();
    setDb(db);
    await db.query("insert into shifts (id, slug, label, status, closes_at) values (1, '1', 'scheduled', 'shipped', now())");
    await db.query("insert into floors (shift_id, name, one_liner, how_to_use, html, hash, script_hashes) values (1, 'n', 'o', 'h', $1, $2, '''sha256-xyz''')", [FLOOR_HTML, HASH]);
  });
  afterEach(() => setDb(null));

  it("lets the site's own page frame a floor", async () => {
    const page = await browser.newPage();
    await page.goto(`${site.origin}/parent`);
    expect(await floorShown(page)).toBe(true);
    await page.close();
  });

  it("refuses a page on another origin, even when it forges the forwarded host", async () => {
    const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-host": new URL(other.origin).host } });
    const page = await context.newPage();
    await page.goto(`${other.origin}/parent`);
    expect(await floorShown(page)).toBe(false);
    await context.close();
  });

  it("shows the veto to a browser that already loaded the floor", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    expect((await page.goto(`${site.origin}/f/${HASH}`))?.status()).toBe(200);
    await db.query("update floors set status = 'vetoed' where hash = $1", [HASH]);
    await page.goto("about:blank");
    expect((await page.goto(`${site.origin}/f/${HASH}`))?.status()).toBe(410);
    await context.close();
  });
});
