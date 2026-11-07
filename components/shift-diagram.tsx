const SPEC = {
  layout: "timeline",
  alt: "A shift runs in order: triage, build, review, verify, publish.",
  steps: [
    { label: "Triage", icon: "ui:shield-check", sub: "Rejects anything unsafe, in public", done: true },
    { label: "Build", icon: "ui:bot", sub: "Three tools, no shell, no network", done: true },
    { label: "Review", icon: "ui:pen-line", sub: "Can send it back once", done: true },
    { label: "Verify", icon: "ui:circle-check", sub: "Real Chrome, a fake wallet, no secrets", done: true },
    { label: "Publish", icon: "ui:send", sub: "Floor, receipt and attestation on Base", done: true },
  ],
};

/** The kit's diagram mounts its own nodes, so React is told to leave the inside alone. */
export function ShiftDiagram() {
  const markup = `<div class="dg" data-diagram><script type="application/json">${JSON.stringify(SPEC).replace(/</g, "\\u003c")}</script></div>`;
  return <div className="panel shift-diagram fill" dangerouslySetInnerHTML={{ __html: markup }} suppressHydrationWarning />;
}
