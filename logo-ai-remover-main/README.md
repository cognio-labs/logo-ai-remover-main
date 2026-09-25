# Bellix.us

Browser-based media cleanup, upscaling, video enhancement, background removal and PDF tools. Public site: <https://www.bellix.us/>.

Current stack: React + TypeScript + TanStack Start/Router + Vite, with a Python FastAPI media backend. Image cleanup is currently simulated; user/credit state includes browser-controlled mocks, and payment enforcement is not established. Marketing copy is not proof of implemented functionality.

## Project documentation

| Document | Purpose |
| --- | --- |
| [PROD.MD](PROD.MD) | Website analysis, scope, routes and user flow |
| [ARCHITECTURE.MD](ARCHITECTURE.MD) | Stack, source map, API/job flow and deployment |
| [RULES.MD](RULES.MD) | Engineering/repository rules |
| [DESIGN.MD](DESIGN.MD) | Visual tokens, components and UX states |
| [TASKS.MD](TASKS.MD) | Prioritized backlog and acceptance criteria |
| [MEMORY.MD](MEMORY.MD) | Dated findings and decisions |
| [SECURITY.MD](SECURITY.MD) | Controls, gaps and remediation |
| [CODE STYLE.MD](CODE%20STYLE.MD) | React/TypeScript and Python conventions |
| [TESTING.MD](TESTING.MD) | Coverage, commands and checklists |
| [AGENTS.md](AGENTS.md) | Agent instructions and Lovable history protection |

## Local development

Use a Node.js version compatible with installed Vite/TanStack packages and Python 3.11 (Docker baseline). FFmpeg/ffprobe and tool-specific model dependencies are needed for media processing.

```powershell
npm ci
npm run dev
```

Backend in a separate terminal; reuse an existing virtual environment if present:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Use the URL printed by Vite. Development API requests proxy to port 8000. FastAPI exposes `/health`, `/docs`, `/openapi.json`. Backend settings load `backend/.env`; provider keys remain server-only. Configure `VITE_API_URL` at frontend build time for production; Vite development proxies are not production routing.

See [TESTING.MD](TESTING.MD) for checks and pytest portability notes. Deployment config lives in `vercel.json`, `Dockerfile`, `railway.toml`; deployed connectivity, model readiness and persistent storage require verification.

## Historical planning material — retained below

The original content below contains earlier prompts, conflicting names/stacks/prices and aspirational features. It is preserved for context, not as evidence of implementation or instructions to migrate the application. The linked documentation above is the current baseline.

### PixelPerfect AI — original brief

You are a senior SaaS architect, AI engineer, UI/UX designer, and full-stack developer.

Build a production-ready AI-powered SaaS platform called:

"Bellix.us"

Tagline:

"Transform AI-generated content into professional-quality media."

The platform is an advanced AI media enhancement tool that allows users to upload images and videos, analyze them, remove unwanted visual elements from their own content, repair AI-generated imperfections, enhance quality, upscale resolution, and export professional-grade media.

The goal is to create a premium SaaS product similar to Canva AI + Photoshop Generative Fill + Topaz AI + Runway.

The application must have:

- Beautiful premium UI/UX

- Modern SaaS architecture

- Scalable backend

- AI processing pipeline

- User dashboard

- Subscription system

- Credit management

- Processing history

- API infrastructure

================================================

1. PRODUCT OBJECTIVE

Create a platform where users can:

Upload:

- AI-generated images

- AI-generated videos

- Marketing creatives

- Social media content

- Product images

- Personal media

The AI system should:

1. Analyze uploaded content

2. Detect unwanted visual elements

3. Repair image/video imperfections

4. Enhance quality

5. Upscale resolution

6. Provide downloadable professional output

The system should preserve:

- Original composition

- Faces

- Important objects

- Image realism

================================================

2. CORE FEATURES

## A. AI IMAGE ENHANCER

Create an advanced image processing workflow.

Features:

Upload:

Supported formats:

- JPG

- PNG

- WEBP

- HEIC

Maximum size:

50MB

Processing pipeline:

Upload Image

↓

AI Analysis

↓

Detect:

- Logos

- Text overlays

- Unwanted objects

- Compression artifacts

- AI generation defects

↓

Generate repair mask

↓

AI inpainting

↓

Quality enhancement

↓

Upscaling

↓

Final output

Models:

Use:

- LaMa Inpainting

- IOPaint

- Stable Diffusion Inpainting

- FLUX Fill

- Real ESRGAN Upscaler

Features:

- Auto detection

- Manual brush selection

- Eraser tool

- Undo/Redo

- Zoom canvas

- Compare slider

- Download PNG/JPG

================================================

## B. AI VIDEO ENHANCER

Create professional video processing system.

Supported:

MP4

MOV

AVI

WEBM

Maximum:

500MB

Workflow:

Upload Video

↓

Extract Frames

↓

Detect unwanted elements

↓

Process frames

↓

Maintain temporal consistency

↓

Enhance quality

↓

Rebuild video

↓

Export

Features:

- Timeline editor

- Frame preview

- Region selection

- Processing percentage

- Estimated completion time

- Preview result

Quality options:

720p

1080p

2K

4K

Advanced:

- FPS enhancement

- Noise reduction

- Stabilization

- Color enhancement

Models:

- ProPainter

- E2FGVI

- Real-ESRGAN Video

- RIFE Frame Interpolation

================================================

3. AI CONTENT ANALYSIS ENGINE

Before processing show:

CONTENT REPORT

Example:

AI Artifact Score:

78%

Detected Issues:

✓ Low resolution

✓ Compression noise

✓ Text overlay detected

✓ Quality enhancement recommended

Provide recommended actions:

"Enhance quality"

"Clean image"

"Upscale to 4K"

================================================

4. USER DASHBOARD

Create premium SaaS dashboard.

Design:

Dark mode

Glassmorphism

Gradient cards

Smooth animations

Dashboard:

Card 1:

Credits Remaining

500

Card 2:

Images Processed

124

Card 3:

Videos Enhanced

32

Card 4:

Storage Used

12GB

Charts:

- Weekly processing

- Monthly usage

- Credit consumption

================================================

5. PROJECT WORKSPACE

Create Photoshop-style workspace.

Features:

Projects:

"My Product Campaign"

Inside:

Original File

Processed Version

Enhanced Version

Allow:

- Rename projects

- Duplicate projects

- Delete projects

- Share projects

================================================

6. HISTORY SYSTEM

Create history page.

Display:

Thumbnail

File name

Processing type

Date

Status

Status:

Processing

Completed

Failed

Actions:

Download

Delete

Reprocess

================================================

7. LANDING PAGE DESIGN

Create world-class SaaS landing page.

Style inspiration:

- Linear

- Vercel

- Stripe

- Framer

Theme:

Dark premium

Colors:

Background:

#050816

Primary:

Electric Purple

Secondary:

Blue Gradient

Sections:

Hero:

Headline:

"Create Perfect AI Content In Seconds"

Subheadline:

"Remove imperfections, enhance quality, and transform AI-generated media into professional visuals."

CTA:

Start Creating Free

Buttons:

Upload Image

Upload Video

================================================

8. LANDING PAGE SECTIONS

Include:

## Hero

Animated background

Floating AI particles

Before/After slider

## Features

Cards:

AI Cleanup

4K Upscaling

Video Enhancement

Smart Detection

Batch Processing

API Access

## How it works

Step 1:

Upload

Step 2:

AI Processing

Step 3:

Download

## Testimonials

Creator reviews

## Pricing

Free

Creator

Professional

Business

## FAQ

================================================

9. PRICING SYSTEM

Implement:

FREE PLAN

₹0/month

Features:

5 image credits/day

720p export

Normal processing queue

CREATOR PLAN

₹499/month

Features:

300 credits

HD export

Priority processing

No watermark

PRO PLAN

₹1499/month

Features:

1500 credits

4K export

Video processing

Batch upload

BUSINESS PLAN

₹9999/month

Features:

API access

Team accounts

Unlimited projects

Priority GPU

================================================

10. AUTHENTICATION

Implement:

Login:

- Google

- Email/password

Use:

Clerk or Supabase Auth

User profile:

Name

Email

Plan

Credits

Usage

================================================

11. PAYMENT SYSTEM

Integrate:

India:

Razorpay

International:

Stripe

Features:

Subscription

Upgrade

Cancel

Invoices

Payment history

================================================

12. BACKEND ARCHITECTURE

Backend:

FastAPI Python

Database:

PostgreSQL

ORM:

Prisma / SQLAlchemy

Queue:

Redis + Celery

Storage:

AWS S3 / Cloudflare R2

Architecture:

Frontend

↓

API Gateway

↓

FastAPI Backend

↓

Task Queue

↓

AI Processing Workers

↓

Storage

↓

Database

================================================

13. DATABASE DESIGN

Users Table:

id

name

email

password

subscription

credits

created_at

Projects Table:

id

user_id

original_file

processed_file

type

status

created_at

Payments Table:

id

user_id

amount

plan

payment_id

date

================================================

14. API STRUCTURE

Create:

POST

/api/upload

POST

/api/process/image

POST

/api/process/video

GET

/api/status/{job_id}

GET

/api/history

GET

/api/download/{id}

POST

/api/payment

================================================

15. ADMIN PANEL

Create admin dashboard.

Features:

Users

Revenue

Processing jobs

GPU usage

Failed jobs

Subscription analytics

================================================

16. PERFORMANCE REQUIREMENTS

The application must:

- Load under 2 seconds

- Mobile responsive

- SEO optimized

- Secure file handling

- Rate limiting

- Error handling

- Background processing

================================================

17. SEO SYSTEM

Create blog CMS.

Target keywords:

AI image enhancer

AI video enhancer

Remove AI artifacts

Improve AI generated images

AI photo quality enhancer

4K AI upscaler

Generate:

Blog pages

Metadata

Schema markup

FAQ sections

================================================

18. FUTURE FEATURES

Prepare architecture for:

- Mobile app

- Chrome extension

- API marketplace

- Enterprise dashboard

- Team collaboration

- AI avatar enhancement

- AI advertisement generator

================================================

19. DEVELOPMENT REQUIREMENTS

Write clean production code.

Follow:

- Component-based architecture

- Modular backend

- Environment variables

- Documentation

- Testing

- Security best practices

Deliver:

Complete frontend

Complete backend

Database schema

API documentation

Deployment instructions

Deployment:

Frontend:

Vercel

Backend:

AWS / Railway / Render

Database:

Supabase PostgreSQL

Storage:

Cloudflare R2

Build this as a startup-ready scalable SaaS product, not a simple demo.

Design a premium AI SaaS dashboard for "Bellix.us".

Style:

Luxury futuristic SaaS.

Inspired by:

Linear + Vercel + Stripe.

Use:

Dark background,

glass cards,

soft gradients,

smooth animations.

Create:

1. Landing page

2. Upload workspace

3. AI processing screen

4. Before/After comparison page

5. User dashboard

6. History gallery

7. Pricing page

Include:

- Floating cards

- Animated AI effects

- Modern typography

- Premium spacing

- Responsive mobile layout

The design should look like a $10M funded AI startup product.
Build a complete, production-ready SaaS web application called "RemoveAI" — an AI watermark and logo remover platform for both videos and images, with AI quality upscaling.

=== DESIGN SYSTEM ===

- Dark futuristic theme: deep black (#0a0a0f) background with electric blue (#3b82f6) and purple (#8b5cf6) gradient accents

- Glassmorphism cards: bg-white/5, backdrop-blur, border-white/10, rounded-2xl

- Font: Inter or Space Grotesk

- Smooth Framer Motion animations on scroll, hover glow effects on cards

- Fully responsive (mobile-first), sticky glass navbar with logo, nav links, "Get Started" CTA button

- All pages share the same navbar and footer

=== PAGE 1: LANDING PAGE (/) ===

1. Hero section: animated gradient mesh background, badge "Powered by Advanced AI", headline "Remove Any Watermark From Video & Images in Seconds", subheadline "AI-powered watermark, logo and text removal with 4K quality enhancement. No skills needed.", two CTA buttons: "Remove Watermark Free" and "Watch Demo", and below it a LIVE interactive before/after image comparison slider showing a watermarked image vs clean image

2. Stats bar: "50K+ Users", "2M+ Files Processed", "4.9/5 Rating", "99% Success Rate"

3. Features section: 6 glassmorphic cards with icons — Video Watermark Removal, Image Logo Removal, 4K AI Upscaling, Batch Processing, Auto Watermark Detection, Privacy First (auto-delete in 24h)

4. How It Works: 3 steps with numbers and connecting line — "Upload your file" → "AI removes watermark" → "Download in HD"

5. Comparison table: "RemoveAI vs Other Tools" with checkmarks

6. Testimonials: 3 review cards with avatars and 5 stars

7. Pricing section: 3 cards — Free (₹0: 5 credits/day, 720p), Pro ₹499/mo (200 credits, HD, no queue, POPULAR badge), Business ₹1499/mo (4K, batch, API access)

8. FAQ accordion: 5 questions

9. CTA section: "Ready to clean your videos?" + big gradient button

10. Footer: logo, links (Privacy, Terms, DMCA, Contact), social icons, copyright

=== PAGE 2: IMAGE WATERMARK REMOVER (/remove/image) ===

- Page header: "AI Image Watermark Remover" + subtitle

- Drag-and-drop upload zone (supports JPG, PNG, WEBP up to 25MB) with dashed border, on upload show image preview

- Toolbox panel: brush tool to paint over watermark manually (adjustable brush size), "Auto Detect Watermark" AI button (auto-marks common watermark areas), eraser to fix selection, "Clear Selection" button

- "Remove Watermark" gradient button → show animated processing loader ("AI is cleaning your image...") with progress percentage

- Result view: interactive before/after comparison slider (react-compare-slider), quality badge (HD), and Download button (PNG & JPG options)

- Below: "Your History" grid — glassmorphic cards with processed image thumbnails, filename, date, status badge (Completed/Processing), Download and Delete buttons

=== PAGE 3: VIDEO WATERMARK REMOVER (/remove/video) ===

- Header: "AI Video Watermark Remover"

- Upload zone: MP4/MOV/WebM up to 500MB, after upload show video player with timeline

- Region selector: draw draggable/resizable rectangle boxes over the video to mark watermark areas (support multiple boxes), frame scrubber

- "Remove Watermark" button → processing screen with animated progress bar, percentage, status steps ("Analyzing frames..." → "Removing watermark..." → "Enhancing quality...")

- Result: side-by-side before/after video players OR toggle switch "Before / After", quality selector (720p / 1080p / 4K), file size display, Download button

- History grid below: video thumbnails (with play icon overlay), filename, duration, date, Download + Delete buttons

=== PAGE 4: AI UPSCALER (/upscale) ===

- Upload image or video, select target quality: 2x / 4x / 8x upscale

- Show original vs upscaled comparison with zoom-on-hover

- Download button

=== PAGE 5: DASHBOARD (/dashboard) ===

- Welcome header with user name

- Credit balance card: large animated counter showing available credits, gradient border

- Usage stats: bar chart of jobs processed per day (last 7 days), total files processed, storage used

- Recent activity table: filename, type (video/image icon), status badge, date, action buttons

- "Upgrade to Pro" gradient banner if on free plan

=== PAGE 6: AUTH ===

- Sign up / Login pages with Google OAuth button + email/password, glassmorphic card centered, gradient background

=== PAGE 7: HISTORY (/history) ===

- Full history page: filter tabs (All / Images / Videos), search bar, grid of all processed files with thumbnails, status badges, download/re-download, delete, date filter

=== PAGE 8: PRICING (/pricing) ===

- Monthly/Yearly toggle, 3 pricing cards, feature checklists, popular plan highlighted with gradient border and badge, Stripe checkout button

=== BACKEND (integrate as API routes) ===

- POST /api/upload — file upload, return file URL + job_id

- POST /api/process/image — accepts image URL + mask coordinates, returns job_id

- POST /api/process/video — accepts video URL + watermark regions (x, y, width, height per frame range), returns job_id

- GET /api/status/:job_id — returns job status: queued/processing/completed with progress %

- GET /api/download/:job_id — returns processed file URL

- GET /api/history — returns user's processed files with metadata

- Credits system: each job deducts 1 credit, Free users get 5 credits/day

- Mock the AI processing with setTimeout for demo (2-8 seconds), structure the code so real AI API (Replicate) can be plugged in later

- Store jobs in database (use Prisma + PostgreSQL schema: User, Job, Credit)

=== TECH ===

Next.js 14 App Router, TypeScript, TailwindCSS, shadcn/ui, Framer Motion, react-compare-slider for before/after, Prisma ORM, Clerk for auth (mock if not configured), Zustand for state. Clean folder structure, reusable components (Navbar, Footer, UploadZone, ProcessingLoader, BeforeAfterSlider, HistoryCard, PricingCard). Add comments in code explaining where to connect real AI APIs.

📋 Bonus: Phase-wise prompts (agar ek saath generate nahi karna)

Sirf Landing Page ke liye:

plain

Create a dark futuristic SaaS landing page for "RemoveAI" with hero section, animated gradient background, interactive before/after image slider, 6 glassmorphic feature cards, 3-step how-it-works, pricing section with Free/Pro/Business cards, FAQ accordion, and footer. Next.js 14, TailwindCSS, Framer Motion, shadcn/ui. Colors: black + electric blue/purple gradients. Fully responsive.

Sirf Tool Page ke liye:

plain

Build an image watermark remover tool page: drag-drop upload, brush selection tool on canvas, auto-detect button, animated processing loader, before/after comparison slider, download button, and history grid with thumbnails and status badges. Glassmorphism dark UI, Framer Motion, react-compare-slider.

Sirf Backend ke liye (Cursor/Claude Code):

plain

Build a FastAPI backend for an AI watermark remover: upload endpoint, image processing endpoint (mask coordinates → Replicate LaMa model), video processing endpoint (watermark regions → ProPainter via webhook), job status polling, download endpoint, history endpoint, credits system with daily free limit, Celery + Redis queue, S3 storage, PostgreSQL via Prisma. Include full error handling and file validation.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://logo-ai-remover.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d3a2e819-d147-4295-bcd5-7bd1f20a95f6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
