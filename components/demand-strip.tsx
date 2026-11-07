import type { DemandView } from "@/lib/demand";
import { wholeNumber } from "@/lib/format";

/** Who has taken part so far: real counts, a ruled row of facts. Zero shows as zero, and seeded proposals are counted apart. */
export function DemandStrip({ demand }: { demand: DemandView }) {
  const facts: [string, number][] = [
    ["Wallets that voted or proposed", demand.wallets],
    ["Votes signed", demand.votes],
    ["Proposals from wallets", demand.walletProposals],
    ["Seeded proposals", demand.seededProposals],
    ["Waitlist signups", demand.waitlist],
  ];
  return (
    <section className="section" id="demand" aria-labelledby="demand-h">
      <div className="wrap">
        <div className="grid grid--top">
          <h2 id="demand-h" className="span-5">Taking part so far</h2>
          <p className="span-6 start-7">Counted from the database, at most 30 seconds ago. Rehearsals are left out. Seeded proposals were written by the builder to start the vote, and are counted apart from proposals signed by wallets.</p>
        </div>
        <dl className="demand-facts">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{wholeNumber(value)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
