# Floor rules

A floor is one small working tool, in one HTML file. It runs in a locked sandbox in a visitor's browser. Build inside these rules, or the shift fails.

## Deliverables

Write both files with `write_file`:

1. `index.html`: the whole tool. Start from `template.html`.
2. `floor.json`: its name, one line, how to use it, and its tests (see below).

Before you finish, call `run_floor_check` and fix everything it reports. It prints `CHECK PASS` when the files pass the static rules. You are done only when it does.

That check reads your files and does not run them. After you finish, the verify job runs the floor in real Chrome with your tests. An uncaught error or a failing test fails the shift.

## What a floor can do

- Use HTML, CSS and one inline `<script>`.
- Use the DOM, canvas, inline SVG, `data:` images and `innerHTML`.
- Keep state in memory while the page is open.
- Read the data snapshot: `JSON.parse(document.getElementById("snapshot").textContent)`. It holds public figures fetched for this shift. The pipeline inserts it, so a floor built without it still runs. Treat every field as possibly missing.

## What a floor cannot do

- Use the network. There is no `fetch`, no external script, style, image or font.
- Store anything. There are no cookies, `localStorage` or `indexedDB`.
- Touch a wallet.
- Navigate. There are no links out, no `location`, no `history`, no `form action`.
- Open windows or dialogs. There is no `alert`, `confirm`, `prompt` or `window.open`.
- Use `eval`, `new Function`, or string timers.
- Use more than one `<script>`, inline `on...` attributes, or `<iframe>`, `<object>`, `<embed>`, `<link>` or `<base>`.
- Assign handlers such as `onload` or `onerror` on `window` or `document.body`. They do nothing here, so use `addEventListener`.
- Exceed 256 KB.

Use only `document.something`, never a stored or computed `document`. Use only these on `window`: `addEventListener`, `removeEventListener`, `innerWidth`, `innerHeight`, `devicePixelRatio`, `matchMedia`, `getComputedStyle`, `requestAnimationFrame`, `cancelAnimationFrame`, `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`.

Plain words such as "Ethereum" are fine in labels. The lowercase names `ethereum`, `web3`, `solana` and `phantom` are not, in code or in strings, and neither are `http://` or `https://`.

## floor.json

```json
{
  "name": "Tip calculator",
  "oneLiner": "Work out a tip and a total from a bill.",
  "howToUse": "Enter the bill and the tip percent, then press Work it out.",
  "tests": [
    { "name": "shows the fields", "steps": [{ "op": "expectVisible", "selector": "#bill" }] },
    { "name": "works out the tip", "steps": [{ "op": "click", "selector": "#go" }, { "op": "expectText", "selector": "#result", "contains": "$15.00" }] },
    { "name": "uses typed values", "steps": [{ "op": "fill", "selector": "#bill", "value": "200" }, { "op": "click", "selector": "#go" }, { "op": "expectText", "selector": "#result", "contains": "$230.00" }] }
  ]
}
```

- `name` is at most 40 characters, `oneLiner` at most 120, `howToUse` at most 200.
- Write 3 to 12 tests. Tests are data, and each one starts from a freshly loaded floor.
- Step ops: `fill` (selector, value), `click` (selector), `select` (selector, value), `press` (selector, key), `expectText` (selector, contains), `expectValue` (selector, equals), `expectVisible` (selector), `expectCount` (selector, count).
- Test what the tool does, not only that it loads. Cover the main flow and one edge case.

## Quality

- It should do the one thing the brief asks, and do it well.
- It must work at a phone width and a desktop width.
- Use plain words. Say what the tool does. No marketing language, and no claims about returns, value or investing.
