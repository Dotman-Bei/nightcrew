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
