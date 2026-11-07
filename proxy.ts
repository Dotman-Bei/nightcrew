import { NextResponse, type NextRequest } from "next/server";

/** With a floors hostname set, floors live only there and everything else lives only on the main host. */
export function routeByHost(pathname: string, host: string | null, floorsOrigin: string | undefined): "next" | "not-found" {
  if (!floorsOrigin) return "next";
  const floorsHost = new URL(floorsOrigin).host;
  const onFloorsHost = host === floorsHost;
  const isFloorPath = pathname.startsWith("/f/");
  if (onFloorsHost && !isFloorPath) return "not-found";
  if (!onFloorsHost && isFloorPath) return "not-found";
  return "next";
}

export function proxy(request: NextRequest): NextResponse {
  const route = routeByHost(request.nextUrl.pathname, request.headers.get("host"), process.env.FLOORS_ORIGIN);
  if (route === "not-found") return new NextResponse("Not found", { status: 404 });
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|taste/|favicon.ico).*)"],
};
