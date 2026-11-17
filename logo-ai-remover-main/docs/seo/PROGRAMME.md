# Bellix SEO implementation — 17 November 2026

## Status and baseline

Implementation is local; nothing has been deployed, submitted to Google, or published externally. English-language international users are an **assumption**, with India and US hypotheses below. No traffic, search-volume, CPC, difficulty, or ranking numbers are available. GSC Wizard refused access with `subscription_required`; a direct Search Console export is an alternative to that connector. Existing Google verification markup is configuration, not proof of ownership.

`baseline.json` records 22 production routes with complete HTTP HTML, metadata, heading structure, internal links, JSON-LD, response bytes and request timing. The first capture followed redirects, so its `status` is the final response status, not the original redirect code. First network chunks depend on transport and are not guaranteed React shell boundaries. Browser inspection independently found one homepage H1. The raw production response contains its H1 later in the stream. This reproduces the simple-crawler discrepancy without establishing Seobility's exact parsing behavior.

| Finding | Before | Local implementation / verification |
|---|---|---|
| Homepage H1 | Absent first chunk; present complete response and browser | Removed blank outer Suspense boundary; local first chunk includes existing H1 |
| Titles | Repeated `Bellix.us` on tool and informational pages | Central static metadata uses absolute titles with one Bellix suffix |
| Canonicals | Missing across captured production pages | Page-specific absolute canonicals |
| Homepage description | Unsupported free, instant, enhancement and 4K claims | Shorter capability-based description |
| Features H1 | Two in complete HTML | One main heading |
| `/remove/image` | No H1 in captured response; client redirect behavior | Server permanent redirect to actual Gemini image tool |
| `/video` | Duplicate video landing content | Permanent redirect to established video landing URL |
| `/video-enhancer`, `/upscale` | Homepage destinations | Existing redirects retained; no fake landing pages created |
| Sitemap | Shared 2025-10-09 date; Gemini image route absent | Unsupported dates omitted; Gemini image included; redirect/private URLs excluded |
| Social links | Generic social-network homepages | Placeholder links removed; unverified Twitter handle removed |
| Claims | Homepage numerical precision and speculative tools | Unsupported rendered promotional sections retired; existing visual tokens retained |
| History | Crawl blocked without noindex | Explicit noindex; crawl permitted so robots metadata can be seen |

`after-local.json` is the local production-build crawl. Production verification remains outstanding. Metadata uses installed Next.js 16 APIs, not the legacy TanStack `head` declarations: router-compat currently returns those declarations without injecting them. No second SEO runtime was installed.

## Files and review groups

1. Metadata: `src/lib/seo.ts`, `src/app/layout.tsx`, and route `src/app/**/page.tsx` wrappers; `public/sitemap.xml`, `public/robots.txt`.
2. Rendering and accuracy: `src/components/layout/AppShell.tsx`, `src/routes/index.tsx`, `src/routes/features.tsx`, `src/components/site/Footer.tsx`. Existing editors remain in place.
3. Landing help and structured data: `src/components/site/ToolDetails.tsx` and four tool wrappers. Visible requirements, steps, limitations, related links; WebApplication and BreadcrumbList; global WebSite and Organization. No invented ratings or offers.
4. Measurement preparation: `src/lib/tool-events.ts`, `src/components/site/ToolMeasurement.tsx`, `src/components/site/JobVideoCleaner.tsx`.
5. Evidence and repeatable verification: `scripts/seo-crawl.mjs`, `docs/seo/*`.

## Capability evidence and remaining accuracy work

Source enforces background image limit 35 MB (`src/routes/background-remover.tsx`), Gemini image MIME PNG/JPEG/WebP and 25 MB (`src/routes/gemini-image-watermark-remover.tsx`), browser video 100 MB with MP4/MOV/WebM/MKV (`JobVideoCleaner.tsx`), PDF 50 MB / 25 pages (`PdfDocumentStudio.tsx`). These are source-level limits, not successful end-to-end compatibility certification. Background processing has a dynamically imported browser engine and fallback; Gemini video engine is browser-local, re-encodes output, and does not remove invisible SynthID. No verified universal retention period, real account/credit enforcement, payment model, or unlimited-free entitlement has been established. Do not infer these from mock user state.

Still required: review legacy FAQ/about/how-it-works and long-form tool copy for remaining model, infrastructure, turnaround, customer-count and privacy claims. Confirm legitimate account/payment behavior and backend retention policy with the operator. `/remove/video` is a distinct backend workspace; local self-canonical metadata added, but service readiness is not established. General image-watermark removal is not equivalent to supported Gemini sparkle cleanup. Do not target arbitrary watermark queries as a supported general tool.

## Keyword-to-page map

Research date: 2026-11-17. Language English. Web search is unlocalized and device-unspecified; these are qualitative hypotheses, **not India/US Google rank tracking**. Search Console and paid keyword metrics unavailable. Source results show many product-background competitors and active Gemini cleanup discussions; they establish competing intent, not search volume.

| Cluster / primary keyword | Intent / supporting terms | Destination | Evidence and priority | Required work |
|---|---|---|---|---|
| remove image background | Tool / transparent PNG, product photo cutout | `/background-remover` | P1: direct implemented workflow; crowded SERP [examples](https://dynapictures.com/tools/remove-background) | Original cutout examples, mobile processing QA |
| Gemini image watermark remover | Tool / visible sparkle, original Gemini export | `/gemini-image-watermark-remover` | P1: distinct supported mark; [creator discussion](https://www.reddit.com/r/GeminiAI/comments/1xp957s/i_made_a_free_tool_that_removes_the_gemini/) | Document supported originals and failure cases |
| Gemini video watermark remover | Tool / Veo visible mark, browser video cleanup | `/gemini-video-watermark-remover` | P1: specific source engine; [India discussion](https://www.reddit.com/r/IndiaTech/comments/1xsgt59/made_a_free_tool_to_remove_the_gemini_veo/) | Owned original clip, codec/device test matrix |
| PDF watermark remover | Tool / PDF stamp cleanup, separate layers | `/pdf-watermark-remover` | P2: document implementation; demand unquantified | Backend readiness; layered versus scanned examples |
| make image background transparent | Informational / PNG transparency, white versus transparent | Draft guide → background tool | P1 supporting intent; use one guide, not competing tool clone | Original transparent PNG demonstration |
| image watermark remover | Broad cleanup | No new page yet | Hold: arbitrary watermark capability not established | Verify real general cleanup before targeting |
| image upscaler / video enhancer | Enhancement | Existing legacy URLs retained | Hold: routes redirect; no functioning public landing workflow | Functionality and output tests before promotion |

India: validate English mobile demand, slow-network model loading, Chrome Android, and Gemini original-export use cases; do not infer audience from a single discussion. US: validate merchant/product-photo desktop and mobile workflows. Neither market has measured opportunity scores. Export GSC queries by country IND/USA, device and landing page; use a keyword tool with country/language/device/date recorded before assigning numeric priorities.

## Prioritized 90-day content and distribution plan

All proposed guides require editorial review and owned/licensed demonstration assets. No guides are auto-published.

| Days | User/problem and cluster | Destination and outline | Original contribution/assets | Links and conversion |
|---|---|---|---|---|
| 1–14 | Merchant needs reusable cutout; product background removal | Draft 1: source prep → upload → edge review → export | Same owned product on white and transparent; record failures | Background tool, sample images, tools; download usable PNG |
| 15–28 | Designer loses transparency; transparent PNG | Draft 2: alpha vs white → PNG export → verify in target app | Checkerboard and two backdrop tests | Draft 1, background tool; export PNG |
| 29–42 | Creator has Gemini visible mark | Draft 3: original export → supported mark → review → attribution | Owned original/export pair; include failed resized input | Gemini image/video tools; reviewed download |
| 43–56 | Portrait editor has difficult hair | Hair cutout guide: contrast → cutout → edge inspection → alternatives | Owned curly/fine-hair portrait, light/dark tests | Background tool, transparent PNG guide; inspect preview |
| 57–70 | Document owner needs stamp cleanup | PDF layers vs scanned marks: diagnose → process → compare all pages | Synthetic owned layered and scanned PDF; page/text checks | PDF tool, FAQ; validated document download |
| 71–84 | Video creator needs reliable export | Browser video troubleshooting: codec → size → review audio/motion | Owned clip, Chrome/Edge/mobile matrix, recorded errors | Video tool, draft 3; successful reviewed export |
| 85–90 | User expects recovered missing detail | Upscaling limits explainer, no enhancer CTA until functional | Controlled downscale/reconstruction test required | Tools and source-quality guides; choose supported task |

Review weekly: prioritize pages with qualified impressions, actual starts, successful processing and downloads; change the plan when evidence disagrees.

Distribution shortlist (proposed, no contact sent): [Product Hunt launch guide](https://help.producthunt.com/en/collections/19793093-launch-guide) for a real product launch; [Shopify Community](https://community.shopify.com/) for helpful merchant image-workflow answers within community rules; [GeminiAI community](https://www.reddit.com/r/GeminiAI/) for an original limitations-first demo if moderators permit; [Photography Stack Exchange](https://photo.stackexchange.com/) for relevant educational questions, no promotional answer spam; [Canva developer platform](https://www.canva.dev/) as a partnership/integration investigation, not an existing integration claim. The first two were opened during research; others need current submission/participation rules checked before use. Photography publications should receive an owned, reproducible demonstration rather than requests to insert ranking links.

Outreach draft for review: “Hi [name], we made a short, reproducible walkthrough showing [specific editing problem] using an original file we own. It includes the result, limitations, and cases where cleanup fails. Would this be useful for your [audience/resource]? I can share the source and comparison assets for independent review. — Bellix”

## Measurement and weekly reporting

No external tracker installed; no analytics ID or consent policy supplied. Source inspection found no established gtag deployment in the inspected shared app code; a production network/tag audit is still required before installing anything.

Prepared custom DOM event: `bellix:tool-event` with **only** `{event, tool}`. Tool opened, file-input selection and download-link click cover four primary tool pages. Drag/drop starts and programmatic canvas downloads are not comprehensively instrumented. Video completion/failure emit from real processing branches. Other engines need completion/failure adapters. `download_requested` means click intent, never “download completed.” Browser save completion cannot be inferred from clicking a link. Signup and purchase events must come from verified auth/payment success; mock credits do not qualify.

Setup: confirm existing analytics property/tags and applicable consent policy; provide desired GA4 property/stream; add a consent-controlled listener mapping allowlisted events to the existing tracker; test denied/granted consent and DebugView; avoid sending filenames, file URLs, media, job IDs, error strings or user identifiers. Register tool as an event parameter. Connect Search Console and analytics with authorized property access; verify ownership in Search Console, submit the canonical sitemap after deployment, and inspect representative URLs. None of these account actions has been completed.

Weekly template: week/date range and data-settlement cutoff; Google clicks/impressions/CTR/average position vs prior settled week; landing page and query-cluster tables; India/US/other and mobile/desktop; branded Bellix variants versus non-branded; organic tool opens → upload starts → processing completion/failure → download requests; completion/upload and download/completion ratios with deduplication rules; top errors by allowlisted category; releases/Google-update annotations; owner/action/due date. Mark missing data unavailable. Avoid joining first-party media identifiers into analytics.

## Performance and verification limits

HTTP request timings in crawl JSON are network observations, not LCP or field Core Web Vitals. No valid baseline LCP/INP/CLS, Lighthouse, CrUX, mobile CPU/network or main-thread/bundle profile has yet been collected. Do not report performance gains from HTML size changes alone. Homepage speculative sections were retired for accuracy; font and media optimization should follow a comparable mobile lab trace. Measure three repeated mobile runs, report median LCP/CLS/TBT separately from field p75 LCP/INP/CLS, then profile heavy editor/model loading. Preserve content SSR. Check image dimensions, responsive delivery, below-fold video preload and third-party scripts based on that evidence.

Security: no uploads/private files were inspected or sent to analytics. Robots and noindex are discovery controls, not authentication. Existing backend job authorization, resource exposure and retention need a dedicated authorized security review; they are not certified by this change. HTTP and bare-domain preferred-host enforcement must be checked at hosting/CDN before deploying; avoid a redundant redirect loop. No hreflang: no localized equivalent routes were established.

## Deploy and rollback

Review diff in the five groups above. Run `npm.cmd run build`, `npx.cmd tsc --noEmit`, targeted lint, and local crawl. Build configuration currently skips type validation, so separate tsc is essential. Test original owned samples through upload, processing, comparison and download on mobile and desktop; confirm service readiness. Use a preview deployment only after authorization. This task does not authorize production deployment.

After explicit production approval, deploy using the existing project root/build configuration, then rerun `node scripts/seo-crawl.mjs https://www.bellix.us docs/seo/production-after.json`; check redirect hops, genuine 404, canonicals, noindex, sitemap and preview image. Use Google Rich Results Test/Schema validator and Search Console URL Inspection; syntactically parsed JSON alone is not Google validation. Check production rendered DOM against complete and early HTML. Recheck country/device analytics after data settles.

Rollback: redeploy the known previous deployment or revert only the reviewed SEO commits. Preserve unrelated work; do not reset the working tree, force-push, or rewrite published history. Restore alias content only if intentionally reversing permanent redirects; browsers/search engines may retain cached redirects.

Official guidance used: [Next metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata), installed Next docs under `node_modules/next/dist/docs/`, [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [canonicals](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [sitemap lastmod](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [LCP](https://web.dev/articles/optimize-lcp), [INP](https://web.dev/articles/optimize-inp).
