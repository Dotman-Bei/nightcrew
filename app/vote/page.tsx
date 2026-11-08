import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { PageShell } from "@/components/site-shell";
import { ConnectPanel, ProposeForm, VoteButton } from "@/components/wallet-actions";
import { WalletRoot } from "@/components/wallet-root";
import { getDb } from "@/lib/db";
import { dayLabel, timeLabel, wholeNumber } from "@/lib/format";
import { voteView, type ProposalRow } from "@/lib/read-models";
import { pageMetadata } from "@/lib/site-meta";

export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({ title: "Night Crew: vote on tonight's floor", description: "Connect a wallet and sign one message to vote for tonight's feature, or propose one. It costs no gas and moves no funds.", path: "/vote" });

type Props = { searchParams: Promise<{ page?: string }> };

function Row({ proposal, shiftSlug }: { proposal: ProposalRow; shiftSlug: string }) {
  return (
    <li>
      <span className="rows__name">{proposal.text}</span>
      <span className="rows__value vote-row__meta">{wholeNumber(proposal.weight)}&nbsp;$VIBES · {proposal.wallets}&nbsp;{proposal.wallets === 1 ? "wallet" : "wallets"}{proposal.seeded ? " · seeded" : ""}</span>
      <VoteButton proposalId={proposal.id} shiftSlug={shiftSlug} />
    </li>
  );
}

export default async function VotePage({ searchParams }: Props) {
  const { page } = await searchParams;
  const view = await voteView(await getDb(), new Date(), Number(page) || 1);
  const closes = timeLabel(view.open.closesAt);
  return (
    <WalletRoot>
      <PageShell closeLine={`Voting closes at ${closes}. It costs no gas.`}>
        <section className="hero hero--split" aria-labelledby="hero-h">
          <div className="wrap">
            <div className="hero-text grid hero-split">
              <div className="hero-copy span-6">
                <p className="hero-notice">Shift {view.open.slug} closes {dayLabel(view.open.closesAt)} at {closes}</p>
                <h1 id="hero-h">Vote on tonight&rsquo;s floor</h1>
                <p className="hero__lead">Connect a wallet and sign one message. It costs no gas and moves no funds. A wallet with no $VIBES still counts, at minimal weight.</p>
                <ConnectPanel />
                <dl className="hero-facts">
                  <div><dt>Open proposals</dt><dd>{view.openCount}</dd></div>
                  <div><dt>Wallets tonight</dt><dd>{view.walletsTonight}</dd></div>
                  <div><dt>Your vote</dt><dd>One, changeable</dd></div>
                </dl>
              </div>
              <div className="hero-visual frame span-6 start-7 vote-top" data-visual="">
                <div className="vote-top__in" tabIndex={0} role="group" aria-label="Top 5 by current estimate">
                  <h2 className="t-card">Top 5 by current estimate</h2>
                  <ol className="rows vote-list">
                    {view.top.map((proposal) => <Row key={proposal.id} proposal={proposal} shiftSlug={view.open.slug} />)}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="open" aria-labelledby="open-h" style={{ "--hm": 2 } as CSSProperties}>
          <div className="wrap">
            <div className="section-head"><h2 id="open-h">All open proposals</h2><p>Newest first. Estimates become final at the close, when balances are read at that block.</p></div>
            <div className="log-pane log-pane--light frame fill" tabIndex={0} role="group" aria-label="All open proposals">
              <ol className="rows vote-list">
                {view.all.map((proposal) => <Row key={proposal.id} proposal={proposal} shiftSlug={view.open.slug} />)}
              </ol>
            </div>
            {view.pageCount > 1 ? (
              <p className="pager">
                {view.page > 1 ? <Link className="link" href={`/vote?page=${view.page - 1}#open`}>See newer proposals</Link> : null}
                {view.page < view.pageCount ? <Link className="link" href={`/vote?page=${view.page + 1}#open`}>See older proposals</Link> : null}
              </p>
            ) : null}
          </div>
        </section>

        <section className="section" id="propose" aria-labelledby="propose-h" style={{ "--hm": 2 } as CSSProperties}>
          <div className="wrap">
            <div className="section-head"><h2 id="propose-h">Propose a feature</h2><p>Any wallet can propose one sentence per shift. Safety triage reads the top 5 at the close.</p></div>
            <div className="grid grid--top fill">
              <div className="span-6"><ProposeForm /></div>
              <div className="span-5 start-8 stack-5 propose-rules">
                <h3 className="t-card">What a floor can be</h3>
                <ul className="rows receipt-rows">
                  <li><span className="rows__name">Yes</span><span className="receipt-rows__line">One small tool in one page: a calculator, a converter, a checklist, a table of public figures.</span></li>
                  <li><span className="rows__name">No</span><span className="receipt-rows__line">Anything needing a server, a wallet, saved data, or live data from elsewhere.</span></li>
                  <li><span className="rows__name">Never</span><span className="receipt-rows__line">Offensive or illegal content, impersonation, or claims about price or returns.</span></li>
                </ul>
                <Link className="link" href="/rejected">See what was rejected</Link>
              </div>
            </div>
          </div>
        </section>
      </PageShell>
    </WalletRoot>
  );
}
