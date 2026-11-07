# Submission draft: Vibeathon 02 "Night shift"

The platform form, pre-answered. File at https://app.vibestarter.xyz/vibeathon/submit, with the application wallet connected. The page already shows "Entrant: LINKED". The user files it; it stays editable until Mon 2026-11-09 22:00 UTC. Target filing: Mon 2026-11-09 12:00 UTC.

Lines marked `TBD-post-build:` are facts that do not exist until the build lands. Nothing else is deferred.

## Required fields

### Project name

Night Crew

### Tagline

An AI dev crew for token holders: sign to vote for a feature, and by morning it ships as a working floor of a public tower, with a receipt on Base.

### Live app URL

TBD-post-build:live app URL

### What does it do, and what should judges try?

Night Crew is an AI dev crew that $VIBES holders command. Any wallet proposes a feature in one sentence, and holders vote by signing a gasless message. At 22:00 UTC the crew takes the top proposal that passes safety triage, builds it, tests it and ships it as a new floor of a public tower, with no human touching the code. A failed shift is published like a passed one, and a night with nothing shipped shows as a dark floor.

It's for token communities with holders but no active developer. $VIBES is the first.

**Try this first:** open the tower and click the newest lit floor. It's a working tool someone asked for in one sentence, running in a locked sandbox. Then click "See the receipt" for the vote tally, the agent's full transcript, the diff, the test results, what the inference cost, and the attestation on Base.

To vote, open "Vote tonight" and sign one message. It costs no gas, and a wallet with no $VIBES still counts at minimal weight, so you can try it with any wallet.

Floors on record at filing: TBD-post-build:count of floors on record (shipped floors, labelled scheduled or off-schedule)

### Built with

Built with Claude Code, by Claude agents working from a written spec one tested task at a time: an architect on Claude Opus 5.5 wrote the spec, plans and task manifest, and an orchestrator dispatched a fresh subagent per task and proved each task's gate before committing it. The spec, plans and manifest are in the repo.

Claude agents also run the product's own nightly shifts, reached through OpenRouter. Triage and review run on Claude Haiku 5.5 with no working tools. The build agent runs on TBD-post-build:build model used for the evidence shifts (planned: Claude Sonnet 5.5), in a small tool loop in a GitHub Actions job. It has three tools: write one of two named files in a temp folder, read a file in that folder, and run the static check. It has no shell and no network, and it stops at hard limits on turns, tokens, spend and time. That job holds the OpenRouter key, so its boundary is the tool set: no tool can reach the key, and nothing in that job runs what the agent writes. A separate job with no secrets then runs the floor in real Chrome against a fake wallet. Every shift publishes its own transcript and its cost as OpenRouter reported it.

Stack: Next.js, TypeScript, Postgres (Neon), viem and wagmi on Base, EAS attestations, Claude through OpenRouter, Playwright with Chrome, GitHub Actions, Vercel. Frontend built with the design-taste-frontend skill.

## Optional fields

### Product screenshot

TBD-post-build:screenshot from the live tower, taken after the first floor ships (PNG, JPG or WebP, at most 5 MB, landscape)

### Repo URL

TBD-post-build:public repo URL, https://github.com/Dotman-Bei/nightcrew, only if the user chooses to flip the repo public at submission. It is private today, and the form does not require it

### Project X handle

Leave blank unless the user wants to add one. The product has no X integration.

### Tool chips

Claude Code, Claude

### Demo video URL

TBD-post-build:demo video URL, if the user records one. Decision at the Sat 7 Nov checkpoint: a plain 60-second screen recording is enough

### Fundable result link

TBD-post-build:Fundable result link, from running https://fundable.vibestarter.xyz on the live URL at closing

## Checks before filing

- The live URL answers with no wallet connected, and the newest floor is lit.
- At least 3 floors are on record, or the true count is stated above.
- Public copy has no investment language, and nothing in the voting flow mentions the contest vote.
- The "not affiliated" line shows on the page.
