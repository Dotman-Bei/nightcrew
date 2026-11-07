import { parse as parseJs } from "acorn";
import { ancestor as walkAncestor } from "acorn-walk";
import { defaultTreeAdapter, parse as parseHtml, type DefaultTreeAdapterTypes } from "parse5";
import { MAX_FLOOR_BYTES } from "@/lib/config";

export type Finding = { rule: string; detail: string };
export type JsNode = { type: string; start: number; end: number; [key: string]: unknown };
type TreeNode = DefaultTreeAdapterTypes.Node;

const ALLOWED_ELEMENTS = new Set("html head title meta style script body main section header footer nav article aside h1 h2 h3 h4 h5 h6 p div span ul ol li dl dt dd table thead tbody tfoot tr th td caption colgroup col form fieldset legend label input textarea select option optgroup button output progress meter details summary small strong em b i u s sub sup code pre kbd samp var mark abbr time blockquote q cite hr br img figure figcaption canvas a svg g path circle rect line polyline polygon ellipse text tspan defs lineargradient radialgradient stop clippath mask desc".split(" "));
const URL_ATTRS = new Set(["src", "href", "xlink:href", "action", "formaction", "srcset", "poster", "background", "ping", "data", "manifest", "cite", "longdesc"]);
const CORE_BANNED_NAMES = new Set(["location", "navigation", "history", "ownerDocument", "getRootNode", "write", "writeln"]);
const BANNED_CREATE = new Set(["iframe", "script", "object", "embed", "link", "base", "meta", "form", "frame", "frameset", "portal"]);

function isSafeUrl(value: string): boolean {
  const v = value.trim();
  return v === "" || v.startsWith("#") || /^data:(image|font)\//i.test(v);
}

function checkCss(css: string, where: string, findings: Finding[]): void {
  for (const match of css.matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/gi)) {
    const target = match[2].trim();
    if (!/^data:(image|font)\//i.test(target) && !target.startsWith("#")) {
      findings.push({ rule: "css-external", detail: `${where} loads ${target.slice(0, 80)}` });
    }
  }
  if (/@import/i.test(css)) findings.push({ rule: "css-import", detail: `${where} uses @import` });
}

export type ParsedFloor = { scripts: string[]; findings: Finding[] };

/** Walks the HTML, applies the structure rules and returns the inline scripts. */
export function parseFloor(html: string): ParsedFloor {
  const findings: Finding[] = [];
  if (Buffer.byteLength(html, "utf8") > MAX_FLOOR_BYTES) {
    findings.push({ rule: "file-size", detail: `the floor is over ${MAX_FLOOR_BYTES} bytes` });
  }
  const scripts: string[] = [];
  const visit = (node: TreeNode): void => {
    if (defaultTreeAdapter.isElementNode(node)) {
      const tag = node.tagName.toLowerCase();
      if (!ALLOWED_ELEMENTS.has(tag)) findings.push({ rule: "element", detail: `<${tag}> is not allowed` });
      for (const attribute of node.attrs) {
        const name = attribute.name.toLowerCase();
        if (name.startsWith("on")) findings.push({ rule: "inline-handler", detail: `<${tag} ${name}> is not allowed; use addEventListener` });
        if (name === "srcdoc") findings.push({ rule: "srcdoc", detail: `<${tag} srcdoc> is not allowed` });
        if (URL_ATTRS.has(name) && !isSafeUrl(attribute.value)) findings.push({ rule: "external-url", detail: `<${tag} ${name}="${attribute.value.slice(0, 80)}"> must be a #fragment or data: URL` });
        if (name === "style") checkCss(attribute.value, `<${tag} style>`, findings);
      }
      if (tag === "meta" && node.attrs.some((item) => item.name === "http-equiv")) findings.push({ rule: "meta-http-equiv", detail: "<meta http-equiv> is not allowed" });
      if (tag === "form" && node.attrs.some((item) => item.name === "action")) findings.push({ rule: "form-action", detail: "<form action> is not allowed" });
      const text = node.childNodes.map((child) => (defaultTreeAdapter.isTextNode(child) ? child.value : "")).join("");
      if (tag === "style") checkCss(text, "<style>", findings);
      if (tag === "script") {
        const type = node.attrs.find((item) => item.name === "type")?.value;
        if (node.attrs.some((item) => item.name === "src")) findings.push({ rule: "script-src", detail: "<script src> is not allowed; keep all code inline" });
        if (type === "application/json") {
          if (node.attrs.find((item) => item.name === "id")?.value !== "snapshot") findings.push({ rule: "script-type", detail: 'the only JSON script allowed has id="snapshot"' });
        } else if (type !== undefined && type !== "" && type !== "text/javascript") {
          findings.push({ rule: "script-type", detail: `<script type="${type}"> is not allowed` });
        } else {
          scripts.push(text);
        }
      }
    }
    if ("childNodes" in node) for (const child of node.childNodes) visit(child);
  };
  visit(parseHtml(html));
  if (scripts.length > 1) findings.push({ rule: "one-script", detail: `the floor has ${scripts.length} scripts; keep all code in one` });
  return { scripts, findings };
}

export function parseScript(code: string, findings: Finding[]): JsNode | null {
  try {
    return parseJs(code, { ecmaVersion: "latest", sourceType: "script" }) as unknown as JsNode;
  } catch (error) {
    findings.push({ rule: "js-syntax", detail: error instanceof Error ? error.message : "the script does not parse" });
    return null;
  }
}

/** The name of a member access, for both a.b and a["b"]. Null when it cannot be known statically. */
export function memberName(node: JsNode): string | null {
  const property = node.property as JsNode;
  if (!node.computed && property.type === "Identifier") return property.name as string;
  if (property.type === "Literal" && typeof property.value === "string") return property.value;
  return null;
}

export function checkCoreScript(ast: JsNode): Finding[] {
  const findings: Finding[] = [];
  walkAncestor(ast as never, {
    ImportExpression() {
      findings.push({ rule: "dynamic-import", detail: "import() is not allowed" });
    },
    Identifier(node: unknown, _state: unknown, ancestors: unknown) {
      const id = node as JsNode;
      const chain = ancestors as JsNode[];
      const parent = chain[chain.length - 2];
      const name = id.name as string;
      if (CORE_BANNED_NAMES.has(name)) findings.push({ rule: "banned-name", detail: `${name} is not allowed: a floor must not navigate` });
      if (name === "document") {
        const isStaticObject = parent?.type === "MemberExpression" && parent.object === id && !parent.computed;
        if (!isStaticObject) findings.push({ rule: "document-alias", detail: "document may only be used as document.something, never stored or indexed" });
      }
    },
    MemberExpression(node: unknown) {
      const member = node as JsNode;
      const name = memberName(member);
      if (name && CORE_BANNED_NAMES.has(name)) findings.push({ rule: "banned-name", detail: `.${name} is not allowed: a floor must not navigate` });
    },
    CallExpression(node: unknown) {
      const call = node as JsNode;
      const callee = call.callee as JsNode;
      if (callee.type !== "MemberExpression") return;
      const name = memberName(callee);
      if (name !== "createElement" && name !== "createElementNS") return;
      const args = call.arguments as JsNode[];
      const tagArg = name === "createElement" ? args[0] : args[1];
      if (!tagArg || tagArg.type !== "Literal" || typeof tagArg.value !== "string") {
        findings.push({ rule: "create-element", detail: `${name} needs a literal tag name` });
      } else if (BANNED_CREATE.has(tagArg.value.toLowerCase())) {
        findings.push({ rule: "create-element", detail: `${name}("${tagArg.value}") is not allowed` });
      }
    },
  } as never);
  return findings;
}
