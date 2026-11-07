import { getDb } from "@/lib/db";

const PARTS = new Set(["bundle.json", "tally.json", "triage.json", "transcript.json", "floor.html", "diff.patch", "tests.json"]);

/** Raw parts, so anyone can re-hash them. A floor is served as plain text here, never as a page. */
export async function GET(_request: Request, context: { params: Promise<{ slug: string; part: string }> }): Promise<Response> {
  const { slug, part } = await context.params;
  if (!PARTS.has(part)) return new Response("Not found", { status: 404 });
  const db = await getDb();
  const result = await db.query<{ content: string }>(
    "select p.content from receipt_parts p join shifts s on s.id = p.shift_id where s.slug = $1 and p.part = $2",
    [slug, part],
  );
  const row = result.rows[0];
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(row.content, {
    status: 200,
    headers: {
      "Content-Type": part.endsWith(".json") ? "application/json; charset=utf-8" : "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="shift-${slug}-${part}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=300",
    },
  });
}
