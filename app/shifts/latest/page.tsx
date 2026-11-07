import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LatestReceipt() {
  const db = await getDb();
  const latest = await db.query<{ slug: string }>(
    "select s.slug from shifts s join receipts r on r.shift_id = s.id where s.label <> 'rehearsal' order by s.slug::int desc limit 1",
  );
  redirect(latest.rows[0] ? `/shifts/${latest.rows[0].slug}` : "/");
}
