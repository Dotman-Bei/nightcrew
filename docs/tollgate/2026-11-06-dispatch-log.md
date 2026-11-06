# Dispatch log

One line per dispatch, for the routing audit. Routing is in the tollgate report. Requested tier, resolved model, dispatched effort (authored effort raised to the tier floor), result after the orchestrator's own gate run.

| Task | Tier | Resolved model | Authored effort | Dispatched | Mode | Result |
|---|---|---|---|---|---|---|
| foundation:1 | fast | claude-haiku-5-5 | low | executor-low | working tree | done, c6cb9bf |
| foundation:2 | top | claude-opus-5-5 | high | executor-high | worktree | done, eec2132 |
| foundation:4 | standard | claude-sonnet-5-5 | low | executor-high | worktree | done, 222032d. Executor skipped the red step; orchestrator proved red |
| foundation:5 | standard | claude-sonnet-5-5 | medium | executor-high | worktree | done, ff92c4c. Executor skipped the red step; orchestrator proved red |
| foundation:6 | standard | claude-sonnet-5-5 | high | executor-high | worktree | done, 2aaee28 |
| floor:1 | top | claude-opus-5-5 | xhigh | executor-xhigh | worktree | gate passed, held for the user's checkpoint |
| pipeline:1 | standard | claude-sonnet-5-5 | high | executor-high | worktree | done, 534c3be |
| pipeline:2 | standard | claude-sonnet-5-5 | low | executor-high | worktree | done, d601ac0 |
| pipeline:3 | standard | claude-sonnet-5-5 | low | executor-high | worktree | done, 9e56059 |
| pipeline:10 | standard | claude-sonnet-5-5 | medium | executor-high | worktree | done, bc52ba7 |
| pipeline:4 | standard | claude-sonnet-5-5 | high | executor-high | worktree | done, 3d73fec |
| pipeline:11 | top | claude-opus-5-5 | high | executor-high | worktree | done, 2b1dfb9 |
| launch:1 | fast | claude-haiku-5-5 | low | executor-low | worktree | done, a8e037c |
| pipeline:5 | top | claude-opus-5-5 | high | executor-high | worktree | in flight |
