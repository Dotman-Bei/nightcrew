import { ancestor as walkAncestor, simple as walkSimple } from "acorn-walk";
import { memberName, type Finding, type JsNode } from "@/lib/floor-gate/static-core";

const BANNED_ANYWHERE = new Set(["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "RTCPeerConnection", "sendBeacon", "importScripts", "Worker", "SharedWorker", "serviceWorker", "postMessage", "MessageChannel", "BroadcastChannel", "localStorage", "sessionStorage", "indexedDB", "cookie", "caches", "eval", "Function", "__proto__", "globalThis", "defaultView", "contentWindow", "contentDocument", "frameElement", "srcElement", "ethereum", "web3", "solana", "phantom", "execCommand", "__ncw"]);
const BANNED_BARE_GLOBALS = new Set(["self", "top", "parent", "frames", "open", "opener", "chrome", "external"]);
const WINDOW_ALLOWLIST = new Set(["addEventListener", "removeEventListener", "innerWidth", "innerHeight", "devicePixelRatio", "matchMedia", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "setTimeout", "clearTimeout", "setInterval", "clearInterval"]);
const BANNED_STRINGS = ["ethereum", "web3", "solana", "phantom", "eip6963", "metamask", "http://", "https://", "javascript:"];

function collectDeclaredNames(ast: JsNode): Set<string> {
  const declared = new Set<string>();
  const addPattern = (pattern: JsNode | null): void => {
    if (!pattern) return;
    if (pattern.type === "Identifier") declared.add(pattern.name as string);
    if (pattern.type === "ObjectPattern") for (const property of pattern.properties as JsNode[]) addPattern((property.value ?? property.argument) as JsNode);
    if (pattern.type === "ArrayPattern") for (const element of pattern.elements as (JsNode | null)[]) addPattern(element);
    if (pattern.type === "AssignmentPattern") addPattern(pattern.left as JsNode);
    if (pattern.type === "RestElement") addPattern(pattern.argument as JsNode);
  };
  const addFunction = (fn: JsNode): void => {
    if (fn.id) addPattern(fn.id as JsNode);
    for (const param of fn.params as JsNode[]) addPattern(param);
  };
  walkSimple(ast as never, {
    VariableDeclarator(node: unknown) {
      addPattern((node as JsNode).id as JsNode);
    },
    FunctionDeclaration(node: unknown) {
      addFunction(node as JsNode);
    },
    FunctionExpression(node: unknown) {
      addFunction(node as JsNode);
    },
    ArrowFunctionExpression(node: unknown) {
      addFunction(node as JsNode);
    },
    ClassDeclaration(node: unknown) {
      addPattern((node as JsNode).id as JsNode);
    },
    CatchClause(node: unknown) {
      addPattern((node as JsNode).param as JsNode);
    },
  } as never);
  return declared;
}

/** Rules the runtime already contains. They exist to give the agent clearer, earlier messages. */
export function checkExtendedScript(ast: JsNode): Finding[] {
  const findings: Finding[] = [];
  const declared = collectDeclaredNames(ast);
  const checkString = (value: string): void => {
    for (const banned of BANNED_STRINGS) {
      if (value.includes(banned)) findings.push({ rule: "banned-string", detail: `a string contains "${banned}"` });
    }
  };
  walkAncestor(ast as never, {
    Identifier(node: unknown, _state: unknown, ancestors: unknown) {
      const id = node as JsNode;
      const chain = ancestors as JsNode[];
      const parent = chain[chain.length - 2];
      const name = id.name as string;
      if (BANNED_ANYWHERE.has(name)) findings.push({ rule: "banned-name", detail: `${name} is not available in a floor` });
      if (BANNED_BARE_GLOBALS.has(name) && !declared.has(name)) findings.push({ rule: "banned-global", detail: `${name} is not available in a floor` });
      if (name === "window") {
        const isStaticObject = parent?.type === "MemberExpression" && parent.object === id && !parent.computed;
        const member = isStaticObject ? memberName(parent) : null;
        if (!member || !WINDOW_ALLOWLIST.has(member)) findings.push({ rule: "window-member", detail: `window${member ? `.${member}` : ""} is not available in a floor` });
      }
    },
    MemberExpression(node: unknown) {
      const member = node as JsNode;
      const name = memberName(member);
      if (name && BANNED_ANYWHERE.has(name)) findings.push({ rule: "banned-name", detail: `.${name} is not available in a floor` });
      if (name === "constructor") findings.push({ rule: "banned-name", detail: ".constructor is not available in a floor" });
    },
    Literal(node: unknown) {
      const literal = node as JsNode;
      if (typeof literal.value === "string") checkString(literal.value);
    },
    TemplateElement(node: unknown) {
      const element = node as JsNode;
      const cooked = (element.value as { cooked?: string | null }).cooked;
      if (cooked) checkString(cooked);
    },
  } as never);
  return findings;
}
