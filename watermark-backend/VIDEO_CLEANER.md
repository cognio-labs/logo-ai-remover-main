# Gemini video cleaner

The Next.js video page obtains the public worker origin from `GET /api/video-worker`. The browser then uploads the clip to FastAPI, polls the job, and downloads the MP4 directly from the worker. The worker accepts an optional `manual_box` as a JSON array of normalized display coordinates `[x, y, width, height]`. The box limits detection. Each upload returns a job ID and an access token. Guest clients send the token as `X-Video-Job-Token` when checking status, downloading, or deleting that job.

The old broad inpaint mask treated background brightness and dark details as watermark pixels. This replaced parts of the floor and colored lights with estimated pixels. The current worker uses temporal high-pass evidence and normalized correlation to locate a fixed matte, calibrates opacity from the clip, and reverses white and any sufficiently supported dark overlay. A thin feathered contour repair uses the current frame. In still areas it also uses a small contribution from the previous frame's residual correction.

## Run locally

Install Python 3.11+, Node.js, and FFmpeg/ffprobe on PATH. Use FFmpeg 7.1 or later for rotation tags. Start these commands in two terminals from their respective folders.

```powershell
# Terminal 1, from watermark-backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

```powershell
# Terminal 2, from logo-ai-remover-main
npm.cmd install
$env:VIDEO_WORKER_URL = "http://localhost:8000"
npm.cmd run dev
```

Open `http://localhost:5678/gemini-video-watermark-remover`. Check `http://localhost:8000/health` for FFmpeg availability and `http://localhost:5678/api/video-worker` for the configured origin. In development the origin defaults to port 8000. Linux and macOS can use `.venv/bin/python`, `npm`, and `export VIDEO_WORKER_URL=http://localhost:8000`.

## Deploy

1. Create a Railway or Render Docker web service from the repository with `watermark-backend` as its root. Use its existing Dockerfile. On a VPS, build from the same folder with `docker build -t bellix-video .` and run `docker run -p 8000:8000 bellix-video` behind an HTTPS reverse proxy.
2. Give the service a public HTTPS origin and set its health check to `/health`. Use one replica and one Uvicorn process because the job queue and tokens are in process memory. Give the worker a dedicated `UPLOAD_DIR` for disposable media. Files are removed on startup and completed outputs expire after 15 minutes. The existing account/credit environment variables remain separate from video processing.
3. Set worker `CORS_ORIGINS` to include any extra frontend preview origins. The two Bellix production domains and local development origins are already included. Configure any reverse proxy or load balancer to accept the worker's 500 MB upload limit.
4. Set `VIDEO_WORKER_URL=https://<public-worker-origin>` in the Vercel Production environment and redeploy the Next.js app. The setting contains no secret. Upload on the production page, check worker progress and download the comparison result. Use the current worker and frontend together.

Direct browser-to-worker media transfer keeps both sides of the job within Vercel's function payload limit. [Vercel guidance on direct uploads](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions)

## Calibration and QA

Run from `watermark-backend`. `--box` uses encoded pixels and should include a clean border. With `--background` provide one known luma level per reference clip. If omitted, the tool fits a local background from the border and rejects highly textured samples. When reference brightness varies enough, the script regresses white opacity and dark shadow separately. Inspect the generated maps before replacing the shipped 16-bit `alpha_mask.png`. If calibration yields a distinct dark halo around the white mark, install the matching dark map as `shadow_mask.png` alongside the white map.

```powershell
python tools/calibrate_alpha.py dark-reference.mp4 gray-reference.mp4 --box 1132 572 56 56 --background 18 105 --output calibrated-alpha.png --shadow-output calibrated-shadow.png
python tools/check_video_pipeline.py --output-dir qa
python tools/check_video_pipeline.py --output-dir qa-real --clip stage=stage-original.mp4
```

The checker generates five clips by default, prints JSON metrics, and writes three 4× before/after corner crops with box overlays, the white and dark alpha estimates, and the contour mask. The debug crops compare frames before H.264 encoding. The numeric report reads the exported MP4, verifies timing/rotation/color tags and audio packet hashes, and measures the sparkle edge response and pixel change outside the bounding box.

## Limits

- The worker targets a visibly translucent, stationary white sparkle. If detection fails, try **Manual position**. The worker rejects uncertain or incompatible marks. Invisible SynthID is outside this pipeline.
- Opaque or clipped pixels contain less recoverable detail. Very strong chroma edges and compression can leave a faint trace at high magnification. HDR sources need an SDR export for the 8-bit MP4 pipeline.
- For native 8-bit 4:2:0 sources, color samples outside the fitted footprint are carried unchanged into the encoder. CRF 14 H.264 is lossy, so decoded pixels outside that footprint can differ. Original audio packets are copied. Audio codecs unsupported by the MP4 muxer may require a compatible source.
- The existing comparison remains a visual review tool. The numerical edge metric alone does not establish artifact-free footage in every scene.

## LaMa residual cleanup

Set `LAMA_MODEL_PATH` to a trusted local Big LaMa TorchScript checkpoint. Install
PyTorch in the worker environment before starting FastAPI. The checkpoint is
loaded once and all inference runs locally. The expanded matte samples the
halo beyond the sparkle, the LaMa mask extends ten pixels, and the model's
residual correction uses Gaussian feathering, matched local grain and
motion-gated temporal smoothing. Frame math uses float32 through the repair
and is quantized when writing to the FFmpeg pipe for the final H.264 encode.
Without a configured model, the worker uses the existing narrow contour repair.

[LaMa source](https://github.com/saic-mdal/lama) ·
[TorchScript weights](https://github.com/enesmsahin/simple-lama-inpainting/releases/tag/v0.1.0)

From the backend folder, save matching 300×300 lossless crops of the encoded
original and processed files. The command uses the processor's quality
sidecar to center the crop.

```powershell
python tools/export_corner_crops.py original.mp4 processed.mp4 --previous prior-export.mp4 --output ../debug/clip
```
