# Night Crew: frontend

The design source for every page task. It follows the `design-taste-frontend` skill at `C:\Users\bamig\Documents\VIBE CODE\Hackathons\.claude\skills\design-taste-frontend\SKILL.md`, referred to below as `<skill>`. Read `<skill>/SKILL.md` and its `references/copy.md`, `system.md`, `layout-v4.md` and `sections.md` before the first page.

Every page in this file was built and passed the skill's checker at all five sizes in a reference build on 2026-11-06, so these decisions are known to work. Plan tasks carry the code.

## 1. Who it is for, and the one action on each page

**Who:** $VIBES holders who want a say in what gets built, and the judges and backers who need to see in one screen that it works. A judge may have no wallet and no $VIBES, and must still understand the product and try the flow.

| Page | Route | The one main action |
|---|---|---|
| Tower | `/` | Vote tonight |
| Receipt | `/shifts/[slug]` | Open the floor |
| Floor | `/floors/[slug]` | See the receipt |
| Vote and propose | `/vote` | Connect a browser wallet, then Vote |
| How it was built | `/built` | See the latest receipt |
| Rejected | `/rejected` | Propose a feature |
| Veto | `/veto` | Sign the veto (builder only, not linked, `noindex`) |

"Vote tonight" reads the same in the nav, the Tower hero and the close, and nowhere else as a filled button. The skill's `consistency.mjs` warns that "Vote" is not in its verb list. That warning is accepted: it is the product's own transaction, and "Vote tonight" is the pitch.

The public face (Tower, Receipt, Floor, Built, Rejected) is server-rendered and loads no wallet code, because Fundable reads it. Wallet code loads only on `/vote` and `/veto`, and neither embeds a floor.

## 2. Visual direction

**Thesis:** a working tower, shown plainly. The picture is the product itself: a dark stack of floors where the shipped ones are lit, on a quiet putty page. No night-sky scenery, no rain, and no green `>_` on a roof, because those belong to the event's own art. Everything else is exact, like a receipt.

### The deal

Dealt by the skill's scripts on 2026-11-06, never chosen by taste.

| Part | Dealt | Note |
|---|---|---|
| Kind | software (`data-type="software"`, site-kind software) | |
| Hero | `split` | Words left, the tower right, on `span-6` and `span-6 start-7` |
| Palette | `putty-black-teal` | |
| Type | `host` (Host Grotesk + JetBrains Mono) | |
| Radius | `sharp` | The skill's rule for developer tools |
| Ground | `sand` | |
| Nav | `nav-centre` | |
| Footer | `footer-dark` | |
| Close | `close-type` | `close-word` was dealt, but its recipe forbids repeating the name in a footer wordmark, and `footer-dark` sets the name large. Dealt again |
| Rhythm | `space` | |
| Buttons | `solid` | |
| Mark | `arc` | |
| Effect | `silk-folds` in the hero's frame | From `--slots band --quiet` with the patterns excluded |
| CSS grounds | none | `bg-topglow` needs a wrapper the shell forbids, and `bg-field` turns a section into a centred grid that collapses the app window. Both tested and dropped |
| Moments | none | `line-carries-colour` was dealt, but it needs a section on a new ground and the rhythm is `space`. The skill allows zero |

### Palette

Keep this `:root` block exactly as printed. `app/layout.tsx` carries it.

```css
:root {
  --p-bg: #dedad3; --p-surface: #d3cec6; --p-ink: #0a0a0a; --p-muted: #55514c;
  --p-accent: #256f82; --p-accent-ink: #ffffff; --p-action: #256f82; --p-action-ink: #ffffff;
  --p-inv-bg: #0a0a0a; --p-inv-surface: #151515; --p-inv-ink: #dedad3; --p-inv-muted: #84827e;
  --p-inv-accent: #256f82; --p-inv-accent-ink: #ffffff; --p-inv-action: #256f82; --p-inv-action-ink: #ffffff;
  --font-display: "Host Grotesk", system-ui, sans-serif;
  --font-text: "Host Grotesk", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  --display-weight: 500;
  --display-tracking: -0.035em;
  --display-tracking-xl: -0.04em;
}
```

The tower and the transcript use the inverse values: `#0a0a0a`, `#151515`, `#dedad3`, `#84827e`, with lit floors in the accent. In diffs only, added lines are `#8fd3a8` and removed lines `#e8a79c`. A failed test is `#9a2f22`. Floors use the same palette through `floor-kit/template.html`, with a system font stack because a floor cannot load fonts.

### Typefaces

Two: **Host Grotesk** for everything people read, and **JetBrains Mono** for floor numbers, hashes, logs and diffs. Loaded from Google Fonts with `display=swap`.

### Spacing

The kit's scale only: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 (`--s-1` to `--s-10`). Heading to content 48 (32 on a phone), cards 24 apart (12 on a phone). Page edges are the kit's `.wrap`: x 80 and 1360 at 1440, x 48 at tablet, x 24 and 366 at 390.

### Motion

- The kit's hover layer on every page: buttons step 1px and press, links draw their underline, the arrow moves 3px. Never override it.
- The `silk-folds` ground behind the tower is the page's one effect, with its pause button.
- Nothing else moves by itself. No loops, entrance animations, counters or scroll effects.
- Under reduced motion everything rests.

## 3. How pages are built in Next.js

These were each learned from a failure in the reference build. Follow them.

- **Kit files are copied, never edited.** `scripts/copy-taste.mjs` copies the runtime assets to `public/taste/`. Page CSS goes in `public/site.css`, linked last.
- **Kit scripts load after hydration.** They change the DOM (effect canvases, pause buttons, nav sheets). Loaded as plain module scripts, they race React and throw hydration error #418. `components/kit-scripts.tsx` injects them from a `useEffect`.
- **The kit's diagram mounts its own nodes.** Its host uses `dangerouslySetInnerHTML` with `suppressHydrationWarning`. JSON in that string is escaped: `<` becomes `\u003c`.
- **No kit fragment uses `data-ui`.** The kit's fragment script animates fake data. Our data is real, so we use the fragment's CSS classes and no script.
- **`.frame > :not(.stage, ...)` is forced to `position: relative`.** Anything placed absolutely in a frame goes inside `<div class="stage">`.
- **`.rows__value` has an explicit grid column.** To stack a row on a phone, set `grid-column: 1; grid-row: auto` on the value too, or the implicit column squeezes the name to one word per line.
- **Scrolling panes count as text unless they are frames.** The checker's `sparse` rule measures text height, so a pane is `log-pane frame fill`.
- **A `.fill` block collapses at tablet** without `main > section > .wrap > .fill { min-height: 62svh; flex: 1 0 auto; }` between 640 and 1279px. This rule is in `public/site.css`.
- **The kit has `.stack-2`, `.stack-4` and `.stack-5` only.** `.stack-6` does nothing.
- **The floor frame's URL is relative on the main host.** A fixed origin breaks on any other port. The layout checker cannot see inside a frame and passes a broken one, so the Floor page's gate also proves the floor renders.
- **Check with `scripts/check-page.mjs`, never a windowed browser.** Routes have no leading slash (`home`, `vote`, `shifts/1`), because Git Bash rewrites `/` into a Windows path. It uses a fresh Chrome profile each run, because a kept profile serves stale CSS.

## 4. Pages, in build order

All copy below is final. Words in `{braces}` come from the database, and the code in each plan task shows where. Every page ends with the same footer (section 4.8).

### 4.1 Tower `/`

**First screen (`.hero.hero--split`).** It answers what this is, what shipped last night, what is being voted on tonight, and how to vote.

- Notice: "Next shift closes {8 Nov} at {22:00 UTC}"
- H1: "AI dev crew that token holders command"
- Lead: "Holders sign to vote for a feature. At 22:00 UTC the crew builds the winner, tests it and ships it as a new floor of this tower, with a receipt on Base."
- Buttons: "Vote tonight" (primary, to `/vote`), "See last night's floor" (secondary, to `#last-floor`)
- Facts: "Floors lit" {2} · "Last shift cost" {$0.36} · "Wallets tonight" {7}
- Picture: the tower, newest at the top. Empty floors "Not built yet" {11 Nov}, then "Tonight's floor" {22:00 UTC}, then each shipped floor lit with its name, each dark floor "Stayed dark".
- Float card, one, opaque: "Leading tonight" / {the top proposal's text}

**Last night's floor (`#last-floor`).**

- H2: "Floor {4}: {Release schedule table}" with "shipped {5 Nov}" in the muted run-on
- Lead: "{the proposal's sentence}" then "Seeded proposal" or {0x7a1f…c4e2}
- Rows: "Votes" {412,800 $VIBES from 9 wallets} · "Tests" {3 of 3 passed} · "Inference cost" {$0.36} · "Attestation on Base" {Attested}
- Actions: "Open the floor" (secondary), "See the receipt" (link)
- Picture: the floor's stored screenshot, linked to the floor. The tower runs no floor code.
- With no floor yet: H2 "The first floor ships tonight", line "The first scheduled shift closes at {22:00 UTC}. Its floor and its receipt appear here by morning."

**Tonight's vote (`#tonight`).**

- H2: "Proposals for tonight's shift"
- Line: "{8} proposals are open. At {22:00 UTC} the crew takes the top one that passes safety triage."
- Rows, top 5: {the proposal} · {509,010 $VIBES · 2 wallets · seeded}
- Beside them, "How to vote": "Connect a wallet" · "Sign one message. It costs no gas and moves no funds." · "Check the tower in the morning."
- Link: "Propose a feature"

**How a shift works (`#how`).**

- H2: "How a shift works"
- Line: "Three agents and two checks, every night at 22:00 UTC. No human touches the code, and a failed shift is published like a passed one."
- Picture: the kit's `timeline` diagram: Triage "Rejects anything unsafe, in public" → Build "Sealed sandbox, no network, no secrets" → Review "Can send it back once" → Verify "Real Chrome, a fake wallet, no secrets" → Publish "Floor, receipt and attestation on Base"

**The whole tower (`#tower`).** The skill's `app-frame`.

- H2: "Every floor, lit or dark"
- Line: "A night with nothing shipped stays dark, and its receipt says why. Floors built after the build window closes are marked." Link: "See what was rejected"
- List pane: "Floor {4}" · {Release schedule table · $0.36} · "Lit". Dark floors show {the reason} · "Dark". Tonight shows "Closes {22:00 UTC} · {7} wallets so far" · "Tonight". A marked row reads "Build window closes 9 Nov, 22:00 UTC". Future rows read "Not built yet".
- Open pane: the newest shift as a real log: close, triage, build, check, review, verify, tests, publish, attest.

### 4.2 Receipt `/shifts/[slug]`

**First screen (`.hero.hero--statement`).**

- H1: "Receipt for shift {4}: {shipped}" (or "failed", "stayed dark")
- Lead: "{the proposal}" {Seeded proposal. / Proposed by 0x7a1f…c4e2.} {Reason: the reason.} With no proposal: "No proposal reached the build agent in this shift."
- Buttons: "Open the floor" (primary, only if lit), "See the attestation" (secondary, to base.easscan.org), or "Attestation pending" (disabled)
- Facts: "Outcome" · "Label" {Scheduled shift / Off-schedule shift / Rehearsal} · "Inference cost" · "Closed"

**Sections.**

- `#tally`, H2 "Vote tally and triage". Line: "Votes weighed at Base block {38201144}." plus one of: "Stake is the current figure at tally, because the staking API keeps no history." / "The staking API did not answer, so stake counted as zero." / "Stake was not counted in this shift." Left: top 5 rows. Right: "Triage decisions", each "Accepted" or "Rejected: {category}" with its reason.
- `#transcript`, H2 "Agent transcript". Line: "Every message and tool call the build agent made, in order." A dark scrolling pane, focusable. Long entries end "[shortened here; the full text is in transcript.json]".
- `#diff`, H2 "Diff against the blank floor". Line: "What the crew changed from the empty template." A dark scrolling pane with added and removed lines coloured.
- `#proof`, H2 "Tests and hashes". Line: "Download any part and hash it with keccak256. Each must match, and the receipt hash is what was attested." Left: each test, "Passed" or "Failed". Right: "Receipt hash" {0xabcd…1234}, then "Download {bundle.json}" for each part.

`/shifts/latest` redirects to the newest public receipt, or `/` if none. An unknown slug shows the not-found page: H1 "This floor has not been built yet", lead "There is no shift at this address. The tower lists every floor and every shift so far.", button "See the tower".

### 4.3 Floor `/floors/[slug]`

One screen and the footer. This is the money shot.

- Notice: "{Scheduled shift}, {5 Nov}"
- H1: "Floor {4}: {Release schedule table}", or "Floor {3} stayed dark", or "Floor {3} was vetoed"
- Lead: {one line} {how to use it}, or "Reason: {the reason}."
- Buttons: "See the receipt" (primary), "See every floor" (secondary)
- Facts: "Network" None · "Storage" None · "Wallet access" None
- Picture: the floor in `<iframe sandbox="allow-scripts" allow="" referrerpolicy="no-referrer">`. Dark: "Nothing shipped on this floor. Its receipt says why." If the frame loads twice: "This floor tried to leave its sandbox, so it was removed from the page."

### 4.4 Vote and propose `/vote`

**First screen (`.hero.hero--split`).**

- Notice: "Shift {5} closes {8 Nov} at {22:00 UTC}"
- H1: "Vote on tonight's floor"
- Lead: "Connect a wallet and sign one message. It costs no gas and moves no funds. A wallet with no $VIBES still counts, at minimal weight."
- Buttons: "Connect a browser wallet" (primary), "Connect Coinbase Wallet" (secondary). Once connected: "Disconnect {0x7a1f…c4e2}"
- Facts: "Open proposals" {8} · "Wallets tonight" {7} · "Your vote" One, changeable
- Picture: "Top 5 by current estimate", each row {the proposal}, {509,010 $VIBES · 2 wallets · seeded}, and a "Vote" button that reads "Sign in your wallet" while signing and "Voted" after.

**All open proposals (`#open`).** H2 "All open proposals". Line: "Newest first. Estimates become final at the close, when balances are read at that block." 20 to a page, links "See newer proposals" and "See older proposals".

**Propose (`#propose`).** H2 "Propose a feature". Line: "Any wallet can propose one sentence per shift. Safety triage reads the top 5 at the close." Field: "One sentence, up to 200 characters". Button: "Sign and propose". Before connecting: "Connect a wallet first. Any wallet can propose, with or without $VIBES." After: "Your proposal is open for votes." Beside it, "What a floor can be": "Yes" One small tool in one page: a calculator, a converter, a checklist, a table of public figures. "No" Anything needing a server, a wallet, saved data, or live data from elsewhere. "Never" Offensive or illegal content, impersonation, or claims about price or returns. Link: "See what was rejected".

### 4.5 How it was built `/built`

**First screen (`.hero.hero--statement`).**

- H1: "How Night Crew was built, and how it stays safe"
- Lead: "Claude agents built this product from a written spec, one tested task at a time. Claude agents also run its nightly shifts, and every shift publishes its own transcript."
- Buttons: "See the latest receipt" (primary), "Join the waitlist" (secondary)
- Facts: "Build tasks" {from the manifest} · "Rehearsals before launch" · "Public shifts" · "Inference so far"

**`#security`.** H2 "What a floor cannot do". Line: "Floors are AI-written code running next to your wallet. So the agent has no authority, and each floor is locked down." Rows:

- "The agent holds nothing": "It works in a sealed sandbox with no network, no secrets and no repo. The worst it can do is write a bad file."
- "A separate machine checks the floor": "A machine with no secrets runs it in real Chrome against a fake wallet. Any touch fails the shift."
- "The browser locks the floor down": one of the two lines below, from `FLOORS_ORIGIN`.
- "Nothing runs until you open it": "The tower shows pictures of floors and runs no floor code. The vote page embeds no floors."

The hostname line:

- Second hostname set: "Floors run on their own hostname, in a sandboxed frame with no storage, no network and no wallet access."
- Main host: "Floors run from this site's own hostname for now, in a sandboxed frame with no storage, no network and no wallet access. The browser treats each floor as a separate, unknown origin, so it cannot read this site's data. A separate hostname is the next step, as a backstop."

Beside the rows, "What stays open": "No browser-side guard can cover every wallet extension. A deliberately hidden escape that beat every layer would still only raise a prompt you would have to approve." Link: "See what was rejected".

**`#waitlist`.** H2 "A crew for another community". Line: "This tower belongs to $VIBES holders. If your token community has holders but no active developer, tell us and we will write when a second crew opens." Fields: "Community or token name", "How to reach you" (placeholder "An email or a handle"). Button: "Join the waitlist". After: "You are on the list. We will write when a second crew opens." Beside it: "One floor a night" The crew builds what your holders vote for. "A public receipt" Every shift publishes its transcript, tests and cost. "No founder needed" A missed night shows as a dark floor the next morning.

### 4.6 Rejected `/rejected`

- H1: "Every proposal the crew refused, and why"
- Lead: "Triage rejects what a floor cannot do or should not do. The builder can veto too. Both are published here, with the reason."
- Button: "Propose a feature". Facts: "Rejected by triage" · "Vetoed by the builder"
- `#list`, H2 "Rejections and vetoes": {the text} · {category in words} · {date} · {the reason}. Empty: "Nothing has been rejected yet."

Category words: Offensive · Illegal · Impersonation · Investment claims · About the contest vote · Needs a backend · Needs a wallet · Too large · Not a tool · Tried to instruct the crew · The model declined.

### 4.7 Veto `/veto`

- H1: "Veto a proposal or a floor"
- Lead: "Only the builder's wallet can sign a veto. It removes a proposal or darkens a floor, and the reason is published on the rejected page."
- Fields: "Target" (Proposal, Floor), "Number", "Reason, shown in public". Button: "Sign the veto". After: "Vetoed. It is now published on the rejected page."

### 4.8 The shell, on every page

- **Nav:** logo "Night Crew" with the arc mark · Floors (`/#tower`) · Receipts (`/shifts/latest`) · Proposals (`/vote#open`) · Rejected (`/rejected`) · Build (`/built`) · button "Vote tonight" (`/vote`)
- **Close:** H2 "Vote on tonight's floor", one line per page, button "Vote tonight" at XL across the wrap
- **Footer:** the name, then Tower (Floors, Shifts) · Receipts (Latest receipt, Rejected) · Proposals (Vote, Propose) · Build (How it was built, Waitlist)
- **Legal row:** "© 2026 Night Crew" · "An independent project. Not affiliated with Vibestarter."

Close lines: Tower and Vote "Voting closes at {22:00 UTC}. It costs no gas." · Receipt "Every shift has a receipt like this one, passed or failed." · Floor "The next floor comes from tonight's vote." · Built "The crew that built this page's floors runs again tonight." · Rejected "Anything that passes triage can be built tonight." · Veto "Every veto is published with its reason."

## 5. Components

| Component | Desktop (1024 and up) | Tablet (640 to 1023) | Phone (under 640) |
|---|---|---|---|
| Nav | Words centred, logo left, button right | Logo, button, 44px menu button | Logo and menu button; full-screen sheet with 56px rows |
| Split hero | Words `span-6`, picture `span-6 start-7`, facts at the column's foot | Stacks: words, then the picture in what is left; facts hidden | Stacks: words, buttons full width, picture at least 240 tall |
| Tower stack | 9 floors, float card lower left | Same, in the shorter frame | Same, narrower |
| Statement hero | H1, lead, buttons, facts at the foot | Same | Facts hidden |
| Rows | Name left, value right | Same | Top-5 rows stack the value under the name, and only the top 2 show on the Tower |
| App window | List 5 columns, open pane 7 | List on top at 252px, open pane under it | Open pane alone |
| Timeline diagram | Across the wrap | Across the wrap | Stacked by the kit |
| Log pane | Fills the section, scrolls inside, focusable | At least 62% of the screen tall | Fills the section; kind label above its text |
| Floor frame | 628 × 716 | Below the words | 342 wide, the height left on the screen |
| Vote row | Text left, Vote button right | Same | Same, narrower |
| Forms | Two columns, 48px fields, 16px text | Same | One column |
| Footer | Name and four columns on the dark ground | Name, then columns two-up | Name, columns two-up, legal row stacked |

## 6. Avoid

- Generic dashboards: stat cards, sparklines, sidebars of icons, gradient KPI tiles. The vote screen is rows and one action.
- Three feature cards with icons under the hero.
- Any fake data in production. The tower shows real floors and honest empty ones. Never invent wallets, votes or quotes.
- Violet or lavender anywhere.
- Words like seamless, unlock, supercharge, powerful, robust, next-generation.
- Metaphors in headings, or headings as questions or commands. Say what the thing is.
- All-caps labels, exclamation marks, or text under 13px.
- Captions under pictures.
- The event's art: rain, a night city, a green `>_`. Any Vibestarter logo.
- Investment language, or any mention of the contest vote in the voting flow.
- A second filled button in a view, or a third button style.
- Animation that nobody asked for: fade-ins, parallax, counters, tilt.
