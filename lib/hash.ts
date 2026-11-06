import { createHash } from "node:crypto";
import { keccak256, toBytes } from "viem";

/** keccak256 of a string's UTF-8 bytes, as 0x-prefixed hex. */
export function keccakText(text: string): `0x${string}` {
  return keccak256(toBytes(text));
}

/** The CSP source for an inline script: 'sha256-<base64>'. */
export function cspScriptHash(script: string): string {
  return `'sha256-${createHash("sha256").update(script, "utf8").digest("base64")}'`;
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
