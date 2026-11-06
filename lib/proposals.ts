import type { Db } from "@/lib/db";

/** Case and whitespace do not make a proposal new. */
export function normaliseProposal(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

export type InsertProposal = {
  text: string;
  author: string;
  shiftId: number;
  seeded: boolean;
  signature: string | null;
  signedAt: string | null;
};

export async function insertProposal(db: Db, proposal: InsertProposal): Promise<number> {
  const result = await db.query<{ id: number }>(
    "insert into proposals (text, normalised, author, seeded, signature, signed_at, shift_opened) values ($1, $2, $3, $4, $5, $6, $7) returning id::int as id",
    [proposal.text.trim(), normaliseProposal(proposal.text), proposal.author.toLowerCase(), proposal.seeded, proposal.signature, proposal.signedAt, proposal.shiftId],
  );
  return result.rows[0].id;
}
