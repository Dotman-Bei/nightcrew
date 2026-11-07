import { beforeEach, describe, expect, it } from "vitest";
import { memoryDb, type Db } from "@/lib/db";
import { categoryWords, dayLabel, money, shortAddress, shortHash, timeLabel, wholeNumber } from "@/lib/format";
import { insertProposal } from "@/lib/proposals";
import { PROPOSALS_PER_PAGE, buildTowerRows, builtView, floorView, receiptView, rejectedView, towerView, voteView } from "@/lib/read-models";
import { ensureOpenShift } from "@/lib/shifts";

const NOW = new Date("2026-11-07T10:00:00Z");

describe("category words", () => {
  it("are plain words, never the raw slug", () => {
    expect(categoryWords("needs-wallet")).toBe("Needs a wallet");
    expect(categoryWords("model-refusal")).toBe("The model declined");
    expect(categoryWords(null)).toBe("Rejected");
  });
});

describe("format helpers", () => {
  it("format money, dates and numbers", () => {
    expect(money(41)).toBe("$0.41");
    expect(dayLabel("2026-11-08T22:00:00Z")).toBe("8 Nov");
    expect(timeLabel("2026-11-08T22:00:00Z")).toBe("22:00 UTC");
    expect(wholeNumber("1234567")).toBe("1,234,567");
    expect(shortAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234…5678");
    expect(shortHash(`0x${"a".repeat(64)}`)).toBe("0xaaaaaa…aaaaaa");
  });
});

describe("the read models", () => {
  let db: Db;
  let shiftId: number;
  const propose = (text: string) => insertProposal(db, { text, author: "0xauthor", shiftId, seeded: true, signature: null, signedAt: null });
  const vote = (voter: string, proposalId: number, weight: string) =>
    db.query("insert into votes (shift_id, voter, proposal_id, signature, signed_at, weight_estimate) values ($1, $2, $3, 's', now(), $4)", [shiftId, voter, proposalId, weight]);

  beforeEach(async () => {
    db = await memoryDb();
    shiftId = (await ensureOpenShift(db, NOW)).id;
  });

  it("rank tonight's proposals numerically, not as text", async () => {
    const low = await propose("low");
    const high = await propose("high");
    await vote("0x1", low, "52000");
    await vote("0x2", high, "509010");
    const view = await towerView(db, NOW);
    expect(view.top.map((row) => row.id)).toEqual([high, low]);
    expect(view.top[0]).toMatchObject({ weight: "509010", wallets: 1 });
    expect(view.walletsTonight).toBe(2);
    expect(view.openCount).toBe(2);
  });
  it("show ten rows on an empty tower, tonight and floors to come, with the build window marked", async () => {
    const view = await towerView(db, NOW);
    expect(view.latest).toBeNull();
    expect(view.rows.filter((row) => row.kind !== "window-close")).toHaveLength(10);
    expect(view.rows.filter((row) => row.kind === "tonight")).toHaveLength(1);
    expect(view.rows.filter((row) => row.kind === "window-close")).toHaveLength(1);
  });
  it("place the build window close between the floors either side of it", () => {
    const rows = buildTowerRows([
      { slug: "4", label: "scheduled", status: "shipped", closes_at: "2026-11-10T22:00:00Z", cost_cents: 1, failure_reason: null, name: "After", one_liner: "", floor_status: "lit", dark_reason: null, bundle: null, attestation_uid: null },
      { slug: "3", label: "scheduled", status: "shipped", closes_at: "2026-11-08T22:00:00Z", cost_cents: 1, failure_reason: null, name: "Before", one_liner: "", floor_status: "lit", dark_reason: null, bundle: null, attestation_uid: null },
    ], { slug: "5", closesAt: "2026-11-11T22:00:00Z" }, 0);
    const kinds = rows.map((row) => (row.kind === "lit" ? row.name : row.kind));
    expect(kinds.indexOf("After")).toBeLessThan(kinds.indexOf("window-close"));
    expect(kinds.indexOf("window-close")).toBeLessThan(kinds.indexOf("Before"));
  });
  it("page the open list at 20, newest first, and clamp the page", async () => {
    for (let i = 0; i < PROPOSALS_PER_PAGE + 3; i += 1) await propose(`idea ${i}`);
    const first = await voteView(db, NOW, 1);
    expect(first.all).toHaveLength(PROPOSALS_PER_PAGE);
    expect(first.all[0].text).toBe(`idea ${PROPOSALS_PER_PAGE + 2}`);
    expect(first.pageCount).toBe(2);
    expect((await voteView(db, NOW, 99)).page).toBe(2);
    expect((await voteView(db, NOW, -1)).page).toBe(1);
    expect(first.top).toHaveLength(5);
  });
  it("leave out rejected, vetoed and twice-failed proposals from the open list", async () => {
    const a = await propose("a");
    const b = await propose("b");
    const c = await propose("c");
    await db.query("update proposals set status = 'rejected' where id = $1", [a]);
    await db.query("update proposals set status = 'vetoed' where id = $1", [b]);
    await db.query("update proposals set failed_attempts = 2 where id = $1", [c]);
    expect((await voteView(db, NOW, 1)).openCount).toBe(0);
  });
  it("list every rejection and veto, with floors first", async () => {
    const a = await propose("needs a server");
    await db.query("update proposals set status = 'rejected', status_reason = 'Needs a server.', status_category = 'needs-backend' where id = $1", [a]);
    const b = await propose("rude");
    await db.query("update proposals set status = 'vetoed', status_reason = 'Rude.' where id = $1", [b]);
    await db.query("insert into shifts (id, slug, label, status, closes_at) values (900, '9', 'scheduled', 'shipped', now())");
    await db.query("insert into floors (shift_id, name, one_liner, how_to_use, html, hash, script_hashes, status, dark_reason) values (900, 'Bad floor', 'o', 'h', 'x', '0x1', 's', 'vetoed', 'It broke the rules.')");
    const rows = await rejectedView(db);
    expect(rows[0]).toMatchObject({ kind: "veto", targetType: "floor", text: "Bad floor", reason: "It broke the rules." });
    expect(rows.map((row) => row.kind)).toEqual(["veto", "veto", "triage"]);
  });
  it("count rehearsals apart from public shifts", async () => {
    await db.query("insert into shifts (slug, label, status, closes_at, cost_cents) values ('r1', 'rehearsal', 'shipped', now(), 30), ('5', 'scheduled', 'shipped', now(), 40), ('6', 'off-schedule', 'dark', now(), 0)");
    expect(await builtView(db)).toEqual({ rehearsals: 1, publicShifts: 2, floorsLit: 1, spentCents: 70 });
  });
  it("return null for a shift with no receipt or floor view", async () => {
    expect(await receiptView(db, "99")).toBeNull();
    expect(await floorView(db, "99")).toBeNull();
  });
});
