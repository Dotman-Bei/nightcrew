# Night Crew: design spec

An AI dev crew that token holders command: they sign to vote for a feature, and by morning the crew has shipped it as a new working floor of a public tower, with a receipt on Base.

**Event pitch line:** Vote tonight. Live by morning.

## 1. Binding constraints

Pulled from the kickoff, the brief and the runsheet.

- **Target:** Base mainnet (chain 8453) for balance reads and EAS attestations. No custom contracts.
- **Runtime:** TypeScript strict, Next.js, Node 22, no local Docker (Windows laptop). The user creates hosting accounts.
- **Hard deadline:** Mon 2026-11-09 22:00 UTC. The Monday 22:00 shift starts at the close, so it cannot be evidence.
- **Team:** solo plus AI. Target tracks: none, one leaderboard, aim at the published rubric.
- **Must land:** the demo money shot. Open the tower and the newest floor is lit: yesterday it was one sentence from a holder, today it is a working tool. Flip it over and there is the vote tally, the agent's transcript, the green tests, the inference cost and the attestation on Base.
- **Out of scope:** a project token or token launch, custom smart contracts, a second community beyond a waitlist form, any floor with a backend, wallet, secret or write access, X or Farcaster integration, anything tied to the contest vote, ERC-8004 registration, Robinhood Chain, a mobile app, Overtime (see section 13).
- **Independence:** original art, no Vibestarter logos, a "not affiliated" line, no investment language in public copy.

### Calendar (binding)

| UTC | Milestone |
|---|---|
| Fri 6 Nov, by 18:00 | Step 1 approved and pushed |
| Fri 6 Nov, by 20:00 | The user's other day-1 dependencies done; Step 2 starts, pipeline first |
| Fri 6 Nov, by 22:00 | `ANTHROPIC_API_KEY` funded and `crew/probe-runtime.ts` run, so the Managed Agents answer is in (section 5) |
| Sat 7 Nov, 06:00 | Last safe moment for that answer (section 5) |
| Sat 7 Nov, 12:00 | Checkpoint: one end-to-end rehearsal done |
| Sat 7 Nov, 18:00 | Walking skeleton live on a public URL, nightly job armed. A missing second hostname does not hold this (section 6) |
| Sat 7 Nov, 22:00 | Scheduled shift 1 |
| Sun 8 Nov, 12:00 | Feature freeze |
| Sun 8 Nov, afternoon | One labelled off-schedule shift |
| Sun 8 Nov, 22:00 | Scheduled shift 2 |
| Mon 9 Nov, start by 10:00 | Spare labelled off-schedule shift, run only if fewer than 3 floors are on record |
| Mon 9 Nov, 12:00 | At least 3 floors on record; the user files the submission |
| Mon 9 Nov, after filing | The user decides judging-night settings from real costs (below) |
| Mon 9 Nov, 22:00 | Hard close |

### Inference budget (binding)

$5 of prepaid Anthropic credit, the user's stated limit. Prices verified on 2026-11-06 per 1M tokens (input / 5-minute cache write / cache read / output): Sonnet 5.5 $2 / $2.50 / $0.10 / $10; Haiku 5.5 $0.10 / $0.125 / $0.01 / $0.50. Session runtime is $0.08 per hour.

| Work | Model | Cap per session | Estimated cost (until the first real run) |
|---|---|---|---|
| Runtime probe, once | `claude-haiku-5-5` | $0.05 | under $0.05 |
| Build, rehearsal r1 and evidence shifts, including the spare | `claude-sonnet-5-5` | $0.60 | about $0.33 |
| Build, rehearsal r2, so Monday's decision has a real Haiku cost and floor to judge | `claude-haiku-5-5` | $0.10 | about $0.04 |
| Build, judging nights (9 to 15 Nov) | decided on Monday, below | | |
| Triage and review, every shift | `claude-haiku-5-5` | none, single calls | about $0.01 |

Through filing, with the spare used, that is 5 Sonnet builds, 1 Haiku build, the probe and 6 rounds of triage and review: worst case about $3.21, estimated about $1.80. A guard stops new crew work when recorded spend reaches `CREW_TOTAL_BUDGET_CENTS` (section 8).

#### Judging-night settings: a Monday decision

The build model for the 7 judging nights is deliberately not fixed here. The user decides on Monday after filing, using the real costs from rehearsals and evidence shifts.

The inputs are `remaining`, which is `CREW_TOTAL_BUDGET_CENTS` minus recorded spend, checked against the Console, and `needed`, which is 7 times the measured average cost of a Sonnet shift.

| Option | When it fits | Settings |
|---|---|---|
| Stay on Sonnet | `needed` is at most `remaining` | No change: `claude-sonnet-5-5`, `60` |
| Move to Haiku | Credit is short and rehearsal r2's floor was good enough | `claude-haiku-5-5`, `10`. At most about $0.77 for 7 nights |
| Top up $5 | Credit is short, Haiku's floor was not good enough, and the user chooses to spend it | Stay on Sonnet, and set `CREW_TOTAL_BUDGET_CENTS` to `950` |

If no decision is made by Mon 9 Nov 21:00 UTC, settings stay as they are, and the guard protects the credit: once it trips, later nights go dark with the reason "credit budget reached".

## 2. Terms

- **Shift:** one run of the pipeline. Scheduled nightly at 22:00 UTC.
- **Crew:** the three agents that run a shift: triage, build and review.
- **Floor:** what a successful shift ships: one small working tool, as one self-contained HTML file.
- **Tower:** the public home screen. Floors stack up as shifts succeed.
- **Dark floor:** a public shift that shipped nothing, for any reason. It still has a receipt.
- **Receipt:** the public record of one shift, passed or failed, anchored by an attestation on Base.
- **Rehearsal:** a full pipeline run labelled as a test. It stays off the tower, and the how-it-was-built page counts rehearsals openly.
- **On record:** a public shift, scheduled or off-schedule, that shipped a lit floor with a live receipt. Failed and dark shifts are published but do not count, and neither do rehearsals. An attestation still pending does not stop a floor counting, because attestation is a cut candidate. The evidence target is at least 3 floors on record by Mon 9 Nov 12:00 UTC.

## 3. Architecture

One Next.js app on Vercel Hobby, one Neon Postgres database added through the Vercel Marketplace, and one GitHub Actions workflow that runs shifts. There is no other infrastructure.

Vercel limits Hobby to non-commercial, personal use. That is acceptable for this entry, which takes no payments. Moving to Pro would be required before Overtime or a raise.

```
                   Visitors                         Holders
                      |                                |
        server-rendered pages, no wallet      /vote: wagmi, signs messages
                      |                                |
                 +----v--------------------------------v----+
                 |            Next.js on Vercel             |
                 |  pages, API routes, floor document route |
                 +----+--------------------------------+----+
                      |                                |
                      v                                v
                 Neon Postgres  <---------------  floors host (optional second hostname)
                      ^                           serves floors under strict CSP
                      |
   +------------------+------------------------------------------+
   | GitHub Actions: shift.yml                                    |
   | close --> crew --> verify --> publish                        |
   +------------------+---------------------+---------------------+
                      |                     |
                      v                     v
          Anthropic Managed Agents     Base: balance reads, EAS
          sealed sandbox
```

### Repository layout

```
app/                     Next.js App Router pages and route handlers
components/              React components for the pages
proxy.ts                 host routing between the main host and the floors host
lib/                     shared code, one responsibility per file
lib/floor-gate/          static gate, floor assembly, browser gate
crew/                    pipeline entry scripts, run with tsx by GitHub Actions
crew/prompts/            triage, build and review prompts
floor-kit/               what the build agent receives: template, rules, schema, check script
db/migrations/           plain SQL migrations
db/seed-dev.sql          fixture data for local pages and tests
public/taste/            assets copied unmodified from the design-taste-frontend skill
tests/                   Vitest suites
.github/workflows/       shift.yml
```

## 4. The shift pipeline

`.github/workflows/shift.yml` has four jobs. Each holds only what it needs. Artifacts pass between jobs as files under `shift-work/`.

| Job | Secrets and variables it holds | Reads | Writes |
|---|---|---|---|
| `close` | `DATABASE_URL`, `BASE_RPC_URL` | database, Base, Vibestarter read API | `shift-input.json` |
| `crew` | `ANTHROPIC_API_KEY`, `CREW_AGENT_ID`, `CREW_ENVIRONMENT_ID`, `CREW_BUILD_MODEL`, `CREW_SHIFT_CAP_CENTS` | `shift-input.json` | `crew-output/` |
| `verify` | nothing, `permissions: {}` | `crew-output/` | `verdict.json`, `assembled.html`, screenshots |
| `publish` | `DATABASE_URL`, `ATTESTER_PRIVATE_KEY`, `BASE_RPC_URL`, `EAS_SCHEMA_UID`, `VETO_ADDRESS` | all artifacts | database, Base attestation |

`publish` runs with `if: always()` whenever `close` claimed a shift, so a failed shift is published like a passed one.

### Triggers

- `schedule` with three cron entries: `0 22 * * *`, `20 22 * * *`, `40 22 * * *`. GitHub's scheduler can run late or drop a run, so the backups exist. Claiming a shift twice does nothing.
- `workflow_dispatch` with inputs `label` (`off-schedule` or `rehearsal`), `reason` (required text) and `rehearsal_proposal` (text, used only for a rehearsal).
- All jobs run only when repo variable `SHIFTS_ARMED` is `true`. The workflow uses `concurrency: shift`.

### Job `close`

1. **Claim.** A scheduled run claims the open shift only if `closes_at <= now()`, with one atomic `UPDATE`. An off-schedule run sets `closes_at = now()` and `label = 'off-schedule'` on the open shift, then claims it. A rehearsal never touches the open shift: it inserts its own shift (`label = 'rehearsal'`, slug `r<n>`) and its own seeded proposal from `rehearsal_proposal`. If nothing was claimed, the job exits and later jobs are skipped.
2. **Open the next shift.** A new open shift is created, closing at the next 22:00 UTC. There is always exactly one open shift.
3. **Budget guard.** If recorded spend plus `CREW_SHIFT_CAP_CENTS` exceeds `CREW_TOTAL_BUDGET_CENTS`, the shift is marked to skip the crew and goes dark with the reason "credit budget reached".
4. **Snapshot block.** The last Base block with a timestamp at or before `closes_at`, found by binary search. The clock decides, not the job's start time.
5. **Tally.** Section 7.
6. **Floor data.** The job fetches Vibestarter's public read endpoints (`/api/stats`, `/api/ledger/stats`, `/api/campaigns`, `/api/supply/circulating`) and on-chain $VIBES figures into `snapshot.json`, at most 100 KB. If a fetch fails, the shift continues with what it has, and the failure is noted in `snapshot.json`.
7. **Output.** `shift-input.json` holds the shift, the ranking with proposal text and the snapshot.

### Job `crew`

1. **Triage.** Single Messages API call on `claude-haiku-5-5`, no tools, structured output (section 6). It walks the ranking top-down, at most 5 proposals, and stops at the first accept. All decisions are kept. No accept means the shift goes dark.
2. **Build.** A Managed Agents session (section 5) receives the triage brief and the floor kit. The agent writes `/mnt/session/outputs/index.html` and `/mnt/session/outputs/floor.json`, and runs the kit's check script until it passes.
3. **Wait.** The job polls until the session is idle or terminated, with a 30-minute limit. A `requires_action` stop is answered with `deny`. A `budget_reached` stop fails the shift at stage `build`.
4. **Collect.** Output files are downloaded with `files.list({ scope_id })`, retrying for the indexing lag. Events become the normalized transcript. `session.usage.list_cost` gives the build cost.
5. **Review.** Single Messages API call on `claude-haiku-5-5`, no tools, structured output: `ship` or `send-back` with reasons. A `send-back` goes to the same session as one `user.message`, the job waits and collects again, and a second review runs. A second `send-back` fails the shift at stage `review`.
6. **Output.** `crew-output/` holds `crew-result.json`, `triage.json`, `review.json`, `transcript.json`, `floor/index.html` and `floor/floor.json`.

### Job `verify`

Runs on a fresh machine with no secrets. It assembles the floor (section 9), runs the static gate, then the browser gate in real Chrome with the fake provider, then the floor's declarative tests, and takes screenshots at 1200x800 and 390x844. It writes `verdict.json` and `assembled.html`. A floor that fails here fails the shift at stage `verify`.

### Job `publish`

Treats every input as hostile data: each file is schema-validated and length-limited before use, and nothing from `crew-output/` is executed.

1. Recomputes the assembled floor from the raw HTML and requires its hash to equal the verdict's.
2. Computes the diff against the blank template, the receipt bundle and all hashes.
3. In one transaction: stores the floor, receipt parts and shift status, marks the built proposal `built`, marks rejected proposals `rejected` with the reason.
4. Attests on Base (section 8). Before attesting, it retries any earlier receipt still marked pending.

Publish is idempotent per shift, so a failed run can be re-run from its artifacts.

## 5. The crew runtime

**Chosen by the user: Managed Agents in a sealed sandbox.** Rejected: `claude-code-action`, because its docs describe no network egress control, call secret scrubbing best-effort, and say injection risk is reduced, not eliminated.

**Fallback:** a Messages API loop on the GitHub runner with no shell, only `write_file`, `read_file` and `run_floor_check` tools. It is used only if the runtime probe forces it (see the decision point below). The `CrewRuntime` interface keeps the swap to one implementation file. The fallback is a plan regeneration, not pre-built code.

```ts
interface CrewRuntime {
  build(input: BuildInput): Promise<BuildResult>;
  sendBack(sessionId: string, reasons: string[]): Promise<BuildResult>;
}
```

### Sandbox settings

- **Environment** (created once by `crew/provision.ts`): `config: { type: "cloud", networking: { type: "limited", allowed_hosts: [], allow_package_managers: false, allow_mcp_servers: false } }`.
- **Agent** (created once): tools are `agent_toolset_20260401` with `web_fetch` and `web_search` disabled, and `permission_policy: always_allow`. The sandbox holds nothing worth protecting and has nowhere to send it, and any pause would hang an unattended shift.
- **Session** (one per shift): `agent_with_overrides` sets `model: { id: CREW_BUILD_MODEL, effort: "medium" }`. `budget: { type: "limit", max_list_cost: { amount: CREW_SHIFT_CAP_CENTS, currency: "USD" } }`. Resources are the floor kit files only. No GitHub resource, no vault.
- Scheduled deployments are not used, because their `initial_events` are fixed while each night's brief differs. GitHub Actions is the trigger.

The docs list the cloud sandbox as Ubuntu 24.04 with Node 22 and Playwright with Chromium at `/opt/pw-browsers/chromium`, so the agent can run the real gate offline. The runtime probe proves this.

### The runtime probe: `crew/probe-runtime.ts`

With the user's key in the environment, it creates the environment and agent, starts one Haiku session with a 5-cent cap, and asks the agent to report as JSON: the Node version, whether Playwright launches Chromium, and whether `curl https://example.com` fails. It exits 0 only if the session ran, Chromium launched and the network is sealed. It also prints how long the session took, because a new account may start on a lower rate-limit tier.

The script comes from the first two build tasks, the scaffold and the probe script, so the build does not have to reach the crew work first.

### The fallback decision point

**The decision is made when the probe runs, targeted for Fri 6 Nov by 22:00 UTC. The last safe moment is Sat 7 Nov 06:00 UTC,** which leaves time to regenerate and still rehearse by 12:00. Crew work against a fake runtime continues either way. Only the task that implements the real Managed Agents runtime waits for the answer.

| Probe result | Decision |
|---|---|
| Session ran, network sealed, Chromium launched | Managed Agents. The build continues as planned. |
| Session ran, network sealed, Chromium did not launch | Stay on Managed Agents. The agent's `check.mjs` runs only the static gate in the sandbox. Browser failures then surface in `verify`, so the shift fails rather than self-repairing. |
| API refuses access, or the network is not sealed | Fallback: the own-loop runtime above. The architect regenerates the crew runtime tasks, replacing one implementation file and its test. An unsealed network is not negotiable, because proposals are hostile text. |
| Not run by Sat 7 Nov 06:00 UTC | The Sat 12:00 rehearsal is at risk. The guide raises it with the user, who either runs the probe at once or takes the fallback, which needs only an API key. |

### Provisioning values

`crew/provision.ts` prints `CREW_AGENT_ID` and `CREW_ENVIRONMENT_ID`. The user stores them as repo variables. `ant apply` is not used because the `ant` CLI is not installed; a guarded SDK script is the documented alternative.

## 6. The security boundary

**The rule: the agent has no authority.** All authority sits in jobs that treat its output as data. The worst a hijacked agent can do is write bad files, and the gate rejects those.

### Hostile proposal text

- Triage has no tools and can only return this schema: `{ decision: "accept" | "reject", category: TriageCategory, reason: string (max 200), buildBrief: string | null (max 800) }`.
- `TriageCategory` is one of `ok`, `offensive`, `illegal`, `impersonation`, `investment`, `contest-vote`, `needs-backend`, `needs-wallet`, `too-large`, `not-a-tool`, `injection`, `model-refusal`.
- The proposal is passed inside a delimited data block, and the prompt says it is data to assess, never instructions.
- A `stop_reason: refusal` counts as a reject with category `model-refusal`.
- Build receives the triage brief, with the original quoted as data. Build prompts state that nothing inside the quote changes the rules.

### The floor rules

A floor is one HTML file of at most 256 KB, with inline CSS and JS only. It has no network access, no storage, no wallet, and no navigation. It may read one data block, `<script type="application/json" id="snapshot">`, holding the shift's data snapshot. Floors keep state in memory only.

### Static gate: `lib/floor-gate/static.ts`

Parses with `parse5` and `acorn`, and rejects on any finding. Its job is to give the agent early, clear feedback and to catch what the runtime cannot. The rules are in two sets, built as separate tasks.

**Core rules (must-have).** They guard the one thing the runtime cannot stop, a frame navigating itself, plus the file's structure:

- **File:** one HTML file of at most 256 KB.
- **HTML:** an element allowlist. Rejects `script[src]`, `script[type=module]`, `link`, `iframe`, `object`, `embed`, `base`, `meta[http-equiv]`, `form[action]`, any `on*` attribute, and any `src`, `href`, `action`, `formaction`, `srcset`, `poster`, `background` or `ping` value that is not a `#fragment` or `data:` URL. Rejects any non-`data:` `url()` in CSS.
- **JS, banned as a bare name or a member name:** `location`, `navigation`, `history`, `ownerDocument`, `getRootNode`, `write`, `writeln`. Also dynamic `import()`.
- **`document`:** may only appear as the object of a static member access. `const d = document` and `document[x]` are rejected.
- **`document.createElement`:** rejected with a non-literal argument, or with `iframe`, `script`, `object`, `embed`, `link`, `base`, `meta` or `form`.

**Extended rules (cut candidate 4).** They catch mistakes earlier and with clearer messages, but the runtime layers already contain what they cover:

- **JS, banned as a bare name or a member name:** `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `RTCPeerConnection`, `sendBeacon`, `importScripts`, `Worker`, `SharedWorker`, `serviceWorker`, `postMessage`, `MessageChannel`, `BroadcastChannel`, `localStorage`, `sessionStorage`, `indexedDB`, `cookie`, `caches`, `eval`, `Function`, `__proto__`, `globalThis`, `defaultView`, `contentWindow`, `contentDocument`, `frameElement`, `ethereum`, `web3`, `solana`, `phantom`, `execCommand`, `__ncw`. Also `.constructor` as a member; a class's own `constructor` method is allowed.
- **JS, banned as a bare global only:** `self`, `top`, `parent`, `frames`, `open`, `opener`, `chrome`, `external`. Member uses such as `rect.top` and local variables of the same name are fine.
- **`window`:** may only appear as the object of a static member access to an allowlisted name: `addEventListener`, `removeEventListener`, `innerWidth`, `innerHeight`, `devicePixelRatio`, `matchMedia`, `getComputedStyle`, `requestAnimationFrame`, `cancelAnimationFrame`, `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`.
- **String and template literals:** cooked values, so escapes do not hide content, are scanned for `ethereum`, `web3`, `solana`, `phantom`, `eip6963`, `metamask`, `http://`, `https://` and `javascript:`. Matching is case-sensitive, so a label like "Ethereum gas" passes.

The kit's `check.mjs` is a bundle of this same code plus the browser gate, so the agent sees what the gate sees.

### Assembly: `lib/floor-gate/assemble.ts`

Deterministic. It parses the raw floor and rewrites it:

1. Inserts the wallet guard as the first child of `<head>`.
2. Inserts the snapshot data block.
3. Wraps every inline script at global scope, so no closure can leak the real `window`: A script that is not a complete program on its own is refused, because `}})` would close the wrapper early.
   `(function(window,self,globalThis,top,parent,frames,opener,location,history,chrome,external,ethereum,web3,solana,phantom,fetch,XMLHttpRequest,WebSocket,EventSource,postMessage,localStorage,sessionStorage,indexedDB,open,navigation,frameElement,caches,cookieStore,documentPictureInPicture,addEventListener,removeEventListener,setTimeout,setInterval,clearTimeout,clearInterval,requestAnimationFrame,cancelAnimationFrame,matchMedia,getComputedStyle){"use strict"; <floor code> }).call(undefined, __ncw, undefined, ...)`.
   `window` and the trailing group from `addEventListener` onward receive `__ncw` and its safe functions; the rest receive `undefined`. `eval` and `Function` cannot be parameters in strict mode, and the CSP blocks them instead.
4. Computes a SHA-256 for the guard and every wrapped script, stored as `floors.script_hashes` for the CSP.

### Wallet guard: `lib/floor-gate/guard.ts`

The first script to run in every floor:

- Defines non-configurable accessors returning `undefined` for `ethereum`, `web3`, `solana`, `phantom`, `coinbaseWalletExtension`, `rabby`, `okxwallet`, `trustwallet`, `tronWeb`, `keplr`, `bitkeep`, `BinanceChain`, where the property is configurable. A provider already defined as non-configurable is handled by the shadowing above.
- Takes `Reflect.apply`, `Function.prototype.bind` and every event method it needs before floor code runs, because a floor can replace anything on a shared prototype. Its lookup tables have no prototype, so a name like `valueOf` is not on the allowlist by inheritance.
- Swallows `eip6963:announceProvider` and `eip6963:requestProvider` events, and replaces `postMessage` with a no-op.
- Makes `contentWindow`, `contentDocument` and `getSVGDocument()` return `null` on iframe, frame, object and embed elements, and the same for `Document.prototype.defaultView`, `UIEvent.prototype.view` and `document.open`, which returns the real window when given three arguments. Makes `Event.prototype.target`, `currentTarget` and `srcElement`, and `MessageEvent.prototype.source`, return `null` instead of the real window, and filters it out of `composedPath()`.
- Treats a listener added with no receiver as added to the window, through the same wrapper, because `EventTarget.prototype.addEventListener.call(undefined, ...)` would otherwise pass the real window as `this`.
- Turns off handler properties such as `onload` on the window, the body and the frameset, which also run with the real window as `this`. Floors use `addEventListener`.
- Publishes `__ncw`, a restricted proxy over an allowlist of window members. Its timers and listeners call the floor's callback with `this` undefined, because the HTML spec otherwise passes the real window to timer callbacks.

### Serving: `app/f/[hash]/route.ts`

```
Content-Security-Policy: sandbox allow-scripts; default-src 'none'; script-src <floors.script_hashes>;
  style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:; connect-src 'none';
  frame-src 'none'; worker-src 'none'; object-src 'none'; manifest-src 'none'; form-action 'none';
  base-uri 'none'; frame-ancestors <main origin>
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), clipboard-read=()
Cross-Origin-Resource-Policy: cross-origin
Cache-Control: public, max-age=31536000, immutable
```

- `script-src` lists only hashes, with no `'unsafe-inline'` and no `'unsafe-eval'`. Inline event handlers, `javascript:` URLs, scripts inserted through the DOM, `Function` and string timers all fail, so floors may use `innerHTML` safely.
- The CSP `sandbox` directive means the floor is sandboxed even when opened directly in a tab, so its origin is opaque and it has no cookies or storage.
- The floor page embeds it as `<iframe sandbox="allow-scripts" allow="" referrerpolicy="no-referrer">`, with no `allow-same-origin`.
- **Self-navigation cannot be stopped by CSP or the sandbox.** Assigning `document.location` loads another page inside the frame. So the static gate rejects it, the browser gate fails on it, and the floor page counts the frame's `load` events and removes the frame on a second one, replacing it with a line saying the floor tried to leave its sandbox.
- When `FLOORS_ORIGIN` is set, the route is served only from that second hostname. `proxy.ts` returns 404 for `/f/*` on the main host and for everything except `/f/*` on the floors host.
- On the main host a floor's URL is relative, so it works on any port and any deployment URL. `frame-ancestors` is `NEXT_PUBLIC_SITE_ORIGIN` when set, otherwise the request's own host.
- A vetoed floor returns 410.

### The second hostname does not block launch

**If `FLOORS_ORIGIN` is not ready by Sat 7 Nov 18:00 UTC, the walking skeleton ships anyway, serving floors from the main host under the CSP sandbox.** Setting the variable later moves floors to the second hostname with no code change and no change to floor URLs on the tower.

The sandbox is what isolates a floor, not the hostname. Verified 2026-11-06 in main-host mode, with a site cookie set: the floor's origin was `null`, `document.cookie` threw `SecurityError` both in the frame and when the floor was opened directly in a tab, the fake provider was not touched, and the tool still worked. The main site sets no login cookie and keeps wallet state only on `/vote`. What a second hostname adds is a backstop if the `sandbox` directive were ever missing from a response.

`/built` states which mode is live, from `FLOORS_ORIGIN`:

- **Second hostname:** "Floors run on their own hostname, in a sandboxed frame with no storage, no network and no wallet access."
- **Main host:** "Floors run from this site's own hostname for now, in a sandboxed frame with no storage, no network and no wallet access. The browser treats each floor as a separate, unknown origin, so it cannot read this site's data. A separate hostname is the next step, as a backstop."

### Wallet-free pages

The tower, receipt, floor, how-it-was-built and rejected pages load no wallet code. `/vote` and `/veto` load wallet code and never embed a floor. The tower runs no floor code at all.

### Browser gate: `lib/floor-gate/browser.ts`

Uses `playwright-core` with Chrome from `CHROME_PATH`. It serves the floor from a local server with the production headers, inside the production iframe, with a fake injected wallet provider installed in every frame before any page script by `context.addInitScript`. The provider is a recording Proxy, tested in both configurable and non-configurable forms. Scoped to the floor's frame, it fails on:

- any touch of the fake provider
- any wallet discovery event reaching the page
- any network request other than the floor document (the browser's own favicon request is ignored)
- any navigation of the floor frame
- any dialog or new window
- any uncaught error or console error

### Declarative tests

`floor.json` holds `{ name (max 40), oneLiner (max 120), howToUse (max 200), tests: FloorTest[] (3 to 12) }`. Tests are data, not code, so agent-written tests execute nothing in the runner. Step ops are `fill`, `click`, `select`, `press`, `expectText`, `expectValue`, `expectVisible` and `expectCount`.

### Proof

`tests/fixtures/hostile-floors.ts` holds 33 floors, one per attack: wallet calls, wallet access through `this`, `defaultView`, a built-up name and discovery events, fetch exfiltration, an image beacon, an iframe realm trick, inline handlers and scripts through `innerHTML`, self-navigation, a form post, storage and cookie reads, `eval`, `Function`, string timers, timer `this`, listener `this` and `composedPath`. Each fixture names the rule set that rejects it, core or extended, and must also be contained by the browser gate with the static gate switched off. Self-navigation is contained by failing the gate, not by preventing it, which is why its rule is in the core set. The launch checklist includes one manual check with the user's real wallet extension, plus 12 found in review: a name built from pieces reaching the wallet through `valueOf` on the restricted window, a replaced `bind`, `call` or `filter`, replaced discovery methods, body and bare handlers, `srcElement`, a listener with no receiver, `document.open`, a frame element, and a script that closes the wrapper early. A floor marked `runtime` is one no static rule can see, so only the runtime stops it.

**Verified 2026-11-06 in a spike** against real Chrome with `playwright-core` 1.65.0 and a fake provider in both configurable and non-configurable forms:

- The provider was touched zero times, and `window.ethereum` and bare `ethereum` were both undefined.
- `Function` and `[].constructor.constructor` threw `EvalError`, and string timers were refused.
- An `innerHTML` `onerror` handler and a DOM-inserted script were both blocked by the hashed CSP, and an image beacon was blocked.
- `document.cookie` threw `SecurityError`, and an iframe's `contentWindow` was `null`.
- `this` was `undefined` in timer, listener, rAF, microtask and idle callbacks.
- A normal tool still worked: a Playwright click inside the sandboxed frame updated its state.
- Self-navigation got through and raised the parent's `load` count to 2, which is why the floor page removes the frame.

**Verified again 2026-11-06 after review.** The first guard let 13 attacks reach a non-configurable provider, and one reach a configurable one. All 32 attacks now hold in both modes. A one-off sweep walked every object reachable from floor code, about 1,000 of them, and found no route to the real window. With one defence removed, the same sweep found it, so the sweep can detect a leak.

### What stays open

No browser-side guard can cover every wallet extension. A deliberately hidden escape that beat every layer would still only raise a prompt the visitor must approve. The how-it-was-built page says so plainly.

### Veto

The user can veto an open proposal or darken a shipped floor by signing with the `VETO_ADDRESS` wallet at `/veto`. Each veto is stored with its reason and shown on `/rejected`. A vetoed proposal is excluded from the ranking. A darkened floor returns 410, and its receipt stays public.

## 7. Votes

### Proposing

`POST /api/proposals` accepts `{ text, address, signature, signedAt }`. Text is one sentence of 1 to 200 characters. `signedAt` must be within 10 minutes of the server clock. Proposals stay open until built, rejected or vetoed. Seeded proposals are inserted by `crew/seed-proposals.ts` with `seeded = true` and are labelled on every page that shows them.

**Limits:**

- One proposal per wallet per shift.
- Five proposals per IP per hour, counted in `rate_events` (section 9) using a salted hash of Vercel's client IP. Rows older than 24 hours are deleted on each write, so no IP history builds up.
- An exact duplicate of an open proposal, after normalising case and whitespace, is refused, and the response points the wallet at the existing proposal to vote for.
- **There is no overall cap per shift.** A cap would let anyone with enough fresh wallets lock real holders out for the night, and it would save nothing, because triage reads at most the top 5 whatever the list's length.

**How the open list stays usable:**

- **Spam cannot jump the queue.** A proposal with no votes ranks below every proposal with votes, and zero-vote proposals rank oldest first, so a flood of new proposals sits at the back.
- **`/vote` shows two lists.** "Top 5" is ordered by current weight estimate, which is what triage reads first. "All open proposals" is newest first, 20 to a page, with server-side `?page=` paging.
- **The tower shows only the top 5** and the total count.
- **The list shrinks by itself.** Built, rejected and vetoed proposals leave it.

**A known limit, recorded rather than engineered away:** someone who votes for five bad proposals can force one dark night, because triage stops after 5. Those five are then rejected and leave the list, so repeating it needs five new proposals each time, and the user can veto ahead of the close.

Signed text, from `lib/messages.ts`:

```
Night Crew feature proposal
Proposal: <text>
Signed at: <ISO 8601 time>
This signature costs no gas and moves no funds.
```

### Voting

`POST /api/votes` accepts `{ shiftSlug, proposalId, address, signature, signedAt }`. One vote per wallet per shift, changeable until the close by upsert, where a later `signedAt` wins. Votes after `closes_at` are refused. Votes do not carry over to the next shift. Votes are limited to 60 per IP per hour, because an invalid signature can trigger an RPC call during verification.

```
Night Crew feature vote
I want the crew to build proposal #<id> in shift <slug>.
Signed at: <ISO 8601 time>
This signature costs no gas and moves no funds.
```

A test asserts both messages contain none of `Vibeathon`, `Vibestarter`, `back`, `entry`, so they stay plainly different from the contest vote.

### Signature checks

Offline recovery first. If the recovered address differs, viem's `publicClient.verifyMessage` on Base, which handles ERC-1271 and ERC-6492, so smart wallets work. Connectors are injected wallets (EIP-6963) and Coinbase Smart Wallet. WalletConnect is left out because it needs another account.

### Weight and tally

`weight = max(1, floor((held + staked) / 1e18))`, in whole $VIBES.

- `held`: `balanceOf(voter)` on `0xefFC8815487084a97edfdfF968b56Ea123421Acb` at the snapshot block, batched through Multicall3.
- `staked` (**cut candidate 2**): `GET https://app.vibestarter.xyz/api/staking/stats?wallet=<address>`, field `stakedBalance`. It is current-only, so receipts label it "current at tally". If it is unavailable, stake counts as 0 and the tally records `stakeMode: "unavailable"`. If cut, `stakeMode` is `"omitted"`.
- Before the close, pages show `votes.weight_estimate`, read at vote time and marked as an estimate.
- Ranking: weight descending, then wallets descending, then proposal id ascending.
- With no votes, the crew builds the oldest open proposal and the receipt says zero votes. With no open proposals, the floor goes dark and no inference is spent.
- A proposal stays open if its build fails, and it leaves the ranking after 2 failed attempts, so one bad proposal cannot burn every night's budget.
- Weight is linear, as the brief says, so a large holder can decide a night alone. The tally always shows weight and wallet count together.

## 8. Receipts and attestation

### Receipt bundle

`lib/receipt.ts` builds this object. Field names follow Vibestarter's Origin Capsule where they overlap, so receipts are reusable in a later founder application.

```ts
type ReceiptBundle = {
  standard: "nightcrew-receipt/1";
  shift: { slug: string; label: "scheduled" | "off-schedule" | "rehearsal"; closes_at: string; started_at: string; finished_at: string; snapshot_block: string | null };
  proposal: { id: number; text: string; author: string; seeded: boolean } | null;
  outcome: "shipped" | "failed" | "dark";
  failure: { stage: "close" | "triage" | "build" | "review" | "verify" | "publish"; reason: string } | null;
  dark_reason: string | null;
  agent_identity: "night-crew";
  agent_tool: "Claude Managed Agents";
  model_provider: "Anthropic";
  models: { triage: string; build: string | null; review: string | null };
  founder_address: string;
  tally_hash: string;
  triage_hash: string;
  transcript_hash: string | null;
  floor_hash: string | null;
  diff_hash: string | null;
  tests: { passed: number; total: number; hash: string } | null;
  cost_cents: number;
  timestamp: string;
};
```

- Canonical JSON: `lib/canonical.ts`, sorted keys, no whitespace, UTF-8.
- Every hash is keccak256 of the part's canonical bytes. The receipt hash is keccak256 of the canonical bundle.
- Raw parts are stored and served at `/api/receipts/[slug]/[part]` (`bundle.json`, `tally.json`, `triage.json`, `transcript.json`, `floor.html`, `diff.patch`, `tests.json`), so anyone can re-hash them.
- `cost_cents` is the platform's `list_cost` for the build session plus triage and review priced from token usage with the price table in `lib/prices.ts`.
- Before storing, the transcript is scanned for key-shaped strings (`sk-ant-`, 64-hex private keys). A match replaces that string with `[removed]`, and a status entry at the end of the transcript, which the receipt hashes, says how many were removed. The sandbox holds no secrets, so a match would be a defect worth seeing.
- Transcript entries are truncated to 20 KB each for storage, and the truncation is marked. The hash covers what is stored.

### Attestation (**cut candidate 3**)

- Schema, registered once by `crew/register-schema.ts` on `0x4200000000000000000000000000000000000020`, with no resolver and `revocable = false`:
  `bytes32 receiptHash,string shift,string outcome,bytes32 transcriptHash,bytes32 floorHash,string agentIdentity,string modelProvider,address founder,uint32 costCents`
- Attest on `0x4200000000000000000000000000000000000021` from the wallet in `ATTESTER_PRIVATE_KEY`, using viem only. The attestation UID comes from the `Attested` event.
- Every shift is attested, including failed and dark ones and rehearsals.
- If attesting fails, the receipt shows "attestation pending" and the next publish retries. Cutting this to a follow-up shift means only that publish does not block on it.

### Spend guard

`shifts.cost_cents` records each shift's spend, including any failed session's reported cost. `CREW_TOTAL_BUDGET_CENTS` starts at 450, which leaves 50 cents unallocated, and that margin covers the probe, which is not a shift. After a $5 top-up it becomes 950.

## 9. Data model

`db/migrations/001_init.sql`. Addresses are stored lowercase.

```sql
create table shifts (
  id             bigserial primary key,
  slug           text not null unique,             -- '1', '2', 'r1'
  label          text not null check (label in ('scheduled','off-schedule','rehearsal')),
  status         text not null check (status in ('open','closed','shipped','failed','dark')),
  closes_at      timestamptz not null,
  started_at     timestamptz,
  finished_at    timestamptz,
  reason         text,                             -- required for off-schedule and rehearsal
  snapshot_block bigint,
  tally          jsonb,
  build_model    text,
  cost_cents     integer not null default 0,
  failure_stage  text,
  failure_reason text,
  created_at     timestamptz not null default now()
);
create unique index one_open_shift on shifts (status) where status = 'open';

create table proposals (
  id            bigserial primary key,
  text          text not null check (char_length(text) between 1 and 200),
  normalised    text not null,                     -- lower case, single spaces
  author        text not null,
  signature     text,
  signed_at     timestamptz,
  seeded        boolean not null default false,
  status        text not null default 'open' check (status in ('open','built','rejected','vetoed')),
  status_reason text,
  status_category text,
  failed_attempts integer not null default 0,
  shift_opened  bigint not null references shifts(id),
  built_in      bigint references shifts(id),
  created_at    timestamptz not null default now()
);
create unique index one_proposal_per_wallet_per_shift on proposals (author, shift_opened) where seeded = false;
create unique index one_open_copy_of_a_proposal on proposals (normalised) where status = 'open';

create table votes (
  shift_id        bigint not null references shifts(id),
  voter           text not null,
  proposal_id     bigint not null references proposals(id),
  signature       text not null,
  signed_at       timestamptz not null,
  weight_estimate numeric,
  created_at      timestamptz not null default now(),
  primary key (shift_id, voter)
);

create table floors (
  shift_id    bigint primary key references shifts(id),
  name        text not null,
  one_liner   text not null,
  how_to_use  text not null,
  html        text not null,
  hash        text not null unique,
  script_hashes text not null,                     -- space-separated CSP sources
  status      text not null default 'lit' check (status in ('lit','vetoed')),
  dark_reason text,
  screenshot_wide   text,                            -- base64 PNG
  screenshot_narrow text
);

create table receipts (
  shift_id         bigint primary key references shifts(id),
  bundle           text not null,
  receipt_hash     text not null,
  attestation_uid  text,
  attestation_tx   text,
  attestation_status text not null default 'pending' check (attestation_status in ('pending','attested'))
);

create table receipt_parts (
  shift_id bigint not null references shifts(id),
  part     text not null,
  content  text not null,
  primary key (shift_id, part)
);

create table vetoes (
  id          bigserial primary key,
  target_type text not null check (target_type in ('proposal','floor')),
  target_id   bigint not null,
  reason      text not null check (char_length(reason) between 1 and 300),
  signature   text not null,
  signed_at   timestamptz not null,
  created_at  timestamptz not null default now()
);

create table waitlist (
  id         bigserial primary key,
  community  text not null check (char_length(community) between 1 and 80),
  contact    text not null check (char_length(contact) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (community, contact)
);

create table rate_events (
  key text not null,                               -- e.g. 'proposal:<salted ip hash>'
  at  timestamptz not null default now()
);
create index rate_events_key_at on rate_events (key, at);
```

### Database access

`lib/db.ts` exposes one function: `query<T>(sql, params) => Promise<{ rows: T[] }>`. With `DATABASE_URL` set it uses `@neondatabase/serverless` over HTTP. Without it, as in local dev and tests, it uses `@electric-sql/pglite` in memory, applies the migrations and loads `db/seed-dev.sql`.

### Numbering

A public shift's slug is the next integer. Every public shift is one floor, lit or dark, so floor n is shift n. Rehearsal slugs are `r1`, `r2`.

## 10. Public face

`docs/FRONTEND.md` holds the visual direction, real copy and component rules. Pages in build order:

1. **Tower** `/`: the landing page and the product. Six screens: hero with the live tower and the newest floor lit, last night's floor, tonight's vote, how a shift works, the whole tower with the close of the build window marked, and the close and footer. The first screen alone answers what this is, what shipped last night, what is being voted on tonight, and how to vote.
2. **Receipt** `/shifts/[slug]`: proposal, tally, triage decision, transcript, diff against the blank floor, test results, cost, attestation link, downloadable parts.
3. **Floor** `/floors/[slug]`: the tool in its sandbox, one click from its receipt.
4. **Vote and propose** `/vote`: connect a wallet, vote, propose. Shows the top 5 and the paged list of all open proposals (section 7).
5. **How it was built** `/built`: the product's own build, the rehearsal count, the security model and what stays open, which hostname floors are served from (section 6), the waitlist form.
6. **Rejected** `/rejected`: every triage rejection and veto with its reason.
7. **Veto** `/veto`: accepts only the `VETO_ADDRESS` signature, not linked from public pages, `noindex`.

Pages 1, 2, 3, 5 and 6 are server-rendered, wallet-free, and use `export const revalidate = 30`. Every page carries a "not affiliated" line. `tests/copy.test.ts` scans page sources for investment language and scans the voting flow for any mention of the contest vote.

## 11. Failure handling

| Failure | Result |
|---|---|
| No open proposals | Dark floor, reason "no proposals", no inference |
| Every proposal tried is rejected | Dark floor, reason "no proposal passed triage" |
| Credit guard reached | Dark floor, reason "credit budget reached", no inference |
| Session hits its cap | Failed at stage `build`, reason "spend cap reached" |
| Session exceeds 30 minutes, build and send-back together | Interrupted, failed at stage `build` |
| Anthropic API error or no credit | Failed at the stage it happened |
| Output files missing | Failed at stage `build` |
| `floor.json` malformed | Failed at stage `verify`, with the reason on the receipt |
| Review sends back twice | Failed at stage `review` |
| Gate rejects the floor | Failed at stage `verify`, findings shown on the receipt |
| Attestation fails, or the attester key is unusable | Shift stands, attestation pending, retried next publish |
| Publish fails | The run is red and re-runnable from its artifacts; nothing is half-written because the writes are one transaction |
| Base RPC fails during tally | Failed at stage `close` |
| Top 5 proposals all rejected | Dark floor, reason "no proposal passed triage". The five leave the list |
| Second hostname not ready by Sat 18:00 UTC | Floors serve from the main host under the CSP sandbox; `/built` says so |
| Fewer than 3 floors on record by Mon 10:00 UTC | Run the spare off-schedule shift |
| Fewer than 3 floors on record at Mon 12:00 UTC | File anyway with the true count. The submission stays editable until 22:00, so another off-schedule shift can still be added if credit allows |

Failed and dark public shifts both render as dark floors on the tower. The receipt names the stage and the reason.

## 12. Testing

- **Vitest** with PGlite for everything touching the database. No Docker and no external services.
- **Real Chrome** for the browser gate and the hostile floor corpus, via `CHROME_PATH`.
- **Pipeline test:** `tests/pipeline.e2e.test.ts` runs close, crew, verify and publish with a fake `CrewRuntime`, a fake triage and review model, a fake chain reader and a fake attester. The whole pipeline can be built and proven before the user's key exists.
- **Page gate:** each page task runs `scripts/check-page.mjs <route>`, which builds the app, starts it on a local port with seeded data, runs the skill's `check.mjs` at the five sizes and exits with the checker's code. Routes have no leading slash, because Git Bash rewrites `/` into a Windows path. The Floor page adds `--expect-floor`, because the checker cannot see inside a frame and passes a broken one.
- **Verified 2026-11-06:** `check.mjs --url http://127.0.0.1:<port>/<path>` works against both `next dev` and `next start` on Next 16.4.5 with TypeScript 7.0.2. It exited 0 with no findings at all five sizes on a test page. No static export and no `--root`.

## 13. Cut candidates

For the Sat 7 Nov 12:00 UTC checkpoint, confirmed by the user, in this order. The three must-haves stay.

1. **Overtime.** Already cut at design. It needs Vercel Pro at about $20 a month, which is four times the inference budget, plus a stored GitHub token on the app server. The plans carry no Overtime tasks. Consequence: a judge cannot watch the whole loop in one sitting, so transcripts and receipts carry that proof.
2. **The staking half of vote weight.** Plan tasks are tagged. If cut, wallets holding only staked $VIBES count at minimal weight. About 82.8M was staked on 2026-11-06, out of a 1B supply.
3. **The attestation moving to a follow-up shift.** Plan tasks are tagged. Receipts stay intact and show "attestation pending".
4. **A trimmed static gate.** Added by the user, and the architect agrees with one exception. The extended rules (section 6) can go, because the Chrome spike ran every attack with no static gate at all and the runtime layers contained all of them except self-navigation. The core rules stay, because they are the only early defence against a floor that navigates itself on a delay too long for the browser gate's run to see. The plan builds the extended rules as their own task, so cutting them means not building it. Consequence: agent mistakes such as calling `fetch` surface as runtime errors rather than clear messages. `check.mjs` still shows them to the agent, because it also runs the browser gate.

## 14. Human gates

Executors never run these. Each is a `human_gate: true` task. They are listed in the order they fall due, and the first two come first so the Managed Agents answer lands on Fri 6 Nov.

| # | Gate | Names | Due (UTC) | Notes |
|---|---|---|---|---|
| 1 | Fund the API key | `ANTHROPIC_API_KEY` | Fri 6 Nov | $5 credit. Needed locally for gate 2, and later as a GitHub secret. |
| 2 | Probe the runtime | `ANTHROPIC_API_KEY` | Fri 6 Nov, by 22:00 | `crew/probe-runtime.ts`, built by the first two build tasks. Its result is the fallback decision (section 5). |
| 3 | Provision agent and environment | `CREW_AGENT_ID`, `CREW_ENVIRONMENT_ID` | Sat 7 Nov, morning | Repo variables. |
| 4 | Vercel and Neon | `DATABASE_URL`, `RATE_LIMIT_SALT` | Sat 7 Nov, before the rehearsal | One account via the Marketplace. `DATABASE_URL` is a secret in GitHub and an env var in Vercel. `RATE_LIMIT_SALT` is a random string, an env var in Vercel. |
| 5 | Attester key | `ATTESTER_PRIVATE_KEY` | Sat 7 Nov, before the rehearsal | GitHub secret, never in chat or the repo. The wallet is already funded. |
| 6 | Register the EAS schema | `EAS_SCHEMA_UID` | Sat 7 Nov, before the rehearsal | Run once with the attester key. Repo variable. |
| 7 | Your wallet address | `VETO_ADDRESS` | Sat 7 Nov, before the rehearsal | Public. Used for vetoes and as `founder_address`. |
| 8 | Budget settings | `CREW_BUILD_MODEL`, `CREW_SHIFT_CAP_CENTS`, `CREW_TOTAL_BUDGET_CENTS` | Sat 7 Nov, before the rehearsal | Repo variables: `claude-sonnet-5-5`, `60`, `450`. |
| 9 | Rehearsals | `gh workflow run` | Sat 7 Nov, by 12:00 | Spends credit. r1 on Sonnet at `60`. r2 on Haiku at `10`, to give the Monday decision a real comparison. |
| 10 | Seed proposals | `DATABASE_URL` | Sat 7 Nov, before 18:00 | `crew/seed-proposals.ts`, at least 5, labelled as seeded. |
| 11 | Deploy | `NEXT_PUBLIC_SITE_ORIGIN` | Sat 7 Nov, by 18:00 | First deploy, then each deploy after. |
| 12 | Arm the nightly job | `SHIFTS_ARMED` | Sat 7 Nov, by 18:00 | Repo variable set to `true`. |
| 13 | Second hostname (non-blocking) | `FLOORS_ORIGIN` | When ready | Added to the same Vercel project. If it is late, floors serve from the main host (section 6). |
| 14 | Real-wallet check | none | Sat 7 Nov, after the first live floor | Open one live floor with a real wallet extension and confirm no prompt. |
| 15 | Off-schedule shift | `gh workflow run` | Sun 8 Nov, afternoon, after the freeze | Labelled. |
| 16 | Spare off-schedule shift | `gh workflow run` | Mon 9 Nov, start by 10:00 | Only if fewer than 3 floors are on record. Labelled. |
| 17 | File the submission | none | Mon 9 Nov, 12:00 | The user, wallet-gated, via Step 3. |
| 18 | Decide judging-night settings | `CREW_BUILD_MODEL`, `CREW_SHIFT_CAP_CENTS`, `CREW_TOTAL_BUDGET_CENTS` | Mon 9 Nov, by 21:00 | From real costs. Options include a $5 top-up (section 1). |

## 15. Stack, pinned

Versions read from npm on 2026-11-06.

| Package | Version |
|---|---|
| `next` | 16.4.5 |
| `react`, `react-dom` | 19.3.1 |
| `typescript` | 7.0.2 |
| `viem` | 2.57.16 |
| `wagmi` | 3.7.11 |
| `@tanstack/react-query` | 5.106.1 |
| `@coinbase/wallet-sdk` | 4.3.7 |
| `@anthropic-ai/sdk` | 1.6.0 |
| `@neondatabase/serverless` | 1.2.0 |
| `@electric-sql/pglite` | 0.5.15 |
| `vitest` | 5.1.0 |
| `tsx` | 4.23.15 |
| `esbuild` | 0.28.2 |
| `acorn` | 8.19.0 |
| `acorn-walk` | 8.3.5 |
| `parse5` | 8.1.0 |
| `playwright-core` | 1.65.0 |
| `zod` | 4.6.7 |
| `diff` | 9.0.0 |

Chrome on this laptop: `C:\Program Files\Google\Chrome\Application\chrome.exe`. GitHub's `ubuntu-latest` runner includes Chrome.

## 16. Reference build

All non-UI code and all seven pages were built in a throwaway reference build on 2026-11-06, then replayed task by task in clean folders, so each plan task carries code that already passed its gate. The build found defects the design alone did not:

- The floor wrapper first sat inside a closure holding the real `window`, and timer callbacks received the real `window` as `this`. Both are closed, and both are in the hostile set.
- The floor page's frame broke on any port but one while the layout checker passed. The URL is now relative, and the gate proves the floor renders.
- Kit scripts raced React hydration, so they now load after it.
- Proposals ranked by weight as text, so 52,000 sorted above 509,010. Ranking is now numeric, with a test.
- The plan review found 13 routes from floor code to the real window, in the guard and the wrapper. Section 6 lists the fixes, and each route is now in the hostile set.

This does not replace Step 2. The orchestrator still builds every task from the plans and proves every gate.

## 17. Design decisions

| Question | Answer | Source |
|---|---|---|
| Cut order at the checkpoint | Overtime, staking half of weight, attestation to a follow-up shift, then a trimmed static gate | User, 2026-11-06, extended in the revision |
| Crew runtime | Managed Agents in a sealed sandbox, own loop as the fallback | User, 2026-11-06 |
| Credit | $5, the user's stated limit | User, 2026-11-06 |
| Build model | Sonnet 5.5 for rehearsal r1 and evidence, Haiku 5.5 for rehearsal r2, triage and review | User, 2026-11-06 |
| Judging-night model | Decided on Monday from real costs, with a $5 top-up as an option | User, revision 2026-11-06 |
| Order of human gates | Fund the key and run the probe first, so the answer lands on Fri 6 Nov | User, revision 2026-11-06 |
| Proposal cap per shift | Dropped. Per-wallet and per-IP limits instead | User, revision 2026-11-06 |
| Second hostname | Non-blocking. Main host under the CSP sandbox if not ready by Sat 18:00 UTC | User, revision 2026-11-06 |
| Evidence target | 3 floors on record, meaning shipped floors, with a spare off-schedule slot on Mon morning | User, revision 2026-11-06 |
| Fourth cut candidate | Extended static rules can go; core rules stay | User proposed, architect agreed with that exception |
| Landing page | The tower at `/` is the landing page | User, 2026-11-06 |
| Overtime | Cut at design, because it needs Vercel Pro | Derived from the $5 limit |
| Host | Vercel Hobby, Neon via Marketplace, GitHub Actions | Architect, approved in design section 1 |
| Floor format | One self-contained HTML file in Postgres | Architect, approved in design section 1 |
| Name | Night Crew. A search found no product with this name; the nearest was NIGHTSHIFT ($SHIFT), seen only on DexScreener listings | Brief's working title, user did not object |
