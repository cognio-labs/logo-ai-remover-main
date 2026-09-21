# PixelRefine video backend

Run from the project root:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r backend\requirements.txt
# Put the server-only OpenRouter key in backend\.env
.\.venv\Scripts\python -m uvicorn backend.main:app --reload --port 8000
```

In another terminal run `npm run dev`. Vite proxies `/api/video/*` to
FastAPI during development. Production can set `VITE_VIDEO_API_URL` to the
backend origin.

The OpenRouter model detects normalized watermark coordinates only. OpenCV
tracks and inpaints that region in the uploaded frames, and FFmpeg rebuilds
the MP4 with audio from that same job's original file.

Run tests with:

```powershell
.\.venv\Scripts\python -m pytest backend\tests -q
```
