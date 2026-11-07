import { z } from "zod";
import { vetoAddress } from "@/lib/config";
import { getDb } from "@/lib/db";
import { isFresh, vetoMessage } from "@/lib/messages";
import { allowEvent, clientKey } from "@/lib/rate-limit";
import { services } from "@/lib/services";

const Body = z.object({
  targetType: z.enum(["proposal", "floor"]),
  targetId: z.number().int().positive(),
  reason: z.string().trim().min(1).max(300),
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
  signedAt: z.string().max(40),
});

const json = (body: unknown, status: number): Response => Response.json(body, { status });

/** Only the VETO_ADDRESS wallet can veto. Every veto is stored with its reason and shown on /rejected. */
export async function POST(request: Request): Promise<Response> {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "A veto needs a target and a reason of up to 300 characters." }, 400);
  const { targetType, targetId, reason, address, signature, signedAt } = parsed.data;
  const now = new Date();
  if (!isFresh(signedAt, now)) return json({ error: "That signature is too old. Sign again." }, 400);

  const db = await getDb();
  if (!(await allowEvent(db, clientKey(request, "veto"), 20, now))) return json({ error: "Too many attempts from here." }, 429);
  if (address.toLowerCase() !== vetoAddress()) return json({ error: "Only the builder's wallet can veto." }, 403);
  if (!(await services.verifySignature(address, vetoMessage({ targetType, targetId, reason, signedAt }), signature))) return json({ error: "That signature does not match this wallet." }, 401);

  const target = targetType === "proposal"
    ? await db.query("select 1 from proposals where id = $1 and status = 'open'", [targetId])
    : await db.query("select 1 from floors where shift_id = $1 and status = 'lit'", [targetId]);
  if (!target.rows[0]) return json({ error: `That ${targetType} is not open to veto.` }, 404);

  await db.batch([
    { sql: "insert into vetoes (target_type, target_id, reason, signature, signed_at) values ($1, $2, $3, $4, $5)", params: [targetType, targetId, reason, signature, signedAt] },
    targetType === "proposal"
      ? { sql: "update proposals set status = 'vetoed', status_reason = $2 where id = $1", params: [targetId, reason] }
      : { sql: "update floors set status = 'vetoed', dark_reason = $2 where shift_id = $1", params: [targetId, reason] },
  ]);
  return json({ ok: true }, 201);
}
