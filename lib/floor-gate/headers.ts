/** The iframe attribute every floor is embedded with. No allow-same-origin, ever. */
export const FLOOR_FRAME_SANDBOX = "allow-scripts";

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

export function floorHeaders(scriptHashes: string, frameAncestor: string): Record<string, string> {
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": floorCsp(scriptHashes, frameAncestor),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), clipboard-read=()",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Cache-Control": "public, max-age=31536000, immutable",
  };
}
