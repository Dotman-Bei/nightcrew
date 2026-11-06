# Runsheet: Vibeathon 02 "Night shift"

Last updated: 2026-11-06 by the guide seat (about 11:20 UTC): Step 0 verified, repo renamed to `nightcrew`, calendar-fit call made (see Calendar-fit call). Event facts were re-verified 2026-11-05 15:40 UTC (second guide session). No Step 0a pack exists. **Event facts below were re-verified at 15:27 UTC against the raw rules-page HTML (curl, not a summariser), the live event page (Chrome) and the V01 announcement post**: weights, deadline, prizes and holder-vote rules all match, and the live countdown (4d 06h 31m) matches Mon 9 Nov 22:00 UTC. The submit page was read only as far as its wallet gate. Step 0 should still re-read the rules page; the page wins on any difference.

## Event

- **Name:** Vibeathon 02 "Night shift" (Vibestarter, "the vibecoding championship, built on Base").
- **URLs:** event https://app.vibestarter.xyz/vibeathon · rules https://blog.vibestarter.xyz/vibeathon-02 · submit https://app.vibestarter.xyz/vibeathon/submit · Base docs https://docs.base.org
- **Deadline:** every deadline is at 22:00 UTC. Build window 2 Nov to **Mon 2026-11-09 22:00 UTC** (= 23:00 UTC+1). Judging and community vote 9 to 16 Nov; winners after the vote closes. Submissions stay editable until the build window closes, so file early and edit after.
- **Judging (reported weights):** Execution 30% ("does it work, end to end?") · Launch potential 25% ("would people back it?") · Originality 20% · Craft and UX 15% · Vibecoding leverage 10% (how well AI tools were used). A panel plus special judges (not yet named). Final score is the average of all scorecards, with the **$VIBES holders' vote counted as one extra scorecard**: the most-voted entry scores 100, others scale in proportion, **an entry with no votes scores 10**. Holders sign a message to vote (no gas); weight is $VIBES held or staked on Base when the build window closed; platform and team wallets cannot vote and nobody can vote for their own entry.
- **Must ship:** a working MVP people can actually use, at a **live URL**; pitch in one line; where to try it. Base is suggested, not required; no contracts or specific tech required. Optional: a Fundable result link shown to judges (not in the rubric).
- **Prizes ($1,000 cash):** 1st $500 · 2nd $250 · 3rd $125 · 4th $75 · 5th $50, plus Starter Card points down to 10th. Strong entries may be invited to raise on Vibestarter (Base or Robinhood Chain); no guaranteed slot. **If invited to raise, entrants commit to launching the project on Vibestarter**, and the introductory post says "build something you genuinely intend to launch". Pick an idea you would actually launch.
- **Tracks:** none. One leaderboard. Sponsor: Vibestarter only (50 Claude Pro seats; seat holders must submit or the seat may be revoked).
- **Theme:** "Night shift" (a ten-storey tower at night in the rain, a green `>_` on its roof, 50 windows for the 50 sponsored seats). It is the edition's branding; the rules page sets **no theme requirement** on entries. Optional flavour for Craft and UX only.
- **Vibeathon 01 (prior art, found 2026-11-05 on the rules page):** 52 applications, 10 builds on the final shortlist. **Corvo Edge 1st, Onetoken 2nd**, both then opened raises on Vibestarter. Details read from the Vibestarter homepage (https://app.vibestarter.xyz/, 2026-11-05): **Corvo Edge** (`$CORVO`, Base, funded 31 Aug, raise shown as 1.38 ETH) is a DEX aggregator, "One chat. Every chain.", latest update "14 chains trading from one registry". **Onetoken** (`$ONE`, Base, 2 Sep) is a permissionless token launchpad on Uniswap V4 (zero upfront capital, one-sided AMM curve); its raise ended at 1.97 ETH and shows refunds open. Both are DeFi/token infrastructure. Vibestarter's approved-to-raise queue is also DeFi-heavy (4 DeFi, 1 Social, 1 AI, 1 Consumer); the homepage links a "Is it raise-ready?" scorer (the Fundable tool). V01 post: https://blog.vibestarter.xyz/introducing-the-vibeathon (edition 1 rules: 3 places, two-week build, no holder vote).
- **Field size:** a small field (V01 was about 50 applicants) makes a top-5 finish realistic for a clean, working, live MVP. V02 reach is wider (special judges, public vote page), so do not assume V02 stays that small.
- **Submit page (read 2026-11-05):** https://app.vibestarter.xyz/vibeathon/submit shows "Identity required: Connect your wallet to link your submission to your entry." So filing is **wallet-gated** and tied to an existing entry. The V01 post says "Tell us who you are and what you want to build, and you're entered", so **applying = becoming an entry**. The submit form's fields stay unread until a wallet is connected (the user's action, never the guide's).
- **Optional extra:** attach a Fundable result link (judges see the score beside the entry; not in the rubric). The architect adds it to the submission draft as a field; the closing pass has the user run it on the live URL.
- **Application:** the user states they **applied** (user-attested 2026-11-05; the guide cannot verify it, since the check is a wallet connect).
- **Submit form not live yet:** the user's Discord thread with the host (Cyphr, Vibestarter), 3:06 to 3:08 PM user-local (about 14:06 to 14:08 UTC if user-local is UTC+1), supplied as a screenshot: the user reported no form on the submission page, the host replied "Then that's a mistake, looking into it now" and "It should be there within the hour". So the field list is **unknown** until it appears; the rules page names only the working MVP, a one-line pitch and where to try it (the live URL), plus the optional Fundable link.
- **Unknowns, none resolved by the guide:** the submit form's field list (host promised it); special judges' names (announced "soon").

## Project repo

- **`Dotman-Bei/nightcrew`**, private (verified 2026-11-06 with `gh repo view`), description set to the brief's one-line solution. Pipeline-created by the guide on 2026-11-05 as `vibeathon-02-night-shift-2026` per `references/repo-bootstrap.md`, **renamed by idea-forge (Step 0) after the brief landed**; `origin` in the local clone now points at `https://github.com/Dotman-Bei/nightcrew.git` and `main` = `origin/main` at `fc91e71`.
- Local clone, unchanged: `C:\Users\bamig\Documents\VIBE CODE\Hackathons\vibeathon-02-night-shift-2026` (next to the kit, not inside it). The folder keeps its old name on purpose: do not rename it mid-campaign, because every kickoff and the VS Code window carry this path. GitHub redirects the old repo URL, but kickoffs use `Dotman-Bei/nightcrew`.
- Making it public is consent-gated and happens at submission, if at all (Vibecoding leverage is easier to judge with a visible repo; the user decides).

## Kit

- `C:\Users\bamig\Documents\VIBE CODE\Hackathons\build-system`, at `origin/main` 230bbc8, clean, read-only. The prompt's `~/hackathons/build-system` does not exist on this machine, so every kickoff carries the real path in its KIT line.
- `gh` full path (for kickoffs, in case a session's PATH lacks it): `C:\Users\bamig\AppData\Local\Programs\GitHub CLI\bin\gh.exe`.

## Tollgate

- Report: `docs/tollgate/2026-11-05-tollgate.md`, run by the guide (0a skipped).
- **Verdicts:** 0a SKIPPED · 0 CLEAR · 1 CLEAR · 2 PENDING (stack rows, row 18) · 2.5 SKIPPED · 3 CLEAR to start (row 5 failed at first, passed after the user connected the Chrome extension; the Step 3 session re-probes it at its own boot); row 8 (wallet) is a user action at submission, see Open blockers.
- Routing: knobs `per-spawn`; tier-to-model ids not yet probe-verified (orchestrator boot); no routing-defeating variables; user settings default effort `xhigh`, so the effort named in each kickoff is set by hand every session.

## Goal

- **Assumed, not stated** (the prompt left the field as a template): finish in the top 5 (cash plus Starter Card points) and be a credible Wave 1 candidate. There are no tracks to win. Correct this line if the goal differs.
- **Skills assumed from the user's GitHub history** (about 30 repos: Solidity and EVM chains, TypeScript, Next.js-style apps): Solidity/EVM, TypeScript/React. Correct if wrong.

## Calendar

- About **83 hours** left at 2026-11-06 11:15 UTC (close Mon 2026-11-09 22:00 UTC). User availability and sleep hours not given; the plan assumes the user's attention, not the clock, is the scarce resource. Local time is UTC+1 (commit timestamps).
- **Revised 2026-11-06** (the first table, written 2026-11-05 for a generic build, is replaced: Night Crew needs a live URL and a running pipeline early, because its evidence accrues one shift per night).

| Target (UTC) | Milestone |
|---|---|
| ~~Thu Nov 5~~ | Step 0 done and verified (done 2026-11-05 16:21 UTC; verified 2026-11-06) |
| Fri Nov 6, 11:20 to ~18:00 | **Step 1** architect dialogue and review (budget about 3 hours of the user's attention); spec, plans and manifest pushed |
| Fri Nov 6, by 20:00 | User's day-1 dependencies done: funded `ANTHROPIC_API_KEY`, burner attester wallet with a little ETH on Base, hosting account (the architect names the host); executor agents copied into `.claude/agents/`; Step 2 starts (pipeline first) |
| ~~Fri Nov 6, 22:00~~ | The brief's "pipeline live by Fri 22:00" for a first nightly shift is **not reachable** (about 10 hours, before Step 1 is even approved). Dropped |
| Sat Nov 7, 12:00 | **Checkpoint:** one end-to-end dry-run shift done (proposal, agent, tests, floor visible). If not, guide and user decide a cut, via the architect, never by hand |
| Sat Nov 7, 18:00 | **Walking skeleton live on a public URL** and the nightly job armed (the first deploy moves up from Sun 20:00) |
| Sat Nov 7, 22:00 | **Scheduled shift 1** |
| Sun Nov 8, 12:00 | Build green; frontend pages done; **feature freeze** |
| Sun Nov 8, 22:00 | **Scheduled shift 2** |
| Mon Nov 9, 12:00 | Submission filed by the user, with at least 3 labelled shifts on record (10 hours of buffer; editable afterward until 22:00) |
| Mon Nov 9, 22:00 | Hard close. The Monday 22:00 shift starts at the close, so it cannot be evidence |

## Strategy decisions

- **Mode:** guided. First Vibestarter campaign, and the user approves each baton.
- **Steps:** skip 0a; run 0, 1, 2, 3 (preflight in parallel with the build, closing after green); skip 2.5 by default.
  - Skip 0a: one sponsor and no SDK, no tracks, no judging ambiguity beyond one page already read; the portal's one JS-gated page (submit) cannot be read by an extractor that never logs in; Chrome tools are not connected here. Cost of skipping: idea-forge gets the event facts in its kickoff and does its own prior-art search.
  - Skip 2.5: the submission asks for a live URL, not a video. Revisit only if the build is green with 12 or more hours of buffer; the vote is won by people who understand the product in under a minute, and a 60-second cut could help, but it is optional.
  - Keep 3: the live URL needs a hosting account and a deploy, and the submit page needs a sign-in the user performs.
- **Tracks:** none exist, so the shortlist becomes the **rubric levers** (reason: published weights).
  1. Execution 30% + Launch potential 25% = 55%: one end-to-end flow that visibly works on the live URL, for a user a Vibestarter backer can picture.
  2. Holder vote (a full scorecard; 10 points for zero votes): a product the Base and $VIBES crowd grasps in one screen and wants to share. A zero-vote entry loses a whole scorecard's worth.
  3. Vibecoding leverage 10% + Craft 15%: the committed spec, plans and a short "how it was built" section on the page show AI-tool use; the frontend skill covers craft.
- **Risk appetite: `safe-feasible` (recommended).** Execution is the heaviest criterion and a live URL is mandatory; 102 hours is short; the unfamiliar parts (submit sign-in, holder vote) cannot be tested early. Switch to `novel-wow` only if the user knows a field this crowded rewards differentiation more than a clean demo; idea-forge still runs the judge's-eye head-to-head on originality either way.
- **Sponsor depth:** none to extract. Vibestarter is the platform, not an SDK. If the chosen idea touches Base or $VIBES, idea-forge's feasibility notes carry live-verified addresses and signatures.

## Calendar-fit call (2026-11-06)

**Verdict: fits, conditionally. No idea-forge re-run, and the brief is not hand-trimmed.** About 83 hours remain. The scope is large (signed weighted votes, an agent pipeline with a security boundary, sandboxed floors, receipts with EAS attestations, a tower, a frontend, a live deploy), but every piece is bounded and the brief already names the cut candidate (Overtime). The risk is not typing speed. It is three things the agents cannot do alone:
1. the user's day-1 dependencies (a funded API key above all);
2. the first end-to-end shift actually running;
3. the review the pipeline's security boundary needs (untrusted public text reaching an agent that commits code).

**What the arithmetic breaks.** The brief's Execution-tie claim needs at least three real shifts on record at submission, and says nightly runs alone reach three only if the pipeline is live by Fri 22:00 UTC. That is not reachable. Scheduled 22:00 UTC shifts that can be evidence are **Sat Nov 7 and Sun Nov 8 (two)**; Fri is too early and Mon starts at the close. So the three-shift target now **requires at least one off-schedule shift, labelled as such**, which the brief explicitly allows. Each shift costs inference money, so the funded API key is also the evidence budget. Seeded proposals stay labelled as seeded.

**Conditions.** (1) Step 1 approved by about Fri 18:00 UTC. (2) Day-1 dependencies done by Fri 20:00 UTC. (3) Pipeline first: the longest pole gets the highest effort and the most review. (4) Walking skeleton live on a public URL by Sat 18:00 UTC. (5) The Sat 12:00 UTC checkpoint above. Cut candidates the guide would propose at that checkpoint, in this order (the architect regenerates the plan, per `references/roles.md` §Mid-build regeneration): Overtime (already a stretch); the staking half of vote weight (the staking API is current-only, so it gives no snapshot); the attestation on Base moving to a follow-up shift. The three must-haves stay.

**Weakest point the brief itself names:** holder participation is unproven, so "holders command it" can read as hollow if votes are thin. Watch it from the first shift.

**Step 2 review mode, to recommend at that kickoff:** `checkpoint` for the pipeline's security-boundary tasks (security-sensitive); decide with the user then, because it costs the user's attention.

## Frontend directive

- User: follow `design-taste-frontend` for all frontend work; write `docs/FRONTEND.md` from the PRD without design questions; then build one page at a time from it, running the dev server after each page and fixing layout breaks and anything generic.
- Guide handling: no PRD exists yet, and the guide writes no spec, plan or product code (its own boundary and the prompt's). The directive is carried into the **architect kickoff** (write `docs/FRONTEND.md` from the approved spec, with the sections the user listed) and the **orchestrator kickoff** (build pages in its order, dev-server check after each). The user may overrule this.
- Skill location: `C:\Users\bamig\Documents\VIBE CODE\Hackathons\.claude\skills\design-taste-frontend\SKILL.md`. It sits above this repo, is 38 MB (1,617 files), and is not committed. Kickoffs point at the absolute path.
- Scope note: the skill targets public company and product sites and says app screens must not look like a generic dashboard. For this event the public face (hero, how it works, a try-it entry) carries Launch potential and the vote; app screens follow the same system. The architect sizes the frontend against Craft and UX being 15% and Execution 30%.

## Local environment notes

- Windows build 21996: no Docker Desktop. Plans must not require it.
- Node 22.17.1, npm 10.9.2, git 2.54.0.
- **Frontend checker probe (guide, 2026-11-06, PASS):** the design-taste skill's `assets/layout/check.mjs` uses only Node built-ins (no npm install) and finds Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe` (present). A smoke run against the skill's own `assets/starter.html` ran headless at 1440x900 and 390x844 and wrote screenshots; the findings it printed are the unfilled template's. **Exit codes: 0 clean, 1 findings, 2 tool failure**, so it works as a one-line gate. Usage: `node <skill>/assets/layout/check.mjs --url <url or file> --profile <dir> --sizes 1440x900,1024x768,820x1180,768x1024,390x844 --shots <dir>`. Not verified: whether `--url` accepts a running `http://127.0.0.1:<port>` dev server (the usage line says "url or file"), and whether a Next.js app needs `--root` on a static export. The architect confirms both before writing a frontend task's gate. The skill says to use only its own scripts for checking, never a windowed browser or a browser tool.

## Step status

| Step | Status | Artifact | Verification | Seat settings |
|---|---|---|---|---|
| Guide | open | this runsheet | n/a | `claude-sonnet-5-5`, stated; effort `high` per the prompt (user-attested) |
| 0a | skipped | none | n/a | n/a |
| 0 idea-forge | **done** | `docs/idea-forge/2026-11-05-nightcrew-brief.md`, committed and pushed (`fc91e71`) | **Verified 2026-11-06:** all nine required fields present with no placeholders (Problem, Solution, Must-have x3 plus one stretch, Target tracks "none", Judging criteria, Why it wins with white space and head-to-head, Money shot, Out of scope, Feasibility notes); the architect kickoff block is present and its REPO line is `Dotman-Bei/nightcrew`; the commit touched only the brief file; repo renamed and described. Spot-checked live by the guide: `$VIBES` `symbol()` = VIBES and `decimals()` = 18 at `0xefFC…1Acb`; EAS predeploy `version()` = 1.4.1-beta.3; `/api/staking/stats`, `/api/openapi.json`, `/api/contracts.json` and fundable.vibestarter.xyz all answer HTTP 200. Not spot-checked: the failed-raise counts, the 0-challenges ledger figure, the Botto and MoltDAO searches | `opus` + `max` per the kickoff; **the model id and effort the session reported were not passed back to the guide** |
| 1 architect | pending, **next** | n/a | n/a | to run at `opus` + `xhigh` |
| 2 orchestrator | pending | n/a | n/a | to run at `opus` + `high` |
| 2.5 demo-studio | skipped by default | n/a | n/a | n/a |
| 3 gate-concierge | pending | n/a | n/a | preflight `sonnet` + `high`; closing `opus` + `high` |

## Next action

- User pastes the **Step 1 (architect) kickoff** in a new chat tab in a VS Code window opened on `C:\Users\bamig\Documents\VIBE CODE\Hackathons\vibeathon-02-night-shift-2026`, at `opus` + `xhigh`. The kickoff carries the frontend directive, the calendar-fit conditions and the frontend-checker facts.
- In parallel, user starts the day-1 dependencies (funded `ANTHROPIC_API_KEY` first). The user does these, never the guide.
- Guide then verifies the baton: spec, plans and `manifest.json` pushed, Stage-4 validation clean, every deploy/key/fund task `human_gate: true`, `docs/gates/submission-draft.md` present, `docs/FRONTEND.md` present with the sections the user listed, stack rows appended to the tollgate report.

## Open blockers

- ~~Top risk: did the user apply?~~ **Cleared by user attestation** (applied). Residual, non-blocking: when the user connects the application wallet on the submit page, confirm the page recognises the entry; if it does not, tell the guide.
- **Submit form (user, non-blocking until Step 1):** the host promised it "within the hour" (see Event). Re-check https://app.vibestarter.xyz/vibeathon/submit with the application wallet connected and give the guide the field list (paste or screenshot) before the Step 1 kickoff is pasted (target Fri 6 Nov 12:00 UTC). Until then the architect drafts `docs/gates/submission-draft.md` from the rules page (pitch, live URL, Fundable link) and marks the rest `TBD-form-fields`; the closing pass reconciles it with the real form. Submissions stay editable until the window closes, so file early with the live URL and edit after.
- **Day-1 dependencies (user, by Fri 20:00 UTC):** (a) an Anthropic **API key with prepaid credit** (`ANTHROPIC_API_KEY`; a Claude Pro seat is not an API key); (b) a burner attester wallet with a little ETH on Base for attestation gas (`ATTESTER_PRIVATE_KEY`, env var only, never committed, never pasted into chat); (c) a hosting account once the architect names the host. Payment and key creation are the user's own actions.
- **Two questions for the host in Discord (user, optional but cheap):** the submit form's field list once it is live, and whether a live product shipping new floors after the build window closes (during judging) is acceptable. The rules are silent on it and the brief flags it.
- User to confirm or correct the assumed goal and skills (above); the prompt's GOAL, SKILLS and CALENDAR fields were still template text in this session too.
- Step 0's reported model id and effort were not passed back; record them here if the user pastes the first line of that chat.
- **Step 3 needs the user's wallet** (tollgate row 8 now applies to Step 3, see the tollgate report): the submit page is wallet-gated, so the user connects the application wallet and signs in themselves; the concierge is never given the key.
- Tollgate row 5 (Chrome extension) passes in the guide session; Step 3 still re-probes it in its own session, so keep Chrome open and the extension signed in.
- Special judges unnamed.
