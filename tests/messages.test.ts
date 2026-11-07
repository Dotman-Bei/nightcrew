import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { memoryDb, type Db } from "@/lib/db";
import { isFresh, proposalMessage, vetoMessage, voteMessage } from "@/lib/messages";
import { allowEvent, clientKey } from "@/lib/rate-limit";

let db: Db;
beforeEach(async () => {
  db = await memoryDb();
});
afterEach(() => undefined);

describe("the signed messages", () => {
  const texts = [
    proposalMessage({ text: "A calculator", signedAt: "t" }),
    voteMessage({ proposalId: 12, shiftSlug: "7", signedAt: "t" }),
    vetoMessage({ targetType: "proposal", targetId: 1, reason: "r", signedAt: "t" }),
  ];
  it("stay plainly different from the contest vote", () => {
    for (const text of texts) expect(text).not.toMatch(/\b(vibeathon|vibestarter|back|entry)\b/i);
  });
  it("say it costs no gas and moves no funds", () => {
    for (const text of texts) expect(text).toContain("This signature costs no gas and moves no funds.");
  });
  it("name the proposal and shift in a vote", () => {
    expect(texts[1]).toContain("I want the crew to build proposal #12 in shift 7.");
  });
  it("expire after ten minutes", () => {
    const now = new Date("2026-11-07T12:00:00Z");
    expect(isFresh("2026-11-07T11:51:00Z", now)).toBe(true);
    expect(isFresh("2026-11-07T11:49:00Z", now)).toBe(false);
    expect(isFresh("nonsense", now)).toBe(false);
  });
});

describe("rate limits", () => {
  it("never store the raw IP", () => {
    const key = clientKey(new Request("http://x", { headers: { "x-real-ip": "1.2.3.4" } }), "vote");
    expect(key.startsWith("vote:")).toBe(true);
    expect(key).not.toContain("1.2.3.4");
  });
  it("allow again after an hour, and delete rows older than a day", async () => {
    const start = new Date("2026-11-07T10:00:00Z");
    expect(await allowEvent(db, "k", 1, start)).toBe(true);
    expect(await allowEvent(db, "k", 1, new Date("2026-11-07T10:30:00Z"))).toBe(false);
    expect(await allowEvent(db, "k", 1, new Date("2026-11-07T11:01:00Z"))).toBe(true);
    await allowEvent(db, "other", 1, new Date("2026-11-09T10:00:00Z"));
    expect((await db.query("select * from rate_events where key = 'k'")).rows).toEqual([]);
  });
});
