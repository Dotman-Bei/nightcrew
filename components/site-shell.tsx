import Link from "next/link";
import type { ReactNode } from "react";

const MAIN_ACTION = "Vote tonight";

export function Arrow() {
  return (
    <svg className="m-arrow" viewBox="0 0 12 12" aria-hidden="true">
      <path className="m-arrow__stem" d="M1 6h8" />
      <path className="m-arrow__head" d="M4.5 2.5 8 6l-3.5 3.5" />
    </svg>
  );
}

export function SiteNav() {
  return (
    <header className="nav nav--centre">
      <div className="wrap nav__bar">
        <Link className="nav__logo" href="/">
          <span className="mark" data-mark="arc" aria-hidden="true"></span>Night Crew
        </Link>
        <nav className="nav__links" aria-label="Main">
          <div className="nav__item"><Link className="nav__link" href="/#tower">Floors</Link></div>
          <div className="nav__item"><Link className="nav__link" href="/shifts/latest">Receipts</Link></div>
          <div className="nav__item"><Link className="nav__link" href="/vote#open">Proposals</Link></div>
          <div className="nav__item"><Link className="nav__link" href="/rejected">Rejected</Link></div>
          <div className="nav__item"><Link className="nav__link" href="/built">Build</Link></div>
        </nav>
        <div className="nav__actions">
          <Link className="btn btn--primary" href="/vote">{MAIN_ACTION}</Link>
        </div>
        <button className="nav__toggle" type="button" aria-expanded="false" aria-label="Menu">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      </div>
    </header>
  );
}

export function SiteFooter({ closeLine }: { closeLine: string }) {
  return (
    <footer className="footer closing footer--dark ground-inverse" id="contact" aria-labelledby="close-h">
      <div className="wrap">
        <div className="closing__cta close--type">
          <div className="section-head">
            <h2 id="close-h">Vote on tonight&rsquo;s floor</h2>
            <p>{closeLine}</p>
          </div>
          <Link className="btn btn--primary btn--xl btn--wide" href="/vote">{MAIN_ACTION}<Arrow /></Link>
        </div>
        <div className="closing__links">
          <div className="grid">
            <div className="span-4 stack-4">
              <Link className="nav__logo footer__name" href="/"><span className="mark" data-mark="arc" aria-hidden="true"></span>Night Crew</Link>
            </div>
            <div className="span-2 footer__col"><h4>Tower</h4><ul><li><Link href="/#tower">Floors</Link></li><li><Link href="/#how">Shifts</Link></li></ul></div>
            <div className="span-2 footer__col"><h4>Receipts</h4><ul><li><Link href="/shifts/latest">Latest receipt</Link></li><li><Link href="/rejected">Rejected</Link></li></ul></div>
            <div className="span-2 footer__col"><h4>Proposals</h4><ul><li><Link href="/vote">Vote</Link></li><li><Link href="/vote#propose">Propose</Link></li></ul></div>
            <div className="span-2 footer__col"><h4>Build</h4><ul><li><Link href="/built">How it was built</Link></li><li><Link href="/built#waitlist">Waitlist</Link></li></ul></div>
          </div>
          <div className="footer__legal">
            <span>&copy; 2026 Night Crew</span>
            <span>An independent project. Not affiliated with Vibestarter.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function PageShell({ closeLine, children }: { closeLine: string; children: ReactNode }) {
  return (
    <>
      <SiteNav />
      <main id="top">{children}</main>
      <SiteFooter closeLine={closeLine} />
    </>
  );
}
