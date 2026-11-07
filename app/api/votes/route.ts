import { z } from "zod";
import { getDb } from "@/lib/db";
import { isFresh, voteMessage } from "@/lib/messages";
import { allowEvent, clientKey } from "@/lib/rate-limit";
import { services } from "@/lib/services";
import { ensureOpenShift } from "@/lib/shifts";

const Body = z.object({
  shiftSlug: z.string().max(20),
  proposalId: z.number().int().positive(),
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
  signedAt: z.string().max(40),
});

const json = (body: unknown, status: number): Response => Response.json(body, { status });

export async function POST(request: Request): Promise<Response> {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "That vote is malformed." }, 400);
  const { shiftSlug, proposalId, address, signature, signedAt } = parsed.data;
  const now = new Date();
  if (!isFresh(signedAt, now)) return json({ error: "That signature is too old. Sign again." }, 400);

  const db = await getDb();
  if (!(await allowEvent(db, clientKey(request, "vote"), 60, now))) return json({ error: "Too many votes from here. Try again in an hour." }, 429);

  const shift = await ensureOpenShift(db, now);
  if (shift.slug !== shiftSlug) return json({ error: "That shift has closed. Vote in the current one." }, 409);
  if (new Date(shift.closes_at).getTime() <= now.getTime()) return json({ error: "Voting for this shift has closed." }, 409);

  const proposal = await db.query<{ status: string }>("select status from proposals where id = $1", [proposalId]);
  if (proposal.rows[0]?.status !== "open") return json({ error: "That proposal is not open." }, 409);

  if (!(await services.verifySignature(address, voteMessage({ proposalId, shiftSlug, signedAt }), signature))) return json({ error: "That signature does not match this wallet." }, 401);

  const estimate = await services.estimateWeight(address);
  await db.query(
    `insert into votes (shift_id, voter, proposal_id, signature, signed_at, weight_estimate) values ($1, $2, $3, $4, $5, $6)
     on conflict (shift_id, voter) do update set proposal_id = excluded.proposal_id, signature = excluded.signature, signed_at = excluded.signed_at, weight_estimate = excluded.weight_estimate
     where excluded.signed_at > votes.signed_at`,
    [shift.id, address.toLowerCase(), proposalId, signature, signedAt, estimate],
  );
  return json({ ok: true, weightEstimate: estimate }, 200);
}
