import { createPublicClient, erc20Abi, http, type Address } from "viem";
import { base } from "viem/chains";
import { VIBES_ADDRESS, baseRpcUrl } from "@/lib/config";

export type BlockInfo = { number: bigint; timestamp: bigint };

export type ChainReader = {
  latestBlock(): Promise<BlockInfo>;
  blockAt(number: bigint): Promise<BlockInfo>;
  /** $VIBES balance of each address at the block, in wei, keyed by lower-case address. */
  heldAt(addresses: string[], block: bigint): Promise<Map<string, bigint>>;
};

const BASE_BLOCK_SECONDS = 2n;

/** The last block whose timestamp is at or before `target`, by estimate then binary search. */
export async function findSnapshotBlock(reader: ChainReader, target: bigint): Promise<bigint> {
  const latest = await reader.latestBlock();
  if (latest.timestamp <= target) return latest.number;
  const estimate = latest.number - (latest.timestamp - target) / BASE_BLOCK_SECONDS;
  let width = 64n;
  let low = estimate - width < 0n ? 0n : estimate - width;
  let high = estimate + width > latest.number ? latest.number : estimate + width;
  while (low > 0n && (await reader.blockAt(low)).timestamp > target) {
    width *= 2n;
    low = low - width < 0n ? 0n : low - width;
  }
  while (high < latest.number && (await reader.blockAt(high)).timestamp <= target) {
    width *= 2n;
    high = high + width > latest.number ? latest.number : high + width;
  }
  while (low < high) {
    const middle = (low + high + 1n) / 2n;
    if ((await reader.blockAt(middle)).timestamp <= target) low = middle;
    else high = middle - 1n;
  }
  return low;
}

export function viemChainReader(rpcUrl: string = baseRpcUrl()): ChainReader {
  const client = createPublicClient({ chain: base, transport: http(rpcUrl) });
  return {
    async latestBlock() {
      const block = await client.getBlock();
      return { number: block.number, timestamp: block.timestamp };
    },
    async blockAt(number) {
      const block = await client.getBlock({ blockNumber: number });
      return { number: block.number, timestamp: block.timestamp };
    },
    async heldAt(addresses, block) {
      const held = new Map<string, bigint>();
      if (addresses.length === 0) return held;
      const results = await client.multicall({
        allowFailure: false,
        blockNumber: block,
        contracts: addresses.map((address) => ({
          address: VIBES_ADDRESS,
          abi: erc20Abi,
          functionName: "balanceOf" as const,
          args: [address as Address] as const,
        })),
      });
      addresses.forEach((address, index) => held.set(address.toLowerCase(), results[index]));
      return held;
    },
  };
}
