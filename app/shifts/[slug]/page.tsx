import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { PageShell, Arrow } from "@/components/site-shell";
import { EASSCAN_ATTESTATION_URL } from "@/lib/config";
import { getDb } from "@/lib/db";
import { categoryWords, dayLabel, money, shortAddress, shortHash, timeLabel, wholeNumber } from "@/lib/format";
import { receiptView } from "@/lib/read-models";
import { pageMetadata } from "@/lib/site-meta";

export const revalidate = 30;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return pageMetadata({ title: `Night Crew: receipt for shift ${slug}`, description: `The public receipt for shift ${slug}: the vote tally, the triage decision, the agents' transcript, the tests, the cost and the attestation on Base.`, path: `/shifts/${slug}` });
}

const OUTCOME_WORDS = { shipped: "Shipped", failed: "Failed", dark: "Stayed dark" } as const;
const STAKE_WORDS = { "current-at-tally": "Stake is the current figure at tally, because the staking API keeps no history.", unavailable: "The staking API did not answer, so stake counted as zero.", omitted: "Stake was not counted in this shift." } as const;

export default async function ReceiptPage({ params }: Props) {
  const { slug } = await params;
  const view = await receiptView(await getDb(), slug);
  if (!view) notFound();
  const { bundle, floor } = view;
  const name = floor?.name ?? bundle.proposal?.text ?? "No proposal";
  const reason = bundle.failure?.reason ?? bundle.dark_reason;
  const labelWord = view.label === "rehearsal" ? "Rehearsal" : view.label === "off-schedule" ? "Off-schedule shift" : "Scheduled shift";
  return (
    <PageShell closeLine="Every shift has a receipt like this one, passed or failed.">
      <section className="hero hero--statement" aria-labelledby="hero-h">
        <div className="wrap">
          <div className="hero-text hero__in">
            <div>
              <h1 id="hero-h">Receipt for shift {slug}: {OUTCOME_WORDS[bundle.outcome].toLowerCase()}</h1>
              <p className="hero__lead">{bundle.proposal ? <>&ldquo;{bundle.proposal.text}&rdquo; {bundle.proposal.seeded ? "Seeded proposal." : `Proposed by ${shortAddress(bundle.proposal.author)}.`}</> : "No proposal reached the build agent in this shift."} {reason ? <>Reason: {reason}.</> : null}</p>
              <div className="btn-row">
                {floor && floor.status === "lit" ? <Link className="btn btn--primary" href={`/floors/${slug}`}>Open the floor<Arrow /></Link> : null}
                {view.attestationUid ? <a className="btn btn--secondary" href={`${EASSCAN_ATTESTATION_URL}${view.attestationUid}`}>See the attestation</a> : <span className="btn btn--secondary" aria-disabled="true">Attestation pending</span>}
              </div>
            </div>
            <dl className="hero__facts">
              <div><dt>Outcome</dt><dd>{OUTCOME_WORDS[bundle.outcome]}</dd></div>
              <div><dt>Label</dt><dd>{labelWord}</dd></div>
              <div><dt>Inference cost</dt><dd>{money(bundle.cost_cents)}</dd></div>
              <div><dt>Closed</dt><dd>{dayLabel(bundle.shift.closes_at)}, {timeLabel(bundle.shift.closes_at)}</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section className="section" id="tally" aria-labelledby="tally-h" style={{ "--hm": 2 } as CSSProperties}>
        <div className="wrap">
          <div className="section-head"><h2 id="tally-h">Vote tally and triage</h2><p>Votes weighed at Base block {bundle.shift.snapshot_block ?? "none"}. {view.tally ? STAKE_WORDS[view.tally.stakeMode] : ""}</p></div>
          <div className="grid fill">
            <div className="log-pane log-pane--light frame span-7" data-visual="">
            <ol className="rows receipt-rows">
              {(view.tally?.entries ?? []).slice(0, 5).map((entry) => (
                <li key={entry.proposalId}>
                  <span className="rows__name">{entry.text}</span>
                  <span className="rows__value">{wholeNumber(entry.weight)} $VIBES · {entry.wallets} {entry.wallets === 1 ? "wallet" : "wallets"}{entry.seeded ? " · seeded" : ""}</span>
                </li>
              ))}
              {(view.tally?.entries ?? []).length === 0 ? <li><span className="rows__name">No proposals were open.</span></li> : null}
            </ol>
            </div>
            <div className="log-pane log-pane--light frame span-5 start-8 stack-5" data-visual="">
              <h3 className="t-card">Triage decisions</h3>
              <ul className="rows receipt-rows">
                {view.triage.map((decision) => (
                  <li key={decision.proposalId}>
                    <span className="rows__name">{decision.decision === "accept" ? "Accepted" : `Rejected: ${categoryWords(decision.category)}`}</span>
                    <span className="receipt-rows__line">{decision.reason}</span>
                  </li>
                ))}
                {view.triage.length === 0 ? <li><span className="rows__name">Triage did not run.</span></li> : null}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="transcript" aria-labelledby="transcript-h">
        <div className="wrap">
          <div className="section-head"><h2 id="transcript-h">Agent transcript</h2><p>Every message and tool call the build agent made, in order.</p></div>
          <div className="log-pane frame fill" tabIndex={0} role="group" aria-label="Agent transcript">
            {view.transcript.length === 0 ? <p>No agent ran in this shift.</p> : null}
            {view.transcript.slice(0, 200).map((entry, index) => (
              <div key={index} className={`log-pane__entry log-pane__entry--${entry.kind}${entry.isError ? " log-pane__entry--error" : ""}`}>
                <span className="log-pane__kind">{entry.tool ?? entry.kind.replace("_", " ")}</span>
                <span className="log-pane__text">{entry.text.length > 2000 ? `${entry.text.slice(0, 2000)}\n[shortened here; the full text is in transcript.json]` : entry.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="diff" aria-labelledby="diff-h">
        <div className="wrap">
          <div className="section-head"><h2 id="diff-h">Diff against the blank floor</h2><p>What the crew changed from the empty template.</p></div>
          <div className="log-pane log-pane--diff frame fill" tabIndex={0} role="group" aria-label="Diff against the blank floor">
            {view.diff === null ? <p>No floor was written in this shift.</p> : null}
            {(view.diff ?? "").split("\n").slice(0, 600).map((line, index) => (
              <div key={index} className={line.startsWith("+") ? "diff-line diff-line--add" : line.startsWith("-") ? "diff-line diff-line--del" : "diff-line"}>{line || " "}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="proof" aria-labelledby="proof-h">
        <div className="wrap">
          <div className="section-head"><h2 id="proof-h">Tests and hashes</h2><p>Download any part and hash it with keccak256. Each must match, and the receipt hash is what was attested.</p></div>
          <div className="grid grid--top fill">
            <ul className="rows receipt-rows span-6">
              {view.tests.slice(0, 7).map((test) => (
                <li key={test.name}>
                  <span className="rows__name">{test.name}</span>
                  <span className={test.pass ? "rows__value test-pass" : "rows__value test-fail"}>{test.pass ? "Passed" : "Failed"}</span>
                </li>
              ))}
              {view.tests.length === 0 ? <li><span className="rows__name">No tests ran in this shift.</span></li> : null}
            </ul>
            <ul className="rows receipt-rows span-6 start-7">
              <li><span className="rows__name">Receipt hash</span><span className="rows__value mono">{shortHash(view.receiptHash)}</span></li>
              {view.parts.map((part) => (
                <li key={part}>
                  <a className="link" href={`/api/receipts/${slug}/${part}`} download>Download {part}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
