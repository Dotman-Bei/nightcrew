import { sha256Hex } from "@/lib/hash";
import type { Db } from "@/lib/db";

const HOUR_MS = 60 * 60 * 1000;
const RETAIN_MS = 24 * HOUR_MS;

/** A salted hash of Vercel's client IP. The raw address is never stored. */
export function clientKey(request: Request, scope: string): string {
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return `${scope}:${sha256Hex(`${process.env.RATE_LIMIT_SALT ?? "dev-salt"}:${ip}`)}`;
}

/** Records one attempt. Returns false when the key has already used its allowance this hour. */
export async function allowEvent(db: Db, key: string, perHour: number, now: Date = new Date()): Promise<boolean> {
  await db.query("delete from rate_events where at < $1", [new Date(now.getTime() - RETAIN_MS).toISOString()]);
  const count = await db.query<{ n: number }>("select count(*)::int as n from rate_events where key = $1 and at > $2", [key, new Date(now.getTime() - HOUR_MS).toISOString()]);
  if (count.rows[0].n >= perHour) return false;
  await db.query("insert into rate_events (key, at) values ($1, $2)", [key, now.toISOString()]);
  return true;
}
