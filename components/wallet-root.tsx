"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { createConfig, http, WagmiProvider } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";

const config = createConfig({
  chains: [base],
  connectors: [injected(), coinbaseWallet({ appName: "Night Crew" })],
  transports: { [base.id]: http() },
  ssr: true,
});

/** Wallet code loads only under this component, which only /vote and /veto use. */
export function WalletRoot({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
