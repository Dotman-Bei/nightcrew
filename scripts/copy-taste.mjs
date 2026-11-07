// Copies the design-taste-frontend skill's runtime assets into public/taste, unmodified.
// The skill sits above this repo and is not committed, so the app ships its own copy.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL = process.env.TASTE_SKILL_DIR || "C:/Users/bamig/Documents/VIBE CODE/Hackathons/.claude/skills/design-taste-frontend";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(SKILL, "assets");
const to = join(root, "public", "taste");
if (!existsSync(from)) throw new Error(`The skill is not at ${from}. Set TASTE_SKILL_DIR.`);

rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
const items = [
  "system.css",
  "system.js",
  "motion",
  "backgrounds/backgrounds.css",
  "backgrounds/backgrounds.js",
  "effects",
  "layout/layout.css",
  "layout/layout.js",
  "icons/icon.css",
  "ui/ui.js",
  "ui/cards.css",
  "ui/base.css",
  "ui/window",
  "ui/terminal-run",
  "diagrams/diagram.css",
  "diagrams/diagram.js",
  "diagrams/mount.js",
  "diagrams/presets.json",
];
for (const item of items) {
  const target = join(to, item);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(join(from, item), target, { recursive: true });
}
console.log(`copied ${items.length} items to public/taste`);
