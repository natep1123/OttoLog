---
name: scoped-execution-chats
description: >-
  Keep OttoLog Cursor chats short and token-efficient: orchestrator vs execution
  split, tight kickoffs, read-only-what-you-need, stop for review, model fit
  without burning the API pool. Use when starting a slice or spike, drafting a
  kickoff, the chat is getting long, the user mentions tokens / usage / Pro+ /
  scoping, or before opening many docs or gold images.
---

# Scoped execution chats

Nate is on **Cursor Pro+** with **no on-demand spend**. Stay inside included
pools. Do not suggest enabling on-demand.

Also follow [`.cursor/rules/agent-workflow.mdc`](../../rules/agent-workflow.mdc)
(models allowlist, kickoff shape, commit gate).

## Role check (first)

| Role | Do | Don't |
|------|----|--------|
| **Orchestrator** (Auto) | Decide, kickoff, review summary, Status | Implement large slices here |
| **Execution** | One scoped slice/spike; stop for review | Grow into product direction or a second slice |

If this chat is already long and the task is a new slice → **stop** and ask Nate
to paste a kickoff into a **new** execution chat instead of continuing.

## Hard limits

1. **One slice per execution chat.** Done → summarize → stop. No “while we’re here.”
2. **Git gate.** Never commit/push/amend unless Nate says `commit` in **this** chat.
3. **No on-demand.** Prefer **Auto** / **Composer 2.5** when quality allows; use
   **Sonnet 5** for scoped builds; **Opus 4.8** only when reverse-cost is high.
4. **Open on demand.** Canonical docs by path; never paste wholesale into the chat.
5. **Gold images.** Open `.jpg`s only for the UI surface you’re changing; not every
   gallery “for context.”
6. **No exploratory rewrites** of working code outside the kickoff’s in-scope list.

## Before heavy tool use

Ask silently:

- Is this still the same slice as the kickoff?
- Can I answer from one file / one doc section instead of a repo crawl?
- Am I about to re-read docs already summarized in the kickoff?

If the answer is “new work” or “broad explore” → narrow or stop for a new chat.

## Kickoff checklist (orchestrator)

Pasteable prompt must include:

1. Git gate  
2. Read list (paths only) + gold `.jpg` dirs when UI  
3. In / out of scope  
4. Acceptance (Murph / device)  
5. Stop for Nate review / no commit unless asked  

Below the prompt (Nate only): **suggested model** + cheaper fallback from the
workflow allowlist. Do **not** put the model name inside the agent prompt.

## Execution habits

- Match neighboring code; small diffs.
- Prefer shared components / tokens over new abstractions.
- When stuck twice on the same approach → stop and report; don’t thrash.
- End with: what changed, how to dogfood, open questions — then wait.

## Anti-patterns (these burned Pro)

- One mega-chat that builds the whole app phase
- Defaulting every turn to Opus / thinking-high
- Re-pasting Status / contract docs into prompts
- Parallel agents editing the same files
- Continuing after “stop for review” without Nate’s next instruction
