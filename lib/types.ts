export type ShiftLabel = "scheduled" | "off-schedule" | "rehearsal";
export type ShiftStatus = "open" | "closed" | "shipped" | "failed" | "dark";
export type FailureStage = "close" | "triage" | "build" | "review" | "verify" | "publish";

export type Shift = {
  id: number;
  slug: string;
  label: ShiftLabel;
  status: ShiftStatus;
  closes_at: string;
  started_at: string | null;
  finished_at: string | null;
  reason: string | null;
  snapshot_block: string | null;
  cost_cents: number;
  failure_stage: FailureStage | null;
  failure_reason: string | null;
};

export type ProposalStatus = "open" | "built" | "rejected" | "vetoed";

export type Proposal = {
  id: number;
  text: string;
  author: string;
  seeded: boolean;
  status: ProposalStatus;
  status_reason: string | null;
  status_category: string | null;
  failed_attempts: number;
  shift_opened: number;
  created_at: string;
};

export type Vote = {
  shift_id: number;
  voter: string;
  proposal_id: number;
  signed_at: string;
  weight_estimate: string | null;
};
