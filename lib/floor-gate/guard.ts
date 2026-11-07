/**
 * The first script to run in every floor. It runs before any floor code and holds the only
 * reference to the real window. Floor code gets `__ncw`, a restricted proxy, through the wrapper
 * in assemble.ts. Stored as a string so it can be hashed for the CSP.
 *
 * A floor shares this realm's prototypes and can replace anything on them, so everything used after
 * this script finishes is taken here, up front: nothing below looks a method up at run time. The
 * lookup tables have no prototype, so a name like `valueOf` is not on the allowlist by inheritance.
 */
export const WALLET_GUARD = String.raw`(function () {
  "use strict";
  var apply = Reflect.apply;
  var bindTo = Function.prototype.bind;
  var define = Object.defineProperty;
  var describe = Object.getOwnPropertyDescriptor;
  var table = function () { return Object.create(null); };
  var realAdd = EventTarget.prototype.addEventListener;
  var realRemove = EventTarget.prototype.removeEventListener;
  var realDispatch = EventTarget.prototype.dispatchEvent;
  var stopNow = Event.prototype.stopImmediatePropagation;
  var eventPath = Event.prototype.composedPath;
  var eventType = describe(Event.prototype, "type").get;
  var mapGet = WeakMap.prototype.get;
  var mapSet = WeakMap.prototype.set;
  var startTimer = window.setTimeout;
  var startRepeat = window.setInterval;
  var NoTimer = TypeError;

  ["ethereum","web3","solana","phantom","coinbaseWalletExtension","rabby","okxwallet","trustwallet","tronWeb","keplr","bitkeep","BinanceChain"].forEach(function (n) {
    try { define(window, n, { get: function () { return undefined; }, set: function () {}, configurable: false }); } catch (e) {}
  });

  var swallow = function (e) { apply(stopNow, e, []); };
  apply(realAdd, window, ["eip6963:announceProvider", swallow, true]);
  apply(realAdd, window, ["eip6963:requestProvider", swallow, true]);
  var prefix = "eip6963:";
  var isDiscovery = function (ev) {
    var type = apply(eventType, ev, []);
    for (var i = 0; i < prefix.length; i += 1) if (type[i] !== prefix[i]) return false;
    return true;
  };
  var fixed = function (proto, prop, fn) { try { define(proto, prop, { value: fn, writable: false, configurable: false }); } catch (e) {} };
  try { define(window, "postMessage", { value: function () {}, writable: false, configurable: false }); } catch (e) {}

  /* A method called with no receiver acts on the real window, and a listener added that way would get it as this. */
  var isWindow = function (target) { return target === undefined || target === null || target === window; };
  var listeners = new WeakMap();
  var wrapped = function (f) {
    if (typeof f !== "function") return f;
    var w = apply(mapGet, listeners, [f]);
    if (!w) {
      w = function (e) { return apply(f, undefined, [e]); };
      apply(mapSet, listeners, [f, w]);
    }
    return w;
  };
  var addSafe = function (t, f, o) { return apply(realAdd, window, [t, wrapped(f), o]); };
  var removeSafe = function (t, f, o) { return apply(realRemove, window, [t, wrapped(f), o]); };
  fixed(EventTarget.prototype, "addEventListener", function (t, f, o) { return isWindow(this) ? addSafe(t, f, o) : apply(realAdd, this, [t, f, o]); });
  fixed(EventTarget.prototype, "removeEventListener", function (t, f, o) { return isWindow(this) ? removeSafe(t, f, o) : apply(realRemove, this, [t, f, o]); });
  fixed(EventTarget.prototype, "dispatchEvent", function (ev) {
    if (isDiscovery(ev)) return true;
    return apply(realDispatch, isWindow(this) ? window : this, [ev]);
  });

  var nul = function (proto, prop) { try { define(proto, prop, { get: function () { return null; }, configurable: false }); } catch (e) {} };
  var none = function () { return null; };
  ["HTMLIFrameElement","HTMLFrameElement","HTMLObjectElement","HTMLEmbedElement"].forEach(function (name) {
    var element = window[name];
    if (!element) return;
    nul(element.prototype, "contentWindow");
    nul(element.prototype, "contentDocument");
    fixed(element.prototype, "getSVGDocument", none);
  });
  nul(Document.prototype, "defaultView");
  nul(UIEvent.prototype, "view");
  /* With three arguments, document.open(url, "_self", "") returns the real window. */
  fixed(Document.prototype, "open", none);

  var hide = function (proto, prop) {
    var d = describe(proto, prop);
    if (!d || !d.get) return;
    var read = d.get;
    try { define(proto, prop, { get: function () { var v = apply(read, this, []); return v === window ? null : v; }, configurable: false }); } catch (e) {}
  };
  ["target","currentTarget","srcElement","originalTarget","explicitOriginalTarget"].forEach(function (prop) { hide(Event.prototype, prop); });
  if (window.MessageEvent) hide(MessageEvent.prototype, "source");
  fixed(Event.prototype, "composedPath", function () {
    var all = apply(eventPath, this, []);
    var out = [];
    for (var i = 0; i < all.length; i += 1) if (all[i] !== window) out[out.length] = all[i];
    return out;
  });

  /* A handler property on the window, or one the body forwards to it, runs with the real window as this. */
  var mute = function (target) {
    Object.getOwnPropertyNames(target).forEach(function (name) {
      if (name.indexOf("on") !== 0) return;
      try { define(target, name, { get: function () { return null; }, set: function () {}, configurable: false }); } catch (e) {}
    });
  };
  mute(window);
  mute(Window.prototype);
  mute(HTMLBodyElement.prototype);
  if (window.HTMLFrameSetElement) mute(HTMLFrameSetElement.prototype);
  /* Some engines forward these six from the generic setter when the element is a body or frameset. */
  var brandOf = function (proto, prop) { var d = describe(proto, prop); return d && d.get; };
  var brands = [brandOf(HTMLBodyElement.prototype, "text")];
  if (window.HTMLFrameSetElement) brands[1] = brandOf(HTMLFrameSetElement.prototype, "cols");
  var forwards = function (element) {
    for (var i = 0; i < brands.length; i += 1) {
      if (brands[i]) { try { apply(brands[i], element, []); return true; } catch (e) {} }
    }
    return false;
  };
  ["onblur","onerror","onfocus","onload","onresize","onscroll"].forEach(function (name) {
    var d = describe(HTMLElement.prototype, name);
    if (!d || !d.set) return;
    var write = d.set;
    try { define(HTMLElement.prototype, name, { get: d.get, set: function (f) { if (!forwards(this)) apply(write, this, [f]); }, configurable: false }); } catch (e) {}
  });

  var timer = function (start) {
    return function (fn, ms) {
      if (typeof fn !== "function") throw new NoTimer("timer needs a function");
      var rest = [];
      for (var i = 2; i < arguments.length; i += 1) rest[rest.length] = arguments[i];
      return start(function () { return apply(fn, undefined, rest); }, ms);
    };
  };
  var allow = table();
  ["innerWidth","innerHeight","devicePixelRatio","matchMedia","getComputedStyle","requestAnimationFrame","cancelAnimationFrame","clearTimeout","clearInterval"].forEach(function (name) { allow[name] = true; });
  var safe = table();
  safe.addEventListener = addSafe;
  safe.removeEventListener = removeSafe;
  safe.setTimeout = timer(startTimer);
  safe.setInterval = timer(startRepeat);
  var traps = table();
  traps.get = function (_, k) {
    if (safe[k]) return safe[k];
    if (!allow[k]) return undefined;
    var v = window[k];
    return typeof v === "function" ? apply(bindTo, v, [window]) : v;
  };
  traps.set = function () { return true; };
  traps.has = function (_, k) { return !!allow[k] || !!safe[k]; };
  traps.getOwnPropertyDescriptor = function () { return undefined; };
  traps.ownKeys = function () { return []; };
  traps.getPrototypeOf = function () { return null; };
  traps.defineProperty = function () { return true; };
  traps.deleteProperty = function () { return true; };
  define(window, "__ncw", { value: new Proxy(table(), traps), writable: false, configurable: false, enumerable: false });
})();`;
