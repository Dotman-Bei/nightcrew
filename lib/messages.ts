/**
 * The exact text a wallet signs. It must stay plainly different from the event's own vote, so it
 * never mentions the event, its host, or backing an entry. tests/messages.test.ts enforces that.
 */

export function proposalMessage(input: { text: string; signedAt: string }): string {
  return [
    "Night Crew feature proposal",
    `Proposal: ${input.text}`,
    `Signed at: ${input.signedAt}`,
    "This signature costs no gas and moves no funds.",
  ].join("\n");
}

export function voteMessage(input: { proposalId: number; shiftSlug: string; signedAt: string }): string {
  return [
    "Night Crew feature vote",
    `I want the crew to build proposal #${input.proposalId} in shift ${input.shiftSlug}.`,
    `Signed at: ${input.signedAt}`,
    "This signature costs no gas and moves no funds.",
  ].join("\n");
}

export function vetoMessage(input: { targetType: "proposal" | "floor"; targetId: number; reason: string; signedAt: string }): string {
  return [
    "Night Crew veto",
    `Target: ${input.targetType} ${input.targetId}`,
    `Reason: ${input.reason}`,
    `Signed at: ${input.signedAt}`,
    "This signature costs no gas and moves no funds.",
  ].join("\n");
}

const MAX_AGE_MS = 10 * 60 * 1000;

/** A signature is only good for 10 minutes either side of the server's clock. */
export function isFresh(signedAt: string, now: Date): boolean {
  const at = Date.parse(signedAt);
  return Number.isFinite(at) && Math.abs(now.getTime() - at) <= MAX_AGE_MS;
}
