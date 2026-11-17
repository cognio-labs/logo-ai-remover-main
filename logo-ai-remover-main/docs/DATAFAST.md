# DataFast integration and verification

Checked on 2026-11-17. No production deployment performed.

## Existing integration

`src/app/layout.tsx` already contains one `next/script` instance with `id="datafast-analytics"`, `strategy="afterInteractive"`, and the original attributes:

```html
<script defer data-website-id="dfid_V7j5JzvHOdmUgfGYd8ynv"
  data-domain="www.bellix.us" src="https://datafa.st/js/script.js"></script>
```

No second script was added. Next.js 16.3.5 is the installed build version. A root-layout Script covers routes sharing that layout. Next.js forwards custom attributes and loads shared scripts once across client navigation: https://nextjs.org/docs/app/guides/scripts . No automatic custom conversion events or revenue reporting were configured in this task.

## Observed results

| Check | Result |
|---|---|
| Source search | One integration; supplied ID/domain/defer/URL preserved |
| Production build | Passed using `node node_modules/next/dist/bin/next build` |
| Local production homepage DOM | Exactly one script, expected website ID/domain, defer=true |
| Local browser network | `GET https://datafa.st/js/script.js` returned HTTP 200 |
| Live `https://www.bellix.us/` | Zero matching script elements; no DataFast requests captured |
| Live `https://www.bellix.us/tools` | Zero matching script elements; no DataFast requests captured |
| Successful live tracking POST/beacon | **Not observed / not verified** |
| Dashboard ingestion | Not checked; no authenticated dashboard access used |

The local script download succeeding does not establish live tracking or dashboard ingestion. Local browser traffic did not demonstrate a successful tracking request; localhost differs from the configured production domain. Do not change the supplied domain just to make a local tracking test pass.

## Deployment steps

1. Review the staged changes before publishing. This working tree includes the earlier SEO programme; do not accidentally include unrelated changes in a tracking-only release. The DataFast integration currently lives in the same root-layout file as some SEO edits.
2. Run the existing production build from `D:/logo-ai-remover-main/logo-ai-remover-main`: `npm.cmd run build`. Preview the intended revision using the existing Vercel project. Do not create a second project or alter environment variables for this public website ID.
3. After explicit production approval, deploy the reviewed revision through the existing connected Git/Vercel workflow. The repository-root `vercel.json` installs/builds the nested `logo-ai-remover-main` app. Confirm the deployment is assigned to `www.bellix.us`.
4. Open the production site in a clean browser with DevTools Network recording, then navigate to another public page using a site link. Check exactly one DataFast script element, matching attributes, script GET 200, and an actual successful DataFast tracking request. Check for browser blocking, CSP errors, DNS failures, or server errors if absent. A downloaded script alone is insufficient.
5. Confirm the corresponding visit in the DataFast dashboard for this website ID. Do not paste tracking request payloads, cookies, or visitor identifiers into reports. If network transport succeeds but dashboard data is missing, report those states separately.

`scripts/datafast-browser-check.js` provides a safe DOM/resource summary for DevTools or `agent-browser eval --stdin`. Cross-origin Resource Timing can omit HTTP status; use the Network panel or the browser network capture for definitive response status.

Rollback: restore the previously approved Vercel deployment, or revert only the reviewed tracking change. Preserve unrelated staged work and published Git history.

This record supersedes earlier SEO notes saying that no tracker had been added: the local DataFast integration now exists, while its production deployment and live event ingestion remain unverified.
