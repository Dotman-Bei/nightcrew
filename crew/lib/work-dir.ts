import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** Artifacts pass between GitHub Actions jobs as files under this folder. */
export const WORK_DIR = process.env.SHIFT_WORK_DIR || "shift-work";

export function workPath(...parts: string[]): string {
  return join(WORK_DIR, ...parts);
}

export function writeWork(path: string, content: string | Buffer): void {
  const full = workPath(path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

export function readWork(path: string): string | null {
  const full = workPath(path);
  return existsSync(full) ? readFileSync(full, "utf8") : null;
}

/** Sets a GitHub Actions step output. Does nothing outside Actions. */
export function setOutput(name: string, value: string): void {
  const file = process.env.GITHUB_OUTPUT;
  if (file) appendFileSync(file, `${name}=${value}\n`);
}
