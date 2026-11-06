import type { ChainReader } from "@/lib/chain";
import { findSnapshotBlock } from "@/lib/chain";
import type { Db } from "@/lib/db";
import { claimOffSchedule, claimScheduled, createRehearsal, ensureOpenShift, spentCents } from "@/lib/shifts";
import { computeTally, type StakeReader, type Tally } from "@/lib/tally";
import type { Shift } from "@/lib/types";
import type { ShiftInput } from "@/crew/lib/contracts";

export type Trigger =
  | { kind: "scheduled" }
  | { kind: "off-schedule"; reason: string }
  | { kind: "rehearsal"; reason: string; proposal: string; author: string };

export type CloseDeps = {
  db: Db;
  chain: ChainReader;
  stakes: StakeReader;
  floorData: () => Promise<string>;
  now: Date;
  trigger: Trigger;
  capCents: number;
  totalBudgetCents: number;
};

type OpenProposal = { id: number; text: string; author: string; seeded: boolean };

async function publicTally(db: Db, chain: ChainReader, stakes: StakeReader, shift: Shift): Promise<Tally> {
  const proposals = await db.query<OpenProposal>(
    "select id::int as id, text, author, seeded from proposals where status = 'open' and failed_attempts < 2 order by id",
  );
  const votes = await db.query<{ voter: string; proposalId: number }>(
    'select voter, proposal_id::int as "proposalId" from votes where shift_id = $1',
    [shift.id],
  );
  const closesAt = new Date(shift.closes_at);
  const snapshotBlock = await findSnapshotBlock(chain, BigInt(Math.floor(closesAt.getTime() / 1000)));
  const voters = votes.rows.map((vote) => vote.voter);
  const held = await chain.heldAt(voters, snapshotBlock);
  const { staked, mode } = await stakes(voters);
  return computeTally({
    proposals: proposals.rows,
    votes: votes.rows,
    held,
    staked,
    stakeMode: mode,
    snapshotBlock: snapshotBlock.toString(),
    closedAt: closesAt.toISOString(),
  });
}

/** The close job. Returns null when there was nothing to claim. */
export async function closeShift(deps: CloseDeps): Promise<ShiftInput | null> {
  const { db, chain, stakes, floorData, now, trigger, capCents, totalBudgetCents } = deps;
  let shift: Shift | null;
  let rehearsalProposal: OpenProposal | null = null;
  if (trigger.kind === "scheduled") {
    shift = await claimScheduled(db, now);
  } else if (trigger.kind === "off-schedule") {
    shift = await claimOffSchedule(db, now, trigger.reason);
  } else {
    const created = await createRehearsal(db, now, trigger.reason, trigger.proposal, trigger.author);
    shift = created.shift;
    rehearsalProposal = { id: created.proposalId, text: trigger.proposal, author: trigger.author.toLowerCase(), seeded: true };
  }
  if (!shift) return null;
  await ensureOpenShift(db, now);

  const base = {
    shift: { id: shift.id, slug: shift.slug, label: shift.label, closesAt: new Date(shift.closes_at).toISOString(), startedAt: now.toISOString() },
  };
  try {
    const snapshot = await floorData();
    const tally = rehearsalProposal
      ? computeTally({ proposals: [rehearsalProposal], votes: [], held: new Map(), staked: new Map(), stakeMode: "omitted", snapshotBlock: null, closedAt: now.toISOString() })
      : await publicTally(db, chain, stakes, shift);
    const spent = await spentCents(db);
    let darkReason: string | null = null;
    if (spent + capCents > totalBudgetCents) darkReason = "credit budget reached";
    else if (tally.entries.length === 0) darkReason = "no proposals";
    return { ...base, tally, snapshot, darkReason, failure: null };
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 400) : "the close job failed";
    return { ...base, tally: null, snapshot: "{}", darkReason: null, failure: { stage: "close", reason } };
  }
}
