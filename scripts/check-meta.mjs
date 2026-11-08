// The gate for social previews and metadata. It builds the app for one origin, starts it, and
// checks every public route's title, description, canonical URL, Open Graph and Twitter tags, the
// icons and the images. Usage: node scripts/check-meta.mjs   Prints META CHECK PASS or META CHECK FAIL.
// The origin is SITE_URL's when it is set. Otherwise it is a reserved name that is not a real host
// (RFC 2606). The gate only builds for it and never fetches it, so no address is hard-coded here.
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { join } from "node:path";

const ORIGIN = new URL(process.env.SITE_URL || "https://nightcrew.example").origin;
const PORT = process.env.CHECK_PORT || "4301";
const LOCAL = `http://127.0.0.1:${PORT}`;
const ROUTES = [
  { path: "/", title: "Night Crew: AI dev crew that token holders command" },
  { path: "/vote", title: "Night Crew: vote on tonight's floor" },
  { path: "/built", title: "Night Crew: how it was built" },
  { path: "/rejected", title: "Night Crew: rejected proposals" },
  { path: "/veto", title: "Night Crew: veto" },
  { path: "/shifts/1", title: "Night Crew: receipt for shift 1" },
  { path: "/floors/1", title: "Night Crew: floor 1" },
];

const env = { ...process.env, NEXT_PUBLIC_SITE_ORIGIN: ORIGIN };
delete env.DATABASE_URL; // the dev seed, never a real database
const next = join("node_modules", "next", "dist", "bin", "next");
const built = spawnSync(process.execPath, [next, "build"], { stdio: "inherit", env });
if (built.status !== 0) {
  console.log("META CHECK FAIL");
  process.exit(2);
}
const server = spawn(process.execPath, [next, "start", "-H", "127.0.0.1", "-p", PORT], { stdio: "ignore", env });
const stop = () => {
  try {
    if (process.platform === "win32") execFileSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    else server.kill();
  } catch {
    // already gone
  }
};

const failures = [];
const fail = (where, message) => failures.push(`${where}: ${message}`);
const decode = (text) => text.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const tags = (html, name) =>
  [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map(([tag]) =>
    Object.fromEntries([...tag.matchAll(/([a-zA-Z][\w:-]*)="([^"]*)"/g)].map(([, key, value]) => [key.toLowerCase(), decode(value)])),
  );

async function checkRoute(route, seen) {
  const response = await fetch(LOCAL + route.path);
  if (response.status !== 200) return fail(route.path, `status ${response.status}`);
  const html = await response.text();
  const metas = tags(html, "meta");
  const links = tags(html, "link");
  const meta = (key) => metas.find((item) => item.property === key || item.name === key)?.content;
  // Next 16 writes the home page's URL as the bare origin, with no trailing slash
  // (next/dist/lib/metadata/resolvers/resolve-url.js). It names the same page. Every other route keeps its path.
  const url = route.path === "/" ? ORIGIN : new URL(route.path, ORIGIN).toString();
  const image = `${ORIGIN}/social/card.png`;
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
  const description = meta("description") ?? "";
  if (title !== route.title) fail(route.path, `title is "${title}", expected "${route.title}"`);
  if (description.length < 50 || description.length > 200) fail(route.path, `description is ${description.length} characters, expected 50 to 200`);
  if (seen.titles.has(title)) fail(route.path, "title is not unique");
  if (seen.descriptions.has(description)) fail(route.path, "description is not unique");
  seen.titles.add(title);
  seen.descriptions.add(description);
  const expected = {
    "og:title": title,
    "og:description": description,
    "og:url": url,
    "og:type": "website",
    "og:site_name": "Night Crew",
    "og:image": image,
    "og:image:width": "1200",
    "og:image:height": "630",
    "twitter:card": "summary_large_image",
    "twitter:title": title,
    "twitter:description": description,
    "twitter:image": image,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (meta(key) !== value) fail(route.path, `${key} is "${meta(key)}", expected "${value}"`);
  }
  if (!meta("og:image:alt") || !meta("twitter:image:alt")) fail(route.path, "the card has no alt text");
  const canonical = links.find((item) => item.rel === "canonical")?.href;
  if (canonical !== url) fail(route.path, `canonical is "${canonical}", expected "${url}"`);
  const iconPaths = links.filter((item) => item.rel === "icon").map((item) => new URL(item.href, ORIGIN).pathname);
  for (const path of ["/favicon.ico", "/icon.svg"]) if (!iconPaths.includes(path)) fail(route.path, `no icon link to ${path}`);
  const apple = links.find((item) => item.rel === "apple-touch-icon");
  if (!apple || new URL(apple.href, ORIGIN).pathname !== "/apple-icon.png") fail(route.path, "no apple-touch-icon link to /apple-icon.png");
  for (const value of [...metas.map((item) => item.content ?? ""), ...links.map((item) => item.href ?? "")]) {
    if (/127\.0\.0\.1|localhost/.test(value)) fail(route.path, `a tag points at a local address: ${value}`);
  }
}

async function bytesOf(path, type) {
  const response = await fetch(LOCAL + path);
  if (response.status !== 200) {
    fail(path, `status ${response.status}`);
    return null;
  }
  if (!(response.headers.get("content-type") ?? "").startsWith(type)) fail(path, `content type is ${response.headers.get("content-type")}`);
  return Buffer.from(await response.arrayBuffer());
}

function pngSize(bytes) {
  if (bytes.length < 24 || bytes.toString("latin1", 1, 4) !== "PNG") return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function checkPng(path, width, height, maxBytes) {
  const bytes = await bytesOf(path, "image/png");
  if (!bytes) return;
  const size = pngSize(bytes);
  if (!size) return fail(path, "not a PNG");
  if (size.width !== width || size.height !== height) fail(path, `is ${size.width}x${size.height}, expected ${width}x${height}`);
  if (bytes.length > maxBytes) fail(path, `is ${bytes.length} bytes, over ${maxBytes}`);
}

async function checkIco() {
  const bytes = await bytesOf("/favicon.ico", "image/");
  if (!bytes) return;
  if (bytes.readUInt16LE(0) !== 0 || bytes.readUInt16LE(2) !== 1) return fail("/favicon.ico", "not an ICO file");
  const sizes = [];
  for (let index = 0; index < bytes.readUInt16LE(4); index += 1) {
    const entry = 6 + index * 16;
    const image = bytes.subarray(bytes.readUInt32LE(entry + 12), bytes.readUInt32LE(entry + 12) + bytes.readUInt32LE(entry + 8));
    const size = pngSize(image);
    if (!size) return fail("/favicon.ico", `image ${index} is not a PNG`);
    sizes.push(size.width);
  }
  if (sizes.join(",") !== "16,32,48") fail("/favicon.ico", `holds sizes ${sizes.join(",")}, expected 16,32,48`);
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 120 && !ready; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      ready = (await fetch(`${LOCAL}/`)).status < 500;
    } catch {
      // not up yet
    }
  }
  if (!ready) {
    fail("server", `the app did not answer at ${LOCAL}/`);
  } else {
    const seen = { titles: new Set(), descriptions: new Set() };
    for (const route of ROUTES) await checkRoute(route, seen);
    await checkPng("/social/card.png", 1200, 630, 1_000_000);
    await checkPng("/apple-icon.png", 180, 180, 100_000);
    await checkIco();
    const svg = await bytesOf("/icon.svg", "image/svg+xml");
    if (svg && !(svg.toString("utf8").includes("<svg") && svg.toString("utf8").includes("#256f82"))) fail("/icon.svg", "not the arc mark in the accent colour");
  }
} finally {
  stop();
}
for (const failure of failures) console.log(failure);
console.log(failures.length === 0 ? "META CHECK PASS" : "META CHECK FAIL");
process.exit(failures.length === 0 ? 0 : 1);
