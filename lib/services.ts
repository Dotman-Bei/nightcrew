import { createPublicClient, http, recoverMessageAddress, type Address, type Hex } from "viem";
import { base } from "viem/chains";
import { viemChainReader } from "@/lib/chain";
import { baseRpcUrl } from "@/lib/config";

/** Network-touching helpers the API routes use. Tests replace these fields. */
export const services = {
  /** Offline recovery first. Smart wallets fall through to ERC-1271 and ERC-6492 on Base. */
  async verifySignature(address: string, message: string, signature: string): Promise<boolean> {
    try {
      const recovered = await recoverMessageAddress({ message, signature: signature as Hex });
      if (recovered.toLowerCase() === address.toLowerCase()) return true;
    } catch {
      // not a plain EOA signature; try the chain
    }
    try {
      const client = createPublicClient({ chain: base, transport: http(baseRpcUrl()) });
      return await client.verifyMessage({ address: address as Address, message, signature: signature as Hex });
    } catch {
      return false;
    }
  },

  /** The number shown until the close. Null when it cannot be read: a vote never fails on it. */
  async estimateWeight(address: string): Promise<string | null> {
    try {
      const reader = viemChainReader();
      const latest = await reader.latestBlock();
      const held = await reader.heldAt([address], latest.number);
      const whole = (held.get(address.toLowerCase()) ?? 0n) / 10n ** 18n;
      return (whole < 1n ? 1n : whole).toString();
    } catch {
      return null;
    }
  },
};
