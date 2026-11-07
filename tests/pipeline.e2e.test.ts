import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import type { ChainReader } from "@/lib/chain";
import { memoryDb, type Db } from "@/lib/db";
import type { Attester } from "@/lib/eas";
import { insertProposal } from "@/lib/proposals";
import { ensureOpenShift } from "@/lib/shifts";
import type { ShiftInput } from "@/crew/lib/contracts";
import { closeShift, type Trigger } from "@/crew/lib/close-shift";
import { crewShift, type CrewOutput } from "@/crew/lib/crew-shift";
import type { StructuredModel } from "@/crew/lib/model";
import { publishShift, type PublishWork } from "@/crew/lib/publish-shift";
import type { BuildResult, CrewRuntime } from "@/crew/lib/runtime";
import { verifyFloor, type VerifyOutput } from "@/crew/lib/verify-floor";
import { launchChrome } from "./helpers/chrome";

const GOOD_HTML = readFileSync("tests/fixtures/good-floor/index.html", "utf8");
const GOOD_JSON = readFileSync("tests/fixtures/good-floor/floor.json", "utf8");
const TEMPLATE = readFileSync("floor-kit/template.html", "utf8");
const FOUNDER = "0x0000000000000000000000000000000000000001";
const AFTER_CLOSE = new Date("2026-11-07T22:04:00Z");
const closeSeconds = BigInt(new Date("2026-11-07T22:00:00Z").getTime() / 1000);

const chain: ChainReader = {
  latestBlock: async () => ({ number: 1040n, timestamp: closeSeconds + 80n }),
  blockAt: async (number) => ({ number, timestamp: closeSeconds + (number - 1000n) * 2n }),
  heldAt: async (addresses) => new Map(addresses.map((address) => [address, 5n * 10n ** 18n])),
};

const smartModel = (rejectAll = false): StructuredModel => async ({ schema }) => {
  const isTriage = JSON.stringify(schema).includes("buildBrief");
  if (isTriage) {
    return rejectAll
      ? { value: { decision: "reject", category: "needs-backend", reason: "Needs a server.", buildBrief: null }, refused: false, costCents: 0.1 }
      : { value: { decision: "accept", category: "ok", reason: "A small tool.", buildBrief: "Build a tip calculator." }, refused: false, costCents: 0.1 };
  }
  return { value: { decision: "ship", reasons: [] }, refused: false, costCents: 0.2 };
};

const runtimeWith = (result: Partial<BuildResult>): CrewRuntime => {
  const build: BuildResult = { sessionId: "sesn_1", status: "done", reason: null, html: GOOD_HTML, floorJson: GOOD_JSON, transcript: [{ at: "t", kind: "message", tool: null, text: "built", truncated: false, isError: false }], costCents: 33, ...result };
  return { build: async () => build, sendBack: async () => build };
};

const okAttester: Attester = async () => ({ uid: "0xuid", tx: "0xtx" });

async function runClose(db: Db, trigger: Trigger = { kind: "scheduled" }, now = AFTER_CLOSE): Promise<ShiftInput> {
  const input = await closeShift({ db, chain, stakes: async () => ({ staked: new Map(), mode: "current-at-tally" }), floorData: async () => '{"totalStaked":"1"}', now, trigger, capCents: 60, totalBudgetCents: 450 });
  if (!input) throw new Error("nothing claimed");
  return input;
}

const runCrew = (input: ShiftInput, model: StructuredModel, runtime: CrewRuntime): Promise<CrewOutput> =>
  crewShift({ input, model, runtime, kitFiles: [], buildModel: "anthropic/claude-sonnet-5.5" });

function workFrom(input: ShiftInput, crew: CrewOutput | null, verify: VerifyOutput | null): PublishWork {
  return {
    shiftInput: JSON.stringify(input),
    crewResult: crew ? JSON.stringify(crew.result) : null,
    transcript: crew ? JSON.stringify(crew.transcript) : null,
    floorHtml: crew?.html ?? null,
    floorJson: crew?.floorJson ?? null,
    verdict: verify ? JSON.stringify(verify.verdict) : null,
    screenshotWide: verify?.screenshots?.wide ?? null,
    screenshotNarrow: verify?.screenshots?.narrow ?? null,
  };
}

const publish = (db: Db, work: PublishWork, attester: Attester | null = okAttester) => publishShift({ db, attester, work, template: TEMPLATE, founder: FOUNDER, now: AFTER_CLOSE });

const shiftRow = async (db: Db, slug: string) => (await db.query<Record<string, unknown>>("select * from shifts where slug = $1", [slug])).rows[0];
const receiptRow = async (db: Db, id: unknown) => (await db.query<Record<string, unknown>>("select * from receipts where shift_id = $1", [id])).rows[0];
const partNames = async (db: Db, id: unknown) => (await db.query<{ part: string }>("select part from receipt_parts where shift_id = $1 order by part", [id])).rows.map((row) => row.part);

describe("a whole shift, with a fake crew and a fake chain", () => {
  let db: Db;
  let shiftId: number;

  beforeEach(async () => {
    db = await memoryDb();
    shiftId = (await ensureOpenShift(db, new Date("2026-11-07T10:00:00Z"))).id;
  });
  const propose = (text: string) => insertProposal(db, { text, author: "0xauthor", shiftId, seeded: false, signature: "s", signedAt: "2026-11-07T10:00:00Z" });

  it("ships a floor: close, crew, verify, publish", async () => {
    const proposalId = await insertProposal(db, { text: "A tip calculator", author: "0xauthor", shiftId, seeded: true, signature: null, signedAt: null });
    await db.query("insert into votes (shift_id, voter, proposal_id, signature, signed_at) values ($1, '0xvoter', $2, 's', now())", [shiftId, proposalId]);

    const input = await runClose(db);
    const crew = await runCrew(input, smartModel(), runtimeWith({}));
    expect(crew.result.outcome).toBe("built");
    const verify = await verifyFloor(crew.html ?? "", crew.floorJson ?? "", input.snapshot, launchChrome);
    expect(verify.verdict.pass).toBe(true);
    const result = await publish(db, workFrom(input, crew, verify));

    expect(result).toMatchObject({ outcome: "shipped", attested: 1, pending: 0 });
    const shift = await shiftRow(db, "1");
    expect(shift.status).toBe("shipped");
    expect(shift.cost_cents).toBe(34);
    expect(shift.build_model).toBe("anthropic/claude-sonnet-5.5");
    const floor = (await db.query<Record<string, unknown>>("select * from floors where shift_id = $1", [shift.id])).rows[0];
    expect(floor.name).toBe("Tip calculator");
    expect(String(floor.html)).toContain('"totalStaked":"1"');
    expect(String(floor.screenshot_wide).length).toBeGreaterThan(1000);
    const receipt = await receiptRow(db, shift.id);
    expect(receipt.attestation_status).toBe("attested");
    expect(receipt.attestation_uid).toBe("0xuid");
    const bundle = JSON.parse(String(receipt.bundle));
    expect(bundle.outcome).toBe("shipped");
    expect(bundle.tests).toMatchObject({ passed: 3, total: 3 });
    expect(bundle.proposal.text).toBe("A tip calculator");
    expect(await partNames(db, shift.id)).toEqual(["bundle.json", "diff.patch", "floor.html", "tally.json", "tests.json", "transcript.json", "triage.json"]);
    const proposal = (await db.query<Record<string, unknown>>("select status from proposals where id = $1", [proposalId])).rows[0];
    expect(proposal.status).toBe("built");
  });

  it("goes dark with no inference when there are no proposals", async () => {
    const input = await runClose(db);
    expect(input.darkReason).toBe("no proposals");
    const result = await publish(db, workFrom(input, null, null));
    expect(result.outcome).toBe("dark");
    const shift = await shiftRow(db, "1");
    expect(shift.status).toBe("dark");
    expect(shift.failure_reason).toBe("no proposals");
    expect(shift.cost_cents).toBe(0);
  });

  it("goes dark when every proposal is rejected, and publishes each reason", async () => {
    const id = await propose("A thing that needs a server");
    const input = await runClose(db);
    const crew = await runCrew(input, smartModel(true), runtimeWith({}));
    const result = await publish(db, workFrom(input, crew, null));
    expect(result.outcome).toBe("dark");
    const proposal = (await db.query<Record<string, unknown>>("select status, status_reason, status_category from proposals where id = $1", [id])).rows[0];
    expect(proposal).toEqual({ status: "rejected", status_reason: "Needs a server.", status_category: "needs-backend" });
  });

  it("publishes a failed build like a passed one, keeps the proposal open and counts the attempt", async () => {
    const id = await propose("A tip calculator");
    const input = await runClose(db);
    const crew = await runCrew(input, smartModel(), runtimeWith({ status: "budget", reason: "spend cap reached", html: null, floorJson: null }));
    const result = await publish(db, workFrom(input, crew, null));
    expect(result).toMatchObject({ outcome: "failed", attested: 1 });
    const shift = await shiftRow(db, "1");
    expect(shift).toMatchObject({ status: "failed", failure_stage: "build", failure_reason: "spend cap reached", cost_cents: 34 });
    const receipt = await receiptRow(db, shift.id);
    expect(JSON.parse(String(receipt.bundle)).failure).toEqual({ stage: "build", reason: "spend cap reached" });
    expect((await db.query<Record<string, unknown>>("select status, failed_attempts from proposals where id = $1", [id])).rows[0]).toEqual({ status: "open", failed_attempts: 1 });
  });

  it("fails at stage verify when the gate rejects the floor, and names why on the receipt", async () => {
    await propose("A tip calculator");
    const input = await runClose(db);
    const hostile = GOOD_HTML.replace("function work()", 'document.location = "/evil"; function work()');
    const crew = await runCrew(input, smartModel(), runtimeWith({ html: hostile }));
    const verify = await verifyFloor(crew.html ?? "", crew.floorJson ?? "", input.snapshot, launchChrome);
    expect(verify.verdict.pass).toBe(false);
    const result = await publish(db, workFrom(input, crew, verify));
    expect(result.outcome).toBe("failed");
    const shift = await shiftRow(db, "1");
    expect(shift.failure_stage).toBe("verify");
    expect(String(shift.failure_reason)).toContain("navigate");
    expect((await db.query("select * from floors where shift_id = $1", [shift.id])).rows).toEqual([]);
  });

  it("refuses to ship if the floor changed after verify", async () => {
    await propose("A tip calculator");
    const input = await runClose(db);
    const crew = await runCrew(input, smartModel(), runtimeWith({}));
    const verify = await verifyFloor(crew.html ?? "", crew.floorJson ?? "", input.snapshot, launchChrome);
    const tampered = { ...workFrom(input, crew, verify), floorHtml: GOOD_HTML.replace("Tip calculator", "Tampered") };
    const result = await publish(db, tampered);
    expect(result.outcome).toBe("failed");
    expect((await shiftRow(db, "1")).failure_stage).toBe("publish");
  });

  it("publishes a failure when the crew job never wrote its result", async () => {
    await propose("A tip calculator");
    const input = await runClose(db);
    const result = await publish(db, workFrom(input, null, null));
    expect(result.outcome).toBe("failed");
    expect((await shiftRow(db, "1")).failure_reason).toBe("The crew job did not finish.");
  });

  it("treats malformed job output as missing rather than trusting it", async () => {
    await propose("A tip calculator");
    const input = await runClose(db);
    const result = await publish(db, { ...workFrom(input, null, null), crewResult: '{"outcome":"built","extra":"<script>"}' });
    expect(result.outcome).toBe("failed");
  });

  it("keeps the shift when attesting fails, and retries on the next publish", async () => {
    await propose("A tip calculator");
    const input = await runClose(db);
    const crew = await runCrew(input, smartModel(), runtimeWith({}));
    const verify = await verifyFloor(crew.html ?? "", crew.floorJson ?? "", input.snapshot, launchChrome);
    const broken: Attester = async () => { throw new Error("no gas"); };
    const first = await publish(db, workFrom(input, crew, verify), broken);
    expect(first).toMatchObject({ outcome: "shipped", attested: 0, pending: 1 });
    const shift = await shiftRow(db, "1");
    expect((await receiptRow(db, shift.id)).attestation_status).toBe("pending");
    const second = await publish(db, workFrom(input, crew, verify));
    expect(second).toMatchObject({ alreadyPublished: true, attested: 1, pending: 0 });
    expect((await receiptRow(db, shift.id)).attestation_status).toBe("attested");
  });

  it("is safe to re-run: nothing is written twice", async () => {
    await propose("A tip calculator");
    const input = await runClose(db);
    const crew = await runCrew(input, smartModel(), runtimeWith({}));
    const verify = await verifyFloor(crew.html ?? "", crew.floorJson ?? "", input.snapshot, launchChrome);
    const first = await publish(db, workFrom(input, crew, verify));
    const second = await publish(db, workFrom(input, crew, verify));
    expect(second.alreadyPublished).toBe(true);
    expect(second.receiptHash).toBe(first.receiptHash);
  });

  it("runs a rehearsal on its own slug and leaves public shift numbers alone", async () => {
    const input = await runClose(db, { kind: "rehearsal", reason: "dry run", proposal: "A tip calculator", author: FOUNDER }, new Date("2026-11-07T11:00:00Z"));
    const crew = await runCrew(input, smartModel(), runtimeWith({}));
    const verify = await verifyFloor(crew.html ?? "", crew.floorJson ?? "", input.snapshot, launchChrome);
    const result = await publish(db, workFrom(input, crew, verify));
    expect(result.outcome).toBe("shipped");
    expect((await shiftRow(db, "r1")).label).toBe("rehearsal");
    expect((await ensureOpenShift(db, AFTER_CLOSE)).slug).toBe("1");
  });
});
