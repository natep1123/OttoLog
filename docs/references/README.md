# UI reference shots

Screenshots agents can `Read` when building nested forms. Prefer this gallery over
pasting the same images into every chat (paste still works for one-off critiques).

## Folders

| Folder | Use |
|--------|-----|
| [`workout-builder/`](./workout-builder/) | **Gold DNA** (7 keepers): Session → Block → Sequence → Exercise (+ locked preview). Structure/feel target for QB too. |
| [`pool-template-log-builder/`](./pool-template-log-builder/) | Raw dump + optionals (same keeper names; plus override/More extras). |
| [`pool-query-insights/`](./pool-query-insights/) | QB before/after open: cool palette (slice 1) → warm rails (slice 1.5). |
| [`query-builder/`](./query-builder/) | QB “after” gallery — **mostly empty** (checklist only). Fill after dogfood / slice 2 lock+preview. Same lean checklist as workout-builder. |

## How agents should use these

In kickoffs, say explicitly:

> Open every `.jpg` under `docs/references/workout-builder/` with the Read tool before UI work.
> Also read that folder’s README. For QB work, also open `pool-query-insights/` before + after shots.
> Do not invent files under `query-builder/` — that after-gallery is still checklist-only.

Reading a markdown `![](...)` link alone does **not** load pixels — open the `.jpg` / `.png` / `.webp` file.

## Maintaining accuracy (Nate + agents)

After a chrome pass that changes how the form looks:

1. Re-shoot the affected lean slots (don’t rebuild an 8× matrix).
2. Drop into `workout-builder/` or `query-builder/` with the checklist filenames.
3. Update that folder’s README one-liner if a shot’s meaning changed.
4. Orchestrator reminds in Status / kickoff when a slice closes.

## Shot strategy (keep the set small)

Do **not** shoot every combo of expand × lock × More per layer.

Use **composite nest shots** + a few **orthogonal chrome** shots — see
[`workout-builder/README.md`](./workout-builder/README.md).
