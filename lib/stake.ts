import { VIBESTARTER_API } from "@/lib/config";
import type { StakeReader } from "@/lib/tally";

/** Current-only: the API has no history, so receipts label the figure "current at tally". */
export function apiStakeReader(fetchImpl: typeof fetch = fetch): StakeReader {
  return async (addresses) => {
    const staked = new Map<string, bigint>();
    try {
      for (const address of addresses) {
        const response = await fetchImpl(`${VIBESTARTER_API}/api/staking/stats?wallet=${address}`);
        if (!response.ok) throw new Error(`staking API returned ${response.status}`);
        const body = (await response.json()) as { stakedBalance?: string };
        staked.set(address.toLowerCase(), BigInt(body.stakedBalance ?? "0"));
      }
      return { staked, mode: "current-at-tally" };
    } catch {
      return { staked: new Map(), mode: "unavailable" };
    }
  };
}
