import { describe, expect, it } from "vitest";
import { memoryDb } from "@/lib/db";
import { insertProposal, normaliseProposal } from "@/lib/proposals";
import { claimOffSchedule, claimScheduled, createRehearsal, ensureOpenShift, nextCloseAfter, spentCents } from "@/lib/shifts";

describe("nextCloseAfter", () => {
  it("is 22:00 UTC the same day before the close", () => {
    expect(nextCloseAfter(new Date("2026-11-07T10:00:00Z")).toISOString()).toBe("2026-11-07T22:00:00.000Z");
  });
  it("is the next day at or after the close", () => {
    expect(nextCloseAfter(new Date("2026-11-07T22:00:00Z")).toISOString()).toBe("2026-11-08T22:00:00.000Z");
    expect(nextCloseAfter(new Date("2026-11-07T23:30:00Z")).toISOString()).toBe("2026-11-08T22:00:00.000Z");
  });
});

describe("shifts", () => {
  it("keeps exactly one open shift, numbers public shifts and claims only after the close", async () => {
    const db = await memoryDb();
    const open = await ensureOpenShift(db, new Date("2026-11-07T10:00:00Z"));
    expect(open.slug).toBe("1");
    expect((await ensureOpenShift(db, new Date("2026-11-07T11:00:00Z"))).id).toBe(open.id);

    expect(await claimScheduled(db, new Date("2026-11-07T21:59:00Z"))).toBeNull();
    const claimed = await claimScheduled(db, new Date("2026-11-07T22:00:30Z"));
    expect(claimed?.id).toBe(open.id);
    expect(claimed?.status).toBe("closed");
    expect(await claimScheduled(db, new Date("2026-11-07T22:20:00Z"))).toBeNull();

    const next = await ensureOpenShift(db, new Date("2026-11-07T22:00:30Z"));
    expect(next.slug).toBe("2");
    expect(new Date(next.closes_at).toISOString()).toBe("2026-11-08T22:00:00.000Z");
  });

  it("closes the open shift early for an off-schedule run and records why", async () => {
    const db = await memoryDb();
    await ensureOpenShift(db, new Date("2026-11-08T10:00:00Z"));
    const claimed = await claimOffSchedule(db, new Date("2026-11-08T15:00:00Z"), "extra evidence shift");
    expect(claimed?.label).toBe("off-schedule");
    expect(claimed?.reason).toBe("extra evidence shift");
    expect(new Date(claimed?.closes_at ?? "").toISOString()).toBe("2026-11-08T15:00:00.000Z");
  });

  it("gives a rehearsal its own slug and leaves the open shift alone", async () => {
    const db = await memoryDb();
    const open = await ensureOpenShift(db, new Date("2026-11-07T10:00:00Z"));
    const first = await createRehearsal(db, new Date("2026-11-07T11:00:00Z"), "dry run", "A tip calculator", "0xABC");
    const second = await createRehearsal(db, new Date("2026-11-07T11:30:00Z"), "dry run", "A tip calculator", "0xABC");
    expect(first.shift.slug).toBe("r1");
    expect(second.shift.slug).toBe("r2");
    expect(first.shift.label).toBe("rehearsal");
    expect((await ensureOpenShift(db, new Date("2026-11-07T12:00:00Z"))).id).toBe(open.id);
    expect((await ensureOpenShift(db, new Date("2026-11-07T12:00:00Z"))).slug).toBe("1");
  });

  it("sums spend across every shift", async () => {
    const db = await memoryDb();
    const a = await createRehearsal(db, new Date("2026-11-07T11:00:00Z"), "dry run", "One", "0xabc");
    await db.query("update shifts set cost_cents = 37 where id = $1", [a.shift.id]);
    expect(await spentCents(db)).toBe(37);
  });
});

describe("proposals", () => {
  it("ignores case and spacing when normalising", () => {
    expect(normaliseProposal("  A  Tip\tCalculator ")).toBe("a tip calculator");
  });
  it("refuses a second open copy of the same proposal", async () => {
    const db = await memoryDb();
    const shift = await ensureOpenShift(db, new Date("2026-11-07T10:00:00Z"));
    const base = { author: "0xA", shiftId: shift.id, seeded: true, signature: null, signedAt: null };
    expect(await insertProposal(db, { ...base, text: "A tip calculator" })).toBeGreaterThan(0);
    await expect(insertProposal(db, { ...base, text: "a  TIP calculator" })).rejects.toThrow();
  });
});
