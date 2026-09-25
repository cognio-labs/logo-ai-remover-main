# Bellix.us — Testing and verification

## Existing backend coverage

| File under `backend/tests/` | Coverage represented by source/test names |
| --- | --- |
| `test_job_isolation.py` | Independent uploads, job-specific processing/download, refresh, failure and API aliases |
| `test_frame_identity.py` | Frame sequence and unchanged content outside masks |
| `test_image_upscale.py` | Upscale flow/formats, invalid/oversized input and isolation |
| `test_pdf_cleaner.py` | Upload/preview, document cleaning and isolation |
| `test_background_remover.py` | Capabilities, sync/async removal, compositing and brush refinement |
| `test_video_enhancer.py` | Dimensions, processing engines, records, health, upload/inspect |

Tests may mock services or use local fixtures. Passing them does not prove deployed models, processing quality, authorization or billing. No frontend test script is declared in `package.json`.

## Commands from repository root

```powershell
npm run lint
npx tsc --noEmit
npm run build
.\.venv\Scripts\python.exe -m pytest backend/tests
```

`npm run test:backend` uses Python on PATH. Prefer the explicit virtual-environment executable where dependencies are installed. Requirements are in `backend/requirements.txt`; media tests may need FFmpeg/ffprobe and model dependencies.

`pytest.ini` hard-codes a D-drive base-temp path. On other machines/checkouts, override with a dedicated disposable directory:

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests --basetemp=backend/storage/temp/pytest-doc-check
```

Pytest clears its base-temp directory. Never point it at real jobs or files to preserve.

## Checks by change type

| Change | Relevant verification |
| --- | --- |
| Docs | Relative links, referenced paths, factual claims and whitespace/diff |
| UI | Typecheck, affected lint/build checks, desktop/mobile/keyboard inspection |
| API | Client types, affected backend tests, success/error contracts |
| Media | Regression tests, real-fixture output inspection, isolation, cancellation/failure |
| Access/billing | Cross-user denial, forged input, replay/idempotency and entitlements |
| Deployment | Build, health/model checks and authorized upload-to-download smoke test |

Start scoped; broaden for shared changes. Separate pre-existing failures and avoid unrelated fixes.

## Manual journey matrix

For each real tool, test a small authorized input, unsupported/over-limit files, failure, retry, simultaneous jobs and refresh. Check output identity and actual transformation. Video needs sequence/duration/resolution/audio-sync checks; images need dimension/transparency checks; PDFs need page count, readable text and preservation outside edited regions. Test cancellation/deletion only where exposed.

Verify production API origin, expired results, 360/768/1440-pixel layouts, keyboard controls and clear error states. Use fixtures; paid jobs and deletion of user media are not incidental documentation checks.

## Baseline review, 2026-09-25

Four public pages returned HTTP 200 and their HTML text was inspected. Configuration, routes and test source were reviewed. No media jobs, browser interaction suite, benchmarks, billing tests or application build were run for this documentation-only task. A simulated timer is not a processing test.
