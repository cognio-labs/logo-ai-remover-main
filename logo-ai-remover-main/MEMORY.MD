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

2026-11-07: Video cleanup uses logo_target.py for shared pixel detection/first-frame inpainting and per-frame local tracking. Preview coordinates map through object-contain letterboxing. Unsupported browser unblending/recording is routed through backend. No confident detection fails without editing arbitrary corner pixels.

2026-11-13: The browser-local Gemini/Veo route now shows upload, engine progress, and exported MP4 in one player. The progress display includes processed frame counts when the engine supplies them. Full-frame visual quality still needs real-fixture review.

2026-11-13 video quality audit: The active Gemini/Veo page downloads a browser WebCodecs/MediaBunny blob; the FastAPI/FFmpeg endpoint is not in this route. On cartoon-source.mp4 the detector found a 48x48 mark at (576,1136), and the actual exported MP4 retained 240 frames, 720x1280, 24 FPS and AAC audio, but baseline decoded frames retained a faint outline. A tested footprint-polish profile reduced the outline on sampled frames. Strict low-confidence gating was restored, and the UI no longer treats frame/export completion as verified visual cleanup. The user's pictured fight-video MP4 was not available for exact frame review.

2026-11-14: A reported 240/241 export was rejected by a UI comparison against the engine's duration × frame-rate estimate. The decoded-frame loop has no 240-frame cap. Export now checks decoded MP4 metadata and duration while hiding source frames and counts during processing. A 240-frame source cannot gain real restoration detail from synthetic extra frames; clips with 500+ source frames remain processed frame by frame. Exact watermark quality still requires review of the user's source and export.

2026-11-14: The completed Gemini/Veo upload result now shows a draggable, synchronized comparison of the user's original video and processed MP4, with keyboard arrow controls. Completion copy says the processed export is ready for review; it does not claim 100% removal or blur-free output because the existing validation does not establish either across every frame.

2026-11-14: Fixed a browser-local video upload race: the adapter could dispatch the selected file to the hidden engine iframe after its HTML controls appeared but before its blocking JavaScript registered the file-change listener. The adapter now waits for the iframe document to finish loading, supports cancellation while waiting, and reports an engine upload error instead of a generic timeout. The repository cartoon-source.mp4 export was exercised in Chrome through the live local page.

2026-11-14: Browser retry showed a second failure mode: the hidden engine owns one mutable job and revokes its prior result URL when a new upload starts. The React wrapper now ignores overlapping process calls for the same active job so a duplicate start cannot invalidate an MP4 while validation fetches it. A retry after the first failed browser run completed and displayed the before/after slider and download action.

2026-11-14: The uploaded video result keeps playback controls below the picture so they do not cover bottom-edge watermark areas. The timeline uses a scoped 6 px range style that overrides a global `input` rule with `!important` padding and white background; paused video no longer gets a dim/blur overlay. Browser layout inspection confirmed a 17 px gap between the picture and seek track, and the download link remained available.

2026-11-17: SEO programme baseline and local fixes recorded in docs/seo/PROGRAMME.md. Actual stack verified as Next.js 16.3.5; older TanStack documentation is stale. Preserve server prerendering by avoiding a blank Suspense boundary around all route content. Static Next metadata is authoritative; legacy route head declarations are inert in router-compat. No production deployment or Search Console submission performed.

2026-11-18: The account video cleaner's FastAPI processor estimates the white sparkle's opacity from sampled frames and reverses the alpha overlay with a calibrated matte. It reconstructs only the narrow contour affected by compression. The reported landscape clip's previous rectangular color patch was absent in sampled frames of the new MP4. The tracked fallback still applies localized spatial repair for confirmed non-catalog sparkles.

2026-11-18: The Gemini video page now uses `VIDEO_WORKER_URL` via `/api/video-worker` and transfers media directly to FastAPI. The worker calibrates a stationary matte, preserves native 4:2:0 pixels outside its repair before encoding where supported, and validates upload metadata. The stage clip and synthetic cases are reproducible with `watermark-backend/tools/check_video_pipeline.py`.

2026-11-19: Local video submission failures were caused by the FastAPI worker not running on the configured `localhost:5000` origin. The client now preflights worker health and presents backend or connection errors directly; retry retains the selected file and manual box. The worker keeps its real processing and output-validation path unchanged.

2026-11-19: The deployed Vercel project had no `VIDEO_WORKER_URL`. The video-worker route now returns a clear 503 instead of leaking a loopback URL to browsers, which previously surfaced as a generic fetch failure. A public HTTPS FastAPI deployment and its Vercel environment variable are still required before production video processing can run.

2026-11-19: Added one reusable, data-driven How It Works guide under the background, Gemini image, and Gemini/Veo video upload heroes. It uses live-flow-specific copy, optional `/public/guide/*.webp` artwork overrides, accessible code illustrations, reduced-motion-safe reveals, upload focus/pulse CTAs, and HowTo JSON-LD. Video guide copy states automatic start and Manual position fallback; it does not promise lossless quality or universal detection.

2026-11-23: Background quality investigation found destructive threshold (>80), hole filling, thin-component pruning, OCR rejection, and non-neural card rectangles in the active rembg pipeline. Removed those steps from orchestration; preserve soft neural alpha and original RGB, including source transparency. ISNet remains primary; portrait-only automatic fallback removed. Local ONNX lists CPU/Azure only; CUDA and nvidia-smi unavailable. Structural alpha tests pass (3); visual quality remains under review, with no production deployment. Debug fixtures and masks live under scratch/bg-quality.

2026-11-23 visual review: Four-panel montage confirms ISNet raw predictions retain rings, screenshot panels and scene material, and graphics may become semitransparent. Removing destructive postprocessing alone does not satisfy professional-quality acceptance. quality_pass is now false pending visual verification; mask_valid records only structural validity. Twenty local sources attempted, some named fixtures are screenshots rather than representative photos. CUDA memory unavailable; do not deploy or claim remove.bg parity.

2026-11-23 continuation: Fixed composite-derived raw alpha and source-alpha double multiplication using mask-only RGB inference. Auto/graphics preserves existing source alpha and reports preservation without claiming AI segmentation; portrait/product requests fresh masks. Two real Bellix logos retain exact RGBA (alpha MAE 0 vs ISNet 16.67/19.06). BiRefNet normalization corrected to fixed /255 and sigmoid without min/max stretching, with numeric tests. Lite produced one cleaner portrait but further Lite/General runs failed 822083584-byte allocations on 8GB CPU host. Nine regression tests and TypeScript passed. See watermark-backend/BACKGROUND_QUALITY_REPORT.md; no model promotion/deployment.

2026-11-25 video audit: Both video cleaner routes use the FastAPI worker. The worker verifies decoded frame timing and individual audio tracks, and fails unlocalized tracks or unchanged repairs. The browser displays the verified result beside the original. See watermark-backend/VIDEO_AUDIT.md for local evidence and limits.
