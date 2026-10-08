# ─────────────────────────────────────────────────────────────────────────────
# BELLIX.US AI UNIFIED PRODUCTION DOCKERFILE
# Multi-purpose GPU-accelerated container for FastAPI API & Celery GPU Workers
# Base: NVIDIA CUDA 12.1 Runtime on Ubuntu 22.04 with PyTorch FP16 support
# Deployable on: RunPod, Modal, AWS EC2 (G4/G5), GCP Compute Engine, Kubernetes
# ─────────────────────────────────────────────────────────────────────────────

FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04 AS base

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility

WORKDIR /app

# Install system dependencies (Python 3.10/3.11, OpenCV libs, FFmpeg, Tesseract OCR)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 \
    python3.10-dev \
    python3.10-distutils \
    python3-pip \
    build-essential \
    curl \
    git \
    ffmpeg \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-hin \
    && rm -rf /var/lib/apt/lists/*

# Set default python alias
RUN ln -sf /usr/bin/python3.10 /usr/bin/python

# Upgrade pip
RUN python -m pip install --upgrade pip setuptools wheel

# Install PyTorch with CUDA 12.1 acceleration first for layer caching
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# Copy and install python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install -r requirements.txt

# Copy backend codebase
COPY backend/ ./backend/
COPY scripts/ ./scripts/

# Create persistent storage mount points and cache dirs
RUN mkdir -p \
    /app/backend/storage/jobs \
    /app/backend/storage/image_jobs \
    /app/backend/storage/pdf_jobs \
    /app/backend/storage/background_jobs \
    /app/backend/storage/temp \
    /app/backend/models/weights \
    /tmp/bellix_cache

ENV TEMP=/app/backend/storage/temp \
    TMP=/app/backend/storage/temp \
    STORAGE_ROOT=/app/backend/storage \
    PORT=8000

# Pre-download models during build or model warm-up (Optional offline build)
# RUN python scripts/download_models.py

EXPOSE 8000

# Healthcheck endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Default entrypoint starts the FastAPI server
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
