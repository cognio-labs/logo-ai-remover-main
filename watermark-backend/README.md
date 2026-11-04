# Gemini Image & Video Watermark Remover (Flask + OpenCV)

Local, privacy-friendly AI watermark remover tool built with Python Flask and OpenCV.
Runs 100% locally on your machine with zero external paid APIs.

## Features

- **Gemini Video Watermark Remover** (`/`):
  - Inpainting corner watermarks on MP4, MOV, WebM, AVI, MKV videos.
  - Video player with synced comparison and MP4 export.
- **Gemini Image Watermark Remover** (`/image-remover`):
  - Batch image upload (up to 10 JPG, PNG, WEBP files, max 20 MB each).
  - Background task queue with multi-threaded OpenCV inpainting.
  - Interactive before/after comparison slider.
  - Per-image status, error isolation, individual PNG download, and batch ZIP export.
  - 1-hour automatic cleanup of temporary files.

## Project Structure

```
watermark-backend/
├── app.py                # Merged Flask app serving both Video and Image tools
├── processor.py          # Video watermark remover logic
├── image_processor.py    # Image watermark remover logic (OpenCV inpainting)
├── requirements.txt      # Python dependencies
├── Dockerfile            # Container configuration
├── docker-compose.yml    # Docker Compose setup
├── uploads/              # Temporary video uploads
├── outputs/              # Cleaned video results
├── image_jobs/           # Temporary image uploads & cleaned results (auto-purged after 1 hr)
└── static/
    ├── index.html        # Video tool frontend
    ├── image-remover.html# Image batch tool frontend
    └── samples/          # Before/after sample images
```

## How to Run Locally

1. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```
2. Start server:
   ```bash
   python app.py
   ```
3. Access in browser:
   - Video Remover: `http://localhost:5000/`
   - Image Remover: `http://localhost:5000/image-remover`

## How to Run with Docker

```bash
docker compose up --build -d
```
Access at `http://localhost:5000/image-remover`.

