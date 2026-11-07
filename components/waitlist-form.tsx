"use client";

import { useState, type FormEvent } from "react";

export function WaitlistForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setState("sending");
    const response = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ community: data.get("community"), contact: data.get("contact") }),
    });
    if (response.ok) {
      setState("sent");
    } else {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(body.error ?? "That did not go through. Try again.");
      setState("error");
    }
  }

  if (state === "sent") return <p className="t-lead" role="status">You are on the list. We will write when a second crew opens.</p>;
  return (
    <form className="form" onSubmit={submit}>
      <label className="field field--full">Community or token name<input name="community" required maxLength={80} autoComplete="organization" /></label>
      <label className="field field--full">How to reach you<input name="contact" required maxLength={120} placeholder="An email or a handle" /></label>
      <div className="btn-row">
        <button className="btn btn--secondary" type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending" : "Join the waitlist"}</button>
      </div>
      {state === "error" ? <p role="alert">{message}</p> : null}
    </form>
  );
}
