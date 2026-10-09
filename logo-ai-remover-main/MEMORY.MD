# Bellix.us — Durable project memory

Keep entries factual and dated. Do not store credentials, personal media, temporary logs or invented prior history.

## 2026-09-25 — Documentation baseline

- User requested PROD, ARCHITECTURE, RULES, DESIGN, TASKS, MEMORY, SECURITY, CODE STYLE, TESTING, README and AGENTS documents plus website analysis/project flow.
- Canonical site supplied: `https://www.bellix.us/`.
- Existing `README.md` and `AGENTS.md` casing is retained. Do not add case-only duplicates.
- Original README material is preserved under a historical heading. Conflicting names, stacks and prices in that material are not current guidance.
- Actual dev/build entry: TanStack Start + Vite; media backend: FastAPI. Leftover Next.js files do not establish a Next.js runtime.
- Current design is light white/rose; `src/styles.css` is the token reference.
- Live HTML returned 200 for `/`, `/tools`, `/pricing`, `/remove/video`. Browser interactions and production processing were not verified.
- `/tools` retains Pilio branding. Pricing navigation is not evidence of a checkout integration.
- Image cleanup uses a simulated pipeline. Other major tools have API/worker implementations; deployed quality is unverified here.
- Job media/metadata are filesystem-based. User/credit state includes browser mocks. Supabase schema comments are not applied migrations.
- A retention setting exists, but no scheduled expiration consumer was found. Zero-retention copy needs reconciliation.
- `src/components/site/JobVideoCleaner.tsx` had pre-existing uncommitted edits before this task; preserve them.
- Lovable is connected: never rewrite published history.

## 2026-10-09 — Background cutout reliability

- The default background remover now uses the bundled U2Net ONNX weights; fast mode retains Silueta. When the first model reports no subject, the worker checks the other model before preserving the image.
- The browser no longer treats a failed cutout or an unavailable backend as a successful transparent PNG. Transparent exports requested by the main page include an 8% contact shadow in the PNG alpha layer.
- Automated tests cover the API flow and shadow alpha. The pictured faucet source file was not available in the workspace, so that specific cutout and fine metallic edges remain unverified.

## 2026-10-09 — Colored document overlay cleanup

- The standalone image path previously masked gray pixels in a broad band and missed the blue Sample overlay while risking text smears. It now selects chromatic mark pixels and reverses a dominant translucent color where possible, leaving pixels outside the mask unchanged.
- Wide colored PDF highlight annotations are now detected as removable native overlays. The attached screenshot was cleaned at its original 225 × 257 pixel size; fully hidden lettering cannot be recovered with certainty from that source.
- The PDF tool UI no longer guarantees perfect typography or invented 4K detail for raster uploads. Focused PDF and image tests passed.

## Open decisions

Authoritative plans/credits, account/guest ownership, retention/provider disclosures, storage/queue providers and deployed model/capability inventory. Resolve these through scoped work rather than assumptions.

## Future entry format

Date → finding/decision → source/test evidence → consequence → task ID. Mark obsolete assumptions explicitly when superseded.
