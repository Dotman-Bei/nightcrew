export const VIBES_ADDRESS = "0xefFC8815487084a97edfdfF968b56Ea123421Acb" as const;
export const EAS_ADDRESS = "0x4200000000000000000000000000000000000021" as const;
export const SCHEMA_REGISTRY_ADDRESS = "0x4200000000000000000000000000000000000020" as const;
export const BASE_CHAIN_ID = 8453;
export const DEFAULT_BASE_RPC_URL = "https://mainnet.base.org";
export const VIBESTARTER_API = "https://app.vibestarter.xyz";
export const BUILD_WINDOW_CLOSE = "2026-11-09T22:00:00.000Z";
export const EASSCAN_ATTESTATION_URL = "https://base.easscan.org/attestation/view/";
export const MAX_FLOOR_BYTES = 256 * 1024;

export function baseRpcUrl(): string {
  return process.env.BASE_RPC_URL || DEFAULT_BASE_RPC_URL;
}

export function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_ORIGIN || "http://127.0.0.1:3000";
}

export function floorsOrigin(): string | null {
  return process.env.FLOORS_ORIGIN || null;
}

export function floorsOnOwnHost(): boolean {
  return floorsOrigin() !== null;
}

/** Relative on the main host, so it works on any port and any deployment URL. */
export function floorDocumentUrl(hash: string): string {
  return `${floorsOrigin() ?? ""}/f/${hash}`;
}

export function vetoAddress(): string {
  return (process.env.VETO_ADDRESS || "0x0000000000000000000000000000000000000000").toLowerCase();
}
