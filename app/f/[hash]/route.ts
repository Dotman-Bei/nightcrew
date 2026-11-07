import { getDb } from "@/lib/db";
import { floorHeaders } from "@/lib/floor-gate/headers";

type FloorRow = { html: string; script_hashes: string; status: string };

/** Who may frame this floor: the main site, or on the main host, whoever asked at this host. */
function frameAncestor(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_ORIGIN;
  if (configured) return configured;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const url = new URL(request.url);
  const protocol = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return host ? `${protocol}://${host}` : url.origin;
}

export async function GET(request: Request, context: { params: Promise<{ hash: string }> }): Promise<Response> {
  const { hash } = await context.params;
  const db = await getDb();
  const result = await db.query<FloorRow>("select html, script_hashes, status from floors where hash = $1", [hash]);
  const floor = result.rows[0];
  if (!floor) return new Response("Not found", { status: 404 });
  if (floor.status === "vetoed") return new Response("This floor was vetoed. Its receipt stays public.", { status: 410 });
  return new Response(floor.html, { status: 200, headers: floorHeaders(floor.script_hashes, frameAncestor(request)) });
}
