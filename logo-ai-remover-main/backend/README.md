# Bellix.us Unified Production AI Backend

A unified, production-grade AI microservice architecture powering the Bellix.us Creative Suite:
1. **AI Image Upscaler** (Crystal-Clear 4K & 8K with Real-ESRGAN, GFPGAN face restoration, AnimeSharp, and Product modes)
2. **AI Background Remover** (Remove.bg-level cutouts via BiRefNet, sub-pixel alpha matting, PyMatting foreground estimation, and Amazon 100% white compliance)
3. **AI Image Cleaner** (Watermark & Imperfection inpainting via LaMa, crop-with-context resolution preservation, and auto-detection)
4. **AI PDF & Document Watermark Remover** (Vector Lossless PDF object redaction, Auto Inpaint 300/400 DPI for scans, and OCR preservation)

---

## Architecture Overview

```
                      ┌──────────────────────────────────────┐
                      │    Bellix.us Web Frontend (Vite)     │
                      └──────────────────┬───────────────────┘
                                         │ HTTP Multipart / SSE
                                         ▼
                      ┌──────────────────────────────────────┐
                      │    FastAPI Gateway & Auth / Limits   │
                      └──────────┬───────────────────┬───────┘
                                 │                   │
                 Enqueues Job    ▼                   ▼ Direct Read
                   ┌───────────────────┐    ┌───────────────────────────┐
                   │ Redis 7.2 Broker  │    │ S3 / Cloudflare R2 Store  │
                   └─────────┬─────────┘    │ (1-Hour Retention Janitor)│
                             │              └───────────────────────────┘
                             ▼
               ┌───────────────────────────────┐
               │ Celery GPU Worker Pool        │
               │ (PyTorch FP16 on CUDA 12.1)   │
               ├───────────────────────────────┤
               │ • Real-ESRGAN x4plus + GFPGAN │
               │ • BiRefNet Matting Engine     │
               │ • LaMa Crop-Context Inpainter │
               │ • PyMuPDF Vector Redactor     │
               └───────────────────────────────┘
```

---

## Folder Structure

```
backend/
├── api/
│   ├── unified_routes.py      # Core unified API router (/api/upscale, /api/remove-bg, etc.)
│   ├── image_routes.py        # Image endpoint aliases
│   ├── background_routes.py   # Background removal router
│   ├── pdf_routes.py          # Document routes
│   └── video_routes.py        # Video watermark removal routes
├── engines/
│   ├── upscaler_engine.py     # Real-ESRGAN + GFPGAN + Tiled overlap blending engine
│   ├── birefnet_engine.py     # BiRefNet + PyMatting alpha & color estimation engine
│   ├── lama_cleaner_engine.py # LaMa inpainting with crop-with-context resolution keeper
│   └── pdf_cleaner_engine.py  # Vector Lossless & Auto Inpaint PDF document engine
├── models/
│   └── weights/               # Downloaded ONNX and PyTorch model checkpoints
├── services/
│   ├── cache_service.py       # SHA-256 result caching (image bytes + parameters)
│   └── rate_limiter.py        # IP-based sliding window rate limiter
├── storage/
│   └── s3_storage.py          # Dual S3/R2 presigned URLs + local fallback + retention janitor
├── tests/
│   └── test_pipeline.py       # Unit tests for scale math, trimap, alpha, and cache
├── utils/
│   └── logging_utils.py       # Structured logging omitting sensitive image pixels
├── workers/
│   ├── celery_app.py          # Celery configuration with high/default/low queues
│   └── tasks.py               # Asynchronous Celery tasks with live SSE progress tracking
├── config.py                  # Pydantic v2 application settings
├── main.py                    # FastAPI application initialization & middleware
└── requirements.txt           # Production Python dependencies

scripts/
├── benchmark.py               # Latency & throughput benchmark suite
├── download_models.py         # Automated model weights downloader
├── generate_samples.py        # Synthetic case-study document & image generator
└── verify_manifest.py         # CI integrity test for case-study assets
```

---

## 1. AI Pipeline Details

### AI Image Upscaler
- **Modes:**
  - `natural`: Real-ESRGAN x4plus for organic sharpness without hallucination.
  - `portrait`: Real-ESRGAN x4plus + GFPGAN v1.4 face restoration (fidelity 0.70) blended smoothly back onto the upscaled base to preserve natural skin pores and prevent a plastic look.
  - `art`: AnimeSharp / Nomos-style model optimized for illustrations and generative art.
  - `product`: Real-ESRGAN x4plus + edge-preserving bilateral denoise + unsharp mask for razor-sharp typography and product boundaries.
- **Scale Logic:**
  - `2x`: Model 4x inference followed by high-fidelity Lanczos downsampling.
  - `4x`: Single direct pass.
  - `8x`: Cascaded two-pass upscale (4x + 2x).
  - Max resolution safety cap at 7680x4320 (8K, ~64 MP).
- **Tiled Overlap Blending:** 400-512px tiles with 24-32px padding blended using a 2D Hanning window to guarantee zero visible seam lines and prevent GPU Out-Of-Memory (OOM) errors.
- **Edge cases handled:** Alpha channel separated and upscaled independently; EXIF orientation corrected; ICC profiles preserved; gentle film grain (0.4% noise) re-injected to prevent plastic over-smoothing.

### AI Background Remover
- **Segmentation Model:** BiRefNet (commercial-safe MIT license).
- **Quality Levels:**
  - `fast`: 1024px working resolution.
  - `balanced`: 1024px with alpha trimap refinement.
  - `ultra_hd`: 2048px high-resolution matting with patch refinement.
- **Sub-Pixel Alpha Matting:** Generates trimap via morphological erosion & dilation, refining transition bands (hair, fur) using PyMatting KNN/closed-form matting.
- **Color Decontamination:** PyMatting `estimate_foreground_ml` estimates clean foreground colors to permanently eradicate background color bleed and green/white halo edges.
- **Compositing:**
  - `transparent`: 32-bit straight alpha RGBA PNG.
  - `solid`: Mathematical alpha blending. Amazon 100% White mode guarantees exact `(255, 255, 255)` on background pixels for e-commerce compliance.
  - `studio_set`: Realistic contact drop shadows generated from the alpha channel with adjustable diffusion and ground perspective.

### AI Image Cleaner & Inpainter
- **Model:** LaMa (Large Mask Inpainting, Apache 2.0 license).
- **Preserve Full Resolution:** Does **not** downscale the original image. For each mask region, calculates a context bounding box with 2.5x padding (minimum 512px), inpaints the region at model resolution, and seamlessly pastes back only the masked pixels.
- **Mask Preprocessing:** 3-8px dilation to eliminate antialiased watermark fringing; 3px Gaussian boundary feathering; Poisson/seamless clone blending.
- **Auto Detect:** High-pass Sobel and morphological filtering to isolate corner timestamps, watermark logos, and overlays, returning editable bounding boxes.

### AI PDF & Document Watermark Remover
- **Step 0 Analyze:** Inspects PDF structure, distinguishing vector digital PDFs from scanned raster PDFs.
- **Mode 1 Vector Lossless (Digital PDFs):** Removes `/Watermark` annotations, draft OCG layers, and repeating semi-transparent vector XObjects directly from content streams without rasterization. **100% typography and vector precision preserved.**
- **Mode 2 Auto Inpaint (Scans):** Renders pages at 300 DPI (Ultra HD: 400 DPI), applies LaMa inpainting to watermark masks, and restores paper background texture.
- **Mode 3 OCR Preserved:** Preserves existing digital text layers or applies Tesseract/OCRmyPDF to embed an invisible searchable text layer.
- **Security & Ethics:** Rejects password-protected PDFs without bypassing encryption; refuses requests to forge financial/legal terms (PAID, VOID, CANCELLED).

---

## 2. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upscale` | Enqueue upscaling job (`scale`: 2, 4, 8; `mode`: natural, portrait, art, product) |
| `POST` | `/api/remove-bg` | Enqueue background removal job (`quality`: fast, balanced, ultra_hd; `bg_mode`: transparent, solid, studio_set) |
| `POST` | `/api/clean/detect` | Auto-detect candidate watermark bounding boxes and return mask URL |
| `POST` | `/api/clean` | Enqueue inpainting job (`image`, `mask`, `quality`: fast, balanced, ultra) |
| `POST` | `/api/pdf/analyze` | Classify document and return watermark candidates |
| `POST` | `/api/pdf/clean` | Clean PDF via `vector_lossless` or `auto_inpaint` |
| `GET` | `/api/jobs/{job_id}` | Query job status, progress percentage, and ETA |
| `GET` | `/api/jobs/{job_id}/stream` | Server-Sent Events (SSE) live progress stream |
| `GET` | `/api/jobs/{job_id}/result` | Retrieve signed result URL, dimensions, and verification data |
| `POST` | `/api/samples/{sample_id}` | Preview synthetic sample restorations |
| `GET` | `/health` | Healthcheck endpoint (`{"ok": true}`) |

---

## 3. Local Development Setup

### Prerequisites
- Python 3.10 or 3.11
- Node.js 18+ (for frontend)
- FFmpeg installed and in PATH
- Redis (optional for local queue; falls back to background worker threads automatically)

### Setup Steps
```powershell
# 1. Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Install backend dependencies
pip install -r backend/requirements.txt

# 3. (Optional) Download offline AI weights
python scripts/download_models.py

# 4. Run tests to verify setup
python -m pytest backend/tests/test_pipeline.py

# 5. Run the performance benchmark
python scripts/benchmark.py

# 6. Start the FastAPI server
uvicorn backend.main:app --reload --port 8000
```

---

## 4. Docker & Production Deployment

### Quickstart with Docker Compose
Run the API, Celery GPU Worker, and Redis with a single command:

```bash
docker compose up --build -d
```

Verify service status:
```bash
docker compose ps
docker compose logs -f worker
```

### Deploying to RunPod / Modal / Cloud GPU

#### RunPod Deployment:
1. Select a GPU template with **PyTorch 2.2+ / CUDA 12.1** (RTX 4090, A10G, or L4).
2. Clone repository:
   ```bash
   git clone <REPO_URL> && cd logo-ai-remover-main
   ```
3. Set environment variables in `.env` (S3/R2 credentials, CORS origins).
4. Launch Celery worker and FastAPI:
   ```bash
   celery -A backend.workers.celery_app worker --loglevel=info --pool=solo -c 1 -Q high,default,low &
   uvicorn backend.main:app --host 0.0.0.0 --port 8000
   ```

#### Modal Deployment:
Wrap the Celery tasks or engine classes in Modal `@app.function(gpu="T4")` or `@app.function(gpu="A10G")` decorator for instantaneous serverless scale-to-zero GPU inference.

---

## 5. Storage, Retention & Privacy

- **Cloudflare R2 / AWS S3 Integration:** Files are uploaded with private ACLs and accessed exclusively through time-limited presigned URLs (60-minute expiry).
- **Zero Retention Policy:** A dedicated background Janitor thread (`backend/storage/s3_storage.py`) sweeps local and temporary storage every 15 minutes, permanently unlinking files older than 1 hour.
- **Data Privacy:** User images are processed in isolated tmpfs memory; they are never logged, persisted, or used for model training.

---

## 6. Model Weights & Licenses

| Engine | Model | License | Commercial Safe |
|---|---|---|---|
| Background Remover | BiRefNet | MIT License | Yes |
| Inpainter | LaMa (Large Mask Inpainting) | Apache 2.0 | Yes |
| Upscaler | Real-ESRGAN x4plus | BSD-3-Clause | Yes |
| Face Restoration | GFPGAN v1.4 | Apache 2.0 | Yes |
| Document Engine | PyMuPDF / pikepdf | AGPL / MPL 2.0 | Yes |

---

## 7. Sensible Assumptions Made

1. **Dual Storage Mode:** System defaults to secure local ephemeral storage if S3 credentials are not configured, automatically switching to Cloudflare R2 / AWS S3 when environment variables are supplied.
2. **Worker Fallback:** When Redis or Celery is offline during development, jobs automatically run in an asynchronous direct worker thread so development is never blocked.
3. **Pure White Exactness:** Amazon product compliance requires `(255, 255, 255)` on background pixels. In Solid mode with `#FFFFFF`, background pixels with alpha under 0.01 are forced to exact RGB 255 to eliminate any compression or floating-point discoloration.
4. **Synthetic Case-Study Generation:** Case-study proof assets are generated synthetically using ReportLab and Pillow to ensure 100% legal compliance and zero privacy risk.
