import { beforeEach, describe, expect, it } from "vitest";
import type { ChainReader } from "@/lib/chain";
import { memoryDb, type Db } from "@/lib/db";
import { ensureOpenShift } from "@/lib/shifts";
import type { StakeReader } from "@/lib/tally";
import { closeShift, type CloseDeps } from "@/crew/lib/close-shift";

const VIBES = 10n ** 18n;
const CLOSE = new Date("2026-11-07T22:00:00Z");
const AFTER = new Date("2026-11-07T22:04:00Z");
const closeSeconds = BigInt(CLOSE.getTime() / 1000);

/** One block every 2 seconds, block 1000 at the close, with block 1040 the latest. */
function fakeChain(held: Record<string, bigint> = {}): ChainReader {
  return {
    latestBlock: async () => ({ number: 1040n, timestamp: closeSeconds + 80n }),
    blockAt: async (number) => ({ number, timestamp: closeSeconds + (number - 1000n) * 2n }),
    heldAt: async (addresses) => new Map(addresses.map((address) => [address, held[address] ?? 0n])),
  };
}

const noStake: StakeReader = async () => ({ staked: new Map(), mode: "current-at-tally" });

describe("closeShift", () => {
  let db: Db;
  const deps = (overrides: Partial<CloseDeps> = {}): CloseDeps => ({
    db,
    chain: fakeChain({ "0xvoter": 10n * VIBES }),
    stakes: noStake,
    floorData: async () => '{"a":1}',
    now: AFTER,
    trigger: { kind: "scheduled" },
    capCents: 60,
    totalBudgetCents: 450,
    ...overrides,
  });
  const addProposal = async (text: string): Promise<number> => {
    const shift = await ensureOpenShift(db, new Date("2026-11-07T10:00:00Z"));
    const result = await db.query<{ id: number }>("insert into proposals (text, normalised, author, seeded, shift_opened) values ($1, $1, '0xauthor', true, $2) returning id::int as id", [text, shift.id]);
    return result.rows[0].id;
  };

  beforeEach(async () => {
    db = await memoryDb();
    await ensureOpenShift(db, new Date("2026-11-07T10:00:00Z"));
  });

  it("claims after the close, tallies at the snapshot block and opens the next shift", async () => {
    const first = await addProposal("first");
    const second = await addProposal("second");
    const open = await ensureOpenShift(db, AFTER);
    await db.query("insert into votes (shift_id, voter, proposal_id, signature, signed_at) values ($1, '0xvoter', $2, 's', now())", [open.id, second]);
    const input = await closeShift(deps());
    expect(input?.shift.slug).toBe("1");
    expect(input?.tally?.snapshotBlock).toBe("1000");
    expect(input?.tally?.entries.map((entry) => entry.proposalId)).toEqual([second, first]);
    expect(input?.tally?.entries[0].weight).toBe("10");
    expect(input?.darkReason).toBeNull();
    expect(input?.snapshot).toBe('{"a":1}');
    expect((await ensureOpenShift(db, AFTER)).slug).toBe("2");
  });
  it("does nothing before the close, and does nothing the second time", async () => {
    expect(await closeShift(deps({ now: new Date("2026-11-07T21:00:00Z") }))).toBeNull();
    expect(await closeShift(deps())).not.toBeNull();
    expect(await closeShift(deps({ now: new Date("2026-11-07T22:20:00Z") }))).toBeNull();
  });
  it("goes dark with no proposals", async () => {
    expect((await closeShift(deps()))?.darkReason).toBe("no proposals");
  });
  it("goes dark when the spend guard would be crossed", async () => {
    await addProposal("first");
    await db.query("update shifts set cost_cents = 400");
    expect((await closeShift(deps()))?.darkReason).toBe("credit budget reached");
  });
  it("leaves out proposals that have failed twice", async () => {
    const first = await addProposal("first");
    await db.query("update proposals set failed_attempts = 2 where id = $1", [first]);
    expect((await closeShift(deps()))?.darkReason).toBe("no proposals");
  });
  it("records a close failure instead of throwing, once the shift is claimed", async () => {
    await addProposal("first");
    const broken: ChainReader = { ...fakeChain(), latestBlock: async () => { throw new Error("rpc down"); } };
    const input = await closeShift(deps({ chain: broken }));
    expect(input?.failure).toEqual({ stage: "close", reason: "rpc down" });
  });
  it("runs a rehearsal on its own shift and proposal, leaving the open shift alone", async () => {
    const input = await closeShift(deps({ now: new Date("2026-11-07T11:00:00Z"), trigger: { kind: "rehearsal", reason: "dry run", proposal: "A tip calculator", author: "0xABC" } }));
    expect(input?.shift.slug).toBe("r1");
    expect(input?.shift.label).toBe("rehearsal");
    expect(input?.tally?.entries[0]).toMatchObject({ text: "A tip calculator", seeded: true, author: "0xabc" });
    expect(input?.tally?.stakeMode).toBe("omitted");
    expect((await ensureOpenShift(db, AFTER)).slug).toBe("1");
  });
});
