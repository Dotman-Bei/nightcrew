import { VIBESTARTER_API } from "@/lib/config";

const MAX_BYTES = 100_000;
const MAX_CAMPAIGNS = 20;
const ZERO_WALLET = "0x0000000000000000000000000000000000000001";

function primitivesOnly(value: unknown): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!value || typeof value !== "object") return out;
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "number" || typeof item === "boolean") out[key] = item;
    if (typeof item === "string" && item.length <= 200 && !/https?:/i.test(item)) out[key] = item;
  }
  return out;
}

/** Public figures a floor may read, because a floor cannot call anything itself. Never throws. */
export async function fetchFloorData(fetchImpl: typeof fetch = fetch, now: Date = new Date()): Promise<string> {
  const data: Record<string, unknown> = { fetchedAt: now.toISOString(), source: "Public read endpoints, fetched for this shift", errors: [] };
  const errors = data.errors as string[];
  const get = async (path: string): Promise<unknown> => {
    try {
      const response = await fetchImpl(`${VIBESTARTER_API}${path}`);
      if (!response.ok) throw new Error(`status ${response.status}`);
      return await response.json();
    } catch (error) {
      errors.push(`${path}: ${error instanceof Error ? error.message : "failed"}`);
      return null;
    }
  };
  data.stats = primitivesOnly(await get("/api/stats"));
  const ledger = (await get("/api/ledger/stats")) as { cells?: unknown } | null;
  data.ledger = primitivesOnly(ledger?.cells);
  data.circulatingSupply = await get("/api/supply/circulating");
  const staking = (await get(`/api/staking/stats?wallet=${ZERO_WALLET}`)) as { totalStaked?: string } | null;
  data.totalStaked = staking?.totalStaked ?? null;
  data.totalSupply = "1000000000000000000000000000";
  const campaigns = (await get("/api/campaigns")) as { campaigns?: unknown[] } | null;
  data.campaigns = (campaigns?.campaigns ?? []).slice(0, MAX_CAMPAIGNS).map(primitivesOnly);
  const text = JSON.stringify(data);
  if (text.length <= MAX_BYTES) return text;
  data.campaigns = [];
  errors.push("campaigns dropped: the snapshot was too large");
  return JSON.stringify(data);
}
