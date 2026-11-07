# Gate ledger: Vibeathon 02 "Night shift"

Audit trail of every human-gated action in the campaign. Preflight was skipped by recommendation (see the runsheet), so this file starts at the closing pass.

- **Seat:** gate concierge, closing pass. Model `claude-opus-5-5`, effort `high` (user-set).
- **Opened:** Sat 2026-11-07, about 13:55 UTC.
- **Granted access:** Chrome (claude-in-chrome). Not granted: any wallet key, any signup, any payment. Signup automation struck.
- **Session probes:** Chrome responded (`tabs_context_mcp`, live navigation). `gh` is logged in as `Dotman-Bei`. Repo `Dotman-Bei/nightcrew` is `PRIVATE`.

## Closing gates

| # | Gate | Tier | Tool plan | Human moment | Risk | Status |
|---|---|---|---|---|---|---|
| C1 | Resolve the draft's and README's `TBD-post-build` lines from the live site and repo | A | Edit, `git` | none | None: docs only | **done** (see Evidence) |
| C2 | Run Fundable on the live URL and record the result link | A: free, no signup, no account | claude-in-chrome on fundable.vibestarter.xyz | none | Low. The page says the result is "filed only because you shared it". The link is optional on the form, and judges see the score beside the entry | **done**, 68/100 PROMISING, https://fundable.vibestarter.xyz/s/WDVXwKCAB5 (see Evidence) |
| C3 | Fill the submission form (launch:15, first half) | A once the wallet is connected | claude-in-chrome, the draft, the screenshot | **Tier B: the user connects their application wallet on the submit page.** The agent never connects, signs or logs in | None until Submit: nothing is filed by a fill | approved in the kickoff; **blocked on the wallet connect** |
| C4 | Press Submit (launch:15, second half) | Own consent, separate from C3 | claude-in-chrome | **The user says "submit"**, after reading the filled form | Reversible: the entry stays editable until Mon 2026-11-09 22:00 UTC | pending |
| C5 | Flip the repo public | A, but consent at this gate | `gh repo edit`, after re-reading `gh auth status` | **The user says yes or no** | Public history is hard to take back. Scan result below | pending; not done |
| C6 | Demo video | Not a concierge gate | none | The user adds it later | Optional field | declined for this filing; the user may add it before the close |

**Identity rule for C3 to C5.** Before the fill and again before Submit, the concierge re-reads the page's identity: it must show the entry as linked (runsheet: "Entrant: LINKED"). A logged-out state or a different identity is a hard stop.

**Order:** C1, C2, then the user's wallet connect, C3, then C5 (so the repo URL can go in the form if chosen), then C4.

## Campaign gates held by the user

Recorded here so this one file is the complete picture. The concierge did not run these and does not run them.

| Gate | Status | Evidence |
|---|---|---|
| foundation:3 key and probe | done by the user | `PROBE RESULT: ok`, tollgate report |
| launch:4 Vercel and Neon | done by the user | dispatch log |
| launch:5 attester key and schema | done by the user | dispatch log; `EAS_SCHEMA_UID` by name only |
| launch:6 budget and settings | done by the user | dispatch log; `CREW_BUILD_MODEL` read back as `anthropic/claude-sonnet-5.5` |
| launch:7 rehearsals | done by the user | `docs/gates/rehearsal-costs.md` |
| launch:8 seed proposals | done by the user | dispatch log |
| launch:9 deploy | done by the user | https://nightcrew-gray.vercel.app answers 200 |
| launch:17 floor headers on the live site | done by the user | dispatch log, FLOOR HEADERS OK |
| launch:10 arm the nightly job | done by the user | `SHIFTS_ARMED` read back as `true` |
| launch:13 off-schedule shift | done by the user | run 42373776560, shift 1 |
| **launch:12 real-wallet check** | **open, no record of it running** | See "Flags before Submit" |
| launch:11 second hostname | open, non-blocking | |
| launch:14 spare off-schedule shift | open, may be moot: 3 floors are already on record | |
| launch:16 judging-night settings | open, Mon 9 Nov by 21:00 UTC | |
| Frame-removal fix | open: the known gap is due before Sun 8 Nov 22:00 UTC | runsheet, Next action |

## Evidence

**Read live, Sat 2026-11-07, about 13:53 UTC, no wallet connected:**

- `/`, `/vote`, `/built`, `/rejected`, `/shifts/1`, `/shifts/2`, `/shifts/3`, `/floors/1`, `/floors/2`, `/floors/3` all answer 200.
- The tower shows "Floors lit 3". Floor 3 opens and renders its working tool.
- **Receipts, read from each public `/api/receipts/<n>/bundle.json`:**

| Shift | Floor | Outcome | Label | Seeded | Wallets | Build / triage and review | Cost | Attestation |
|---|---|---|---|---|---|---|---|---|
| 1 | Stake share calculator | shipped | off-schedule | yes | 0 | `anthropic/claude-sonnet-5.5` / `anthropic/claude-haiku-5.5` | 10 cents | [attested on Base](https://base.easscan.org/attestation/view/0x4638789c707675c35fc97e15968a97965d5a210bfdb3101ab63b83b2971e9d1f) |
| 2 | Vibestarter raises | shipped | off-schedule | yes | 0 | same | 10 cents | pending |
| 3 | Release schedule calculator | shipped | off-schedule | yes | 0 | same | 6 cents | pending |

- **Draft's "Checks before filing":** live URL answers with no wallet, newest floor lit: PASS. At least 3 floors: PASS. "Not affiliated" line shows: PASS, in the footer. No investment language: PASS on the rendered text of `/`, `/built`, `/rejected` and `/vote` (a word scan, then the vote page read in full; its only mention is the rule forbidding "claims about price or returns"). Nothing in the voting flow mentions the contest vote: PASS.
- **"A wallet with no $VIBES still counts at minimal weight":** matches `lib/tally.ts:41` and the vote page. Not exercised by a real wallet.
- **Screenshot:** `docs/gates/evidence/nightcrew-tower-1600x900.png`, 1600x900, 171 KB, headless Chrome against the live site.

**Fundable, Sat 2026-11-07 13:58 UTC, on https://nightcrew-gray.vercel.app:** 68/100, verdict PROMISING, receipt F-H7BYV. Idea 38/60 (problem and demand 10/20, differentiation 10/15, timing 7/10, backer fit 11/15). Execution 30/40 (craft 6/10, reliability 10/10, product evidence 14/20). Its line, shown to anyone with the link: "the machine runs, the crowd has not shown up yet." Named misses: no custom domain, no social preview image, all proposals seeded, 0 wallets. Its "working vote flow" comes from reading the page, so it is not proof of launch:12.

**Repo-flip scan (read-only, for C5):** one tracked env file, `.env.example`. Secret-shaped strings in the tree are 3 short test fixtures (19 to 23 characters), in `tests/` and the pipeline plan. No database URL with a password in the tree or history. The 64-hex values are the public schema UID and a hash test vector. This was a pattern scan, not a full audit. A flip would also publish working notes in `docs/`: the refused card, the OpenRouter key pasted into chat and the decision not to rotate it, the accepted frame-removal gap, the Discord thread, and local paths with the Windows username. An anonymous request to the repo returns 404 today, and no live page links to it.

## Flags before Submit

1. **The voting flow has no real-wallet proof on the live site.** launch:12 has no record, and every receipt shows 0 wallets. The form tells judges to vote. The user is connecting a wallet anyway: a vote from it would close this.
2. **"It's a working tool someone asked for in one sentence"** is not quite true of the floors on record, since all three proposals are seeded. The floors line discloses it. A one-line rewording is offered to the user; the filled copy stays as drafted until they choose.
3. **The newest floor's receipt shows "Attestation pending"**, while the text promises "the attestation on Base". The floors line discloses it. It clears at the next publish.
