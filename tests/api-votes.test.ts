import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { POST as postProposal } from "@/app/api/proposals/route";
import { POST as postVote } from "@/app/api/votes/route";
import { memoryDb, setDb, type Db } from "@/lib/db";
import { proposalMessage, voteMessage } from "@/lib/messages";
import { services } from "@/lib/services";
import { ensureOpenShift } from "@/lib/shifts";

const signedAt = () => new Date().toISOString();
const wallet = () => privateKeyToAccount(generatePrivateKey());
let ipCounter = 0;
const nextIp = () => `10.0.0.${(ipCounter += 1)}`;
const post = (body: unknown, ip = nextIp()) => new Request("http://x/api", { method: "POST", headers: { "content-type": "application/json", "x-real-ip": ip }, body: JSON.stringify(body) });

async function signedProposal(text: string, account = wallet(), at = signedAt()) {
  return { text, address: account.address, signedAt: at, signature: await account.signMessage({ message: proposalMessage({ text, signedAt: at }) }) };
}
async function signedVote(proposalId: number, shiftSlug: string, account = wallet(), at = signedAt()) {
  return { proposalId, shiftSlug, address: account.address, signedAt: at, signature: await account.signMessage({ message: voteMessage({ proposalId, shiftSlug, signedAt: at }) }) };
}

const realServices = { ...services };
let db: Db;

beforeEach(async () => {
  db = await memoryDb();
  setDb(db);
  services.estimateWeight = async () => "7";
  services.verifySignature = async (address, message, signature) => {
    const { recoverMessageAddress } = await import("viem");
    const recovered = await recoverMessageAddress({ message, signature: signature as `0x${string}` });
    return recovered.toLowerCase() === address.toLowerCase();
  };
  await ensureOpenShift(db, new Date());
});
afterEach(() => {
  setDb(null);
  Object.assign(services, realServices);
});

describe("POST /api/votes", () => {
  const addProposal = async (text = "A tip calculator"): Promise<number> => (await (await postProposal(post(await signedProposal(text)))).json()).id;
  const slug = async () => (await ensureOpenShift(db, new Date())).slug;

  it("records a signed vote with its estimate", async () => {
    const id = await addProposal();
    const account = wallet();
    const response = await postVote(post(await signedVote(id, await slug(), account)));
    expect(response.status).toBe(200);
    expect((await response.json()).weightEstimate).toBe("7");
    const row = (await db.query<Record<string, unknown>>("select proposal_id::int as proposal_id, weight_estimate::text as w from votes where voter = $1", [account.address.toLowerCase()])).rows[0];
    expect(row).toEqual({ proposal_id: id, w: "7" });
  });
  it("still records the vote when the estimate cannot be read", async () => {
    services.estimateWeight = async () => null;
    const id = await addProposal();
    expect((await postVote(post(await signedVote(id, await slug())))).status).toBe(200);
  });
  it("lets a wallet change its vote: later wins", async () => {
    const a = await addProposal("First idea");
    const b = await addProposal("Second idea");
    const account = wallet();
    const shiftSlug = await slug();
    await postVote(post(await signedVote(a, shiftSlug, account, new Date(Date.now() - 1000).toISOString())));
    await postVote(post(await signedVote(b, shiftSlug, account, signedAt())));
    const rows = (await db.query<{ proposal_id: number }>("select proposal_id::int as proposal_id from votes where voter = $1", [account.address.toLowerCase()])).rows;
    expect(rows).toEqual([{ proposal_id: b }]);
  });
  it("keeps the later vote if an older one arrives after it", async () => {
    const a = await addProposal("First idea");
    const b = await addProposal("Second idea");
    const account = wallet();
    const shiftSlug = await slug();
    await postVote(post(await signedVote(b, shiftSlug, account, signedAt())));
    await postVote(post(await signedVote(a, shiftSlug, account, new Date(Date.now() - 60000).toISOString())));
    const rows = (await db.query<{ proposal_id: number }>("select proposal_id::int as proposal_id from votes where voter = $1", [account.address.toLowerCase()])).rows;
    expect(rows).toEqual([{ proposal_id: b }]);
  });
  it("refuses a vote for another shift, and a signature replayed into another shift", async () => {
    const id = await addProposal();
    expect((await postVote(post(await signedVote(id, "99")))).status).toBe(409);
    const body = await signedVote(id, "99");
    expect((await postVote(post({ ...body, shiftSlug: await slug() }))).status).toBe(401);
  });
  it("refuses a vote after the close", async () => {
    const id = await addProposal();
    const shiftSlug = await slug();
    await db.query("update shifts set closes_at = now() - interval '1 minute' where status = 'open'");
    expect((await postVote(post(await signedVote(id, shiftSlug)))).status).toBe(409);
  });
  it("refuses a vote for a proposal that is not open", async () => {
    const id = await addProposal();
    await db.query("update proposals set status = 'vetoed' where id = $1", [id]);
    expect((await postVote(post(await signedVote(id, await slug())))).status).toBe(409);
  });
});
