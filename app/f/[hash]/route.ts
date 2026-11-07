import { getDb } from "@/lib/db";
import { floorFrameAncestors, floorHeaders } from "@/lib/floor-gate/headers";

type FloorRow = { html: string; script_hashes: string; status: string };

/** No request header reaches the response, so every visitor and every cache gets the same headers. */
export async function GET(_request: Request, context: { params: Promise<{ hash: string }> }): Promise<Response> {
  const { hash } = await context.params;
  const db = await getDb();
  const result = await db.query<FloorRow>("select html, script_hashes, status from floors where hash = $1", [hash]);
  const floor = result.rows[0];
  if (!floor) return new Response("Not found", { status: 404 });
  if (floor.status === "vetoed") return new Response("This floor was vetoed. Its receipt stays public.", { status: 410 });
  return new Response(floor.html, { status: 200, headers: floorHeaders(floor.script_hashes, floorFrameAncestors(process.env.NEXT_PUBLIC_SITE_ORIGIN)) });
}
