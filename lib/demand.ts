import type { Db } from "@/lib/db";

export type DemandView = { wallets: number; votes: number; walletProposals: number; seededProposals: number; waitlist: number };

// One round trip. Rehearsal shifts are left out, as on the tower. Addresses are stored in lower case.
const DEMAND = `
  with public_shifts as (select id from shifts where label <> 'rehearsal'),
       cast_votes as (select voter from votes where shift_id in (select id from public_shifts)),
       wallet_proposals as (select author from proposals where seeded = false and shift_opened in (select id from public_shifts))
  select (select count(*)::int from (select voter from cast_votes union select author from wallet_proposals) as wallets) as wallets,
         (select count(*)::int from cast_votes) as votes,
         (select count(*)::int from wallet_proposals) as "walletProposals",
         (select count(*)::int from proposals where seeded = true and shift_opened in (select id from public_shifts)) as "seededProposals",
         (select count(*)::int from waitlist) as waitlist`;

/** Real counts of who has taken part. Every number comes from the database, and zero stays zero. */
export async function demandView(db: Db): Promise<DemandView> {
  const row = (await db.query<DemandView>(DEMAND)).rows[0];
  return { wallets: row.wallets, votes: row.votes, walletProposals: row.walletProposals, seededProposals: row.seededProposals, waitlist: row.waitlist };
}
