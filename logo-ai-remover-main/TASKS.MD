# Bellix.us — Prioritized implementation backlog

Baseline: 2026-09-25. Unchecked items are proposed work, not implemented fixes. Close items with acceptance evidence.

## Documentation baseline

- [x] Inspect public HTML for home, tools, pricing and video-cleaner pages.
- [x] Map routes, clients, backend workers, storage and deployment configuration.
- [x] Create requested documentation and project-flow diagrams.
- [x] Preserve existing README material and Lovable instructions.

## P0 — Trust and access boundaries

- [ ] **SEC-01: Job ownership.** Add server identity or scoped guest-job credentials to status, original, preview, result, cancel and delete. Acceptance: another user/guest cannot read or mutate the job; valid owner flows pass.
- [ ] **SEC-02: Restrict CORS.** Replace the broad origin regex with deliberate development/production origins. Acceptance: trusted origins work; unrelated origins receive no credentialed CORS grant. First inventory deployment origins.
- [ ] **SEC-03: Retention.** Define retention by tool, schedule cleanup and protect active jobs. Acceptance: expired artifacts/metadata are removed, active inputs survive and privacy copy matches measured behavior.
- [ ] **SEC-04: Abuse controls.** Add request/concurrency/resource limits and sanitized public errors. Acceptance: excess work is rejected predictably without internal paths or secrets in responses.
- [ ] **PROD-01: Claims audit.** Validate zero retention, GPU/model names, quality guarantees, batch/unlimited plans and timing promises. Acceptance: retained claims have deployment/test evidence or clear qualification.
- [ ] **PROD-02: Image-cleaner simulation.** Wire masks to a real endpoint or explicitly label the demo. Acceptance for real processing: intended pixels change and download matches the processed result.

## P1 — Reliable end-to-end product

- [ ] **OPS-01: Deployed tool verification.** Use authorized fixtures for cleanup, enhancement, upscale, background and PDF. Acceptance: upload → status → result → download works; real limits and failures are documented.
- [ ] **OPS-02: Restart-safe jobs.** Define recovery and introduce durable queue/shared metadata where needed. Acceptance: restart cannot silently strand jobs; duplicate submissions cannot conflict.
- [ ] **UX-01: Branding/navigation.** Remove Pilio references, implement policy destinations and check CTAs. Acceptance: consistent metadata/name and no dead legal controls.
- [ ] **PROD-03: Authoritative limits/plans.** Resolve daily/monthly credits, 60/120-second/unlimited durations and upload/export limits. Acceptance: one server contract drives UI and validation.
- [ ] **QA-01: Browser journeys.** Cover success, rejection, failure, retry, cancel, refresh and simultaneous jobs. Acceptance: checks verify backend responses/results, not only timers/screenshots.
- [ ] **QA-02: Portable pytest paths.** Replace drive-specific `pytest.ini` configuration. Acceptance: Windows/Linux tests use dedicated disposable storage without touching live jobs.

## P2 — Accounts, billing and scale

- [ ] **AUTH-01: Replace demo identity.** Add authentication, migrations and data-access policies. Acceptance: client plan/role edits cannot escalate privileges. Coordinate with SEC-01.
- [ ] **BILL-01: Billing and credits.** Implement verified webhooks, authoritative ledger, idempotent charging/refunds and entitlements. Depends on AUTH-01/PROD-03. Acceptance: replay cannot double-charge/grant credits; failure/cancel rules are tested.
- [ ] **DATA-01: Persistent history/storage.** Introduce account-scoped job metadata and object storage where required. Acceptance: cross-session retrieval and complete authorized deletion.
- [ ] **OPS-03: Observability.** Measure per-tool failures, queue wait, processing time, storage growth and cost without logging secrets/media. Acceptance: operators can trace failures and receive actionable alerts.
- [ ] **UX-02: Accessibility/performance review.** Test keyboard, touch, reduced motion, status announcements and media loading. Acceptance: reproducible findings and prioritized fixes.

## Delivery flow

Choose task → inspect source → define acceptance → implement → verify → update docs/memory → review diff → commit/deploy only within authorized scope.

Completing this documentation setup does not complete the product backlog.
