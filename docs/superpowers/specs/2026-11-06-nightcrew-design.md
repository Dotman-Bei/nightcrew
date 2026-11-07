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
| Fri 6 Nov, by 22:00 | `OPENROUTER_API_KEY` set with a credit limit and `crew/probe-openrouter.ts` run, so the OpenRouter answer is in (section 5) |
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

A $5 OpenRouter key, with a usable balance of at most about $4.70 until the probe prints the real figure. Prices read from OpenRouter on 2026-11-06 per 1M tokens (input / 5-minute cache write / cache read / output): Sonnet 5.5 $2 / $2.50 / $0.10 / $10; Haiku 5.5 $0.10 / $0.125 / $0.01 / $0.50. These are for planning only. **The runtime spends from the cost each reply reports, never from a price table.**

| Work | Model | Cap | Worst case, cents | Expected, cents |
|---|---|---|---:|---:|
| Probe, once | both | none, short calls | 2 | 1 |
| Rehearsal r1 | `anthropic/claude-sonnet-5.5` | 60 | 90 | 35 |
| Rehearsal r2, so Monday's decision has a real Haiku cost and floor to judge | `anthropic/claude-haiku-5.5` | 10 | 13 | 4 |
| 3 real shifts | `anthropic/claude-sonnet-5.5` | 60 each | 270 | 105 |
| **Required: 3 real shifts and 2 rehearsals** | | | **375** | **145** |
| Spare shift, if needed | `anthropic/claude-sonnet-5.5` | 60 | 90 | 35 |
| **Total with the spare** | | | **465** | **180** |
| Build, judging nights (9 to 15 Nov) | decided on Monday, below | | | |

**It fits, with no cut.** `CREW_SHIFT_CAP_CENTS` stays at `60` (`10` for r2). `CREW_TOTAL_BUDGET_CENTS` is the probe's printed figure: remaining credit in cents, minus 30, and never above `440`. With a usable balance of 470, that is about `438`. A guard stops new crew work when recorded spend reaches it (section 8).

**What was assumed.**

- *Worst case of 90 for a Sonnet shift:* the 60 cap, plus up to 28 for a last call that can only be stopped after it returns (16,000 output tokens at $10 per 1M, which is 16, plus a 60,000-token conversation with no cache hits at $2 per 1M, which is 12), plus 2 for triage and review. Prompt caching should make the real figure lower.
- *Expected 35:* a floor of about 25 KB, about 8,000 tokens; about 2,000 thinking tokens on each writing turn at `medium` effort; up to 6 turns with one full rewrite; prompt caching on; and about 1 cent for triage and review. These are estimates until r1. `launch:7` records r1's real cost and flags the guide if it is over 70 cents, twice the expected figure, or if the build stopped at its spend cap. With a cap of 60, a shift passes 70 only through that last call, so the cap stop is the likelier signal.
- *Why it fits under 470:* the probe spends at most 2, leaving 468, so the total is 438. The guard starts a shift only while recorded spend plus 60 is at most the total, and that shift can run 30 over. So spend ends at most at 468.
- *The key's own credit limit* is a hard stop on top of all this, enforced by OpenRouter.

#### Judging-night settings: a Monday decision

The build model for the 7 judging nights is deliberately not fixed here. The user decides on Monday after filing, using the real costs from rehearsals and evidence shifts.

The inputs are `remaining`, which is `CREW_TOTAL_BUDGET_CENTS` minus recorded spend, checked against real credit with `crew/probe-openrouter.ts --credit-only`, and `needed`, which is 7 times the measured average cost of a Sonnet shift.

| Option | When it fits | Settings |
|---|---|---|
| Stay on Sonnet | `needed` is at most `remaining` | No change: `anthropic/claude-sonnet-5.5`, `60` |
| Move to Haiku | Credit is short and rehearsal r2's floor was good enough | `anthropic/claude-haiku-5.5`, `10`. At most about $0.77 for 7 nights |
| Top up | Credit is short, Haiku's floor was not good enough, and the user chooses to spend it | Stay on Sonnet, raise the key's limit, and set `CREW_TOTAL_BUDGET_CENTS` to recorded spend plus the new remaining credit in cents, minus 30 |

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
          OpenRouter, to Anthropic     Base: balance reads, EAS
          tool loop on the runner
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
| `crew` | `OPENROUTER_API_KEY`, `CREW_BUILD_MODEL`, `CREW_SHIFT_CAP_CENTS`, optional `CREW_STRUCTURED_MODE` and `CREW_BUILD_TRANSPORT` | `shift-input.json` | `crew-output/` |
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

1. **Triage.** Single call on `anthropic/claude-haiku-5.5`, no working tools, schema-constrained output (section 6). It walks the ranking top-down, at most 5 proposals, and stops at the first accept. All decisions are kept. No accept means the shift goes dark.
2. **Build.** The tool loop (section 5) receives the triage brief and the floor kit, on `CREW_BUILD_MODEL`. The agent writes `index.html` and `floor.json` in its temp folder, and calls `run_floor_check` until it passes.
3. **Limits.** The loop stops at 16 turns, 300,000 tokens, the spend cap or 30 minutes. A stop at a limit fails the shift at stage `build`, unless the floor had already passed its check.
4. **Collect.** The job reads the two files from the temp folder. The loop's events become the normalized transcript. The cost is the sum of what each reply reported.
5. **Review.** Single call on `anthropic/claude-haiku-5.5`, no working tools, schema-constrained output: `ship` or `send-back` with reasons. A `send-back` continues the same conversation as one user message, and a second review runs. A second `send-back` fails the shift at stage `review`.
6. **Output.** `crew-output/` holds `crew-result.json`, which carries the triage and review decisions, `transcript.json`, `floor/index.html` and `floor/floor.json`.

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

**Amended 2026-11-06, by the user: an OpenRouter tool loop on the GitHub runner.** The user could not fund an Anthropic API account, because the card was refused, and holds a $5 OpenRouter key instead. Managed Agents is not available on OpenRouter. This is the spec's own fallback, taken for a different reason than a failed probe. Earlier rejected: `claude-code-action`, because its docs describe no network egress control, call secret scrubbing best-effort, and say injection risk is reduced, not eliminated.

The `CrewRuntime` interface stays, and the swap is one implementation file, `crew/lib/openrouter-runtime.ts`:

```ts
interface CrewRuntime {
  build(input: BuildInput): Promise<BuildResult>;
  sendBack(sessionId: string, reasons: string[]): Promise<BuildResult>;
}
```

### How the crew reaches the models

The pinned `@anthropic-ai/sdk` points at OpenRouter's Anthropic-compatible Messages endpoint: `new Anthropic({ baseURL: "https://openrouter.ai/api", apiKey: null, authToken: OPENROUTER_API_KEY })`. It is the smallest change and the strongest proof available without a key. Sonnet 5.5 has mandatory reasoning, and this endpoint returns thinking blocks natively, so sending them back unchanged is enough. It is also the setup OpenRouter documents for a Claude tool loop.

| Fact | Value | Source, read 2026-11-06 |
|---|---|---|
| Build slug | `anthropic/claude-sonnet-5.5`, $2 / $10 per 1M tokens (cache write $2.50, cache read $0.10) | [endpoints](https://openrouter.ai/api/v1/models/anthropic/claude-sonnet-5.5/endpoints) |
| Triage and review slug | `anthropic/claude-haiku-5.5`, $0.10 / $0.50 per 1M tokens, 5 times that above 100,000 prompt tokens | [endpoints](https://openrouter.ai/api/v1/models/anthropic/claude-haiku-5.5/endpoints) |
| Base URL and auth | `https://openrouter.ai/api`, bearer token. A call with an invalid key got a 401 from `/api/v1/messages` in Anthropic's error shape | [Claude Code guide](https://openrouter.ai/docs/guides/guides/claude-code-integration) |
| Tool calling | `tools`, `tool_choice`, `tool_use` and `tool_result` blocks, in the `/messages` schema | [OpenAPI](https://openrouter.ai/openapi.json) |
| Structured output | `output_config.format` with `type: json_schema`, in the `/messages` schema | [OpenAPI](https://openrouter.ai/openapi.json) |
| A refusal | `stop_reason: refusal` on a normal reply. A moderation block or a provider-side refusal is a 403 before or instead of a reply | [OpenAPI](https://openrouter.ai/openapi.json), [errors](https://openrouter.ai/docs/api/reference/errors-and-debugging) |
| Cost per reply | `usage.cost`, in dollars, on a non-streamed reply. **The published stream schema does not list it**, so a streamed call may have to use `GET /v1/generation?id=`, field `total_cost`, with the id from the `X-Generation-Id` header | [OpenAPI](https://openrouter.ai/openapi.json), [streaming](https://openrouter.ai/docs/api/reference/streaming) |
| Remaining credit | `GET /v1/key`, field `limit_remaining`, which is **null unless the key has a credit limit**. `GET /v1/credits` needs a management key | [limits](https://openrouter.ai/docs/api/reference/limits), [credits](https://openrouter.ai/docs/api/api-reference/credits/get-credits) |
| Out of credit | A 402. `metadata.limit_source` says why: `openrouter_credits`, `openrouter_key_limit` or `openrouter_in_flight_budget` | [limits](https://openrouter.ai/docs/api/reference/limits) |

Three more facts shaped the design:

- **The in-flight budget.** A low-balance or new account has a cap on the estimated cost of running and recently finished requests, as a fraction of its balance, even with credit left. The estimate uses `max_tokens`, so every call sets it. `in_flight_budget_exhausted` is transient: the client waits out `Retry-After`, up to 3 times. On the Messages endpoint errors come in Anthropic's shape, which may drop OpenRouter's `metadata`, so the client also recognises this from the message and the header. `weight_exceeds_budget` means one request is too large: the build drops from 16,000 to 8,000 tokens once.
- **Sonnet 5.5 rejects a forced `tool_choice` with a 400, and reasoning cannot be turned off.** The default effort is `high`, so the build sets `medium`. Thinking counts toward `max_tokens` and is billed as output.
- **History must stay append-only.** Thinking blocks are bound to the system prompt, the tools and every earlier message, so none of them changes during a build.

### The loop

- **Tools:** exactly `write_file`, `read_file` and `run_floor_check`. No shell, no network, no server tools, no plugins. A model call has no `tool_choice`.
- **Paths:** confined to a temp folder from `mkdtemp`. A path must match a strict relative pattern, and it is resolved and checked again. Only `index.html` and `floor.json` can be written, each at most 256 KB. The kit is read-only under `kit/`. A read returns at most 24,000 characters.
- **Routing:** every call is pinned with `provider: { only: ["anthropic"], allow_fallbacks: false }`.
- **Model allowlist:** `CREW_BUILD_MODEL` must be one of the two exact slugs. A suffix such as `:online` would add web search, so it is refused.
- **Limits, all checked before each call:** 16 model turns, 300,000 tokens in total, a conversation of 60,000 tokens, `CREW_SHIFT_CAP_CENTS` from real reported cost, and 30 minutes, shared by the build and its send-back. A call can pass the cap only by its own cost, at most about 28 cents on Sonnet (section 1). One call can run past the 30 minutes by at most its own 6-minute timeout, which the crew job's 50-minute limit covers. A floor that already passed its check still ships if a limit stops the closing message.
- **`max_tokens`:** 16,000 per call. A call cut off by the limit writes nothing, and the agent is told to write a smaller file.
- **Cost:** the runtime spends only from what each reply reports. If a reply reports no cost, the run stops rather than spend blind. Each `BuildResult` reports only what that call to the runtime spent.
- **Never throws after spending:** a failed call returns what was already spent, with a reason in public words. No response body reaches a receipt.
- **Retries:** only an HTTP error, which is not billed: a 429 or 5xx, up to 3 times. The SDK's own retries are off, because it would also retry a timed-out call, and OpenRouter can bill a call the client gave up on. A dropped call fails the build instead. Its cost is then missing from the record, which is why `launch:16` checks recorded spend against real credit.
- **Prompt caching:** `cache_control: { type: "ephemeral" }` at the top level of each build call.

### `run_floor_check` never runs anything

`crew/lib/floor-check.ts` runs the static gate, the `floor.json` schema and assembly, in-process, on the agent's text. All three only parse. It adds one check of its own: an id that a test names must appear somewhere in `index.html`, because otherwise that test can never pass.

**The crew job never executes agent output and never opens a browser. The browser gate stays in the secretless verify job.** A test fails if any crew source imports Playwright, the browser gate, `child_process` or `vm`, and the workflow test fails if the crew job runs anything but `npm ci` and `crew/crew.ts`.

**What this costs.** The agent can no longer run its own floor. Runtime errors and failing tests first show up in `verify`, which fails the shift with no chance to fix it. Three things reduce this: the id check above, a build prompt that tells the agent to trace each test by hand, and a review prompt that checks the same. The spare shift covers the rest. Rehearsal r1 is the first real measure of this rate. If it is high, the option is to feed verify's findings to a second crew job. That is not built, and it goes through the architect.

### Two settings, so a probe finding is not a plan change

Both are optional repo variables, read by the probe and the crew job. An unset value means the default, and a mistyped one stops the job.

| Variable | Default | Other value | Use it when |
|---|---|---|---|
| `CREW_STRUCTURED_MODE` | `json-schema` | `forced-tool` | Schema output is unsupported. Triage and review make a forced tool call that nothing runs, and the existing local schema validation checks the reply. This works only because they stay on Haiku 5.5, which accepts a forced `tool_choice` |
| `CREW_BUILD_TRANSPORT` | `non-stream` | `stream` | A long non-streamed call drops. Every build call streams, and cost comes from the stream if present, otherwise from the generation lookup |

### The probe: `crew/probe-openrouter.ts`

The user sets a credit limit on the key, sets `OPENROUTER_API_KEY` in the shell, and runs it. It spends under 2 cents. In order, it checks: the key and its credit, both slugs on Anthropic's own endpoint, a tool round trip on each model at the build's real `max_tokens` with thinking blocks sent back, schema output in the current mode, where a streamed call's cost comes from, and one long call on Haiku in the current transport. Every model call must report a cost.

It prints `REMAINING CREDIT`, `SET CREW_TOTAL_BUDGET_CENTS TO`, `STREAMED COST COMES FROM`, and last `PROBE RESULT: <result>`. **It exits 0 only on `ok`.** `--credit-only` reads the credit and spends nothing.

**`usage.cost` on a streamed reply is not confirmed.** The docs say usage arrives in `message_delta`, but the published schema for that event has no `cost` field, and no call can be made without the user's key. The probe's `STREAMED COST COMES FROM` line settles it: `response`, `lookup` or `none`. Stream mode works with `response` or `lookup`. With `none`, stream mode is unavailable, and the probe still passes if non-stream works.

### The decision point

**The decision is made when the probe runs, targeted for Fri 6 Nov by 22:00 UTC. The last safe moment is Sat 7 Nov 06:00 UTC.** The build does not wait for it, because `pipeline:8` is proven against a scripted OpenRouter, and the expected fallbacks are settings.

| Probe result | Decision |
|---|---|
| `ok` | Continue. Use the printed budget figure in `launch:6`. |
| `key-invalid` | Copy the key again and re-run. Nothing was spent. |
| `no-credit-figure` | Set a credit limit on the key, no higher than the balance, and re-run. Nothing was spent. |
| `no-credit` | Top up, or raise the key's limit. If the balance is what it should be, tell the guide. |
| `structured-output-unsupported`, forced tool works | Set `CREW_STRUCTURED_MODE=forced-tool` in the shell and as a repo variable, and re-run. |
| `structured-output-unsupported`, forced tool fails too | Back to the architect. |
| `too-large` | Even 8,000 tokens does not fit the in-flight budget on Sonnet. Move the build to Haiku, or add credit. Decide with the guide. |
| `long-call-dropped` | Set `CREW_BUILD_TRANSPORT=stream` in the shell and as a repo variable, and re-run. If `STREAMED COST COMES FROM` said `none`, back to the architect. |
| `model-missing` | A slug has changed. Back to the architect to update the two slugs. |
| `tools-failed` | Back to the architect, for a Chat Completions client. |
| `no-cost` | Back to the architect, for a cost lookup on every call. |
| Not run by Sat 7 Nov 06:00 UTC | The Sat 12:00 rehearsal is at risk. The guide raises it with the user. |

## 6. The security boundary

**The rule: the agent has no authority.** All authority sits in jobs that treat its output as data. The worst a hijacked agent can do is write bad files, and the gate rejects those.

**What changed with the OpenRouter runtime, and what did not.** The build loop now runs on the GitHub runner, in the process that holds `OPENROUTER_API_KEY`, instead of in a remote sandbox with no secrets. So the boundary is now the tool set, not a machine. The model can only ask for three tools, and none of them can reach the environment, the network or a shell, or run anything (section 5). Proposals are still hostile text. The verify job, the browser gate, the floor rules and everything below are unchanged.

### Hostile proposal text

- Triage has no tools and can only return this schema: `{ decision: "accept" | "reject", category: TriageCategory, reason: string (max 200), buildBrief: string | null (max 800) }`.
- `TriageCategory` is one of `ok`, `offensive`, `illegal`, `impersonation`, `investment`, `contest-vote`, `needs-backend`, `needs-wallet`, `too-large`, `not-a-tool`, `injection`, `model-refusal`.
- The proposal is passed inside a delimited data block, and the prompt says it is data to assess, never instructions.
- A `stop_reason: refusal`, or a 403 from a moderation block or a provider-side refusal, counts as a reject with category `model-refusal`. OpenRouter lists these models as moderated, so hostile text can be stopped before it reaches the model, and that must not fail the shift. A moderation error echoes the flagged text, so the client reads only the error's named fields, never its body as a whole: a proposal must not be able to steer how its own rejection is read.
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

- **JS, banned as a bare name or a member name:** `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `RTCPeerConnection`, `sendBeacon`, `importScripts`, `Worker`, `SharedWorker`, `serviceWorker`, `postMessage`, `MessageChannel`, `BroadcastChannel`, `localStorage`, `sessionStorage`, `indexedDB`, `cookie`, `caches`, `eval`, `Function`, `__proto__`, `globalThis`, `defaultView`, `contentWindow`, `contentDocument`, `frameElement`, `srcElement`, `ethereum`, `web3`, `solana`, `phantom`, `execCommand`, `__ncw`. Also `.constructor` as a member; a class's own `constructor` method is allowed.
- **JS, banned as a bare global only:** `self`, `top`, `parent`, `frames`, `open`, `opener`, `chrome`, `external`. Member uses such as `rect.top` and local variables of the same name are fine.
- **`window`:** may only appear as the object of a static member access to an allowlisted name: `addEventListener`, `removeEventListener`, `innerWidth`, `innerHeight`, `devicePixelRatio`, `matchMedia`, `getComputedStyle`, `requestAnimationFrame`, `cancelAnimationFrame`, `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`.
- **String and template literals:** cooked values, so escapes do not hide content, are scanned for `ethereum`, `web3`, `solana`, `phantom`, `eip6963`, `metamask`, `http://`, `https://` and `javascript:`. Matching is case-sensitive, so a label like "Ethereum gas" passes.

The agent's `run_floor_check` runs this same code in-process, so it sees what the static gate sees. It does not see the browser gate (section 5).

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
- Makes `contentWindow`, `contentDocument` and `getSVGDocument()` return `null` on iframe, frame, object and embed elements, and the same for `Document.prototype.defaultView`, `UIEvent.prototype.view` and `document.open`, which returns the real window when given three arguments. Makes `Event.prototype.target`, `currentTarget`, `srcElement`, `originalTarget` and `explicitOriginalTarget`, and `MessageEvent.prototype.source`, return `null` instead of the real window, and filters it out of `composedPath()`.
- Treats a listener added with no receiver as added to the window, through the same wrapper, because `EventTarget.prototype.addEventListener.call(undefined, ...)` would otherwise pass the real window as `this`.
- Turns off handler properties such as `onload` on the window, the body and the frameset, which also run with the real window as `this`. The generic setters for `onblur`, `onerror`, `onfocus`, `onload`, `onresize` and `onscroll` ignore a body or frameset, because some engines forward those to the window, and still work on every other element, so `img.onload` works. Floors use `addEventListener`.
- Publishes `__ncw`, a restricted proxy over an allowlist of window members. Its timers and listeners call the floor's callback with `this` undefined, because the HTML spec otherwise passes the real window to timer callbacks.

### Serving: `app/f/[hash]/route.ts`

```
Content-Security-Policy: sandbox allow-scripts; default-src 'none'; script-src <floors.script_hashes>;
  style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:; connect-src 'none';
  frame-src 'none'; worker-src 'none'; object-src 'none'; manifest-src 'none'; form-action 'none';
  base-uri 'none'; frame-ancestors <NEXT_PUBLIC_SITE_ORIGIN, when set> 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), clipboard-read=()
Cross-Origin-Resource-Policy: cross-origin
Cache-Control: no-store
```

**Amended 2026-11-07 (`floor:8`).** Floors were first served `public, max-age=31536000, immutable`, and `frame-ancestors` fell back to the request's `Host` and `X-Forwarded-*` headers. A vetoed floor could then stay in a browser or shared cache for a year, and a forged header could widen who may frame a floor. The two lines below on framing and vetoes replace the originals.

- `script-src` lists only hashes, with no `'unsafe-inline'` and no `'unsafe-eval'`. Inline event handlers, `javascript:` URLs, scripts inserted through the DOM, `Function` and string timers all fail, so floors may use `innerHTML` safely.
- The CSP `sandbox` directive means the floor is sandboxed even when opened directly in a tab, so its origin is opaque and it has no cookies or storage.
- The floor page embeds it as `<iframe sandbox="allow-scripts" allow="" referrerpolicy="no-referrer">`, with no `allow-same-origin`.
- **Self-navigation cannot be stopped by CSP or the sandbox.** Assigning `document.location` loads another page inside the frame. So the static gate rejects it, the browser gate fails on it, and the floor page counts the frame's `load` events and removes the frame on a second one, replacing it with a line saying the floor tried to leave its sandbox.
- When `FLOORS_ORIGIN` is set, the route is served only from that second hostname. `proxy.ts` returns 404 for `/f/*` on the main host and for everything except `/f/*` on the floors host.
- On the main host a floor's URL is relative, so it works on any port and any deployment URL. `frame-ancestors` is `'self'`, plus `NEXT_PUBLIC_SITE_ORIGIN` when it is a plain http(s) origin; any other value is ignored. It is never built from request headers. The browser checks `'self'` against the URL it actually loaded, so a forged `Host` or `X-Forwarded-Host` cannot widen it, and every visitor and every cache gets the same headers. On the floors hostname, `'self'` names that hostname, so `launch:11` needs the variable set.
- A vetoed floor returns 410 on its next load. Floors are served `no-store`, so no browser or shared cache keeps a copy to show after a veto. The cost is one function call and one database read per floor load, with no saving on a repeat view. At this site's traffic that is small next to the floor page itself, which already reads the database. Limits that stay: a tab already open on a floor keeps it until reloaded. The floor page regenerates every 30 seconds, so until its next regeneration its heading can still name the floor while its frame shows the 410. The screenshot route, which the tower shows, is cached `public, max-age=60`, not `no-store`, because the tower loads many screenshots per view; a browser that already loaded a floor's picture can show it for up to a minute. A vetoed floor's screenshot returns 410, as its floor does.
- **Verified 2026-11-07 in real Chrome** by `tests/floor-serving-browser.test.ts`, against the code before and after `floor:8`. Before: a browser that had loaded a floor still got it, with status 200, after the veto, and a page on another origin framed the floor by forging `X-Forwarded-Host`. After: the next load got 410, the forged page was refused, and the site's own page still framed the floor under the CSP sandbox. The floor page gate (`check-page.mjs floors/1 --expect-floor`) also passed on a production build with the variable unset.

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

**Verified again 2026-11-06 after review.** The first guard let 13 attacks reach a non-configurable provider, and one reach a configurable one. All 32 attacks now hold in both modes. A one-off sweep walked every object reachable from floor code, about 1,000 of them, and found no route to the real window. With one defence removed, the same sweep found it, so the sweep can detect a leak. A separate adversarial pass then tried about 13,000 method calls, every `on*` handler, and tampering with every shared prototype, and also found nothing. Its controls reproduced the leak whenever a defence was removed.

### What stays open

No browser-side guard can cover every wallet extension. A deliberately hidden escape that beat every layer would still only raise a prompt the visitor must approve. The how-it-was-built page says so plainly.

The guard is verified in Chrome only, because the gate runs Chrome. It carries defences for other engines, such as the generic handler setters above, but these are untested in Firefox and Safari.

Self-navigation stays reachable without the `document` name, for example through `document.documentElement.parentNode`. The core rules cannot see every such path and CSP cannot stop it, which is why the floor page counts frame loads and removes the frame on a second load. It does not expose the window or the wallet.

### Veto

The user can veto an open proposal or darken a shipped floor by signing with the `VETO_ADDRESS` wallet at `/veto`. Each veto is stored with its reason and shown on `/rejected`. A vetoed proposal is excluded from the ranking. A darkened floor returns 410 on its next load, at its direct URL too, because floors are served `no-store` (section 6). Its receipt stays public.

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
  agent_tool: "Night Crew tool loop on OpenRouter";
  model_provider: "Anthropic via OpenRouter";
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
- `cost_cents` is the sum of the cost OpenRouter reported for every call in the shift, rounded up once. There is no price table.
- Before storing, the transcript is scanned for key-shaped strings (`sk-or-`, `sk-ant-`, 64-hex private keys). A match replaces that string with `[removed]`, and a status entry at the end of the transcript, which the receipt hashes, says how many were removed. The agent's tools can reach no secrets, so a match would be a defect worth seeing.
- Transcript entries are truncated to 20 KB each for storage, and the truncation is marked. The hash covers what is stored.

### Attestation (**cut candidate 3**)

- Schema, registered once by `crew/register-schema.ts` on `0x4200000000000000000000000000000000000020`, with no resolver and `revocable = false`:
  `bytes32 receiptHash,string shift,string outcome,bytes32 transcriptHash,bytes32 floorHash,string agentIdentity,string modelProvider,address founder,uint32 costCents`
  The OpenRouter amendment changes no field. `modelProvider` is a free string, now `Anthropic via OpenRouter`, so the schema UID stays the same. The bundle's `agent_tool`, hashed into `receiptHash`, names the runtime.
- Attest on `0x4200000000000000000000000000000000000021` from the wallet in `ATTESTER_PRIVATE_KEY`, using viem only. The attestation UID comes from the `Attested` event.
- Every shift is attested, including failed and dark ones and rehearsals.
- If attesting fails, the receipt shows "attestation pending" and the next publish retries. Cutting this to a follow-up shift means only that publish does not block on it.

### Spend guard

`shifts.cost_cents` records each shift's spend, including what a failed build had already spent. `CREW_TOTAL_BUDGET_CENTS` starts at the probe's figure, 440 at most, for the reasons in section 1. A crash that kills the crew job would lose that shift's record, which is why `launch:16` checks recorded spend against real credit, and why the key has its own limit.

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
| Build hits its spend, token or turn limit | Failed at stage `build`, with the reason, unless the floor had already passed its check |
| Build exceeds 30 minutes, build and send-back together | Failed at stage `build` |
| OpenRouter error or no credit | Failed at the stage it happened, in public words with no response body |
| In-flight budget full | The client waits out `Retry-After`, up to 3 times, then fails at the stage it happened |
| A request too large for the in-flight budget | The build drops to 8,000 tokens once, then fails at stage `build` |
| A reply reports no cost | Failed at the stage it happened, rather than spend blind |
| A moderation block on a proposal | Triage rejects it with category `model-refusal`, and the next proposal is tried |
| Output files missing | Failed at stage `build` |
| `floor.json` malformed | Failed at stage `verify`, with the reason on the receipt |
| Review sends back twice | Failed at stage `review` |
| Gate rejects the floor, including a runtime error or failing test the agent could not see | Failed at stage `verify`, findings shown on the receipt |
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
4. **A trimmed static gate.** Added by the user, and the architect agrees with one exception. The extended rules (section 6) can go, because the Chrome spike ran every attack with no static gate at all and the runtime layers contained all of them except self-navigation. The core rules stay, because they are the only early defence against a floor that navigates itself on a delay too long for the browser gate's run to see. The plan builds the extended rules as their own task, so cutting them means not building it. **This cut costs more since the OpenRouter amendment.** The agent no longer runs a browser, so the extended rules are its only early warning of a mistake such as calling `fetch`. Without them that mistake fails the shift in `verify`, with no chance to fix it.

## 14. Human gates

Executors never run these. Each is a `human_gate: true` task. They are listed in the order they fall due, and the first two come first so the OpenRouter answer lands on Fri 6 Nov. Row 3 was removed by the OpenRouter amendment, and nothing was renumbered.

| # | Gate | Names | Due (UTC) | Notes |
|---|---|---|---|---|
| 1 | Set the key locally, with a credit limit | `OPENROUTER_API_KEY` | Fri 6 Nov | Set the limit in OpenRouter's key settings, no higher than the balance. Needed locally for gate 2, and later as a GitHub secret. |
| 2 | Run the probe | `OPENROUTER_API_KEY` | Fri 6 Nov, by 22:00 | `crew/probe-openrouter.ts`, built by `foundation:7`. Its result is the decision in section 5. Gates 1 and 2 are both `foundation:3`. |
| 4 | Vercel and Neon | `DATABASE_URL`, `RATE_LIMIT_SALT` | Sat 7 Nov, before the rehearsal | One account via the Marketplace. `DATABASE_URL` is a secret in GitHub and an env var in Vercel. `RATE_LIMIT_SALT` is a random string, an env var in Vercel. |
| 5 | Attester key | `ATTESTER_PRIVATE_KEY` | Sat 7 Nov, before the rehearsal | GitHub secret, never in chat or the repo. The wallet is already funded. |
| 6 | Register the EAS schema | `EAS_SCHEMA_UID` | Sat 7 Nov, before the rehearsal | Run once with the attester key. Repo variable. |
| 7 | Your wallet address | `VETO_ADDRESS` | Sat 7 Nov, before the rehearsal | Public. Used for vetoes and as `founder_address`. |
| 8 | Budget settings | `OPENROUTER_API_KEY`, `CREW_BUILD_MODEL`, `CREW_SHIFT_CAP_CENTS`, `CREW_TOTAL_BUDGET_CENTS` | Sat 7 Nov, before the rehearsal | The key is a GitHub secret. Repo variables: `anthropic/claude-sonnet-5.5`, `60`, and the probe's figure, about 438. Plus `CREW_STRUCTURED_MODE` or `CREW_BUILD_TRANSPORT` only if the probe asked. |
| 9 | Rehearsals | `gh workflow run` | Sat 7 Nov, by 12:00 | Spends credit. r1 on Sonnet at `60`. r2 on Haiku at `10`, to give the Monday decision a real comparison. Records r1's real cost in `docs/gates/rehearsal-costs.md`, and flags the guide if it is over 70 cents or the build stopped at its spend cap. |
| 10 | Seed proposals | `DATABASE_URL` | Sat 7 Nov, before 18:00 | `crew/seed-proposals.ts`, at least 5, labelled as seeded. |
| 11 | Deploy | `NEXT_PUBLIC_SITE_ORIGIN` | Sat 7 Nov, by 18:00 | First deploy, then each deploy after. |
| 12 | Arm the nightly job | `SHIFTS_ARMED` | Sat 7 Nov, by 18:00 | Repo variable set to `true`. |
| 13 | Second hostname (non-blocking) | `FLOORS_ORIGIN` | When ready | Added to the same Vercel project. If it is late, floors serve from the main host (section 6). |
| 14 | Real-wallet check | none | Sat 7 Nov, after the first live floor | Open one live floor with a real wallet extension and confirm no prompt. |
| 15 | Off-schedule shift | `gh workflow run` | Sun 8 Nov, afternoon, after the freeze | Labelled. |
| 16 | Spare off-schedule shift | `gh workflow run` | Mon 9 Nov, start by 10:00 | Only if fewer than 3 floors are on record. Labelled. |
| 17 | File the submission | none | Mon 9 Nov, 12:00 | The user, wallet-gated, via Step 3. |
| 18 | Decide judging-night settings | `CREW_BUILD_MODEL`, `CREW_SHIFT_CAP_CENTS`, `CREW_TOTAL_BUDGET_CENTS` | Mon 9 Nov, by 21:00 | From real costs. Options include a top-up (section 1). |

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
| `@anthropic-ai/sdk` | 1.6.0, pointed at OpenRouter |
| `@neondatabase/serverless` | 1.2.0 |
| `@electric-sql/pglite` | 0.5.15 |
| `vitest` | 5.1.0 |
| `tsx` | 4.23.15 |
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

The OpenRouter amendment was built the same way. Its client, loop and probe ran against the real SDK with a scripted OpenRouter, because no key was available to the architect. **No call to OpenRouter's models has run yet.** The probe is the first.

This does not replace Step 2. The orchestrator still builds every task from the plans and proves every gate.

## 17. Design decisions

| Question | Answer | Source |
|---|---|---|
| Cut order at the checkpoint | Overtime, staking half of weight, attestation to a follow-up shift, then a trimmed static gate | User, 2026-11-06, extended in the revision |
| Crew runtime | OpenRouter tool loop on the runner, because no Anthropic account could be funded. Replaces Managed Agents in a sealed sandbox | User, amendment 2026-11-06 |
| OpenRouter endpoint | The Messages endpoint through the pinned SDK, not Chat Completions | Architect, approved in the amendment delta |
| Fallback settings | `CREW_STRUCTURED_MODE` and `CREW_BUILD_TRANSPORT`, so a probe finding is a config change | User, amendment 2026-11-06 |
| r1 cost check | `launch:7` records it and flags the guide over 70 cents | User, amendment 2026-11-06 |
| Credit | A $5 OpenRouter key, usable balance at most about $4.70 | User, amendment 2026-11-06 |
| Build model | Sonnet 5.5 for rehearsal r1 and evidence, Haiku 5.5 for rehearsal r2, triage and review | User, 2026-11-06 |
| Judging-night model | Decided on Monday from real costs, with a $5 top-up as an option | User, revision 2026-11-06 |
| Order of human gates | Set the key and run the probe first, so the answer lands on Fri 6 Nov | User, revision 2026-11-06 |
| Proposal cap per shift | Dropped. Per-wallet and per-IP limits instead | User, revision 2026-11-06 |
| Second hostname | Non-blocking. Main host under the CSP sandbox if not ready by Sat 18:00 UTC | User, revision 2026-11-06 |
| Evidence target | 3 floors on record, meaning shipped floors, with a spare off-schedule slot on Mon morning | User, revision 2026-11-06 |
| Fourth cut candidate | Extended static rules can go; core rules stay | User proposed, architect agreed with that exception |
| Landing page | The tower at `/` is the landing page | User, 2026-11-06 |
| Overtime | Cut at design, because it needs Vercel Pro | Derived from the $5 limit |
| Host | Vercel Hobby, Neon via Marketplace, GitHub Actions | Architect, approved in design section 1 |
| Floor format | One self-contained HTML file in Postgres | Architect, approved in design section 1 |
| Floor caching after a veto | `no-store`: a veto reaches the next load, at one function call and one database read per floor load. Chosen over a short `max-age`, which saves little on a floor viewed once and leaves a window a judge could see | Architect, amendment 2026-11-07, on the user's report |
| Who may frame a floor | `'self'` plus a validated `NEXT_PUBLIC_SITE_ORIGIN`, never request headers. `'self'` instead of a localhost branch, because the browser evaluates it and it needs no guess about dev or production | Architect, amendment 2026-11-07, on the user's report |
| Name | Night Crew. A search found no product with this name; the nearest was NIGHTSHIFT ($SHIFT), seen only on DexScreener listings | Brief's working title, user did not object |
