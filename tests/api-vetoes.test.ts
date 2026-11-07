import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { POST as postProposal } from "@/app/api/proposals/route";
import { POST as postVeto } from "@/app/api/vetoes/route";
import { memoryDb, setDb, type Db } from "@/lib/db";
import { proposalMessage, vetoMessage } from "@/lib/messages";
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

describe("POST /api/vetoes", () => {
  const builder = wallet();
  const veto = async (targetType: "proposal" | "floor", targetId: number, account = builder, reason = "Offensive.") => {
    const at = signedAt();
    return { targetType, targetId, reason, address: account.address, signedAt: at, signature: await account.signMessage({ message: vetoMessage({ targetType, targetId, reason, signedAt: at }) }) };
  };
  beforeEach(() => {
    process.env.VETO_ADDRESS = builder.address;
  });
  afterEach(() => {
    delete process.env.VETO_ADDRESS;
  });

  it("lets the builder veto a proposal and records the reason", async () => {
    const { id } = await (await postProposal(post(await signedProposal("A bad idea")))).json();
    expect((await postVeto(post(await veto("proposal", id)))).status).toBe(201);
    expect((await db.query<Record<string, unknown>>("select status, status_reason from proposals where id = $1", [id])).rows[0]).toEqual({ status: "vetoed", status_reason: "Offensive." });
    expect((await db.query<Record<string, unknown>>("select reason from vetoes")).rows).toEqual([{ reason: "Offensive." }]);
  });
  it("refuses every other wallet, even with a valid signature", async () => {
    const { id } = await (await postProposal(post(await signedProposal("An idea")))).json();
    expect((await postVeto(post(await veto("proposal", id, wallet())))).status).toBe(403);
  });
  it("lets the builder darken a shipped floor", async () => {
    await db.query("insert into shifts (id, slug, label, status, closes_at) values (500, 's', 'scheduled', 'shipped', now())");
    await db.query("insert into floors (shift_id, name, one_liner, how_to_use, html, hash, script_hashes) values (500, 'n', 'o', 'h', 'x', '0xfloor', 's')");
    expect((await postVeto(post(await veto("floor", 500)))).status).toBe(201);
    expect((await db.query<Record<string, unknown>>("select status, dark_reason from floors where shift_id = 500")).rows[0]).toEqual({ status: "vetoed", dark_reason: "Offensive." });
  });
  it("returns 404 for a target that is not open", async () => {
    expect((await postVeto(post(await veto("proposal", 9999)))).status).toBe(404);
  });
});
