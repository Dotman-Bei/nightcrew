import { z } from "zod";

const WEI_PER_VIBES = 10n ** 18n;

export const StakeMode = z.enum(["current-at-tally", "unavailable", "omitted"]);
export type StakeMode = z.infer<typeof StakeMode>;

export type StakeReader = (addresses: string[]) => Promise<{ staked: Map<string, bigint>; mode: StakeMode }>;

/** Used if the staking half of vote weight is cut: every stake counts as zero. */
export const noStakeReader: StakeReader = async () => ({ staked: new Map(), mode: "omitted" });

export const TallyEntry = z.object({
  proposalId: z.number(),
  text: z.string(),
  author: z.string(),
  seeded: z.boolean(),
  weight: z.string(),
  wallets: z.number(),
});
export type TallyEntry = z.infer<typeof TallyEntry>;

export const VoterRecord = z.object({
  address: z.string(),
  proposalId: z.number(),
  held: z.string(),
  staked: z.string(),
  weight: z.string(),
});
export type VoterRecord = z.infer<typeof VoterRecord>;

export const Tally = z.object({
  snapshotBlock: z.string().nullable(),
  closedAt: z.string(),
  stakeMode: StakeMode,
  entries: z.array(TallyEntry),
  voters: z.array(VoterRecord),
});
export type Tally = z.infer<typeof Tally>;

/** max(1, whole $VIBES held plus staked). A wallet with none still counts at minimal weight. */
export function voteWeight(held: bigint, staked: bigint): bigint {
  const whole = (held + staked) / WEI_PER_VIBES;
  return whole < 1n ? 1n : whole;
}

export type TallyInput = {
  proposals: { id: number; text: string; author: string; seeded: boolean }[];
  votes: { voter: string; proposalId: number }[];
  held: Map<string, bigint>;
  staked: Map<string, bigint>;
  stakeMode: StakeMode;
  snapshotBlock: string | null;
  closedAt: string;
};

/** Ranks weight descending, then wallets descending, then oldest proposal first. */
export function computeTally(input: TallyInput): Tally {
  const open = new Map(input.proposals.map((proposal) => [proposal.id, proposal]));
  const totals = new Map<number, { weight: bigint; wallets: number }>();
  const voters: VoterRecord[] = [];
  for (const vote of input.votes) {
    if (!open.has(vote.proposalId)) continue;
    const held = input.held.get(vote.voter) ?? 0n;
    const staked = input.staked.get(vote.voter) ?? 0n;
    const weight = voteWeight(held, staked);
    const total = totals.get(vote.proposalId) ?? { weight: 0n, wallets: 0 };
    totals.set(vote.proposalId, { weight: total.weight + weight, wallets: total.wallets + 1 });
    voters.push({ address: vote.voter, proposalId: vote.proposalId, held: held.toString(), staked: staked.toString(), weight: weight.toString() });
  }
  const entries = input.proposals
    .map((proposal) => {
      const total = totals.get(proposal.id) ?? { weight: 0n, wallets: 0 };
      return { proposalId: proposal.id, text: proposal.text, author: proposal.author, seeded: proposal.seeded, weight: total.weight, wallets: total.wallets };
    })
    .sort((a, b) => {
      if (a.weight !== b.weight) return a.weight > b.weight ? -1 : 1;
      if (a.wallets !== b.wallets) return b.wallets - a.wallets;
      return a.proposalId - b.proposalId;
    })
    .map((entry) => ({ ...entry, weight: entry.weight.toString() }));
  return { snapshotBlock: input.snapshotBlock, closedAt: input.closedAt, stakeMode: input.stakeMode, entries, voters };
}
