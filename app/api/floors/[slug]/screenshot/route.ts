import { getDb } from "@/lib/db";

/** The picture the wallet-free pages show. The tower never runs floor code. */
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await context.params;
  const narrow = new URL(request.url).searchParams.get("size") === "narrow";
  const db = await getDb();
  const result = await db.query<{ wide: string | null; narrow: string | null; status: string }>(
    "select f.screenshot_wide as wide, f.screenshot_narrow as narrow, f.status from floors f join shifts s on s.id = f.shift_id where s.slug = $1",
    [slug],
  );
  const row = result.rows[0];
  if (!row) return new Response("Not found", { status: 404 });
  if (row.status === "vetoed") return new Response("Vetoed", { status: 410 });
  const data = narrow ? row.narrow : row.wide;
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(data, "base64"), {
    status: 200,
    headers: { "Content-Type": "image/png", "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=60" },
  });
}
