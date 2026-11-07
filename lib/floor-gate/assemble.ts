import { parse as parseJs } from "acorn";
import { defaultTreeAdapter, html as htmlNs, parse, serialize, type DefaultTreeAdapterTypes } from "parse5";
import { keccakText, cspScriptHash } from "@/lib/hash";
import { WALLET_GUARD } from "@/lib/floor-gate/guard";

type TreeNode = DefaultTreeAdapterTypes.Node;
type ElementNode = DefaultTreeAdapterTypes.Element;

const UNDEFINED_NAMES = ["self", "globalThis", "top", "parent", "frames", "opener", "location", "history", "chrome", "external", "ethereum", "web3", "solana", "phantom", "fetch", "XMLHttpRequest", "WebSocket", "EventSource", "postMessage", "localStorage", "sessionStorage", "indexedDB", "open", "navigation", "frameElement", "caches", "cookieStore", "documentPictureInPicture"];
const SAFE_NAMES = ["addEventListener", "removeEventListener", "setTimeout", "setInterval", "clearTimeout", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "matchMedia", "getComputedStyle"];

const PARAMS = ["window", ...UNDEFINED_NAMES, ...SAFE_NAMES].join(",");
const ARGS = ["__ncw", ...UNDEFINED_NAMES.map(() => "void 0"), ...SAFE_NAMES.map((name) => `__ncw.${name}`)].join(",");

/**
 * Wraps floor code at global scope, so no closure can leak the real window. The inner block lets
 * a floor declare its own `top` or `location` with let or const without clashing with a parameter.
 * Refuses anything that is not a complete program on its own: a script holding `}})` would close the
 * wrapper early and run the rest at global scope, with the real window and without strict mode.
 */
export function wrapFloorScript(code: string): string {
  try {
    parseJs(code, { ecmaVersion: "latest", sourceType: "script" });
  } catch {
    throw new Error("a floor script must be a complete program");
  }
  return `(function(${PARAMS}){"use strict";{\n${code}\n}}).call(undefined,${ARGS});`;
}

function collectScripts(node: TreeNode, out: ElementNode[]): void {
  if (defaultTreeAdapter.isElementNode(node) && node.tagName === "script") out.push(node);
  if ("childNodes" in node) for (const child of node.childNodes) collectScripts(child, out);
}

function attr(element: ElementNode, name: string): string | undefined {
  return element.attrs.find((item) => item.name === name)?.value;
}

function scriptText(element: ElementNode): string {
  return element.childNodes.map((child) => (defaultTreeAdapter.isTextNode(child) ? child.value : "")).join("");
}

function setScriptText(element: ElementNode, text: string): void {
  element.childNodes = [];
  defaultTreeAdapter.insertText(element, text);
}

function newScript(text: string, attrs: { name: string; value: string }[] = []): ElementNode {
  const script = defaultTreeAdapter.createElement("script", htmlNs.NS.HTML, attrs);
  setScriptText(script, text);
  return script;
}

export type AssembledFloor = {
  html: string;
  /** Space-separated CSP sources for the guard and every wrapped script. */
  scriptHashes: string;
  /** keccak256 of the assembled HTML. */
  hash: `0x${string}`;
};

/** Deterministic: the same raw floor and snapshot always give the same bytes. */
export function assembleFloor(rawHtml: string, snapshotJson: string | null): AssembledFloor {
  const doc = parse(rawHtml.replace(/\r\n/g, "\n"));
  const htmlElement = doc.childNodes.find((node): node is ElementNode => defaultTreeAdapter.isElementNode(node) && node.tagName === "html");
  if (!htmlElement) throw new Error("assembleFloor: no html element");
  const head = htmlElement.childNodes.find((node): node is ElementNode => defaultTreeAdapter.isElementNode(node) && node.tagName === "head");
  if (!head) throw new Error("assembleFloor: no head element");

  const hashes: string[] = [cspScriptHash(WALLET_GUARD)];
  const scripts: ElementNode[] = [];
  collectScripts(htmlElement, scripts);

  for (const script of scripts) {
    if (attr(script, "type") === "application/json") {
      if (attr(script, "id") === "snapshot") defaultTreeAdapter.detachNode(script);
      continue;
    }
    const wrapped = wrapFloorScript(scriptText(script));
    setScriptText(script, wrapped);
    hashes.push(cspScriptHash(wrapped));
  }

  const safeSnapshot = (snapshotJson ?? "{}").replace(/</g, "\\u003c");
  const first = head.childNodes[0] ?? null;
  const guardScript = newScript(WALLET_GUARD);
  const snapshotScript = newScript(safeSnapshot, [
    { name: "type", value: "application/json" },
    { name: "id", value: "snapshot" },
  ]);
  if (first) {
    defaultTreeAdapter.insertBefore(head, guardScript, first);
    defaultTreeAdapter.insertBefore(head, snapshotScript, first);
  } else {
    defaultTreeAdapter.appendChild(head, guardScript);
    defaultTreeAdapter.appendChild(head, snapshotScript);
  }

  const output = serialize(doc);
  return { html: output, scriptHashes: hashes.join(" "), hash: keccakText(output) };
}
