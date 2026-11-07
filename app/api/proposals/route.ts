import { z } from "zod";
import { getDb } from "@/lib/db";
import { isFresh, proposalMessage } from "@/lib/messages";
import { insertProposal, normaliseProposal } from "@/lib/proposals";
import { allowEvent, clientKey } from "@/lib/rate-limit";
import { services } from "@/lib/services";
import { ensureOpenShift } from "@/lib/shifts";

const Body = z.object({
  text: z.string().trim().min(1).max(200).regex(/^[^\r\n]+$/, "one line only"),
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
  signedAt: z.string().max(40),
});

const json = (body: unknown, status: number): Response => Response.json(body, { status });

export async function POST(request: Request): Promise<Response> {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Write one sentence of up to 200 characters." }, 400);
  const { text, address, signature, signedAt } = parsed.data;
  const now = new Date();
  if (!isFresh(signedAt, now)) return json({ error: "That signature is too old. Sign again." }, 400);

  const db = await getDb();
  if (!(await allowEvent(db, clientKey(request, "proposal"), 5, now))) return json({ error: "Too many proposals from here. Try again in an hour." }, 429);
  if (!(await services.verifySignature(address, proposalMessage({ text, signedAt }), signature))) return json({ error: "That signature does not match this wallet." }, 401);

  const copy = await db.query<{ id: number }>("select id::int as id from proposals where normalised = $1 and status = 'open'", [normaliseProposal(text)]);
  if (copy.rows[0]) return json({ error: "This proposal is already open. Vote for it instead.", existingId: copy.rows[0].id }, 409);

  const shift = await ensureOpenShift(db, now);
  const already = await db.query("select 1 from proposals where author = $1 and shift_opened = $2 and seeded = false", [address.toLowerCase(), shift.id]);
  if (already.rows[0]) return json({ error: "This wallet has already proposed for this shift." }, 409);

  const id = await insertProposal(db, { text, author: address, shiftId: shift.id, seeded: false, signature, signedAt });
  return json({ id }, 201);
}
