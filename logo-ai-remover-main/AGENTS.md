<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

# Bellix.us agent guide

## Read before editing

Start with [README.md](README.md), [RULES.MD](RULES.MD) and task-relevant docs. Read [PROD.MD](PROD.MD) for scope, [ARCHITECTURE.MD](ARCHITECTURE.MD) for flow, [DESIGN.MD](DESIGN.MD) for UI, [SECURITY.MD](SECURITY.MD) for boundaries, [CODE STYLE.MD](CODE%20STYLE.MD) for conventions and [TESTING.MD](TESTING.MD) for checks. [TASKS.MD](TASKS.MD) tracks work; [MEMORY.MD](MEMORY.MD) records durable decisions.

## Working agreement

- Check `git status --short` before edits and preserve unrelated changes.
- Actual stack: TanStack Start/Router + Vite + React, with FastAPI. Archived README prompts are not current implementation instructions.
- Stay within the user request; backlog entries do not authorize unrelated fixes or deployment.
- Keep secrets private and avoid unnecessary access to user uploads. Preserve job isolation and verified outputs.
- Do not edit the generated route tree or duplicate Lovable Vite plugins.
- Distinguish real API flows from simulated image cleanup and demo account/credits.
- Reuse the light/rose design and shared components.
- Run appropriate checks; report actual results and untested areas.
- Update affected docs when behavior changes, decisions in MEMORY and open work in TASKS.
- Preserve the Lovable block and published Git history.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
