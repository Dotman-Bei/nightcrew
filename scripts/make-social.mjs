// Renders the social card and the icons in real Chrome, from the site's palette, type and the kit's arc mark.
// Usage: node scripts/make-social.mjs
// Writes public/social/card.png (1200x630), public/icon.svg, public/favicon.ico (16, 32, 48) and public/apple-icon.png (180).
// Needs Chrome (set CHROME_PATH if it is not at the usual path) and the network, for the two Google fonts.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const SAND = "#dedad3";
const INK = "#0a0a0a";
const MUTED = "#55514c";
const ACCENT = "#256f82";
const INV_SURFACE = "#151515";
const INV_INK = "#dedad3";
const INV_MUTED = "#84827e";
// The kit's arc mark, the one in the nav (public/taste/system.css, .mark[data-mark="arc"]).
const ARC = "M2.5 21.5V12a9.5 9.5 0 0 1 19 0v9.5h-6V12a3.5 3.5 0 0 0-7 0v9.5z";
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${SAND}"/><path transform="translate(4 4)" fill="${ACCENT}" d="${ARC}"/></svg>`;
const FONTS = "https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@400..700&family=JetBrains+Mono:wght@400..500&display=block";
// A shift, newest step at the top like the tower. The lines are the site's own, from "How a shift works".
const STEPS = [
  ["publish", "Floor, receipt and attestation on Base"],
  ["verify", "Real Chrome, a fake wallet, no secrets"],
  ["review", "Can send it back once"],
  ["build", "Three tools, no shell, no network"],
  ["triage", "Rejects anything unsafe, in public"],
  ["vote", "One signed message, no gas"],
];

const CARD = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>
* { box-sizing: border-box; margin: 0; }
html, body { width: 1200px; height: 630px; overflow: hidden; }
body { display: grid; grid-template-columns: minmax(0, 1fr) 452px; gap: 56px; padding: 64px; background: ${SAND}; color: ${INK}; font-family: "Host Grotesk", sans-serif; }
.copy { display: flex; flex-direction: column; justify-content: space-between; min-width: 0; }
.brand { display: flex; align-items: center; gap: 12px; font-size: 26px; font-weight: 500; letter-spacing: -0.02em; }
.brand svg { width: 28px; height: 28px; flex: none; }
h1 { font-size: 66px; font-weight: 500; line-height: 1.1; padding-bottom: 12px; letter-spacing: -0.04em; }
.lead { margin-top: 24px; font-size: 24px; line-height: 1.4; color: ${MUTED}; }
.foot { font: 500 18px/1.4 "JetBrains Mono", monospace; color: ${ACCENT}; }
.tower { display: flex; flex-direction: column; gap: 6px; padding: 16px; background: ${INK}; border-radius: 4px; }
.floor { flex: 1 1 0; min-height: 0; display: grid; grid-template-columns: 92px minmax(0, 1fr); align-items: center; gap: 12px; padding: 0 16px; background: ${INV_SURFACE}; border-radius: 2px; color: ${INV_INK}; font-size: 19px; line-height: 1.25; }
.floor b { font: 500 15px/1.3 "JetBrains Mono", monospace; color: ${INV_MUTED}; }
.floor--lit { background: ${ACCENT}; color: #ffffff; }
.floor--lit b { color: #ffffff; }
</style></head><body>
<div class="copy">
  <p class="brand"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="${ACCENT}" d="${ARC}"/></svg>Night Crew</p>
  <div><h1>AI dev crew that token holders command</h1><p class="lead">Holders sign to vote for a feature. The crew builds the winner, tests it and ships it as a new floor of a public tower, with a receipt on Base.</p></div>
  <p class="foot">A new floor every night at 22:00 UTC</p>
</div>
<div class="tower">${STEPS.map(([step, line], index) => `<div class="floor${index === 0 ? " floor--lit" : ""}"><b>${step}</b><span>${line}</span></div>`).join("")}</div>
</body></html>`;

function icoFrom(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size, 0);
    entry.writeUInt8(size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...pngs.map(({ data }) => data)]);
}

const executablePath = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((path) => path && existsSync(path));
if (!executablePath) throw new Error("No Chrome found. Set CHROME_PATH.");
const browser = await chromium.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(CARD, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() => ["Host Grotesk", "JetBrains Mono"].every((family) => [...document.fonts].some((face) => face.family.replace(/"/g, "") === family && face.status === "loaded")));
  if (!loaded) throw new Error("The two Google fonts did not load, so the card would fall back to a system font.");
  const overflow = await page.evaluate(() => [...document.querySelectorAll("body *")].filter((node) => node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1).map((node) => node.className || node.tagName));
  if (overflow.length > 0) throw new Error(`Text is cut on the card: ${overflow.join(", ")}`);
  mkdirSync("public/social", { recursive: true });
  writeFileSync("public/social/card.png", await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 1200, height: 630 } }));

  const render = async (size) => {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<!doctype html><html><head><style>html, body { margin: 0; width: ${size}px; height: ${size}px; } svg { display: block; width: ${size}px; height: ${size}px; }</style></head><body>${ICON_SVG}</body></html>`);
    return page.screenshot({ type: "png", clip: { x: 0, y: 0, width: size, height: size } });
  };
  writeFileSync("public/icon.svg", `${ICON_SVG}\n`);
  writeFileSync("public/apple-icon.png", await render(180));
  const pngs = [];
  for (const size of [16, 32, 48]) pngs.push({ size, data: await render(size) });
  writeFileSync("public/favicon.ico", icoFrom(pngs));
} finally {
  await browser.close();
}
console.log("social card and icons written");
