import Link from "next/link";
import type { CSSProperties } from "react";
import { ShiftDiagram } from "@/components/shift-diagram";
import { Arrow, PageShell } from "@/components/site-shell";
import { FloorList, TowerStack } from "@/components/tower";
import { getDb } from "@/lib/db";
import { dayLabel, money, shortAddress, timeLabel, wholeNumber } from "@/lib/format";
import { towerView } from "@/lib/read-models";

export const revalidate = 30;

export default async function TowerPage() {
  const view = await towerView(await getDb(), new Date());
  const closes = timeLabel(view.open.closesAt);
  const top = view.top[0];
  const latest = view.latest;
  return (
    <PageShell closeLine={`Voting closes at ${closes}. It costs no gas.`}>
      <section className="hero hero--split" aria-labelledby="hero-h">
        <div className="wrap">
          <div className="hero-text grid hero-split">
            <div className="hero-copy span-6">
              <p className="hero-notice">Next shift closes {dayLabel(view.open.closesAt)} at {closes}</p>
              <h1 id="hero-h">AI dev crew that token holders command</h1>
              <p className="hero__lead">Holders sign to vote for a feature. At 22:00 UTC the crew builds the winner, tests it and ships it as a new floor of this tower, with a receipt on Base.</p>
              <div className="btn-row">
                <Link className="btn btn--primary" href="/vote">Vote tonight<Arrow /></Link>
                <Link className="btn btn--secondary" href="#last-floor">See last night&rsquo;s floor</Link>
              </div>
              <dl className="hero-facts">
                <div><dt>Floors lit</dt><dd>{view.floorsLit}</dd></div>
                <div><dt>Last shift cost</dt><dd>{view.lastCostCents === null ? "None yet" : money(view.lastCostCents)}</dd></div>
                <div><dt>Wallets tonight</dt><dd>{view.walletsTonight}</dd></div>
              </dl>
            </div>
            <div className="hero-visual frame span-6 start-7" data-visual="" data-fx="silk-folds" data-fx-seed="7">
              <div className="stage">
                <TowerStack rows={view.rows} />
                {top ? (
                  <div className="tower-float">
                    <p className="t-label">Leading tonight</p>
                    <p className="tower-float__text">{top.text}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="last-floor" aria-labelledby="last-h">
        <div className="wrap">
          {latest ? (
            <>
              <div className="section-head"><h2 id="last-h">Floor {latest.slug}: {latest.name} <span className="muted">shipped {dayLabel(latest.day)}</span></h2></div>
              <div className="grid grid--top fill">
                <div className="span-5 stack-5">
                  {latest.proposal ? <p className="t-lead">&ldquo;{latest.proposal.text}&rdquo; <span className="muted">{latest.proposal.seeded ? "Seeded proposal" : shortAddress(latest.proposal.author)}</span></p> : null}
                  <ul className="rows">
                    <li><span className="rows__name">Votes</span><span className="rows__value">{wholeNumber(latest.weight)} $VIBES from {latest.wallets} {latest.wallets === 1 ? "wallet" : "wallets"}</span></li>
                    <li><span className="rows__name">Tests</span><span className="rows__value">{latest.tests ? `${latest.tests.passed} of ${latest.tests.total} passed` : "None"}</span></li>
                    <li><span className="rows__name">Inference cost</span><span className="rows__value">{money(latest.costCents)}</span></li>
                    <li><span className="rows__name">Attestation on Base</span><span className="rows__value">{latest.attestationUid ? "Attested" : "Pending"}</span></li>
                  </ul>
                  <div className="btn-row">
                    <Link className="btn btn--secondary" href={`/floors/${latest.slug}`}>Open the floor</Link>
                    <Link className="link" href={`/shifts/${latest.slug}`}>See the receipt</Link>
                  </div>
                </div>
                <Link className="frame frame--photo span-6 start-7 m-zoom" style={{ "--ratio": "66.667%" } as CSSProperties} href={`/floors/${latest.slug}`} aria-label={`Open floor ${latest.slug}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="frame__img" src={`/api/floors/${latest.slug}/screenshot`} alt={latest.oneLiner} data-source="client" data-subject="the floor" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="section-head"><h2 id="last-h">The first floor ships tonight</h2><p>The first scheduled shift closes at {closes}. Its floor and its receipt appear here by morning.</p></div>
            </>
          )}
        </div>
      </section>

      <section className="section" id="tonight" aria-labelledby="tonight-h" style={{ "--hm": 1 } as CSSProperties}>
        <div className="wrap">
          <div className="section-head"><h2 id="tonight-h">Proposals for tonight&rsquo;s shift</h2><p>{view.openCount} proposals are open. At {closes} the crew takes the top one that passes safety triage.</p></div>
          <div className="grid grid--top fill">
            <ol className="rows vote-rows span-7">
              {view.top.map((proposal) => (
                <li key={proposal.id}>
                  <span className="rows__name">{proposal.text}</span>
                  <span className="rows__value">{wholeNumber(proposal.weight)} $VIBES · {proposal.wallets} {proposal.wallets === 1 ? "wallet" : "wallets"}{proposal.seeded ? " · seeded" : ""}</span>
                </li>
              ))}
            </ol>
            <div className="span-4 start-9 stack-5 how-to">
              <h3 className="t-card">How to vote</h3>
              <ol className="rows">
                <li><span className="rows__name">Connect a wallet</span></li>
                <li><span className="rows__name">Sign one message. It costs no gas and moves no funds.</span></li>
                <li><span className="rows__name">Check the tower in the morning.</span></li>
              </ol>
              <Link className="link" href="/vote#propose">Propose a feature</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="how" aria-labelledby="how-h">
        <div className="wrap">
          <div className="section-head"><h2 id="how-h">How a shift works</h2><p>Three agents and two checks, every night at 22:00 UTC. No human touches the code, and a failed shift is published like a passed one.</p></div>
          <ShiftDiagram />
        </div>
      </section>

      <section className="section" id="tower" aria-labelledby="tower-h">
        <div className="wrap">
          <div className="grid grid--top">
            <h2 id="tower-h" className="span-5">Every floor, lit or dark</h2>
            <p className="span-6 start-7">A night with nothing shipped stays dark, and its receipt says why. Floors built after the build window closes are marked. <Link className="link" href="/rejected">See what was rejected</Link></p>
          </div>
          <div className="ui app fill">
            <div className="app__pane app__pane--list"><FloorList rows={view.rows.slice(0, 11)} /></div>
            <div className="app__pane app__pane--open">
              <pre className="log">{latest ? `shift ${latest.slug}
close    snapshot block read, ${latest.wallets} ${latest.wallets === 1 ? "wallet" : "wallets"} tallied
triage   proposal accepted
build    index.html and floor.json written
check    CHECK PASS
review   ship
verify   static gate clean, 0 wallet touches, 0 network requests
tests    ${latest.tests ? `${latest.tests.passed} of ${latest.tests.total} passed` : "none"}
publish  floor ${latest.slug} lit, cost ${money(latest.costCents)}
attest   ${latest.attestationUid ? "attested on Base" : "pending"}
` : `tonight's shift closes at ${closes}
`}</pre>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
