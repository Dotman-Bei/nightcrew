import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FloorFrame } from "@/components/floor-frame";
import { Arrow, PageShell } from "@/components/site-shell";
import { floorDocumentUrl } from "@/lib/config";
import { getDb } from "@/lib/db";
import { dayLabel } from "@/lib/format";
import { floorView } from "@/lib/read-models";

export const revalidate = 30;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Night Crew: floor ${slug}` };
}

export default async function FloorPage({ params }: Props) {
  const { slug } = await params;
  const view = await floorView(await getDb(), slug);
  if (!view) notFound();
  const floor = view.floor;
  const lit = floor !== null && floor.status === "lit";
  const heading = lit ? `Floor ${slug}: ${floor.name}` : floor ? `Floor ${slug} was vetoed` : `Floor ${slug} stayed dark`;
  const lead = lit ? floor.oneLiner : floor ? `Reason: ${floor.darkReason ?? "none given"}.` : `Reason: ${view.reason ?? "nothing shipped"}.`;
  return (
    <PageShell closeLine="The next floor comes from tonight's vote.">
      <section className="hero hero--split" aria-labelledby="hero-h">
        <div className="wrap">
          <div className="hero-text grid hero-split">
            <div className="hero-copy span-6">
              <p className="hero-notice">{view.label === "rehearsal" ? "Rehearsal" : view.label === "off-schedule" ? "Off-schedule shift" : "Scheduled shift"}, {dayLabel(view.day)}</p>
              <h1 id="hero-h">{heading}</h1>
              <p className="hero__lead">{lead}{lit && floor.howToUse ? ` ${floor.howToUse}` : ""}</p>
              <div className="btn-row">
                <Link className="btn btn--primary" href={`/shifts/${slug}`}>See the receipt<Arrow /></Link>
                <Link className="btn btn--secondary" href="/#tower">See every floor</Link>
              </div>
              <dl className="hero-facts">
                <div><dt>Network</dt><dd>None</dd></div>
                <div><dt>Storage</dt><dd>None</dd></div>
                <div><dt>Wallet access</dt><dd>None</dd></div>
              </dl>
            </div>
            <div className="hero-visual frame span-6 start-7" data-visual="">
              {lit ? <FloorFrame src={floorDocumentUrl(floor.hash)} title={floor.name} /> : (
                <div className="stage"><div className="tower-dark"><p>Nothing shipped on this floor. Its receipt says why.</p></div></div>
              )}
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
