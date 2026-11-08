# Submission draft: Vibeathon 02 "Night shift"

The platform form, pre-answered. File at https://app.vibestarter.xyz/vibeathon/submit, with the application wallet connected. The page already shows "Entrant: LINKED". The user files it; it stays editable until Mon 2026-11-09 22:00 UTC. Target filing: Mon 2026-11-09 12:00 UTC.

Build-time facts resolved by the gate concierge's closing pass, Sat 2026-11-07, from the live site and the public receipts, and refreshed at about 16:00 UTC: 4 floors, all attested, one real wallet vote, frame-removal fix deployed. Evidence and open flags: `docs/gates/2026-11-07-gate-ledger.md`.

## Required fields

### Project name

Night Crew

### Tagline

An AI dev crew for token holders: sign to vote for a feature, and by morning it ships as a working floor of a public tower, with a receipt on Base.

### Live app URL

https://nightcrew.suitz.xyz

### What does it do, and what should judges try?

Night Crew is an AI dev crew that $VIBES holders command. Any wallet proposes a feature in one sentence, and holders vote by signing a gasless message. At 22:00 UTC the crew takes the top proposal that passes safety triage, builds it, tests it and ships it as a new floor of a public tower, with no human touching the code. A failed shift is published like a passed one, and a night with nothing shipped shows as a dark floor.

It's for token communities with holders but no active developer. $VIBES is the first.

**Try this first:** open the tower and click the newest lit floor. It's a working tool built from a one-sentence proposal, running in a locked sandbox. Then click "See the receipt" for the vote tally, the agent's full transcript, the diff, the test results, what the inference cost, and its attestation on Base.

To vote, open "Vote tonight" and sign one message. It costs no gas, and a wallet with no $VIBES still counts at minimal weight, so you can try it with any wallet.

Floors on record at filing: 4 (shifts 1 to 4). All four are off-schedule shifts on seeded proposals, and all four are attested on Base. A real wallet has signed a vote on the live site, and the tower reads "Wallets tonight 1"; the four receipts show 0 wallets because their shifts closed before that vote. The first scheduled shift runs Sat 7 Nov at 22:00 UTC.

### Built with

Built with Claude Code, by Claude agents working from a written spec one tested task at a time: an architect on Claude Opus 5.5 wrote the spec, plans and task manifest, and an orchestrator dispatched a fresh subagent per task and proved each task's gate before committing it.

Claude agents also run the product's own nightly shifts, reached through OpenRouter. Triage and review run on Claude Haiku 5.5 with no working tools. The build agent runs on Claude Sonnet 5.5, in a small tool loop in a GitHub Actions job. It has three tools: write one of two named files in a temp folder, read a file in that folder, and run the static check. It has no shell and no network, and it stops at hard limits on turns, tokens, spend and time. That job holds the OpenRouter key, so its boundary is the tool set: no tool can reach the key, and nothing in that job runs what the agent writes. A separate job with no secrets then runs the floor in real Chrome against a fake wallet. On the live site each floor runs in a sandboxed frame, and a floor that navigates itself away is removed from the page. Every shift publishes its own transcript and its cost as OpenRouter reported it.

Stack: Next.js, TypeScript, Postgres (Neon), viem and wagmi on Base, EAS attestations, Claude through OpenRouter, Playwright with Chrome, GitHub Actions, Vercel. Frontend built with the design-taste-frontend skill.

## Optional fields

### Product screenshot

`docs/gates/evidence/nightcrew-tower-4-floors-1600x900.png` (PNG, 1600x900, 171 KB, landscape, from the live tower at about 17:00 UTC Sat 7 Nov: its window shows floors 2 to 4, and the counters read "Floors lit 4" and "Wallets tonight 1")

### Repo URL

https://github.com/Dotman-Bei/nightcrew

### Project X handle

Leave blank unless the user wants to add one. The product has no X integration.

### Tool chips

Claude Code, Claude

### Demo video URL

https://youtu.be/4LSovoe7UnM (1:34, recorded on the live site on Sun 8 Nov 2026 and uploaded by the user; it shows 5 floors, so it is newer than the 4-floor text above)

### Fundable result link

https://fundable.vibestarter.xyz/s/WDVXwKCAB5 (68/100, PROMISING, run on the live URL Sat 7 Nov 13:58 UTC)

## Checks before filing

- The live URL answers with no wallet connected, and the newest floor is lit.
- At least 3 floors are on record, or the true count is stated above.
- Public copy has no investment language, and nothing in the voting flow mentions the contest vote.
- The "not affiliated" line shows on the page.
