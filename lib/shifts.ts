import type { Db } from "@/lib/db";
import type { Shift } from "@/lib/types";

const SHIFT_COLUMNS = "id::int as id, slug, label, status, closes_at::text as closes_at, started_at::text as started_at, finished_at::text as finished_at, reason, snapshot_block::text as snapshot_block, cost_cents, failure_stage, failure_reason";

/** The next 22:00 UTC strictly after `now`. */
export function nextCloseAfter(now: Date): Date {
  const close = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 22, 0, 0, 0));
  if (close.getTime() <= now.getTime()) close.setUTCDate(close.getUTCDate() + 1);
  return close;
}

async function nextPublicSlug(db: Db): Promise<string> {
  const result = await db.query<{ next: number }>("select coalesce(max(slug::int), 0)::int + 1 as next from shifts where label <> 'rehearsal'");
  return String(result.rows[0].next);
}

export async function getOpenShift(db: Db): Promise<Shift | null> {
  const result = await db.query<Shift>(`select ${SHIFT_COLUMNS} from shifts where status = 'open'`);
  return result.rows[0] ?? null;
}

/** There is always exactly one open shift. Creates it when none exists. */
export async function ensureOpenShift(db: Db, now: Date): Promise<Shift> {
  const existing = await getOpenShift(db);
  if (existing) return existing;
  const slug = await nextPublicSlug(db);
  const result = await db.query<Shift>(
    `insert into shifts (slug, label, status, closes_at) values ($1, 'scheduled', 'open', $2) returning ${SHIFT_COLUMNS}`,
    [slug, nextCloseAfter(now).toISOString()],
  );
  return result.rows[0];
}

/** Claims the open shift if its close has passed. Returns null when there is nothing to claim. */
export async function claimScheduled(db: Db, now: Date): Promise<Shift | null> {
  const result = await db.query<Shift>(
    `update shifts set status = 'closed', started_at = $1 where status = 'open' and closes_at <= $1 returning ${SHIFT_COLUMNS}`,
    [now.toISOString()],
  );
  return result.rows[0] ?? null;
}

/** Closes the open shift now and labels it off-schedule. */
export async function claimOffSchedule(db: Db, now: Date, reason: string): Promise<Shift | null> {
  const result = await db.query<Shift>(
    `update shifts set status = 'closed', label = 'off-schedule', reason = $2, closes_at = $1, started_at = $1 where status = 'open' returning ${SHIFT_COLUMNS}`,
    [now.toISOString(), reason],
  );
  return result.rows[0] ?? null;
}

/** A rehearsal never touches the open shift. It gets its own shift and seeded proposal. */
export async function createRehearsal(db: Db, now: Date, reason: string, proposalText: string, author: string): Promise<{ shift: Shift; proposalId: number }> {
  const count = await db.query<{ n: number }>("select count(*)::int as n from shifts where label = 'rehearsal'");
  const slug = `r${count.rows[0].n + 1}`;
  const shift = await db.query<Shift>(
    `insert into shifts (slug, label, status, closes_at, started_at, reason) values ($1, 'rehearsal', 'closed', $2, $2, $3) returning ${SHIFT_COLUMNS}`,
    [slug, now.toISOString(), reason],
  );
  const proposal = await db.query<{ id: number }>(
    `insert into proposals (text, normalised, author, seeded, status, shift_opened) values ($1, $2, $3, true, 'built', $4) returning id::int as id`,
    [proposalText, `rehearsal:${slug}`, author.toLowerCase(), shift.rows[0].id],
  );
  return { shift: shift.rows[0], proposalId: proposal.rows[0].id };
}

export async function spentCents(db: Db): Promise<number> {
  const result = await db.query<{ total: number }>("select coalesce(sum(cost_cents), 0)::int as total from shifts");
  return result.rows[0].total;
}
