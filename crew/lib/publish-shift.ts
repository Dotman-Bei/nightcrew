import { createTwoFilesPatch } from "diff";
import type { Db, Statement } from "@/lib/db";
import type { Attester } from "@/lib/eas";
import { assembleFloor } from "@/lib/floor-gate/assemble";
import { FloorSpec } from "@/lib/floor-gate/floor-spec";
import { buildReceipt, type ReceiptBundle, type ReceiptFailure, type ReceiptOutcome } from "@/lib/receipt";
import { CrewResult, ShiftInput, Transcript, Verdict } from "@/crew/lib/contracts";
import { CREW_SUPPORT_MODEL } from "@/crew/lib/triage";

/** Everything publish reads from other jobs, as untrusted text. Any of it may be missing. */
export type PublishWork = {
  shiftInput: string;
  crewResult: string | null;
  transcript: string | null;
  floorHtml: string | null;
  floorJson: string | null;
  verdict: string | null;
  screenshotWide: string | null;
  screenshotNarrow: string | null;
};

export type PublishDeps = {
  db: Db;
  attester: Attester | null;
  work: PublishWork;
  template: string;
  founder: string;
  now: Date;
};

export type PublishResult = { outcome: ReceiptOutcome; receiptHash: string; attested: number; pending: number; alreadyPublished: boolean };

function safeParse<T>(schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } }, text: string | null): T | null {
  if (text === null) return null;
  try {
    const result = schema.safeParse(JSON.parse(text));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

async function attestPending(db: Db, attester: Attester | null): Promise<{ attested: number; pending: number }> {
  const rows = await db.query<{ shift_id: number; bundle: string; receipt_hash: string }>(
    "select shift_id::int as shift_id, bundle, receipt_hash from receipts where attestation_status = 'pending' order by shift_id",
  );
  let attested = 0;
  for (const row of rows.rows) {
    if (!attester) continue;
    const bundle = JSON.parse(row.bundle) as ReceiptBundle;
    try {
      const { uid, tx } = await attester({
        receiptHash: row.receipt_hash,
        shift: bundle.shift.slug,
        outcome: bundle.outcome,
        transcriptHash: bundle.transcript_hash,
        floorHash: bundle.floor_hash,
        agentIdentity: bundle.agent_identity,
        modelProvider: bundle.model_provider,
        founder: bundle.founder_address,
        costCents: bundle.cost_cents,
      });
      await db.query("update receipts set attestation_status = 'attested', attestation_uid = $1, attestation_tx = $2 where shift_id = $3", [uid, tx, row.shift_id]);
      attested += 1;
    } catch (error) {
      console.error(`attestation failed for shift ${bundle.shift.slug}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { attested, pending: rows.rows.length - attested };
}

/** Treats every input as hostile data: validated, length-limited, and never executed. Idempotent per shift. */
export async function publishShift({ db, attester, work, template, founder, now }: PublishDeps): Promise<PublishResult> {
  const input = ShiftInput.parse(JSON.parse(work.shiftInput));
  const shiftId = input.shift.id;

  const existing = await db.query<{ receipt_hash: string; bundle: string }>("select receipt_hash, bundle from receipts where shift_id = $1", [shiftId]);
  if (existing.rows[0]) {
    const counts = await attestPending(db, attester);
    const bundle = JSON.parse(existing.rows[0].bundle) as ReceiptBundle;
    return { outcome: bundle.outcome, receiptHash: existing.rows[0].receipt_hash, ...counts, alreadyPublished: true };
  }

  const crew = safeParse(CrewResult, work.crewResult);
  const transcript = safeParse(Transcript, work.transcript);
  const verdict = safeParse(Verdict, work.verdict);
  const spec = safeParse(FloorSpec, work.floorJson);

  let outcome: ReceiptOutcome;
  let failure: ReceiptFailure | null = null;
  let darkReason: string | null = null;
  let assembled: ReturnType<typeof assembleFloor> | null = null;

  if (input.failure) {
    outcome = "failed";
    failure = input.failure;
  } else if (input.darkReason) {
    outcome = "dark";
    darkReason = input.darkReason;
  } else if (!crew) {
    outcome = "failed";
    failure = { stage: "build", reason: "The crew job did not finish." };
  } else if (crew.outcome === "dark") {
    outcome = "dark";
    darkReason = crew.darkReason;
  } else if (crew.outcome === "failed") {
    outcome = "failed";
    failure = crew.failure ?? { stage: "build", reason: "The crew job failed." };
  } else if (!verdict) {
    outcome = "failed";
    failure = { stage: "verify", reason: "The verify job did not finish." };
  } else if (!verdict.pass) {
    outcome = "failed";
    const details = [...verdict.static.map((item) => item.detail), ...verdict.violations.map((item) => `${item.kind}: ${item.detail}`), ...verdict.errors, ...verdict.floorJsonIssues, ...verdict.tests.filter((test) => !test.pass).map((test) => `test "${test.name}" failed`)];
    failure = { stage: "verify", reason: `The gate rejected the floor: ${details.slice(0, 5).join("; ")}`.slice(0, 500) };
  } else if (!work.floorHtml || !spec) {
    outcome = "failed";
    failure = { stage: "publish", reason: "The floor files are missing or malformed." };
  } else {
    assembled = assembleFloor(work.floorHtml, input.snapshot);
    if (assembled.hash !== verdict.floorHash) {
      outcome = "failed";
      failure = { stage: "publish", reason: "The assembled floor does not match what the gate verified." };
      assembled = null;
    } else {
      outcome = "shipped";
    }
  }

  const proposalEntry = crew?.proposalId != null ? input.tally?.entries.find((entry) => entry.proposalId === crew.proposalId) : undefined;
  const diff = outcome === "shipped" && work.floorHtml ? createTwoFilesPatch("blank-floor.html", "floor.html", template.replace(/\r\n/g, "\n"), work.floorHtml.replace(/\r\n/g, "\n")) : null;
  const costCents = crew?.costCents ?? 0;

  const receipt = buildReceipt(
    {
      shift: { slug: input.shift.slug, label: input.shift.label, closes_at: input.shift.closesAt, started_at: input.shift.startedAt, finished_at: now.toISOString(), snapshot_block: input.tally?.snapshotBlock ?? null },
      proposal: proposalEntry ? { id: proposalEntry.proposalId, text: proposalEntry.text, author: proposalEntry.author, seeded: proposalEntry.seeded } : null,
      outcome,
      failure,
      dark_reason: darkReason,
      models: crew?.models ?? { triage: CREW_SUPPORT_MODEL, build: null, review: null },
      founder_address: founder.toLowerCase(),
      cost_cents: costCents,
      timestamp: now.toISOString(),
    },
    {
      tally: input.tally ?? {},
      triage: crew?.triage ?? [],
      transcript: transcript ?? null,
      floorHtml: assembled?.html ?? null,
      diff,
      tests: verdict?.tests ?? null,
    },
  );

  const statements: Statement[] = [
    {
      sql: "update shifts set status = $2, finished_at = $3, snapshot_block = $4, tally = $5, build_model = $6, cost_cents = $7, failure_stage = $8, failure_reason = $9 where id = $1",
      params: [shiftId, outcome, now.toISOString(), input.tally?.snapshotBlock ?? null, JSON.stringify(input.tally ?? {}), crew?.models.build ?? null, costCents, failure?.stage ?? null, failure?.reason ?? darkReason],
    },
    {
      sql: "insert into receipts (shift_id, bundle, receipt_hash) values ($1, $2, $3)",
      params: [shiftId, receipt.bundleText, receipt.receiptHash],
    },
    ...Object.entries(receipt.parts).map(([part, content]) => ({ sql: "insert into receipt_parts (shift_id, part, content) values ($1, $2, $3)", params: [shiftId, part, content] })),
  ];

  if (outcome === "shipped" && assembled && spec) {
    statements.push({
      sql: "insert into floors (shift_id, name, one_liner, how_to_use, html, hash, script_hashes, screenshot_wide, screenshot_narrow) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      params: [shiftId, spec.name, spec.oneLiner, spec.howToUse, assembled.html, assembled.hash, assembled.scriptHashes, work.screenshotWide, work.screenshotNarrow],
    });
  }
  for (const decision of crew?.triage ?? []) {
    if (decision.decision === "reject") {
      statements.push({ sql: "update proposals set status = 'rejected', status_reason = $2, status_category = $3 where id = $1 and status = 'open'", params: [decision.proposalId, decision.reason, decision.category] });
    }
  }
  if (crew?.proposalId != null && input.shift.label !== "rehearsal") {
    if (outcome === "shipped") {
      statements.push({ sql: "update proposals set status = 'built', built_in = $2 where id = $1", params: [crew.proposalId, shiftId] });
    } else if (outcome === "failed") {
      statements.push({ sql: "update proposals set failed_attempts = failed_attempts + 1 where id = $1", params: [crew.proposalId] });
    }
  }
  await db.batch(statements);

  const counts = await attestPending(db, attester);
  return { outcome, receiptHash: receipt.receiptHash, ...counts, alreadyPublished: false };
}
