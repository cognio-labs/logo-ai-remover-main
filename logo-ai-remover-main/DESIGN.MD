# Bellix.us — Design system and UX flow

Baseline: `src/styles.css`, shared components and public HTML inspected on 2026-09-25. This was not a rendered visual/accessibility audit.

## Current identity and tokens

Light creative-studio design: white surfaces, pale rose sections, crimson actions, neutral text, rounded cards and media comparisons. Historical dark-purple briefs are not the current reference.

| Token | Value |
| --- | --- |
| Background/card | `#FFFFFF` |
| Foreground | `#111827` |
| Primary / focus ring | `#E11D48` |
| Primary glow | `#FB7185` |
| Secondary | `#FFF1F4` |
| Muted / muted text | `#FFF5F7` / `#6B7280` |
| Border | `#FCE7EC` |
| Success / destructive | `#059669` / `#DC2626` |
| Base radius | `1rem` |
| Primary gradient | `#E11D48` → `#FF2E63` → `#FF4FA3` |

Font stack: Söhne, Inter, system fallbacks. Verify font availability before assuming Söhne renders. CSS currently maps font-weight utilities to 400; use scale/spacing/contrast for hierarchy and treat global weight changes deliberately. Some headings use serif utilities.

## Reusable components

Use `Navbar`, `Footer`, `PinkButton`, `UploadZone`, tool-specific uploaders, `BeforeAfterSlider`, video comparison components and Radix/shadcn primitives. Progress and loaders should be driven by actual work; preserve a clear demo distinction where processing is simulated.

## Required tool states

| State | User experience |
| --- | --- |
| Empty | Purpose, supported files/limits, upload action and accurate privacy information |
| Uploading/validating | File name, meaningful progress and validation errors |
| Ready | Original preview, relevant settings and processing action |
| Queued/processing | Real stage/progress and supported cancellation |
| Completed | Original/result comparison, actual format/resolution and download |
| Failed | Actionable explanation and safe retry, no success illustration |
| Cancelled/expired | Explicit status and instructions to restart |

These are requirements, not a claim that every route already implements every state.

## Accessibility and responsive behavior

Stack narrow layouts; use side-by-side previews where space permits. Check 360, 768 and 1440 CSS-pixel widths. Upload must work without drag/drop. Provide keyboard/touch alternatives for masks/sliders, visible focus, labels and live status announcements. Do not rely on color alone. Respect reduced-motion preferences.

## Content improvements

Unify Bellix.us branding, especially `/tools`. Give each hero a clear primary task. Validate model/hardware/quality claims and label illustrative samples. Replace footer legal spans with working destinations when policies are implemented. Align pricing and upload limits with server behavior. These are backlog items; documentation setup does not alter UI.
