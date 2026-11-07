# Dispatch log

One line per dispatch, for the routing audit. Routing is in the tollgate report. Requested tier, resolved model, dispatched effort (authored effort raised to the tier floor), result after the orchestrator's own gate run.

| Task | Tier | Resolved model | Authored effort | Dispatched | Mode | Result |
|---|---|---|---|---|---|---|
| foundation:1 | fast | claude-haiku-5-5 | low | executor-low | working tree | done, c6cb9bf |
| foundation:2 | top | claude-opus-5-5 | high | executor-high | worktree | done, eec2132 |
| foundation:4 | standard | claude-sonnet-5-5 | low | executor-high | worktree | done, 222032d. Executor skipped the red step; orchestrator proved red |
| foundation:5 | standard | claude-sonnet-5-5 | medium | executor-high | worktree | done, ff92c4c. Executor skipped the red step; orchestrator proved red |
| foundation:6 | standard | claude-sonnet-5-5 | high | executor-high | worktree | done, 2aaee28 |
| floor:1 | top | claude-opus-5-5 | xhigh | executor-xhigh | worktree | done, 9086b23. Committed on the user's and guide's go |
| pipeline:1 | standard | claude-sonnet-5-5 | high | executor-high | worktree | done, 534c3be |
| pipeline:2 | standard | claude-sonnet-5-5 | low | executor-high | worktree | done, d601ac0 |
| pipeline:3 | standard | claude-sonnet-5-5 | low | executor-high | worktree | done, 9e56059 |
| pipeline:10 | standard | claude-sonnet-5-5 | medium | executor-high | worktree | done, bc52ba7 |
| pipeline:4 | standard | claude-sonnet-5-5 | high | executor-high | worktree | done, 3d73fec |
| pipeline:11 | top | claude-opus-5-5 | high | executor-high | worktree | done, 2b1dfb9 |
| launch:1 | fast | claude-haiku-5-5 | low | executor-low | worktree | done, a8e037c |
| pipeline:5 | top | claude-opus-5-5 | high | executor-high | worktree | done, 88a013f |
| pipeline:6 | standard | claude-sonnet-5-5 | medium | executor-high | worktree | done, 60412aa |
| pipeline:7 | top | claude-opus-5-5 | high | executor-high | worktree | done, 7f6e9c9 |
| pipeline:14 | top | claude-opus-5-5 | high | executor-high | worktree | done, fa0a132 |
| floor:7 | top | claude-opus-5-5 | high | executor-high | worktree | done, fd32ec0. Committed on the user's and guide's go |
| foundation:7 | top | claude-opus-5-5 | high | executor-high | worktree | done, 49d4032 |
| floor:2 | top | claude-opus-5-5 | high | executor-high | worktree | done, 55d0963 |
| floor:3 | top | claude-opus-5-5 | xhigh | executor-xhigh | worktree | done, 2fa5850 |
| pipeline:15 | top | claude-opus-5-5 | medium | executor-medium | worktree | done, ae71699 |
| votes:1 | top | claude-opus-5-5 | high | executor-high | worktree | done, 9103dac |
| votes:6 | standard | claude-sonnet-5-5 | medium | executor-high | worktree | done, 103076d |
| foundation:3 | human gate | not dispatched | low | run by the user | their shell | PROBE RESULT: ok, 2026-11-07. Spent 1.009 cents. Budget figure 440. Streamed cost comes from the response. |
| floor:6 | standard | claude-sonnet-5-5 | medium | executor-high | worktree | done, 11dcf70 |
| votes:5 | top | claude-opus-5-5 | medium | executor-medium | worktree | done, 3c37c10 |
| floor:4 | top | claude-opus-5-5 | high | executor-high | worktree | done, 1ef94b8. Executor skipped the red step; orchestrator proved it, and broke the wrapper and guard in a throwaway copy to confirm the corpus fails |
| pipeline:8 | top | claude-opus-5-5 | high | executor-high | worktree | done, 9bcf774 |
| pipeline:9 | top | claude-opus-5-5 | high | executor-high | worktree | done, 8e4aa4f |
| votes:2 | top | claude-opus-5-5 | medium | executor-medium | worktree | done, 88a143a |
| votes:3 | top | claude-opus-5-5 | medium | executor-medium | worktree | done, 3ffc62c |
| pipeline:12 | top | claude-opus-5-5 | xhigh | executor-xhigh | worktree | done, 953c065 |
| floor:5 | top | claude-opus-5-5 | medium | executor-medium | worktree | done, f066b8a. Orchestrator re-ran the end-to-end test against the stricter gate: 11 of 11 |
| votes:4 | top | claude-opus-5-5 | high | executor-high | worktree | done, 74df785 |
| frontend:1 | standard | claude-sonnet-5-5 | medium | executor-high | worktree | done, d8b9d67. The 83 copied kit files are identical to the skill's |
| pipeline:13 | top | claude-opus-5-5 | high | executor-high | worktree | done, 7cc482b. Committed on the user's go |
| frontend:2 | standard | claude-sonnet-5-5 | high | executor-high | worktree | done, 9d3e27b. Six layout and wording fixes from the printed code, reviewed |
| frontend:3 | standard | claude-sonnet-5-5 | high | executor-high | worktree | done, b09dd02. Wallet plural and CSS fixes from the printed code, reviewed |
| frontend:4 | top | claude-opus-5-5 | high | executor-high | worktree | done, 5e20e8f. Gate passed on floors/1 and floors/3. Stage wrappers added from the printed code, reviewed |
| launch:6 | human gate | not dispatched | low | run by the user | their shell | done. Secret OPENROUTER_API_KEY set. Variables CREW_BUILD_MODEL anthropic/claude-sonnet-5.5, CREW_SHIFT_CAP_CENTS 60, CREW_TOTAL_BUDGET_CENTS 440 and VETO_ADDRESS set. Neither fallback setting is set |
| launch:4 | human gate | not dispatched | low | run by the user | their shell | done. Secret DATABASE_URL on GitHub, confirmed by name. User reports db:migrate done, and set the Vercel variables |
| launch:8 | human gate | not dispatched | low | run by the user | their shell | done, 6388330. 8 seeded proposals open |
| frontend:5 | top | claude-opus-5-5 | high | executor-high | worktree | done, 3807180. Layout, plural and keyboard fixes from the printed code, reviewed with orchestrator screenshots at 390 and 1440 |
| frontend:7 | standard | claude-sonnet-5-5 | low | executor-high | worktree | done, 87e8e4f. As printed |
| frontend:6 | standard | claude-sonnet-5-5 | medium | executor-high | worktree | done, dfd939d. As printed. Gate re-run after the session restart |
| frontend:8 | top | claude-opus-5-5 | low | executor-medium | worktree | done, b338003. Executor stopped with the session mid-fix, with the gate failing. Orchestrator restored the printed code, which passes |
| frontend:9 | standard | claude-sonnet-5-5 | low | executor-high | worktree | done, 2779538. Test-only task, so no red step |
| launch:2 | standard | claude-sonnet-5-5 | medium | executor-high | worktree | done, d28cd4c. Replaces the workspace stub README, as the stub said. PowerShell gate run by the orchestrator: PASS |
| launch:9 | human gate | not dispatched | low | run by the user | Vercel | done, b4b1e49. https://nightcrew-gray.vercel.app, gate LIVE, reads Neon. Site origin not yet confirmed: launch:17 proves it |
| floor:8 | top | claude-opus-5-5 | high | executor-high | worktree | done, 5d518cc. Packet rebuilt after the architect's 86f56b5; executor resumed to add the 60-second screenshot cache. New 4-file gate and the full suite (347 tests) re-run by the orchestrator |
| launch:5 | human gate | not dispatched | low | run by the user | their shell | done. Schema registered on Base and read back by the orchestrator. EAS_SCHEMA_UID set. ATTESTER_PRIVATE_KEY re-set from the file after the first paste was invalid |
| launch:7 | human gate | not dispatched | low | run by the user | GitHub Actions | done, 1f1ca43. r1 Sonnet 10 cents shipped, r2 Haiku 1 cent shipped, both attested. r1's first attempt failed in close on a malformed DATABASE_URL secret, re-set from the file. Settings back to Sonnet and 60 |
| launch:17 | human gate | not dispatched | low | run by the user | public pages | done, de4d3db. FLOOR HEADERS OK, re-run by the orchestrator |
| launch:10 | human gate | not dispatched | low | run by the user | GitHub | done, 282cca2. SHIFTS_ARMED true. Known risk accepted: the frame-removal gap, to be fixed before Sun 8 Nov 22:00 UTC |
| launch:13 | human gate | not dispatched | low | run by the user | GitHub Actions | done, 4ebcdbb. Run Sat 12:46 UTC, ahead of the Sunday slot. Floor 1 shipped, 10 cents, attested |
| (extra) shift 2 | not a task | not dispatched | - | run by the user | GitHub Actions | Second off-schedule evidence shift, run 42374883748, Sat 12:59 UTC: shipped, 10 cents. Attestation pending, because ATTESTER_PRIVATE_KEY had been set to an empty value at 12:59:32 UTC. Re-set at 13:07:45 UTC from a well-formed key; the next publish retries it |
| frontend:10 | top | claude-opus-5-5 | medium | executor-medium | worktree | done, 5902c93. Amends frontend:4. Red run 3 failed, 2 passed, as the task says. Page checks on floors/1 and floors/3 and the full suite (352 tests) re-run by the orchestrator. The orchestrator's frame-removal harness: removed in 8 of 8 runs, up from 1 of 8 |
| (extra) 2 more shifts | not a task | not dispatched | - | not run by the orchestrator | GitHub Actions | Off-schedule runs 42376243646 (Sat 13:17 UTC, shipped, attested 0, pending 2: invalid key) and 42381268981 (Sat 14:22 UTC, shipped, attested 3, pending 0, after the secret was re-set at 14:21:37 UTC) |
