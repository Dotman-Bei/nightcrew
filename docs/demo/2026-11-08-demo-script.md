<!-- demo-script-schema: v1 -->
# Night Crew — demo script

## 0 — Production card

| field | value |
|---|---|
| Project | Night Crew (`Dotman-Bei/nightcrew`), live at https://nightcrew.suitz.xyz |
| Event | Vibeathon 02 "Night shift" |
| Target length | 1:30 (hard cap 2:00) |
| Resolution / fps | 1920×1080 @ 30 |
| Voice | edge-tts, en-US-AriaNeural, health-checked before use. Fallback: Kokoro, which needs the espeak-ng installer, a consented install. |
| Music | off (captions-only) |
| Wallet on camera | none. No wallet scene, no connect, no signature, no staged vote. |
| Upload target | none, upload struck. The user uploads the rendered file themselves; this seat never uploads. |
| Schema | v1 |

## 1 — Story & time budget

Prove: the winning proposal of shift 5 (3 wallets, 3 $VIBES) became a working floor anyone can use, and its public receipt (tests 6 of 6, $0.07) is attested on Base. All of it is shown with real data from the live site.
Money shot: scene S5.

| criterion | weight | seconds |
|---|---|---|
| Execution ("does it work, end to end?") | 30% | 27 |
| Launch potential ("would people back it?") | 25% | 23 |
| Originality | 20% | 18 |
| Craft and UX | 15% | 13 |
| Vibecoding leverage ("how well AI tools were used") | 10% | 9 |

Weights are quoted from the published rules (https://blog.vibestarter.xyz/vibeathon-02, as recorded in the brief and re-verified in the runsheet on 2026-11-05). No Step 0a pack exists, so there is no `event.md` for this event. Scenes serve several criteria at once (the receipt scene carries Execution and Vibecoding leverage together), so scene seconds and criterion seconds are not 1:1. The holders' scorecard rewards being understood quickly, so the story is told in one pass, in the order a visitor meets the product: the clock, the vote, the tower, a floor, its receipt, its attestation, who is taking part.

Rules this script obeys:

- **Real data only.** Every number below was read from the live site on 2026-11-08 and is re-asserted at capture (the `gate assertion` column). If a number has changed, capture stops and the script is edited and re-approved. Nothing is rounded up.
- **Seeded is said plainly.** Floor 5's proposal is a seeded proposal (the page and the receipt say so). The narration says "one sentence", never "a holder asked". The tally is described as "wallets", never as holders voting.
- **No fake countdown.** The site has no ticking countdown (checked in the app source). The home page shows the label "Next shift closes 8 Nov at 22:00 UTC", so that label is what is shown. No timer is overlaid.
- **No wallet, no vote, no signing.** `/vote` is shown as a visitor sees it, disconnected. No Connect, Vote, Propose or Sign control is clicked or hovered.
- **Nothing sensitive in frame.** Capture is page-level, so no terminal, `.env`, balance or wallet address list can appear. A fresh browser profile has no wallet extension, so no stored connection can reconnect and show an address.
- **No investment language, no contest-vote ask, no event art or Vibestarter logos.** "Not affiliated" is stated on the outro card, as on the site.
- **Dated.** The title and outro cards say "Recorded on the live site, 8 Nov 2026", because the tower keeps growing after this recording.

## 2 — Pre-flight — set up before recording

| # | item | how to verify | ✓ |
|---|---|---|---|
| 1 | App running: nothing to start, it is the live Vercel deploy at https://nightcrew.suitz.xyz | `curl -sL -o NUL -w "%{http_code}"` returns 200 for `/`, `/vote`, `/floors/5`, `/shifts/5`; the attestation link on `/shifts/5` resolves on base.easscan.org | |
| 2 | Demo data: no fixtures. The live state at script time (2026-11-08 ~04:00 UTC) is "Floors lit 5", floor 5 "Staged release quiz" (shift 5, scheduled, shipped 7 Nov), receipt tally 3 $VIBES · 3 wallets, tests 6 of 6, cost $0.07, attested. "Taking part so far": wallets that voted or proposed 6, votes signed 6, proposals from wallets 1, seeded proposals 8, waitlist signups 0 | Home text reads "Floors lit 5" and "Floor 5 Staged release quiz"; the counts match. **Capture before 21:30 UTC on 8 Nov**: shift 6 closes at 22:00 UTC, and the shift-5 cron started 3 h late, so the home page may change from about 22:00 UTC. If it reads "Floors lit 6", stop and re-script | |
| 3 | Wallet state: N/A, no wallet scenes. Nothing connected, nothing signed, nothing staged | `/vote` renders "Connect a browser wallet" (not an address) in the capture profile; the driver's click guard refuses any control matching connect, vote, sign or propose | |
| 4 | Browser hygiene: a fresh temp profile in Playwright-driven Chrome, no extensions, no bookmarks bar, 1920×1080 viewport, device scale 1, 100% zoom, no password-manager prompts. The user's own Chrome, which has a wallet extension, is never used to record | Launch log shows a throwaway `--user-data-dir`; first frame is the page only, with no browser chrome | |
| 5 | Desktop hygiene: capture is page-level (`page.screencast`), so the desktop is never in frame and no `gfxcapture` or `ddagrab` is used. Windows focus assist on during the take; `.env` files and terminals closed anyway | Focus assist on; QC frames show page content only | |
| 6 | Capture toolchain: tollgate session card for Step 2.5 (rows 5, 9, 10, 11, 16; 13 N-A, upload struck). Row 10 failed at the first probe (ffmpeg missing); the user is installing it and a re-probe is pending | `docs/tollgate/2026-11-05-tollgate.md`, Step 2.5 session card, green after the row-10 re-probe | |
| 7 | Assets: title card and outro text per §5; logo is the arc mark at `public/icon.svg`; outro QR encodes https://nightcrew.suitz.xyz; repo URL as text https://github.com/Dotman-Bei/nightcrew; palette and fonts from `docs/FRONTEND.md` (sand `#dedad3`, ink `#0a0a0a`, teal `#256f82`, Host Grotesk, JetBrains Mono); music N/A | Files exist; QR scans to the live URL | |

## 3 — Shot list

| id | seconds | visual (route/action/window) | narration cue | driver | wallet verbs | gate assertion | retakes | take |
|---|---|---|---|---|---|---|---|---|
| S1 | 14 | `/` home, no clicks: hero headline, the "Next shift closes 8 Nov at 22:00 UTC" strip, the tower with lit floors. One slow scroll of at most 200 px to show the tower panel | S1 "Night Crew is…" | screencast | — | page text has "Next shift closes 8 Nov at 22:00 UTC" and "Floors lit 5"; final frame shows the strip and the headline | 3 | |
| S2 | 12 | Click the nav button "Vote tonight" (a real navigation) to `/vote`. Hold on the heading and the no-gas sentence, then scroll slowly to the top-5 list. No Connect, Vote, Propose or Sign control is clicked or hovered | S2 "To steer it…" | screencast | — | URL is `/vote`; text has "It costs no gas" and "Connect a browser wallet"; body text has no `0x` address (regex `0x[0-9a-fA-F]{8,}`); click guard never fired | 3 | |
| S3 | 10 | `/` scrolled to the whole-tower section: floors 1 to 5 lit, floor 6 "Tonight", the "Build window closes 9 Nov, 22:00 UTC" marker. Smooth scroll, then hold | S3 "Each shift that…" | screencast | — | tower shows "Floor 5 Staged release quiz" lit and "Floor 6 … Tonight"; the build-window marker is visible in the final frame | 3 | |
| S4 | 16 | `/` at the Floor 5 card: click "Open the floor" to `/floors/5`. Use the quiz in its sandboxed frame for real: read each question, click an answer (the feedback shows each time), click Next through all four to the score screen and its summary | S4 "Floor five started…" | screencast | — | `/floors/5` shows "Network None", "Storage None", "Wallet access None"; the frame shows "Question 4 of 4" then a result matching "out of 4" and a "Summary"; every answer is a real click, and answers are chosen at record time from the questions shown | 3 | |
| S5 | 16 | On `/floors/5` click "See the receipt" to `/shifts/5`. Hold on "Receipt for shift 5 : shipped" (outcome, cost). Jump to "Vote tally and triage" (3 $VIBES · 3 wallets · seeded; triage Accepted). Jump to "Tests and hashes" (six tests, all Passed; receipt hash). Jumps skip the transcript and diff | S5 "Open its receipt…" | screencast | — | `/shifts/5` text has "shipped", "$0.07", "3 $VIBES · 3 wallets" on the winning line and six "Passed" rows; no `0x` address in the frames (hashes are fine) | 3 | |
| S6 | 6 | Click "See the attestation" on `/shifts/5`. The base.easscan.org attestation page opens (UID `0xed97…98c0`). Frame the attestation record with no address legible: scroll below the attester row. Fallback if that cannot be framed: end the take on the receipt's attestation link, with no navigation shown | S6 "Then its hash…" | screencast | — | URL host is base.easscan.org and the UID in the URL matches the receipt link; page title or body says "Attestation"; QC finds no legible address | 3 | |
| S7 | 12 | `/` scrolled to "Taking part so far", with the whole row in frame and the page's own note on how counts are made. Hold. No cropping | S7 "These are the…" | screencast | — | text has "Wallets that voted or proposed 6", "Votes signed 6", "Seeded proposals 8", "Waitlist signups 0" | 3 | |

The title card (3 s) and outro card (6 s) are Remotion compositions, not recorded scenes, so they are not rows here. Total at plan: 86 s of scenes plus 9 s of cards, 95 s. Final scene timing is audio-first.

## 4 — Narration script

TTS input drops the `$` sign (so "VIBES" is read as a word); captions keep the text as written.

**S1** — Night Crew is an AI dev crew that token holders command. Every night at ten p.m. UTC, it builds the winning proposal, tests it, and ships it as a new floor of this tower.
words: 34 · planned: 14s @ ~2.4 w/s · tone: clear, matter-of-fact, no hype · gloss: AI → "A I"; UTC → "U T C"; p.m. → "P M"

**S2** — To steer it, connect a wallet and sign one message. No gas, just a signature. Even a wallet with no $VIBES counts, at minimal weight, so anyone can try it.
words: 30 · planned: 12s @ ~2.4 w/s · tone: friendly, slightly slower on "No gas, just a signature" · gloss: $VIBES → "vibes"

**S3** — Each shift that ships lights a floor, and five are lit. A night with nothing shipped stays dark, and its receipt says why.
words: 23 · planned: 10s @ ~2.4 w/s · tone: calm, a beat after "lit" · gloss: none

**S4** — Floor five started as one sentence: a small quiz about how a raise releases funds. Now it is a working tool, in a locked sandbox with no network and no wallet access.
words: 32 · planned: 16s @ ~2.4 w/s (the extra time is the quiz being used) · tone: plain, lets the clicking breathe · gloss: none

**S5** — Open its receipt and everything is public. Three wallets signed for this proposal, three $VIBES of weight. Triage accepted it, the crew built it, and all six tests passed, for seven cents of inference.
words: 34 · planned: 16s @ ~2.4 w/s · tone: the proof beat, measured, each number clear · gloss: $VIBES → "vibes"

**S6** — Then its hash is attested on Base, where anyone can check it.
words: 12 · planned: 6s @ ~2.4 w/s · tone: short, confident · gloss: Base → "base" (the network)

**S7** — These are the real counts, from the database. Six wallets have voted or proposed. Eight proposals were seeded by the builder to start the vote, and they are counted apart.
words: 30 · planned: 12s @ ~2.4 w/s · tone: honest, understated, no spin · gloss: none

**O** (outro card, not a recorded scene) — Vote on tonight's floor. Live by morning. Try it on the live site.
words: 13 · planned: 6s @ ~2.4 w/s · tone: warm close · gloss: none. The URL is shown on the card and is not spoken.

## 5 — Assembly plan

Order: title card → S1 → S2 → S3 → S4 → S5 → S6 → S7 → outro. Transitions: hard cuts. Captions: on, word-timed from the edge-tts word boundaries, bottom-centre in a band at y 940–1040, Host Grotesk 600, light text on a dark translucent pill, at most two lines, current word emphasised. Scroll targets keep each scene's subject above y 900 so captions never cover it. Music: off. Loudness: −14 LUFS. Export: 1080p h264. Mechanics: references/demo-stack.md.

Cards: the title card (3 s) is sand ground with the arc mark, "Night Crew", "Vote tonight. Live by morning." and "Recorded on the live site · 8 Nov 2026". The outro card (6 s) is an ink ground with "Vote on tonight's floor", the live URL, the QR, the repo URL, "Vibeathon 02 · Night shift" and "An independent project. Not affiliated with Vibestarter."

Timing rules: scene length follows the narration (audio-first). If a recorded clip is longer than its narration, the narration is padded with silence; if shorter, the last frame is held for at most one second. Recorded footage is never sped up, slowed or re-timed, and a jump scroll or hard cut between real steps is the only editing of an interaction. Capture is page-level and headless-capable, so the desktop is never recorded.

## 6 — QC record

| check | scene(s) | pass/fail | note |
|---|---|---|---|
| money shot visible | | | |
| text legible at 1080p | | | |
| captions present + synced | | | |
| no capture yellow border | | | |
| no secret / no address that shouldn't be on screen | | | |
| per-scene duration within budget | | | |
| total duration within ±10% | | | |
| audio present, loudness sane | | | |

## 7 — Publish block

| field | value |
|---|---|
| Upload target + account | none, upload struck. The user uploads the rendered file themselves |
| Title | Night Crew: vote tonight, live by morning (Vibeathon 02 demo) |
| Description | Night Crew is an AI dev crew that token holders command. Wallets sign a free message to vote, with no gas. At 22:00 UTC the crew builds the winning proposal, tests it and ships it as a new floor of a public tower, with a receipt attested on Base. Recorded on the live site on 8 Nov 2026: https://nightcrew.suitz.xyz. Code: https://github.com/Dotman-Bei/nightcrew. Built for Vibeathon 02 "Night shift". An independent project, not affiliated with Vibestarter. Music: none. |
| Tags | night crew, ai agents, claude code, base, eas attestation, token holders, vibeathon |
| Visibility | unlisted (the user's call, as they upload it) |
| URL | TBD |
| Verified logged-out | TBD |
| Resolves | submission-draft demo video URL |

## 8 — Status ledger

| date | event | by |
|---|---|---|
| 2026-11-08 | scripted | demo-studio |
| 2026-11-08 | approved (the user) | demo-studio |
