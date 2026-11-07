import Link from "next/link";
import { Arrow, PageShell } from "@/components/site-shell";

export default function NotFound() {
  return (
    <PageShell closeLine="Voting closes at 22:00 UTC. It costs no gas.">
      <section className="hero hero--statement" aria-labelledby="hero-h">
        <div className="wrap">
          <div className="hero-text hero__in">
            <div>
              <h1 id="hero-h">This floor has not been built yet</h1>
              <p className="hero__lead">There is no shift at this address. The tower lists every floor and every shift so far.</p>
              <div className="btn-row">
                <Link className="btn btn--primary" href="/#tower">See the tower<Arrow /></Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
