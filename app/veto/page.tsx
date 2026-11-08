import type { Metadata } from "next";
import { PageShell } from "@/components/site-shell";
import { ConnectPanel, VetoForm } from "@/components/wallet-actions";
import { WalletRoot } from "@/components/wallet-root";
import { pageMetadata } from "@/lib/site-meta";

export const metadata: Metadata = { ...pageMetadata({ title: "Night Crew: veto", description: "Only the builder's wallet can sign a veto. It removes a proposal or darkens a floor, and the reason is published on the rejected page.", path: "/veto" }), robots: { index: false, follow: false } };

export default function VetoPage() {
  return (
    <WalletRoot>
      <PageShell closeLine="Every veto is published with its reason.">
        <section className="hero hero--split" aria-labelledby="hero-h">
          <div className="wrap">
            <div className="hero-text grid hero-split">
              <div className="hero-copy span-6">
                <h1 id="hero-h">Veto a proposal or a floor</h1>
                <p className="hero__lead">Only the builder&rsquo;s wallet can sign a veto. It removes a proposal or darkens a floor, and the reason is published on the rejected page.</p>
                <ConnectPanel />
              </div>
              <div className="hero-visual frame span-6 start-7 vote-top" data-visual="">
                <div className="vote-top__in"><VetoForm /></div>
              </div>
            </div>
          </div>
        </section>
      </PageShell>
    </WalletRoot>
  );
}
