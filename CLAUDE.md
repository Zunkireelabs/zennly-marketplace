# How work runs in this repo

@AGENTS.md documents the codebase. This file documents the process. Read both.

## Roles

One session is **lead** for this repo; everything else is an **executor**.

The lead plans, reviews, delegates, and reports to the owner. The lead does not
grind out implementation itself when it can be delegated — its scarce resource is
judgement, not keystrokes. Executors implement one scoped task and report back.

Only the lead talks to the owner about scope, trade-offs or status. An executor
that gets handed repo work by anyone other than the lead points them at the lead.

**This working tree has exactly one writer at a time.** Two sessions editing it
once produced duplicate `dob` migrations and a FAILED row in `_prisma_migrations`
that blocked all migration work until it was rolled back. Before any session
starts editing, confirm with `ListAgents` + `SendMessage` that no peer session is
mid-task here. Parallel work goes in a git worktree, never in this tree.

## The 9/10 gate

Before any plan, migration, schema change, auth change or non-trivial refactor is
executed, the lead reviews it **itself** and rates it out of 10 against:

1. Does it solve the problem the owner actually described?
2. Is the diagnosis evidence-based — a log line, a psql query, a browser
   measurement — rather than inferred from reading code?
3. What breaks in production if it is wrong, and is that recoverable?
4. Is it the smallest thing that answers the question? (The owner rejects
   over-engineering, and has been right to.)
5. Is it verifiable, and how will we know it worked?

**Below 9: do not execute.** Name the weakest criterion, fix it, re-rate. State
the rating and the reasoning to the owner before proceeding, not after.

A rating is a judgement the lead owns. Do not hand out a 9 to clear the gate.

## Reporting to the owner

Explain in simple, non-technical words. The owner asks "tell me in simple words"
often; long technical answers land badly. Lead with what it means for them, keep
the mechanism short, and put file paths at the end for whoever needs them.

Never claim something works without having run it. "Tests pass" means you ran the
tests and read the output. If a step was skipped, say so.

## Diagnosis before theory

When the owner says something "doesn't work", get the server log or query the
database before forming a theory. Every real diagnosis in this project has come
from a log or from psql, and none were findable by reading components:

- "the Profile button is broken" → a 36px touch target next to Log out; there was
  no `/account` request in the log at all.
- "the page is blank" → Next blocking cross-origin dev resources over the LAN IP.
- "Google sign-in is broken" → visible in `auth.flow_state.referrer`; a Supabase
  Site URL setting, not our code.

Audit the data layer before the UI. Three of the four best findings in the
`/account` build came from `src/lib/account/studio-lookup.ts` and the API route —
field-name mismatches and dropped fields that no component could reveal.

## Git

Push to the feature branch. **Never open a PR** — the owner has corrected this
explicitly. Commit only when asked.

## Tooling

- The Claude-in-Chrome extension has failed in every session here. Use Python
  Playwright with system Chrome: `/usr/local/opt/python@3.14/bin/python3.14`,
  `p.chromium.launch(channel="chrome")`. Pillow is available.
- `psql` is at `/usr/local/opt/libpq/bin/psql`. `DIRECT_URL` in `.env` reaches the
  marketplace database directly, including the `auth` schema.
- Turbopack has hung compiling a route with no error anywhere. `rm -rf .next/dev`
  and restart before investigating a "slow" route.
- The owner tests on a real Android phone over the LAN, so check mobile.

