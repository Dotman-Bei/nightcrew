import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { PageShell, Arrow } from "@/components/site-shell";
import { WaitlistForm } from "@/components/waitlist-form";
import { floorsOnOwnHost } from "@/lib/config";
import { getDb } from "@/lib/db";
import { money } from "@/lib/format";
import { builtView } from "@/lib/read-models";

export const revalidate = 30;
export const metadata: Metadata = { title: "Night Crew: how it was built" };

function taskCount(): number {
  try {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "docs", "superpowers", "manifest.json"), "utf8")) as { tasks: unknown[] };
    return manifest.tasks.length;
  } catch {
    return 0;
  }
}

export default async function BuiltPage() {
  const view = await builtView(await getDb());
  const hostLine = floorsOnOwnHost()
    ? "Floors run on their own hostname, in a sandboxed frame with no storage, no network and no wallet access."
    : "Floors run from this site's own hostname for now, in a sandboxed frame with no storage, no network and no wallet access. The browser treats each floor as a separate, unknown origin, so it cannot read this site's data. A separate hostname is the next step, as a backstop.";
  return (
    <PageShell closeLine="The crew that built this page's floors runs again tonight.">
      <section className="hero hero--statement" aria-labelledby="hero-h">
        <div className="wrap">
          <div className="hero-text hero__in">
            <div>
              <h1 id="hero-h">How Night Crew was built, and how it stays safe</h1>
              <p className="hero__lead">Claude agents built this product from a written spec, one tested task at a time. Claude agents also run its nightly shifts, and every shift publishes its own transcript.</p>
              <div className="btn-row">
                <Link className="btn btn--primary" href="/shifts/latest">See the latest receipt<Arrow /></Link>
                <Link className="btn btn--secondary" href="#waitlist">Join the waitlist</Link>
              </div>
            </div>
            <dl className="hero__facts">
              <div><dt>Build tasks</dt><dd>{taskCount()}</dd></div>
              <div><dt>Rehearsals before launch</dt><dd>{view.rehearsals}</dd></div>
              <div><dt>Public shifts</dt><dd>{view.publicShifts}</dd></div>
              <div><dt>Inference so far</dt><dd>{money(view.spentCents)}</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section className="section" id="security" aria-labelledby="security-h" style={{ "--hm": 2 } as CSSProperties}>
        <div className="wrap">
          <div className="section-head"><h2 id="security-h">What a floor cannot do</h2><p>Floors are AI-written code running next to your wallet. So the agent has no authority, and each floor is locked down.</p></div>
          <div className="grid grid--top fill">
            <ul className="rows receipt-rows span-7">
              <li><span className="rows__name">The agent holds nothing</span><span className="receipt-rows__line">It has three tools: write a file, read a file, run the static check. It has no shell, no network and no secrets, and nothing runs its code in the job that holds the key. The worst it can do is write a bad file.</span></li>
              <li><span className="rows__name">A separate machine checks the floor</span><span className="receipt-rows__line">A machine with no secrets runs it in real Chrome against a fake wallet. Any touch fails the shift.</span></li>
              <li><span className="rows__name">The browser locks the floor down</span><span className="receipt-rows__line">{hostLine}</span></li>
              <li><span className="rows__name">Nothing runs until you open it</span><span className="receipt-rows__line">The tower shows pictures of floors and runs no floor code. The vote page embeds no floors.</span></li>
            </ul>
            <div className="span-4 start-9 stack-5">
              <h3 className="t-card">What stays open</h3>
              <p>No browser-side guard can cover every wallet extension. A deliberately hidden escape that beat every layer would still only raise a prompt you would have to approve.</p>
              <Link className="link" href="/rejected">See what was rejected</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="waitlist" aria-labelledby="waitlist-h" style={{ "--hm": 2 } as CSSProperties}>
        <div className="wrap">
          <div className="section-head"><h2 id="waitlist-h">A crew for another community</h2><p>This tower belongs to $VIBES holders. If your token community has holders but no active developer, tell us and we will write when a second crew opens.</p></div>
          <div className="grid fill">
            <div className="log-pane log-pane--light frame span-6" data-visual=""><WaitlistForm /></div>
            <ul className="rows receipt-rows log-pane log-pane--light frame span-6 start-7" data-visual="">
              <li><span className="rows__name">One floor a night</span><span className="receipt-rows__line">The crew builds what your holders vote for.</span></li>
              <li><span className="rows__name">A public receipt</span><span className="receipt-rows__line">Every shift publishes its transcript, tests and cost.</span></li>
              <li><span className="rows__name">No founder needed</span><span className="receipt-rows__line">A missed night shows as a dark floor the next morning.</span></li>
            </ul>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
