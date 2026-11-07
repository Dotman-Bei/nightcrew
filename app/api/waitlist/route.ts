import { z } from "zod";
import { getDb } from "@/lib/db";
import { allowEvent, clientKey } from "@/lib/rate-limit";

const Body = z.object({
  community: z.string().trim().min(1).max(80),
  contact: z.string().trim().min(1).max(120),
});

const json = (body: unknown, status: number): Response => Response.json(body, { status });

export async function POST(request: Request): Promise<Response> {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Give a community name and a way to reach you." }, 400);
  const db = await getDb();
  if (!(await allowEvent(db, clientKey(request, "waitlist"), 5))) return json({ error: "Too many requests from here. Try again in an hour." }, 429);
  await db.query("insert into waitlist (community, contact) values ($1, $2) on conflict (community, contact) do nothing", [parsed.data.community, parsed.data.contact]);
  return json({ ok: true }, 201);
}
