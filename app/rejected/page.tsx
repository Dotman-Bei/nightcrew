import type { Metadata } from "next";
import Link from "next/link";
import { PageShell, Arrow } from "@/components/site-shell";
import { getDb } from "@/lib/db";
import { categoryWords, dayLabel } from "@/lib/format";
import { rejectedView } from "@/lib/read-models";

export const revalidate = 30;
export const metadata: Metadata = { title: "Night Crew: rejected proposals" };

export default async function RejectedPage() {
  const rows = await rejectedView(await getDb());
  const triage = rows.filter((row) => row.kind === "triage").length;
  const vetoes = rows.length - triage;
  return (
    <PageShell closeLine="Anything that passes triage can be built tonight.">
      <section className="hero hero--statement" aria-labelledby="hero-h">
        <div className="wrap">
          <div className="hero-text hero__in">
            <div>
              <h1 id="hero-h">Every proposal the crew refused, and why</h1>
              <p className="hero__lead">Triage rejects what a floor cannot do or should not do. The builder can veto too. Both are published here, with the reason.</p>
              <div className="btn-row">
                <Link className="btn btn--primary" href="/vote#propose">Propose a feature<Arrow /></Link>
              </div>
            </div>
            <dl className="hero__facts">
              <div><dt>Rejected by triage</dt><dd>{triage}</dd></div>
              <div><dt>Vetoed by the builder</dt><dd>{vetoes}</dd></div>
            </dl>
          </div>
        </div>
      </section>
      <section className="section" id="list" aria-labelledby="list-h">
        <div className="wrap">
          <div className="section-head"><h2 id="list-h">Rejections and vetoes</h2></div>
          <div className="log-pane log-pane--light frame fill" tabIndex={0} role="group" aria-label="Rejections and vetoes">
            {rows.length === 0 ? <p>Nothing has been rejected yet.</p> : null}
            <ul className="rows receipt-rows">
              {rows.map((row, index) => (
                <li key={index}>
                  <span className="rows__name">{row.text}</span>
                  <span className="rows__value">{row.kind === "veto" ? "Veto" : categoryWords(row.category)} · {dayLabel(row.at)}</span>
                  <span className="receipt-rows__line">{row.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
