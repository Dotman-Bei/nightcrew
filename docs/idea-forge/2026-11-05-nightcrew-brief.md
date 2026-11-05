# Idea Forge Brief — Night Crew: an AI dev crew that token holders command

> "Night Crew" is a working title; the builder may rename it. This brief is the single source of truth
> handed to the architect (Step 1). It fixes *what* and *why*, not *how*.

## Terms

- **Shift:** one run of the pipeline: take the winning proposal, build it, test it, ship it, publish the
  receipt. Scheduled nightly at 22:00 UTC.
- **Crew:** the AI agents that run a shift.
- **Floor:** what a successful shift ships: one small working tool in its own sandbox.
- **Tower:** the public home screen. Floors stack up as shifts succeed.
- **Receipt:** the public record of one shift, passed or failed, anchored by an attestation on Base.

## Event + constraints

- **Date written:** 2026-11-05. The rules page was re-read that day and matches the kickoff's facts.
- **Hackathon:** Vibeathon 02 "Night shift" (Vibestarter).
  - Rules and judging: https://blog.vibestarter.xyz/vibeathon-02
  - Event page: https://app.vibestarter.xyz/vibeathon
  - Submit page (wallet-gated; the user files it): https://app.vibestarter.xyz/vibeathon/submit
- **Hard deadline (calendar fact; idea-forge did not gate on it):** Mon 2026-11-09 22:00 UTC. Judging and
  the holder vote run 9 to 16 November.
- **Must ship:** a working MVP people can actually use, at a live URL, plus a one-line pitch. Base is
  suggested, not required. The "Night shift" theme is branding only.
- **Commitment:** an entrant invited to raise commits to launching on Vibestarter.
- **Team:** an autonomous agent pool (architect → executors → reviewer) plus the builder, whose skills are
  Solidity/EVM and TypeScript/React (Next.js-style apps).
- **Environment:** Windows laptop, Node 22, no Docker Desktop. The user creates any hosting account.
- **Risk posture:** `safe-feasible`.

## Problem

Token communities outlive the people who built for them: holders have money and opinions but no way to turn
either into shipped product, because governance votes end in a forum post and a quiet founder leaves them
only waiting or selling. Vibestarter's own record shows it (read 2026-11-05): of four external raises, two
failed to fund (0.36 and 0.49 ETH), Onetoken is refunding after a wind-down with no founder post in the 57
days after funding, only Corvo Edge is still releasing, and the public ledger shows 0 challenges filed
across 46 events.

## Solution (one line)

An AI dev crew that token holders command: they sign to vote for a feature, and by morning the crew has
shipped it as a new working floor of a public tower, with a receipt on Base.

**Event pitch line:** Vote tonight. Live by morning.

## Must-have demo features

1. **The shift loop.** Any wallet proposes a feature in one sentence. Holders vote by signing a gasless
   message, weighted by $VIBES held plus staked on Base; a wallet with no $VIBES still counts at minimal
   weight, so any judge can try the flow. At 22:00 UTC the crew takes the top proposal that passes safety
   triage, builds it, tests it and ships it with no human touching the code. A failed shift is published
   like a passed one.
2. **The tower.** One public screen, no wallet needed, answers four questions: what is this, what shipped
   last night, what is being voted on tonight, and how do I vote. Each floor opens a working tool in a
   sandbox. A night with nothing shipped shows as a dark floor.
3. **The receipts.** Every shift has a public page with the proposal, the vote tally, the agent transcript,
   the diff, the test results, the inference cost and an attestation on Base that hashes them. A short "how
   this was built" page covers the product's own build.

**One stretch, only after those three are real: Overtime.** Pay a small amount of ETH on Base to run a shift
now, so a judge can watch the whole loop in one sitting and the treasury's income and inference cost are
public.

## Target sponsor track(s)

None exist: one leaderboard, no tracks, no required tech, and Vibestarter is the only sponsor. The idea aims
at the rubric levers:

1. One end-to-end flow that visibly works on a live URL.
2. Legible to $VIBES holders in one screen, because their token steers it. This is a new use for a token
   whose holders can otherwise stake and challenge.
3. Visible AI-tool leverage and craft: the agent work is the product, and it is public.

## Judging criteria (published)

Execution 30% ("does it work, end to end?") · Launch potential 25% ("would people back it?") · Originality
20% · Craft and UX 15% · Vibecoding leverage 10% ("how well AI tools were used to build it").

An entry's score is the average of every scorecard: each judge's, plus one holders' card. Holders pick the
one entry they would back, weighted by the $VIBES held or staked on Base when the build window closed. The
most-voted entry scores 100, others score in proportion, and an entry with no votes scores 10.

Optional: a Fundable result link shows beside the entry but is not in the rubric. Fundable v3 weights idea 60
/ execution 40 and scores problem, differentiation, timing and backer fit.

Source: https://blog.vibestarter.xyz/vibeathon-02 and https://fundable.vibestarter.xyz

## Why it wins

Unlike the V01 podium (Corvo Edge, a DEX aggregator; Onetoken, a token launchpad), the DeFi-heavy raise queue
(4 of 7), AI coding tools sold to one developer, or DAO tools whose votes end in a forum post, Night Crew
sells to a community and a vote ends in a floor you can click; three bounded searches found holders steering
AI art (Botto) and AI delegates voting on treasuries (MoltDAO), but nothing shipping software from token
votes. Against Corvo Edge, the strongest prior art, it wins on Originality and on Vibecoding leverage because
every floor publishes its agent transcript while Corvo shows capsule-level provenance (Verified, Claude Code)
and no agent sessions in its comm link, and it ties on Execution only if at least three real shifts are on
record at submission; against Onetoken it wins on Launch potential because a missed night shows as a dark
floor the next morning, where Onetoken's page shows 57 silent days after funding.

## Demo money shot (~15 seconds)

Open the tower and the newest floor is lit: yesterday it was one sentence from a holder, today it is a
working tool you click and use. Flip it over and there is the vote tally, the agent's transcript, the green
tests, what the inference cost, and the attestation on Base.

## Out of scope (explicit)

- No project token and no token launch in this build. Votes use $VIBES.
- No custom smart contracts. Attestations use the EAS predeploys.
- One tower, one community ($VIBES). A second community is at most a waitlist form.
- No floor gets a backend, a wallet, a secret, or write access to anything, and no floor can change the main
  app.
- No X or Farcaster integration and no X API.
- Nothing tied to the contest vote: no rewards for it, and no asking for it inside the product's voting flow.
- No ERC-8004 registration for the crew, no Robinhood Chain, no mobile app, no local Docker.

## Launch logic (why someone would back it)

- **Customer:** token communities with holders but no active developer, such as quiet founders and community
  takeovers. $VIBES is the first community.
- **Revenue:** a community pays per shift or per month from its treasury. No customer has paid yet; this is
  the claim to test.
- **Raise fit:** Vibestarter releases funds on a fixed schedule (10% at finalization, then 15% a month for six
  months), which maps directly onto paying a crew's nightly bill in public. If invited, the project's own
  token would be what a community holds or spends to run a crew. That token is not built here, and public copy
  makes no claim about returns or value.
- **Admission fit:** the founder rubric scores Provenance, Substance, Traction/proof and Founder credibility
  (at least 8/12 with no zero). Receipts directly supply Provenance and Traction/proof.

## Feasibility notes for the architect (primitives, not design)

Verified live on 2026-11-05 unless marked otherwise.

**Base and $VIBES**

- Base mainnet, chain 8453, public RPC `https://mainnet.base.org`. It answered a historical `eth_call` at
  −302,400 blocks (about 7 days) and returned open CORS headers. Rate limits were not measured.
- $VIBES on Base: `0xefFC8815487084a97edfdfF968b56Ea123421Acb`. `symbol()` returns VIBES, `decimals()` returns
  18, `totalSupply()` returns 1,000,000,000 × 10^18. Read `balanceOf(address)` at a chosen block for a snapshot.
- Staked balance: `GET https://app.vibestarter.xyz/api/staking/stats?wallet=0x…` returns `stakedBalance`,
  `lastStakeAt`, `totalStaked` and `sharePercent`. It is current-only, and the staking contract is not in
  `/api/contracts.json`, so this route gives no historical stake figure.

**Vibestarter read surfaces (no key, rate-limited per IP), on `https://app.vibestarter.xyz`**

- REST: `/api/openapi.json`, `/api/campaigns`, `/api/campaigns/by-tx/{txHash}`, `/api/stats`, `/api/feed`,
  `/api/ledger`, `/api/ledger/stats`, `/api/backings/recent`, `/api/supply/circulating`,
  `/api/mcp/activity?campaignId=…`.
- Read-only MCP at `/mcp`, full docs at `/llms-full.txt`, verified ABIs and addresses at `/api/contracts.json`.
- **No CORS.** `GET /api/stats` returned no `Access-Control-Allow-Origin` and an `OPTIONS` preflight returned
  403. A floor running in a browser cannot call this API directly, so it needs a server-side snapshot.

**Attestations**

- EAS on Base: `0x4200000000000000000000000000000000000021` (`version()` returns `1.4.1-beta.3`).
  SchemaRegistry: `0x4200000000000000000000000000000000000020`. Both have code, so there is nothing to deploy.
  Public viewer: https://base.easscan.org.
- Vibestarter's Origin Capsule records agent identity, model provider, transcript hash, founder address and
  timestamp (https://app.vibestarter.xyz/docs/origin-capsule). Using the same fields in receipts makes them
  reusable in a later founder application.

**Crew runtime: two candidates, neither run yet; the architect chooses**

- `anthropics/claude-code-action` on a GitHub runner. Inputs include `prompt`, `claude_args` (`--max-turns`,
  `--model`, `--allowedTools`, `--disallowedTools`), `anthropic_api_key` and `github_token`. Scheduled use is
  documented in its `docs/solutions.md`.
- Claude Managed Agents (beta) scheduled deployments, per the Claude API skill's docs: POSIX cron with an IANA
  timezone, start jitter up to 9 minutes, a per-session USD budget cap, deny-by-default `limited` networking
  with `allowed_hosts`, and vault credentials that never enter the sandbox. Those sandbox controls bear directly
  on the hostile-input fact below. Availability on this account was not checked.
- Inference prices per 1M input/output tokens (Claude API skill, cached 2026-10-06): Opus 5.5 $4/$20, Sonnet 5.5
  $2/$10, Haiku 5.5 $0.10/$0.50. Rough estimate: $0.50 to $2 per floor, unverified until the first real run.

**Facts the design must answer**

- Proposals are untrusted public text reaching an agent that can commit code.
- Floors are AI-written code running in visitors' browsers next to their wallets. Wallet extensions may inject a
  provider into iframes, so do not treat a cross-origin frame alone as isolation; test with a fake injected
  provider. A floor must not be able to prompt a wallet, read a secret, or reach an unapproved host.
- Public proposals can ask for offensive or illegal content. The builder needs a veto, and every veto is
  published with its reason.
- The official contest vote also uses a signed message, so this product's vote text must be plainly different.
- This is an independent entry: original art, no Vibestarter logos, and a "not affiliated" line. The event's own
  theme art is a tower, and Vibestarter's moderation policy lists brand impersonation as a removal ground.
- Public copy carries no investment language.

**Repo and visibility**

- The repo is private and flipping it public is consent-gated, so serve transcripts and diffs from the app.
  Receipts must work before any flip.

**Order and evidence**

- Longest pole: the shift pipeline and its security boundary. Give it the highest reasoning effort and the most
  review; the tower and receipts pages read from what it produces.
- Evidence accrues one shift per night, so the pipeline should run before the polish. The Execution tie above
  assumes at least three real shifts on record at submission. Scheduled nightly runs before the close alone only
  reach three if the pipeline is live by Fri 6 Nov 22:00 UTC; off-schedule build-week shifts count if labelled as
  such. Seeded proposals are labelled as seeded.

**Day-1 external dependency**

- An Anthropic API key with prepaid credit (`ANTHROPIC_API_KEY`), which the user must obtain. A Claude Pro seat
  is not an API key.
- Also user actions: hosting account(s) and a small ETH balance on Base for attestation gas
  (`ATTESTER_PRIVATE_KEY`, env var only, never committed).

**Event mechanics to carry forward**

- The rules say submissions stay editable until the window closes and are silent on a live product changing
  afterward. Floors shipped during judging are this product's normal behaviour, so mark the close of the build
  window on the tower's timeline. The user may want to confirm with the host in Discord.
- Fundable reads the page and everything it links to, so keep the public face server-rendered and wallet-free.
  The user runs it on the live URL at closing.

## Rubric mapping (why this won, for the record)

Scored on the four axes of `references/ideation-rubric.md`, re-mapped to the event's published weights with
buildability highest: **Intrinsic buildability + Execution 35** (event 30, +5 `safe-feasible`) · **Launch
potential + holders' card 25** · **Demo + Craft + Vibecoding leverage 25** · **Originality 15** (event 20, −5
`safe-feasible`). 29 candidates plus 8 bolder rewrites went in; 8 fell at the buildability gate and the other 29
were scored.

Night Crew scored 4 / 4 / 5 / 5 = **440**, ahead of a raise watchdog (435, then 410 after a clear Launch-potential
loss in the head-to-head), an AI first-user agent (425, then 400, no decisive win beyond Originality) and an agent
bounty arena (420, incremental on known prompt-injection games).

- **Buildability is 4, not 5:** no external blocker was found, but the nightly run is a moving part and a judge
  cannot see the whole loop in one sitting without the stretch.
- **Weakest point:** Launch potential ties Corvo Edge rather than beating it. The MVP has one community and no
  paying customer, and holder participation is unproven. If votes are thin the crew still ships, but "holders
  command it" weakens. Watch this first.
- **Limits of the evidence:** the white-space claim rests on three bounded searches, which cannot prove absence.
  Corvo Edge and Onetoken facts were read from their Vibestarter pages and the public API on 2026-11-05.

## Architect kickoff block

Paste into a new, fresh session at the architect's session settings.

```
KIT: C:\Users\bamig\Documents\VIBE CODE\Hackathons\build-system (read-only doctrine). Resolve every kit path in
this prompt (architect/SKILL.md, orchestrator/SKILL.md, references/...) inside it. The project repo is never the
kit.

SESSION SETTINGS: tier top · effort xhigh, or high for a one-task plan-bug fix
(references/model-routing.md §Seat settings). Start by stating the exact model id you are running
as. If it is below this campaign's top-tier binding, warn me and wait for my go before anything
else. (In an autopilot dispatch, just state it — the autopilot logs drift.)

You are the ARCHITECT for this build. Load and follow architect/SKILL.md (and its references/).
Do not write product code. Your only deliverables are: an approved spec, executor-ready plan
documents, docs/superpowers/manifest.json, the pre-filled docs/gates/submission-draft.md
(build-time facts marked TBD-post-build), and the Stack requirements section appended to the
tollgate report (references/tollgate.md).

PROJECT: An AI dev crew that token holders command: they sign to vote for a feature, and by morning the crew has
shipped it as a new working floor of a public tower, with a receipt on Base.

REPO: Dotman-Bei/nightcrew — the project repo (canonical; sync it before reading anything)

DOCS: docs/idea-forge/2026-11-05-nightcrew-brief.md, https://blog.vibestarter.xyz/vibeathon-02,
docs/guide/2026-11-05-vibeathon-02-night-shift-runsheet.md (event facts and the frontend directive)

CONSTRAINTS: Base mainnet (chain 8453) for balance reads and EAS attestations, no custom contracts; TypeScript
strict, React/Next.js-style app, Node 22, no local Docker (Windows laptop; the user creates hosting accounts);
hard deadline Mon 2026-11-09 22:00 UTC; team = solo + AI. Target track(s): none, one leaderboard, aim at the
published rubric. Must land the demo money shot. Out of scope: a project token or token launch, custom smart
contracts, a second community beyond a waitlist form, any floor with a backend, wallet, secret or write access,
X or Farcaster integration, anything tied to the contest vote, ERC-8004 registration, Robinhood Chain, a mobile
app.

EXECUTION TARGET: built in Claude Code by the orchestrator — the main session dispatches a fresh
subagent per task (orchestrator/SKILL.md). Every task must be self-contained per
references/task-contract.md — paste upstream signatures into each task, declare Provides/Requires, and
give exactly one gate command per task. Hand off at the reviewed plan + manifest (the default —
omit the manifest only when the build has no deploy/key/fund tasks) and the
orchestrator builds it. (For an external multi-account pool instead, stop at the manifest for a kernel.)

Start with Stage 1 (Ingest): read every doc above, then confirm the target/runtime/deadline back to
me before asking your first brainstorming question.
```
