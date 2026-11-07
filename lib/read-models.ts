import { BUILD_WINDOW_CLOSE } from "@/lib/config";
import type { Db } from "@/lib/db";
import type { ReceiptBundle } from "@/lib/receipt";
import { ensureOpenShift, nextCloseAfter } from "@/lib/shifts";
import type { Tally } from "@/lib/tally";
import type { TranscriptEntry, TriageDecision } from "@/crew/lib/contracts";

const TOWER_ROWS = 10;

export type ProposalRow = { id: number; text: string; author: string; seeded: boolean; weight: string; wallets: number };

export type TowerRow =
  | { kind: "lit"; slug: string; name: string; oneLiner: string; costCents: number; day: string; label: string }
  | { kind: "dark"; slug: string; reason: string; day: string; label: string }
  | { kind: "tonight"; slug: string; closesAt: string; wallets: number }
  | { kind: "upcoming"; day: string }
  | { kind: "window-close"; at: string };

export type LatestFloor = {
  slug: string;
  name: string;
  oneLiner: string;
  day: string;
  costCents: number;
  proposal: { text: string; author: string; seeded: boolean } | null;
  weight: string;
  wallets: number;
  tests: { passed: number; total: number } | null;
  attestationUid: string | null;
};

export type TowerView = {
  open: { slug: string; closesAt: string };
  rows: TowerRow[];
  latest: LatestFloor | null;
  top: ProposalRow[];
  openCount: number;
  walletsTonight: number;
  floorsLit: number;
  lastCostCents: number | null;
};

type PublicShiftRow = {
  slug: string;
  label: string;
  status: string;
  closes_at: string;
  cost_cents: number;
  failure_reason: string | null;
  name: string | null;
  one_liner: string | null;
  floor_status: string | null;
  dark_reason: string | null;
  bundle: string | null;
  attestation_uid: string | null;
};

const iso = (value: string): string => new Date(value).toISOString();

/** Tonight's proposals by current estimate, in the order triage would read them. */
export async function rankedOpenProposals(db: Db, shiftSlug: string, limit: number, offset = 0, order: "ranked" | "newest" = "ranked"): Promise<ProposalRow[]> {
  const orderBy = order === "ranked" ? "coalesce(sum(v.weight_estimate), 0) desc, count(v.voter) desc, p.id asc" : "p.id desc";
  const result = await db.query<ProposalRow>(
    `select p.id::int as id, p.text, p.author, p.seeded,
            coalesce(sum(v.weight_estimate), 0)::text as weight, count(v.voter)::int as wallets
       from proposals p
       left join votes v on v.proposal_id = p.id and v.shift_id = (select id from shifts where slug = $1)
      where p.status = 'open' and p.failed_attempts < 2
      group by p.id
      order by ${orderBy}
      limit $2 offset $3`,
    [shiftSlug, limit, offset],
  );
  return result.rows;
}

async function countOpen(db: Db): Promise<number> {
  const result = await db.query<{ n: number }>("select count(*)::int as n from proposals where status = 'open' and failed_attempts < 2");
  return result.rows[0].n;
}

async function walletsFor(db: Db, shiftSlug: string): Promise<number> {
  const result = await db.query<{ n: number }>("select count(*)::int as n from votes v join shifts s on s.id = v.shift_id where s.slug = $1", [shiftSlug]);
  return result.rows[0].n;
}

/** The tower, newest at the top: empty floors to come, tonight, then every public shift. */
export function buildTowerRows(shifts: PublicShiftRow[], open: { slug: string; closesAt: string }, wallets: number): TowerRow[] {
  const past: TowerRow[] = [];
  const windowClose = new Date(BUILD_WINDOW_CLOSE).getTime();
  let windowMarked = false;
  for (const shift of shifts) {
    const closed = new Date(shift.closes_at).getTime();
    if (!windowMarked && closed <= windowClose) {
      if (past.length > 0) past.push({ kind: "window-close", at: BUILD_WINDOW_CLOSE });
      windowMarked = true;
    }
    const day = iso(shift.closes_at);
    if (shift.status === "shipped" && shift.floor_status === "lit") {
      past.push({ kind: "lit", slug: shift.slug, name: shift.name ?? "", oneLiner: shift.one_liner ?? "", costCents: shift.cost_cents, day, label: shift.label });
    } else {
      past.push({ kind: "dark", slug: shift.slug, reason: shift.dark_reason ?? shift.failure_reason ?? "Nothing shipped.", day, label: shift.label });
    }
  }
  const tonight: TowerRow = { kind: "tonight", slug: open.slug, closesAt: open.closesAt, wallets };
  const tonightIsBeforeClose = new Date(open.closesAt).getTime() <= windowClose;
  const lower: TowerRow[] = [tonight, ...(tonightIsBeforeClose && !windowMarked ? [{ kind: "window-close", at: BUILD_WINDOW_CLOSE } as TowerRow].slice(0, 0) : []), ...past];
  const upcoming: TowerRow[] = [];
  let close = new Date(open.closesAt);
  while (upcoming.length + lower.length < TOWER_ROWS) {
    close = nextCloseAfter(close);
    upcoming.unshift({ kind: "upcoming", day: close.toISOString() });
  }
  const rows = [...upcoming, ...lower];
  if (!rows.some((row) => row.kind === "window-close")) {
    const index = rows.findIndex((row) => {
      const when = row.kind === "upcoming" ? row.day : row.kind === "tonight" ? row.closesAt : row.kind === "window-close" ? row.at : row.day;
      return new Date(when).getTime() <= windowClose;
    });
    if (index > 0) rows.splice(index, 0, { kind: "window-close", at: BUILD_WINDOW_CLOSE });
  }
  return rows;
}

const PUBLIC_SHIFTS = `
  select s.slug, s.label, s.status, s.closes_at::text as closes_at, s.cost_cents, s.failure_reason,
         f.name, f.one_liner, f.status as floor_status, f.dark_reason, r.bundle, r.attestation_uid
    from shifts s
    left join floors f on f.shift_id = s.id
    left join receipts r on r.shift_id = s.id
   where s.label <> 'rehearsal' and s.status <> 'open'
   order by s.slug::int desc`;

export async function towerView(db: Db, now: Date): Promise<TowerView> {
  const openShift = await ensureOpenShift(db, now);
  const open = { slug: openShift.slug, closesAt: iso(openShift.closes_at) };
  const shifts = (await db.query<PublicShiftRow>(PUBLIC_SHIFTS)).rows;
  const wallets = await walletsFor(db, open.slug);
  const lit = shifts.filter((shift) => shift.status === "shipped" && shift.floor_status === "lit");
  let latest: LatestFloor | null = null;
  if (lit[0]) {
    const shift = lit[0];
    const bundle = shift.bundle ? (JSON.parse(shift.bundle) as ReceiptBundle) : null;
    const tally = (await db.query<{ tally: Tally | null }>("select tally from shifts where slug = $1", [shift.slug])).rows[0]?.tally ?? null;
    const entry = tally?.entries.find((item) => item.proposalId === bundle?.proposal?.id);
    latest = {
      slug: shift.slug,
      name: shift.name ?? "",
      oneLiner: shift.one_liner ?? "",
      day: iso(shift.closes_at),
      costCents: shift.cost_cents,
      proposal: bundle?.proposal ? { text: bundle.proposal.text, author: bundle.proposal.author, seeded: bundle.proposal.seeded } : null,
      weight: entry?.weight ?? "0",
      wallets: entry?.wallets ?? 0,
      tests: bundle?.tests ? { passed: bundle.tests.passed, total: bundle.tests.total } : null,
      attestationUid: shift.attestation_uid,
    };
  }
  return {
    open,
    rows: buildTowerRows(shifts, open, wallets),
    latest,
    top: await rankedOpenProposals(db, open.slug, 5),
    openCount: await countOpen(db),
    walletsTonight: wallets,
    floorsLit: lit.length,
    lastCostCents: shifts[0] ? shifts[0].cost_cents : null,
  };
}

export type ReceiptView = {
  slug: string;
  label: string;
  status: string;
  bundle: ReceiptBundle;
  receiptHash: string;
  attestationStatus: string;
  attestationUid: string | null;
  attestationTx: string | null;
  tally: Tally | null;
  triage: TriageDecision[];
  transcript: TranscriptEntry[];
  diff: string | null;
  tests: { name: string; pass: boolean; detail: string | null }[];
  floor: { name: string; oneLiner: string; status: string; darkReason: string | null } | null;
  parts: string[];
};

export async function receiptView(db: Db, slug: string): Promise<ReceiptView | null> {
  const row = (await db.query<{ id: number; label: string; status: string; tally: Tally | null; bundle: string; receipt_hash: string; attestation_status: string; attestation_uid: string | null; attestation_tx: string | null }>(
    `select s.id::int as id, s.label, s.status, s.tally, r.bundle, r.receipt_hash, r.attestation_status, r.attestation_uid, r.attestation_tx
       from shifts s join receipts r on r.shift_id = s.id where s.slug = $1`,
    [slug],
  )).rows[0];
  if (!row) return null;
  const parts = (await db.query<{ part: string; content: string }>("select part, content from receipt_parts where shift_id = $1 order by part", [row.id])).rows;
  const part = (name: string): string | null => parts.find((item) => item.part === name)?.content ?? null;
  const floor = (await db.query<{ name: string; one_liner: string; status: string; dark_reason: string | null }>("select name, one_liner, status, dark_reason from floors where shift_id = $1", [row.id])).rows[0];
  return {
    slug,
    label: row.label,
    status: row.status,
    bundle: JSON.parse(row.bundle) as ReceiptBundle,
    receiptHash: row.receipt_hash,
    attestationStatus: row.attestation_status,
    attestationUid: row.attestation_uid,
    attestationTx: row.attestation_tx,
    tally: row.tally && "entries" in row.tally ? row.tally : null,
    triage: JSON.parse(part("triage.json") ?? "[]") as TriageDecision[],
    transcript: JSON.parse(part("transcript.json") ?? "[]") as TranscriptEntry[],
    diff: part("diff.patch"),
    tests: JSON.parse(part("tests.json") ?? "[]") as { name: string; pass: boolean; detail: string | null }[],
    floor: floor ? { name: floor.name, oneLiner: floor.one_liner, status: floor.status, darkReason: floor.dark_reason } : null,
    parts: parts.map((item) => item.part),
  };
}

export type FloorView = {
  slug: string;
  label: string;
  status: string;
  day: string;
  floor: { name: string; oneLiner: string; howToUse: string; hash: string; status: string; darkReason: string | null } | null;
  reason: string | null;
};

export async function floorView(db: Db, slug: string): Promise<FloorView | null> {
  const row = (await db.query<{ label: string; status: string; closes_at: string; failure_reason: string | null; name: string | null; one_liner: string | null; how_to_use: string | null; hash: string | null; floor_status: string | null; dark_reason: string | null }>(
    `select s.label, s.status, s.closes_at::text as closes_at, s.failure_reason, f.name, f.one_liner, f.how_to_use, f.hash, f.status as floor_status, f.dark_reason
       from shifts s left join floors f on f.shift_id = s.id where s.slug = $1 and s.status <> 'open'`,
    [slug],
  )).rows[0];
  if (!row) return null;
  return {
    slug,
    label: row.label,
    status: row.status,
    day: iso(row.closes_at),
    floor: row.name && row.hash ? { name: row.name, oneLiner: row.one_liner ?? "", howToUse: row.how_to_use ?? "", hash: row.hash, status: row.floor_status ?? "lit", darkReason: row.dark_reason } : null,
    reason: row.failure_reason,
  };
}

export type VoteView = {
  open: { slug: string; closesAt: string };
  top: ProposalRow[];
  all: ProposalRow[];
  page: number;
  pageCount: number;
  openCount: number;
  walletsTonight: number;
};

export const PROPOSALS_PER_PAGE = 20;

export async function voteView(db: Db, now: Date, page: number): Promise<VoteView> {
  const openShift = await ensureOpenShift(db, now);
  const open = { slug: openShift.slug, closesAt: iso(openShift.closes_at) };
  const openCount = await countOpen(db);
  const pageCount = Math.max(1, Math.ceil(openCount / PROPOSALS_PER_PAGE));
  const current = Math.min(Math.max(1, page), pageCount);
  return {
    open,
    top: await rankedOpenProposals(db, open.slug, 5),
    all: await rankedOpenProposals(db, open.slug, PROPOSALS_PER_PAGE, (current - 1) * PROPOSALS_PER_PAGE, "newest"),
    page: current,
    pageCount,
    openCount,
    walletsTonight: await walletsFor(db, open.slug),
  };
}

export type RejectedRow = { kind: "triage" | "veto"; targetType: "proposal" | "floor"; text: string; reason: string; category: string | null; at: string };

export async function rejectedView(db: Db): Promise<RejectedRow[]> {
  const proposals = await db.query<{ text: string; status: string; status_reason: string | null; status_category: string | null; created_at: string }>(
    "select text, status, status_reason, status_category, created_at::text as created_at from proposals where status in ('rejected','vetoed') order by id desc",
  );
  const floors = await db.query<{ name: string; dark_reason: string | null; closes_at: string }>(
    "select f.name, f.dark_reason, s.closes_at::text as closes_at from floors f join shifts s on s.id = f.shift_id where f.status = 'vetoed' order by s.id desc",
  );
  return [
    ...floors.rows.map((row): RejectedRow => ({ kind: "veto", targetType: "floor", text: row.name, reason: row.dark_reason ?? "", category: null, at: iso(row.closes_at) })),
    ...proposals.rows.map((row): RejectedRow => ({ kind: row.status === "vetoed" ? "veto" : "triage", targetType: "proposal", text: row.text, reason: row.status_reason ?? "", category: row.status_category, at: iso(row.created_at) })),
  ];
}

export type BuiltView = { rehearsals: number; publicShifts: number; floorsLit: number; spentCents: number };

export async function builtView(db: Db): Promise<BuiltView> {
  const row = (await db.query<BuiltView>(
    `select count(*) filter (where label = 'rehearsal')::int as rehearsals,
            count(*) filter (where label <> 'rehearsal' and status <> 'open')::int as "publicShifts",
            count(*) filter (where label <> 'rehearsal' and status = 'shipped')::int as "floorsLit",
            coalesce(sum(cost_cents), 0)::int as "spentCents"
       from shifts`,
  )).rows[0];
  return row;
}
