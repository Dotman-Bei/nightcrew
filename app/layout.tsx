import type { Metadata } from "next";
import type { ReactNode } from "react";
import { KitScripts } from "@/components/kit-scripts";
import { siteOrigin } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: "Night Crew: AI dev crew that token holders command",
  description: "Holders sign to vote for a feature. At 22:00 UTC the crew builds the winner, tests it and ships it as a new floor of a public tower, with a receipt on Base.",
  other: { "site-kind": "software", "page-type": "software" },
};

const PALETTE = `:root {
  --p-bg: #dedad3; --p-surface: #d3cec6; --p-ink: #0a0a0a; --p-muted: #55514c;
  --p-accent: #256f82; --p-accent-ink: #ffffff; --p-action: #256f82; --p-action-ink: #ffffff;
  --p-inv-bg: #0a0a0a; --p-inv-surface: #151515; --p-inv-ink: #dedad3; --p-inv-muted: #84827e;
  --p-inv-accent: #256f82; --p-inv-accent-ink: #ffffff; --p-inv-action: #256f82; --p-inv-action-ink: #ffffff;
  --font-display: "Host Grotesk", system-ui, sans-serif;
  --font-text: "Host Grotesk", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  --display-weight: 500;
  --display-tracking: -0.035em;
  --display-tracking-xl: -0.04em;
}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-type="software" data-radius="sharp" data-ground="sand" data-buttons="solid" data-motion="">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@400..700&family=JetBrains+Mono:wght@400..500&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/taste/system.css" />
        <link rel="stylesheet" href="/taste/ui/cards.css" />
        <link rel="stylesheet" href="/taste/motion/motion.css" />
        <link rel="stylesheet" href="/taste/backgrounds/backgrounds.css" />
        <link rel="stylesheet" href="/taste/layout/layout.css" />
        <link rel="stylesheet" href="/taste/icons/icon.css" />
        <link rel="stylesheet" href="/taste/ui/base.css" />
        <link rel="stylesheet" href="/taste/ui/window/fragment.css" />
        <link rel="stylesheet" href="/taste/ui/terminal-run/fragment.css" />
        <link rel="stylesheet" href="/taste/diagrams/diagram.css" />
        <style dangerouslySetInnerHTML={{ __html: PALETTE }} />
        <link rel="stylesheet" href="/site.css" />
        <script src="/taste/backgrounds/backgrounds.js"></script>
      </head>
      <body>
        {children}
        <KitScripts />
      </body>
    </html>
  );
}
