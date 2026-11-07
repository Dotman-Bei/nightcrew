/** The iframe attribute every floor is embedded with. No allow-same-origin, ever. */
export const FLOOR_FRAME_SANDBOX = "allow-scripts";

const PLAIN_ORIGIN = /^https?:\/\/[a-z0-9.-]+(:\d+)?$/;

/**
 * Who may frame a floor, built from configuration and never from a request. The browser checks
 * 'self' against the URL it actually loaded, so on the main host this works on any port and any
 * deployment URL. The configured main site is added when it is a plain http(s) origin, which the
 * floors hostname needs. Anything else is ignored, not trusted.
 */
export function floorFrameAncestors(configured: string | undefined): string {
  if (!configured) return "'self'";
  let origin: string;
  try {
    origin = new URL(configured).origin;
  } catch {
    return "'self'";
  }
  return PLAIN_ORIGIN.test(origin) ? `${origin} 'self'` : "'self'";
}

export function floorCsp(scriptHashes: string, frameAncestor: string): string {
  return [
    "sandbox allow-scripts",
    "default-src 'none'",
    `script-src ${scriptHashes}`,
    "style-src 'unsafe-inline'",
    "img-src data:",
    "font-src data:",
    "media-src data:",
    "connect-src 'none'",
    "frame-src 'none'",
    "worker-src 'none'",
    "object-src 'none'",
    "manifest-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    `frame-ancestors ${frameAncestor}`,
  ].join("; ");
}

/** no-store: a veto must reach every viewer on their next load, so no browser or shared cache keeps a copy. */
export function floorHeaders(scriptHashes: string, frameAncestor: string): Record<string, string> {
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": floorCsp(scriptHashes, frameAncestor),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), clipboard-read=()",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Cache-Control": "no-store",
  };
}
