import { existsSync } from "node:fs";
import { chromium, type Browser } from "playwright-core";

const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter((path): path is string => Boolean(path));

export function chromePath(): string {
  const found = CANDIDATES.find((path) => existsSync(path));
  if (!found) throw new Error("No Chrome found. Set CHROME_PATH.");
  return found;
}

export function launchChrome(): Promise<Browser> {
  return chromium.launch({ executablePath: chromePath(), headless: true });
}
