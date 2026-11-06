import { describe, expect, it } from "vitest";
import { findSnapshotBlock, type ChainReader } from "@/lib/chain";
import { computeTally, voteWeight } from "@/lib/tally";

const VIBES = 10n ** 18n;
const CLOSE = new Date("2026-11-07T22:00:00Z");
const closeSeconds = BigInt(CLOSE.getTime() / 1000);

/** One block every 2 seconds, block 1000 at the close, with block 1040 the latest. */
function fakeChain(held: Record<string, bigint> = {}): ChainReader {
  return {
    latestBlock: async () => ({ number: 1040n, timestamp: closeSeconds + 80n }),
    blockAt: async (number) => ({ number, timestamp: closeSeconds + (number - 1000n) * 2n }),
    heldAt: async (addresses) => new Map(addresses.map((address) => [address, held[address] ?? 0n])),
  };
}

describe("voteWeight", () => {
  it("counts whole $VIBES held plus staked", () => {
    expect(voteWeight(5n * VIBES, 2n * VIBES)).toBe(7n);
  });
  it("gives a wallet with nothing a weight of 1", () => {
    expect(voteWeight(0n, 0n)).toBe(1n);
    expect(voteWeight(VIBES / 2n, 0n)).toBe(1n);
  });
});

describe("computeTally", () => {
  const proposals = [
    { id: 1, text: "old", author: "0xa", seeded: true },
    { id: 2, text: "new", author: "0xb", seeded: false },
    { id: 3, text: "newest", author: "0xc", seeded: false },
  ];
  const base = { proposals, staked: new Map<string, bigint>(), stakeMode: "current-at-tally" as const, snapshotBlock: "9", closedAt: "t" };

  it("ranks by weight, then wallets, then oldest", () => {
    const tally = computeTally({
      ...base,
      votes: [{ voter: "0x1", proposalId: 3 }, { voter: "0x2", proposalId: 2 }, { voter: "0x3", proposalId: 2 }],
      held: new Map([["0x1", 2n * VIBES], ["0x2", VIBES], ["0x3", VIBES]]),
    });
    expect(tally.entries.map((entry) => entry.proposalId)).toEqual([2, 3, 1]);
    expect(tally.entries[0]).toMatchObject({ weight: "2", wallets: 2 });
  });
  it("puts a flood of zero-vote proposals behind anything with votes, oldest first", () => {
    const tally = computeTally({ ...base, votes: [{ voter: "0x1", proposalId: 3 }], held: new Map() });
    expect(tally.entries.map((entry) => entry.proposalId)).toEqual([3, 1, 2]);
  });
  it("keeps the oldest first when nobody voted", () => {
    expect(computeTally({ ...base, votes: [], held: new Map() }).entries.map((entry) => entry.proposalId)).toEqual([1, 2, 3]);
  });
  it("ignores a vote for a proposal that is no longer open", () => {
    const tally = computeTally({ ...base, votes: [{ voter: "0x1", proposalId: 99 }], held: new Map() });
    expect(tally.voters).toEqual([]);
  });
});

describe("findSnapshotBlock", () => {
  it("finds the last block at or before the close", async () => {
    expect(await findSnapshotBlock(fakeChain(), closeSeconds)).toBe(1000n);
    expect(await findSnapshotBlock(fakeChain(), closeSeconds + 1n)).toBe(1000n);
    expect(await findSnapshotBlock(fakeChain(), closeSeconds + 3n)).toBe(1001n);
  });
  it("returns the latest block when the target is ahead of it", async () => {
    expect(await findSnapshotBlock(fakeChain(), closeSeconds + 1000n)).toBe(1040n);
  });
  it("copes with blocks far from the two-second estimate", async () => {
    const slow: ChainReader = {
      latestBlock: async () => ({ number: 1000n, timestamp: closeSeconds + 5000n }),
      blockAt: async (number) => ({ number, timestamp: closeSeconds + (number - 500n) * 10n }),
      heldAt: async () => new Map(),
    };
    expect(await findSnapshotBlock(slow, closeSeconds)).toBe(500n);
  });
});
