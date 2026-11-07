import { readFileSync } from "node:fs";
import { join } from "node:path";
import { neonDb } from "@/lib/db";
import { insertProposal } from "@/lib/proposals";
import { ensureOpenShift } from "@/lib/shifts";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const db = neonDb(required("DATABASE_URL"));
const author = required("VETO_ADDRESS");
const shift = await ensureOpenShift(db, new Date());
const texts = JSON.parse(readFileSync(join(process.cwd(), "crew", "seed-proposals.json"), "utf8")) as string[];
for (const text of texts) {
  try {
    const id = await insertProposal(db, { text, author, shiftId: shift.id, seeded: true, signature: null, signedAt: null });
    console.log(`seeded proposal ${id}: ${text}`);
  } catch {
    console.log(`already open, skipped: ${text}`);
  }
}
const open = await db.query<{ n: number }>("select count(*)::int as n from proposals where seeded = true and status = 'open'");
const count = Number(open.rows[0]?.n ?? 0);
if (count < 5) throw new Error(`only ${count} seeded proposals are open`);
console.log(`seeded proposals open: ${count}`);
