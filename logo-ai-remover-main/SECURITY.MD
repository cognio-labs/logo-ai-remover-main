# Bellix.us — Security boundaries and remediation

Baseline: source and public HTML inspection on 2026-09-25. This is not a penetration test, compliance report or proof of deployed exploitability.

## Trust boundaries

Files, filenames, masks, IDs and browser state are untrusted. Media crosses into FastAPI, local storage and processing engines. Optional external providers need a data-disclosure review. Public URLs and UUIDs are not authorization.

## Observations

| Evidence | Finding | Follow-up |
| --- | --- | --- |
| `backend/utils/file_utils.py`, video routes | Job ID/path checks and isolated directories exist | Preserve and test across all tools |
| Configuration/upload routes | File, duration, page and pixel limits exist | Align UI and add resource/concurrency enforcement |
| `backend/main.py` | Credentialed CORS includes `https?://.*` | Restrict origins; CORS does not replace authentication |
| Inspected `backend/api/` routes | No evident authenticated-owner dependency for job operations | Enforce owner or scoped guest credentials on every operation |
| `src/lib/userStore.ts` | Mock identity with editable role/credits; default demo role is admin | Never trust for privileges/billing |
| `src/lib/supabase.ts` | Client configuration and commented schema | Add migrations, verified sessions and database access policies |
| Storage/retention search | Media persists on disk; a setting alone does not delete it | Implement monitored cleanup and truthful disclosures |
| General exception handler | Returns raw exception text | Return safe messages/correlation IDs with restricted diagnostics |

## Implementation requirements

- Verify authenticated ownership or a narrowly scoped guest credential for original, preview, result, cancel and delete. Enforce ownership separately from path containment.
- Inspect/decode media instead of trusting extension/MIME alone. Bound bytes, pixels, pages, frames, duration, processing time and queue depth.
- Resolve paths within the job root. Never use submitted filenames as arbitrary paths or shell fragments.
- Keep provider keys and privileged database credentials server-side. `VITE_*` values are public browser-build configuration.
- Do not log uploads, tokens or sensitive provider payloads. Audit and disclose media sent to external providers.
- Apply private-media cache controls and revoke access when deleting/expiring jobs.
- Handle successful, failed, cancelled and abandoned job retention without deleting active inputs.
- Maintain parser/model dependencies and deployment resource limits.
- Verify payment webhook signatures and event identity; handle replays before granting credits. Browser plan toggles are not entitlements.

## Reporting and incidents

A dedicated security contact was not verified. The owner should designate a private reporting channel before public launch. Do not put secrets or user media in public issues. For confirmed incidents, restrict affected access, preserve minimal private evidence, rotate exposed credentials, identify affected jobs and document remediation.

See [TASKS.MD](TASKS.MD), SEC-01–04 and AUTH-01/BILL-01. Documentation does not implement these controls.
