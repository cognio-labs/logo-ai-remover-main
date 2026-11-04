# 🎬 Bellix Labs — Video Watermark Remover

> **Video watermark removal — 100% local, self-contained, no paid APIs.**

A full-stack application that removes watermarks from videos using OpenCV inpainting. Upload a video, paint over the watermark on an interactive canvas or use auto-detection, and download the clean result. Everything runs locally on your machine — no cloud services, no subscriptions.

---

## ✨ Features

- **Drag & Drop Upload** — Upload videos up to 100 MB (MP4, AVI, MOV, MKV, WebM)
- **Interactive Canvas Mask Editor** — Paint over watermarks with an adjustable brush, undo/clear support
- **OpenCV Inpainting Engine** — Fast, CPU-optimized frame-by-frame watermark removal (Telea & Navier-Stokes)
- **Multi-core Processing** — Distributes frame inpainting across all CPU cores via multiprocessing
- **Audio Preservation** — Automatically extracts and remuxes the original audio track
- **Real-time Progress** — Live progress bar that polls the backend during processing
- **Premium Dark UI** — Luxury dark design with smooth gradients, animations, and responsive layout

---

## 📸 How It Works

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. Upload   │ ──▶ │  2. Paint    │ ──▶ │  3. Process  │ ──▶ │  4. Download │
│    Video     │     │    Mask      │     │  (Inpaint)   │     │    Result    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

1. **Upload** a video file via drag-and-drop or file picker
2. **Paint** over the watermark area on the first frame using the brush tool (or auto-detect)
3. **Process** — the backend splits frames, runs inpainting, and reassembles the video
4. **Download** the watermark-free video with original audio intact

---

## 🏗️ Architecture

```
watermark-backend/
├── Dockerfile              # Lightweight python:3.10-slim container
├── docker-compose.yml      # Compose config with volume mounts
├── .dockerignore            # Excludes dev files from build context
├── .gitignore               # Git ignore rules
├── requirements.txt         # Python dependencies
│
├── main.py                  # FastAPI app — REST endpoints
├── video_utils.py           # FFmpeg wrapper — audio/frame/video pipeline
├── inpainter.py             # OpenCV inpainting + multiprocessing
├── processor.py             # Auto-detection and sub-pixel inpainting
│
├── uploads/                 # Runtime directory (gitignored)
│
└── static/
    ├── index.html           # Single-page frontend (semantic HTML5)
    └── app.js               # Vanilla JS — canvas, upload, polling logic
```

### Backend (Python / FastAPI)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/upload` | POST | Upload a video file, extract first frame |
| `/frame/{task_id}` | GET | Retrieve the first frame as PNG for the canvas |
| `/process` | POST | Submit a binary mask and start background processing |
| `/status/{task_id}` | GET | Poll processing progress (0–100%) |
| `/download/{task_id}` | GET | Download the final processed video |
| `/api/upload` | POST | Bellix automated video upload & processing |
| `/api/status/{job_id}` | GET | Status polling for web frontend |
| `/api/result/{job_id}` | GET | Stream the cleaned video |
| `/api/download/{job_id}` | GET | Download cleaned video |

---

## 🚀 Quick Start

### Run with Docker

```bash
docker-compose up --build
# Open in your browser: http://localhost:8000
```

### Run Locally with Python

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

<p align="center">
  Built with ◆ <strong>Bellix Labs Video Watermark Remover</strong> — 100% local, zero cloud dependencies
</p>
