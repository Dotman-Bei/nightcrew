"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { proposalMessage, vetoMessage, voteMessage } from "@/lib/messages";

function short(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** The one filled button on the page until a wallet is connected. */
export function ConnectPanel() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  if (isConnected && address) {
    return (
      <div className="btn-row">
        <button className="btn btn--secondary" type="button" onClick={() => disconnect()}>Disconnect {short(address)}</button>
      </div>
    );
  }
  return (
    <div className="stack-2">
      <div className="btn-row">
        {connectors.slice(0, 2).map((connector, index) => (
          <button key={connector.uid} className={index === 0 ? "btn btn--primary" : "btn btn--secondary"} type="button" disabled={isPending} onClick={() => connect({ connector })}>
            {connector.name === "Injected" ? "Connect a browser wallet" : `Connect ${connector.name}`}
          </button>
        ))}
      </div>
      {error ? <p role="alert">{error.message}</p> : null}
    </div>
  );
}

async function send(path: string, body: unknown): Promise<{ ok: boolean; error?: string; existingId?: number }> {
  const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const parsed = (await response.json().catch(() => ({}))) as { error?: string; existingId?: number };
  return { ok: response.ok, ...parsed };
}

export function VoteButton({ proposalId, shiftSlug }: { proposalId: number; shiftSlug: string }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "signing" | "done">("idle");
  const [problem, setProblem] = useState<string | null>(null);

  async function vote() {
    if (!address) return;
    setProblem(null);
    setState("signing");
    try {
      const signedAt = new Date().toISOString();
      const signature = await signMessageAsync({ message: voteMessage({ proposalId, shiftSlug, signedAt }) });
      const result = await send("/api/votes", { proposalId, shiftSlug, address, signature, signedAt });
      if (!result.ok) throw new Error(result.error ?? "That vote did not go through.");
      setState("done");
      router.refresh();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "That vote did not go through.");
      setState("idle");
    }
  }

  return (
    <span className="vote-button">
      <button className="btn btn--secondary" type="button" disabled={!isConnected || state === "signing"} onClick={vote}>{state === "done" ? "Voted" : state === "signing" ? "Sign in your wallet" : "Vote"}</button>
      {problem ? <span role="alert" className="vote-button__problem">{problem}</span> : null}
    </span>
  );
}

export function ProposeForm() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "signing" | "done">("idle");
  const [problem, setProblem] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!address) return;
    const form = event.currentTarget;
    const text = String(new FormData(form).get("text") ?? "").trim();
    setProblem(null);
    setState("signing");
    try {
      const signedAt = new Date().toISOString();
      const signature = await signMessageAsync({ message: proposalMessage({ text, signedAt }) });
      const result = await send("/api/proposals", { text, address, signature, signedAt });
      if (!result.ok) throw new Error(result.error ?? "That proposal did not go through.");
      setState("done");
      form.reset();
      router.refresh();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "That proposal did not go through.");
      setState("idle");
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <label className="field field--full">One sentence, up to 200 characters<textarea name="text" required maxLength={200} rows={3} /></label>
      <div className="btn-row">
        <button className="btn btn--secondary" type="submit" disabled={!isConnected || state === "signing"}>{state === "signing" ? "Sign in your wallet" : "Sign and propose"}</button>
      </div>
      {!isConnected ? <p>Connect a wallet first. Any wallet can propose, with or without $VIBES.</p> : null}
      {state === "done" ? <p role="status">Your proposal is open for votes.</p> : null}
      {problem ? <p role="alert">{problem}</p> : null}
    </form>
  );
}

export function VetoForm() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [outcome, setOutcome] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!address) return;
    const data = new FormData(event.currentTarget);
    const targetType = String(data.get("targetType")) as "proposal" | "floor";
    const targetId = Number(data.get("targetId"));
    const reason = String(data.get("reason") ?? "").trim();
    try {
      const signedAt = new Date().toISOString();
      const signature = await signMessageAsync({ message: vetoMessage({ targetType, targetId, reason, signedAt }) });
      const result = await send("/api/vetoes", { targetType, targetId, reason, address, signature, signedAt });
      setOutcome(result.ok ? "Vetoed. It is now published on the rejected page." : (result.error ?? "That veto did not go through."));
    } catch (error) {
      setOutcome(error instanceof Error ? error.message : "That veto did not go through.");
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">Target<select name="targetType" defaultValue="proposal"><option value="proposal">Proposal</option><option value="floor">Floor</option></select></label>
      <label className="field">Number<input name="targetId" type="number" min={1} required /></label>
      <label className="field field--full">Reason, shown in public<textarea name="reason" required maxLength={300} rows={3} /></label>
      <div className="btn-row"><button className="btn btn--secondary" type="submit" disabled={!isConnected}>Sign the veto</button></div>
      {outcome ? <p role="status">{outcome}</p> : null}
    </form>
  );
}
