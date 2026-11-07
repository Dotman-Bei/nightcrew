import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as getPart } from "@/app/api/receipts/[slug]/[part]/route";
import { GET as getShot } from "@/app/api/floors/[slug]/screenshot/route";
import { POST as postWaitlist } from "@/app/api/waitlist/route";
import { memoryDb, setDb, type Db } from "@/lib/db";

let ipCounter = 0;
const nextIp = () => `10.0.0.${(ipCounter += 1)}`;
const post = (body: unknown, ip = nextIp()) => new Request("http://x/api", { method: "POST", headers: { "content-type": "application/json", "x-real-ip": ip }, body: JSON.stringify(body) });

let db: Db;
beforeEach(async () => {
  db = await memoryDb();
  setDb(db);
});
afterEach(() => setDb(null));

describe("POST /api/waitlist", () => {
  it("stores a community once", async () => {
    const body = { community: "Some DAO", contact: "someone@example.com" };
    expect((await postWaitlist(post(body))).status).toBe(201);
    expect((await postWaitlist(post(body))).status).toBe(201);
    expect((await db.query("select * from waitlist")).rows).toHaveLength(1);
  });
  it("refuses an empty field", async () => {
    expect((await postWaitlist(post({ community: "", contact: "x" }))).status).toBe(400);
  });
});

describe("raw receipt parts", () => {
  const part = (slug: string, name: string) => getPart(new Request("http://x"), { params: Promise.resolve({ slug, part: name }) });
  beforeEach(async () => {
    await db.query("insert into shifts (id, slug, label, status, closes_at) values (600, '60', 'scheduled', 'shipped', now())");
    await db.query("insert into receipt_parts (shift_id, part, content) values (600, 'floor.html', '<script>x</script>'), (600, 'bundle.json', '{}')");
  });
  it("serves a floor as plain text, never as a page", async () => {
    const response = await part("60", "floor.html");
    expect(response.headers.get("Content-Type")).toContain("text/plain");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
  });
  it("serves the exact bytes", async () => {
    expect(await (await part("60", "bundle.json")).text()).toBe("{}");
  });
  it("returns 404 for an unknown part or shift", async () => {
    expect((await part("60", "secrets.txt")).status).toBe(404);
    expect((await part("61", "bundle.json")).status).toBe(404);
  });
});

describe("floor screenshots", () => {
  const shot = (slug: string) => getShot(new Request(`http://x/api/floors/${slug}/screenshot`), { params: Promise.resolve({ slug }) });
  beforeEach(async () => {
    await db.query("insert into shifts (id, slug, label, status, closes_at) values (700, '70', 'scheduled', 'shipped', now())");
    await db.query("insert into floors (shift_id, name, one_liner, how_to_use, html, hash, script_hashes, screenshot_wide) values (700, 'n', 'o', 'h', 'x', '0xshot', 's', 'iVBORw0KGgo=')");
  });
  it("serves the stored image, cached for at most a minute so a veto reaches it soon", async () => {
    const response = await shot("70");
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });
  it("returns 410 once the floor is vetoed", async () => {
    await db.query("update floors set status = 'vetoed' where shift_id = 700");
    expect((await shot("70")).status).toBe(410);
  });
});
