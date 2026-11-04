# 🎬 Bellix Labs — Real FFmpeg Video Watermark Remover Backend

High-performance Python backend powered by FastAPI and the real system `ffmpeg` binary. Performs mathematical reverse alpha unblending for Google Gemini / Veo watermarked videos with zero AI distortion, preserving 100% original video resolution, framerate, and audio track.

> **Note:** This backend requires the real `ffmpeg` binary and must be deployed to a persistent container service (Railway, Render, Fly.io, or VPS). It must **NOT** be deployed to serverless hosts like Vercel or Netlify.

---

## 🚀 Quick Start (Local Run)

### 1. Prerequisites
- Python 3.11+
- System `ffmpeg` and `ffprobe` installed and on your PATH:
  ```bash
  # Linux (Ubuntu/Debian)
  sudo apt-get update && sudo apt-get install -y ffmpeg

  # macOS
  brew install ffmpeg

  # Windows (via winget or chocolatey)
  winget install Gyan.FFmpeg
  ```

### 2. Install Dependencies & Run
```bash
cd watermark-backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Health check will be available at: `http://localhost:8000/health`

---

## 🐳 Docker Deployment

### Build and Run Locally
```bash
docker build -t bellix-watermark-backend .
docker run -p 8000:8000 bellix-watermark-backend
```

---

## ☁️ Cloud Deployment Guides

### 1. Railway (Recommended)
1. Fork or push the repo to GitHub.
2. In Railway dashboard, click **New Project** > **Deploy from GitHub repo**.
3. Set the Root Directory to `watermark-backend`.
4. Railway will automatically detect the `Dockerfile` and expose `${PORT}`.
5. Set Environment Variables:
   - `CORS_ORIGINS`: `https://bellix.us,https://www.bellix.us`
6. Copy the generated Railway URL (e.g. `https://xxx.up.railway.app`) and set it in your frontend as `NEXT_PUBLIC_API_URL`.

### 2. Render
1. Create a **New Web Service** from your GitHub repo.
2. Select **Docker** environment (or set Root Directory to `watermark-backend`).
3. Add Environment Variables:
   - `CORS_ORIGINS`: `https://bellix.us,https://www.bellix.us`
4. Deploy service and set public URL in frontend.

### 3. Fly.io
```bash
cd watermark-backend
fly launch
fly deploy
```

### 4. Linux VPS (Ubuntu / Debian / systemd)
```bash
sudo apt-get update && sudo apt-get install -y ffmpeg python3-pip python3-venv git
cd /opt/watermark-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run with uvicorn or configure a systemd service:
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## 📡 API Specification

### `POST /api/video/process` (multipart/form-data)
- **Parameters:**
  - `file`: Video file (`video/mp4`, `video/webm`, `video/quicktime`, etc., up to 500 MB, duration $\le 120$ s).
  - `size_pct`: Corner box width % (float, default `7.0`).
  - `dist_pct`: Distance from right/bottom corner % (float, default `4.0`).
  - `alpha`: Watermark opacity calibration (float `0.10` to `0.90`, default `0.30`).
- **Response:**
  ```json
  { "job_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479" }
  ```

### `GET /api/video/status/{job_id}`
- **Response:**
  ```json
  {
    "state": "queued|processing|done|error",
    "progress": 45,
    "error": null,
    "log_tail": ["frame=  120 fps=45.0 ..."]
  }
  ```

### `GET /api/video/download/{job_id}`
Streams the pristine clean MP4 file (`<original-name>-clean.mp4`) with attachment headers.

### `DELETE /api/video/{job_id}`
Deletes job workspace and temporary artifacts immediately.

### `GET /health`
Returns `{"ok": true, "ffmpeg": true}` verifying server health and the ffmpeg binary.
