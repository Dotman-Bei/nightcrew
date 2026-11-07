const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CATEGORY_WORDS: Record<string, string> = {
  offensive: "Offensive",
  illegal: "Illegal",
  impersonation: "Impersonation",
  investment: "Investment claims",
  "contest-vote": "About the contest vote",
  "needs-backend": "Needs a backend",
  "needs-wallet": "Needs a wallet",
  "too-large": "Too large",
  "not-a-tool": "Not a tool",
  injection: "Tried to instruct the crew",
  "model-refusal": "The model declined",
};

/** A triage category in the words the pages use. */
export function categoryWords(category: string | null | undefined): string {
  return CATEGORY_WORDS[category ?? ""] ?? "Rejected";
}

export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

export function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** "8 Nov" in UTC. */
export function dayLabel(iso: string): string {
  const date = new Date(iso);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

/** "22:00 UTC". */
export function timeLabel(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")} UTC`;
}

/** "1,234,567". */
export function wholeNumber(value: string | number | bigint): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function shortHash(hash: string): string {
  return hash.length > 14 ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : hash;
}
