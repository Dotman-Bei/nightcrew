import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { DemandStrip } from "@/components/demand-strip";
import { memoryDb, type Db } from "@/lib/db";
import { demandView } from "@/lib/demand";
import { insertProposal } from "@/lib/proposals";
import { createRehearsal, ensureOpenShift } from "@/lib/shifts";

const NOW = new Date("2026-11-07T10:00:00Z");
const BUILDER = "0x00000000000000000000000000000000000000f0";
const ALICE = "0xaaaa00000000000000000000000000000000aaaa";
const BOB = "0xbbbb00000000000000000000000000000000bbbb";

describe("live demand", () => {
  let db: Db;
  let shiftId: number;
  const vote = (shift: number, voter: string, proposalId: number) =>
    db.query("insert into votes (shift_id, voter, proposal_id, signature, signed_at, weight_estimate) values ($1, $2, $3, 's', now(), 1)", [shift, voter, proposalId]);

  beforeEach(async () => {
    db = await memoryDb();
    shiftId = (await ensureOpenShift(db, NOW)).id;
  });

  it("is zero on an empty database", async () => {
    expect(await demandView(db)).toEqual({ wallets: 0, votes: 0, walletProposals: 0, seededProposals: 0, waitlist: 0 });
  });

  it("counts each wallet once, keeps seeded proposals apart and leaves rehearsals out", async () => {
    const seeded = await insertProposal(db, { text: "A seeded tool", author: BUILDER, shiftId, seeded: true, signature: null, signedAt: null });
    await insertProposal(db, { text: "Another seeded tool", author: BUILDER, shiftId, seeded: true, signature: null, signedAt: null });
    const own = await insertProposal(db, { text: "A wallet's own tool", author: ALICE, shiftId, seeded: false, signature: "0xsig", signedAt: NOW.toISOString() });
    await vote(shiftId, ALICE, own);
    await vote(shiftId, BOB, seeded);
    const rehearsal = await createRehearsal(db, NOW, "rehearsal", "A rehearsal tool", "0xcccc00000000000000000000000000000000cccc");
    await vote(rehearsal.shift.id, "0xdddd00000000000000000000000000000000dddd", rehearsal.proposalId);
    await db.query("insert into waitlist (community, contact) values ($1, $2)", ["A community", "someone@example.com"]);
    expect(await demandView(db)).toEqual({ wallets: 2, votes: 2, walletProposals: 1, seededProposals: 2, waitlist: 1 });
  });

  it("shows zero as zero and labels seeded proposals as seeded", () => {
    const html = renderToStaticMarkup(createElement(DemandStrip, { demand: { wallets: 0, votes: 0, walletProposals: 0, seededProposals: 8, waitlist: 0 } }));
    expect(html).toContain("<dt>Wallets that voted or proposed</dt><dd>0</dd>");
    expect(html).toContain("<dt>Votes signed</dt><dd>0</dd>");
    expect(html).toContain("<dt>Proposals from wallets</dt><dd>0</dd>");
    expect(html).toContain("<dt>Seeded proposals</dt><dd>8</dd>");
    expect(html).toContain("<dt>Waitlist signups</dt><dd>0</dd>");
  });

  it("is on the home page, read from the database, cached and wallet-free", () => {
    const page = readFileSync("app/page.tsx", "utf8");
    expect(page).toContain("const demand = await demandView(db);");
    expect(page).toContain("<DemandStrip demand={demand} />");
    expect(page).toContain("export const revalidate = 30;");
    expect(readFileSync("components/demand-strip.tsx", "utf8")).not.toMatch(/use client|wagmi|wallet-root/);
  });
});
