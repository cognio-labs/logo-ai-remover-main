# Bellix.us — Code style

## TypeScript and React

- Follow `.prettierrc`: 100-column print width, semicolons, double quotes, trailing commas.
- Use PascalCase components/types and camelCase functions/values; prefer descriptive tool-specific contracts.
- Prefer `@/` source imports. Keep TanStack pages in `src/routes/`, shared components in existing component directories.
- Centralize requests, URL resolution and response parsing in `src/lib` API clients.
- Prefer explicit types and `unknown` for untrusted inputs. Current compiler settings are `strict: false`, `strictNullChecks: true`; do not claim strict-mode coverage or change policy incidentally.
- Follow hook dependency rules. Clean up timers, polling, streams and object URLs; guard browser-only APIs during SSR.
- Preserve job identity across asynchronous updates so stale requests cannot overwrite a newer upload.
- Use TanStack server boundaries (`*.server.ts` or the supported TanStack marker). ESLint prohibits the Next.js `server-only` import.
- Do not manually edit `src/routeTree.gen.ts` or duplicate Lovable Vite plugins.

## Python

- Use four-space indentation, snake_case functions/modules, PascalCase models/classes and useful type hints.
- Use Pydantic contracts/settings and `pathlib.Path` for file operations.
- Routes handle validation/HTTP; services handle domain work; workers orchestrate processing.
- Associate artifacts and diagnostic events with the right job; make cancellation/failure explicit.
- Pass structured subprocess arguments, never shell-interpolated untrusted filenames.
- Preserve diagnostic context privately and return safe public errors.
- Follow surrounding conventions; current npm scripts do not establish a Python formatter/linter policy.

## Maintenance

Keep changes focused. Comments should explain constraints such as media identity, output verification and SSR. Mark simulations clearly. Do not describe future integrations as installed.

Format changed files where possible; `npm run format` rewrites the entire repository. Quote `"CODE STYLE.MD"` in shell commands because its filename contains a space. Validation guidance: [TESTING.MD](TESTING.MD).
