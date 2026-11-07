import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { POST as postProposal } from "@/app/api/proposals/route";
import { memoryDb, setDb, type Db } from "@/lib/db";
import { proposalMessage } from "@/lib/messages";
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

describe("POST /api/proposals", () => {
  it("accepts one signed sentence", async () => {
    const response = await postProposal(post(await signedProposal("A tip calculator")));
    expect(response.status).toBe(201);
    const { id } = await response.json();
    const row = (await db.query<Record<string, unknown>>("select text, seeded, status from proposals where id = $1", [id])).rows[0];
    expect(row).toEqual({ text: "A tip calculator", seeded: false, status: "open" });
  });
  it("refuses a signature from another wallet", async () => {
    const body = await signedProposal("A tip calculator");
    expect((await postProposal(post({ ...body, address: wallet().address }))).status).toBe(401);
  });
  it("refuses text the signature does not cover", async () => {
    const body = await signedProposal("A tip calculator");
    expect((await postProposal(post({ ...body, text: "Something else" }))).status).toBe(401);
  });
  it("refuses an old signature", async () => {
    const old = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    expect((await postProposal(post(await signedProposal("A tip calculator", wallet(), old)))).status).toBe(400);
  });
  it("refuses over 200 characters, an empty sentence and more than one line", async () => {
    for (const text of ["x".repeat(201), "   ", "one\ntwo"]) expect((await postProposal(post(await signedProposal(text)))).status).toBe(400);
  });
  it("refuses a second proposal from a wallet in the same shift", async () => {
    const account = wallet();
    expect((await postProposal(post(await signedProposal("First idea", account)))).status).toBe(201);
    expect((await postProposal(post(await signedProposal("Second idea", account)))).status).toBe(409);
  });
  it("points a duplicate at the proposal already open, ignoring case and spacing", async () => {
    const { id } = await (await postProposal(post(await signedProposal("A tip calculator")))).json();
    const response = await postProposal(post(await signedProposal("a  TIP calculator")));
    expect(response.status).toBe(409);
    expect((await response.json()).existingId).toBe(id);
  });
  it("has no overall cap per shift", async () => {
    for (let i = 0; i < 55; i += 1) expect((await postProposal(post(await signedProposal(`Idea number ${i}`)))).status).toBe(201);
  });
  it("limits one IP to five an hour", async () => {
    const ip = "10.9.9.9";
    for (let i = 0; i < 5; i += 1) expect((await postProposal(post(await signedProposal(`Idea ${i}`), ip))).status).toBe(201);
    expect((await postProposal(post(await signedProposal("Idea six"), ip))).status).toBe(429);
  });
});
