# Bellix video cleaner audit

## Root causes and changes

| Finding | Fix |
| --- | --- |
| The previous guaranteed mode cropped even when it failed to detect a sparkle. Its clamped crop could also leave part of a detected mark in the picture. | Crop and scale requires a stationary detection and excludes its fitted footprint with padding. Restore keeps the original framing. |
| The tracker silently passed through frames it could not localize. Some repair paths bypassed the residual check, and an unchanged repair could still be encoded and reported as successful. | A missed tracked frame or a repair that changes no frames fails. The fixed matte path measures the edge on every processed frame and checks the aggregate residual. |
| Clip-wide opacity left a faint or inverted sparkle in scenes with different opacity or compression. In opaque clips, feathering mixed the source back into the rim and native 4:2:0 delta updates retained a chroma outline after RGB clipping and resampling. | The worker fits a bounded per-frame correction when the remaining shape matches the sparkle. The opaque path replaces the silhouette and color bleed in RGB before encoding. Motion-gated corrections protect moving details, and the worker resets cached corrections when the overlay disappears. |
| The encoder reconstructed longer variable-rate timelines as constant rate. It selected an audio policy using only the first track. Worker validation checked dimensions and approximate duration. | The worker reconstructs the decoded timeline, retains frame dimensions, orientation and sample aspect ratio, and decodes every exported frame before publication. Audio handling chooses stream copy or AAC per track and checks packet hashes for copies and track alignment. |
| The comparison drag math used the outer container, including margins around portrait video. Result state could remain visible during a retry, and the UI inferred its stage from the percentage. Configuration errors were displayed as a worker-offline banner. | Position uses the actual picture. The processed pane has its own URL, loading state, and media error state. A new run clears the previous result, shows the worker stage, and requires a verified frame count before download. Configuration errors retain their actual message. |
| The local `dev:all` command referenced an uninstalled runner, and the workspace root lacked the worker command shown in the UI. | Both package entry points now use the existing cross-platform worker launcher. |
| FFmpeg calibration used automatic decoder parallelism. With simultaneous video workloads, the local worker ran out of decoder buffers and could not read the upload. | Calibration, tracking, and full-frame verification use bounded decoder threads. |

The source file is read unchanged. The worker maps available descriptive metadata and does not run any invisible watermark or provenance manipulation. H.264 re-encoding can affect embedded signals and invalidates original-file signatures on the derivative. Keep the original with its provenance.

## Files changed

- `watermark-backend/processor.py` handles detection, masking, temporal restoration, crop geometry and export gating.
- `watermark-backend/video_stream.py` verifies frame timing, dimensions, aspect ratio, and audio tracks.
- `watermark-backend/main.py` validates the primary video stream and publishes results only after export checks.
- `logo-ai-remover-main/src/app/api/video-worker/route.ts` validates the browser-facing worker origin.
- The root and frontend `package.json` files and `logo-ai-remover-main/scripts/start-worker.js` make the local worker commands available from either folder.
- `logo-ai-remover-main/src/app/gemini-video-watermark-remover/page.tsx` and `src/routes/gemini-video-watermark-remover.tsx` align page and help copy with the worker.
- `logo-ai-remover-main/src/components/site/JobVideoCleaner.tsx` handles input validation, job stages, and result downloads.
- `logo-ai-remover-main/src/components/site/VideoCompareSlider.tsx` handles comparison coordinates, playback, and preview failures.
- `watermark-backend/test_video_wide_regression.py` extends automated fixture coverage and generates reports and comparison strips.
- `logo-ai-remover-main/scripts/check-video-cleaner-ui.py` exercises the actual upload and comparison flow with Playwright.
- `watermark-backend/VIDEO_CLEANER.md`, this report, and the frontend project notes document the behavior and checks.

## Files inspected

- Application entry points and configuration under `logo-ai-remover-main/` include `package.json`, `scripts/start-worker.js`, `src/app/api/video-worker/route.ts`, `src/app/gemini-video-watermark-remover/page.tsx`, `src/app/remove/video/page.tsx`, `src/routes/gemini-video-watermark-remover.tsx`, and `src/routes/remove.video.tsx`. Root `package.json` was also checked.
- UI source includes `src/components/site/JobVideoCleaner.tsx`, `VideoCompareSlider.tsx`, `VideoCompareSlider.css`, and the other slider caller `HowItWorksGuide.tsx`. The search also traced legacy `src/lib/videoJobs.ts`, `geminiVideoEngine.ts`, and `videoCleanerEngine.ts` references to distinguish the live worker flow.
- Backend source includes `main.py`, `processor.py`, `video_stream.py`, `logo_target.py`, `lama_residual.py`, `temporal_inpainter.py`, `local_reconstruction.py`, `video_utils.py`, `synthid_verifier.py`, `billing_access.py`, and the archived `app.py`. Worker startup and deployment references include `Dockerfile`, `run_backend.bat`, and `vercel.json`.
- Test code includes `test_video_target.py`, `test_video_wide_regression.py`, `tools/check_video_pipeline.py`, `run_universal_video_regression.py`, `test_all_endpoints.py`, `test_all_features.py`, `test_e2e.py`, `test_live_http.py`, `test_cartoon_clean.py`, `test_regression_gemini.py`, `test_gemini_precision.py`, and `test_synthid.py`. Other pytest test definitions were searched to separate offline tests from standalone HTTP utilities.
- Guidance includes `AGENTS.md`, `README.md`, `RULES.MD`, `PROD.MD`, `ARCHITECTURE.MD`, `DESIGN.MD`, `SECURITY.MD`, `CODE STYLE.MD`, `TESTING.MD`, `TASKS.MD`, `MEMORY.MD`, the installed Next.js route-handler guide, `watermark-backend/VIDEO_CLEANER.md`, `requirements-dev.txt`, and the webapp-testing skill.

## Verification artifacts

The automated reports list source and output paths, frame counts, detection details, and audio checks for each case. Comparison strips show corresponding decoded frames. The middle panel is the processed video, and the right panel amplifies the pixel differences by four.

- The focused format run passed four detector/MP4 unit tests and three matrix tests covering 10 exports and three expected rejections. The fixtures cover odd dimensions, rotated portrait, 4K, 60 fps, scene cuts, a dark sparkle, and a sparkle that appears and disappears. On the nine fixtures with clean references, every frame was compared to its reference. Mean error inside the repair box fell from 12.30–20.44 to 1.34–4.26 on a 0–255 scale. [Format results](../debug/video-audit-formats/regression_summary.json)
- The 938-frame VFR fixture retained its per-frame timestamps and 4:3 sample aspect ratio. The AAC track was packet-identical and the Opus track was converted to AAC. [VFR comparison](../debug/video-audit-formats/syn_long_vfr_mixed_audio.png)
- An independent decoded-frame check on the 240-frame landscape fixture confirmed timing, rotation and audio-packet hashes. Its median matched sparkle-edge response fell from 0.1773 to 0.0000, with an absolute 95th-percentile response of 0.0194 after encoding.
- Chromium tested the actual local worker with a marked clip and an unmarked control. The test verified both video sources, keyboard positions from 0% through 100%, pointer drag, Original/Split/Processed, playback, seek, progress, a byte-identical download to the worker response, and the no-download error state. [Browser results](../debug/video-audit-browser-final/browser-results.json) · [Original](../debug/video-audit-browser-final/split-100.png) · [Processed](../debug/video-audit-browser-final/split-000.png)
- Direct comparison on the 1080p fixture showed that the new opacity fit removed a faint silhouette visible at the midpoint of the earlier export. Opaque inpainting estimates covered textures and requires visual review. [1080p comparison](../debug/video-audit-complete/real_1080p_example.png) · [Portrait comparison](../debug/video-audit-complete/real_portrait_cartoon_9x16.png)
- On the 240-frame opaque, saturated logo fixture, increasing the mask alone left a thin blue outline. The RGB repair removed the outlined shape in the reviewed frames, while the filled texture remains slightly softer than the surrounding image. The export retained all 240 timestamps with zero detected black frames. The source had no audio. [Opaque clip results](../debug/video-audit-opaque-rgb/regression_summary.json) · [Opaque comparison](../debug/video-audit-opaque-rgb/real_hero_manual_bottom_left.png)
- The broader offline run reported 53 passed, 8 failed and 22 passing subtests. The failures were three billing expectations and five PDF ownership checks. The video matrix passed. The final opaque RGB change was also checked separately on its 240-frame source. [Complete video matrix and comparison paths](../debug/video-audit-current/regression_summary.json)
- The matrix verified 2,410 decoded frames across 18 exports, with zero detected black frames. Its five expected rejections include unmarked 1280×720 at 24 fps and 720×1104 at 25 fps fixtures with 240 and 100 source frames respectively. The largest change in mean repair error between adjacent frames with ground truth was 3.122 on a 0–255 scale.

The offline run excluded `test_all_endpoints.py`, `test_all_features.py`, `test_e2e.py`, `test_live_http.py`, `test_cartoon_clean.py`, and `test_regression_gemini.py`. These standalone scripts make live requests, use the superseded API contract, or write to existing or machine-specific fixture locations. The Chromium check exercised the current video API locally.

The standalone TypeScript check reported an error in the image tool at `src/lib/geminiPrecisionEngine.ts:103`. Scoped ESLint reported formatting errors with its normal configuration. With the formatting rule disabled, it reported zero errors and two Fast Refresh warnings.

Production coordinates are computed from video dimensions, display rotation, and matched image evidence. Test fixtures use specific positions to generate repeatable clips.
