/**
 * ==========================================================================
 * app.js — Bellix Labs Video Watermark Remover Frontend Application
 * ==========================================================================
 * Handles:
 *   1. Drag-and-drop / click-to-upload video files
 *   2. Canvas-based mask painting (brush tool with undo)
 *   3. Mask submission and background processing initiation
 *   4. Progress polling via /status endpoint
 *   5. Download link generation on completion
 *
 * Security:
 *   - All DOM manipulation uses safe APIs (createElement, textContent, etc.)
 *   - No innerHTML, outerHTML, or document.write usage
 *   - File type validation is performed client-side as a UX convenience;
 *     the server performs authoritative validation.
 * ==========================================================================
 */

"use strict";

/* -------------------------------------------------------------------------
 * DOM Element References
 * ------------------------------------------------------------------------- */
const elements = {
    // Sections
    sectionUpload:   document.getElementById("section-upload"),
    sectionMask:     document.getElementById("section-mask"),
    sectionStatus:   document.getElementById("section-status"),
    sectionDownload: document.getElementById("section-download"),

    // Upload
    uploadZone:        document.getElementById("upload-zone"),
    uploadZoneContent: document.getElementById("upload-zone-content"),
    uploadProgress:    document.getElementById("upload-progress"),
    uploadStatusText:  document.getElementById("upload-status-text"),
    fileInput:         document.getElementById("file-input"),

    // Canvas / Video
    canvasContainer: document.getElementById("canvas-container"),
    videoFrame:      document.getElementById("video-frame"),
    canvasMask:      document.getElementById("canvas-mask"),

    // Video Controls
    videoControls: document.getElementById("video-controls"),
    btnPlayPause:  document.getElementById("btn-play-pause"),
    videoSlider:   document.getElementById("video-slider"),
    videoTime:     document.getElementById("video-time"),

    // Toolbar
    brushSize:      document.getElementById("brush-size"),
    brushSizeValue: document.getElementById("brush-size-value"),
    btnUndo:        document.getElementById("btn-undo"),
    btnClear:       document.getElementById("btn-clear"),

    // Actions
    fileLogo: document.getElementById("file-logo"),
    logoPreviewContainer: document.getElementById("logo-preview-container"),
    logoPreview: document.getElementById("logo-preview"),
    btnClearLogo: document.getElementById("btn-clear-logo"),
    selectAlgorithm: document.getElementById("select-algorithm"),
    toggleEnhance: document.getElementById("toggle-enhance"),
    btnProcess:  document.getElementById("btn-process"),
    btnDownload: document.getElementById("btn-download"),
    btnNew:      document.getElementById("btn-new"),

    // Progress
    progressBarFill: document.getElementById("progress-bar-fill"),
    progressText:    document.getElementById("progress-text"),
    progressDetail:  document.getElementById("progress-detail"),

    // Toast
    toastError:   document.getElementById("toast-error"),
    toastMessage: document.getElementById("toast-message"),
    toastClose:   document.getElementById("toast-close"),
};


/* -------------------------------------------------------------------------
 * Application State
 * ------------------------------------------------------------------------- */
const state = {
    taskId: null,               // Current task UUID from the server
    isDrawing: false,           // Whether the user is currently painting
    brushSize: 20,              // Current brush radius in pixels
    maskHistory: [],            // Array of ImageData snapshots for undo
    maxHistorySize: 30,         // Maximum number of undo steps
    pollInterval: null,         // setInterval ID for status polling
};

// Accepted video MIME types (client-side pre-validation)
const ACCEPTED_TYPES = new Set([
    "video/mp4",
    "video/avi",
    "video/x-msvideo",
    "video/quicktime",
    "video/x-matroska",
    "video/webm",
]);

// Accepted file extensions (fallback if MIME type is missing)
const ACCEPTED_EXTENSIONS = new Set([".mp4", ".avi", ".mov", ".mkv", ".webm"]);

// Maximum file size in bytes (100 MB)
const MAX_FILE_SIZE = 100 * 1024 * 1024;


/* -------------------------------------------------------------------------
 * Initialization
 * ------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", init);

function init() {
    setupUploadZone();
    setupToolbar();
    setupCanvasEvents();
    setupVideoControls();
    setupActionButtons();
    setupToast();
}


/* =========================================================================
 * 1. UPLOAD HANDLING
 * ========================================================================= */

function setupUploadZone() {
    const zone = elements.uploadZone;
    const input = elements.fileInput;
    if (!zone || !input) return;

    // Click to open file dialog
    zone.addEventListener("click", () => input.click());

    // Keyboard accessibility
    zone.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            input.click();
        }
    });

    // File selected via dialog
    input.addEventListener("change", () => {
        if (input.files && input.files.length > 0) {
            handleFileUpload(input.files[0]);
        }
    });

    // --- Drag-and-drop events ---
    zone.addEventListener("dragenter", (e) => {
        e.preventDefault();
        zone.classList.add("upload-zone--dragover");
    });

    zone.addEventListener("dragover", (e) => {
        e.preventDefault();
        zone.classList.add("upload-zone--dragover");
    });

    zone.addEventListener("dragleave", (e) => {
        e.preventDefault();
        zone.classList.remove("upload-zone--dragover");
    });

    zone.addEventListener("drop", (e) => {
        e.preventDefault();
        zone.classList.remove("upload-zone--dragover");

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    // --- Logo Upload Listeners (if present) ---
    if (elements.fileLogo) {
        elements.fileLogo.addEventListener("change", (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                const url = URL.createObjectURL(file);
                if (elements.logoPreview) elements.logoPreview.src = url;
                if (elements.logoPreviewContainer) elements.logoPreviewContainer.hidden = false;
            }
        });
    }

    if (elements.btnClearLogo) {
        elements.btnClearLogo.addEventListener("click", () => {
            if (elements.fileLogo) elements.fileLogo.value = "";
            if (elements.logoPreviewContainer) elements.logoPreviewContainer.hidden = true;
            if (elements.logoPreview) elements.logoPreview.src = "";
        });
    }
}


/**
 * Validate and upload a video file to the backend.
 *
 * @param {File} file - The video file to upload.
 */
async function handleFileUpload(file) {
    const ext = "." + file.name.split(".").pop().toLowerCase();

    if (!ACCEPTED_TYPES.has(file.type) && !ACCEPTED_EXTENSIONS.has(ext)) {
        showError("Unsupported file type. Please upload MP4, AVI, MOV, MKV, or WebM.");
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
        showError("File is too large. Maximum size is 100 MB.");
        return;
    }

    // --- Show upload progress UI ---
    if (elements.uploadZoneContent) elements.uploadZoneContent.hidden = true;
    if (elements.uploadProgress) elements.uploadProgress.hidden = false;
    if (elements.uploadStatusText) elements.uploadStatusText.textContent = "Uploading…";

    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/upload", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || "Upload failed.");
        }

        const data = await response.json();
        state.taskId = data.task_id;

        if (elements.uploadStatusText) elements.uploadStatusText.textContent = "Loading preview…";

        // Load the video into the player
        await loadVideoPlayer(state.taskId);

        // Transition to the mask editor step
        showSection("mask");

    } catch (err) {
        showError(err.message || "Failed to upload video.");
        if (elements.uploadZoneContent) elements.uploadZoneContent.hidden = false;
        if (elements.uploadProgress) elements.uploadProgress.hidden = true;
    }
}


/**
 * Fetch the uploaded video and load it into the video player.
 *
 * @param {string} taskId - The task UUID.
 */
function loadVideoPlayer(taskId) {
    return new Promise((resolve, reject) => {
        const video = elements.videoFrame;
        if (!video) {
            resolve();
            return;
        }

        video.onloadedmetadata = () => {
            const maskCanvas = elements.canvasMask;
            if (maskCanvas) {
                maskCanvas.width = video.videoWidth;
                maskCanvas.height = video.videoHeight;

                const maskCtx = maskCanvas.getContext("2d");
                maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
                saveMaskState();
            }

            resolve();
        };

        video.onerror = () => {
            reject(new Error("Failed to load video preview."));
        };

        video.src = "/video/" + encodeURIComponent(taskId);
    });
}


/* =========================================================================
 * 1.5 VIDEO CONTROLS
 * ========================================================================= */

function setupVideoControls() {
    const video = elements.videoFrame;
    const playBtn = elements.btnPlayPause;
    const slider = elements.videoSlider;
    const timeDisplay = elements.videoTime;

    if (!video || !playBtn) return;

    playBtn.addEventListener("click", () => {
        if (video.paused || video.ended) {
            video.play();
        } else {
            video.pause();
        }
    });

    video.addEventListener("play", () => playBtn.textContent = "⏸ Pause");
    video.addEventListener("pause", () => playBtn.textContent = "▶ Play");

    const formatTime = (timeInSeconds) => {
        if (isNaN(timeInSeconds)) return "0:00";
        const m = Math.floor(timeInSeconds / 60);
        const s = Math.floor(timeInSeconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    video.addEventListener("timeupdate", () => {
        if (!video.duration) return;
        const progress = (video.currentTime / video.duration) * 100;
        if (slider) slider.value = progress;
        if (timeDisplay) timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
    });

    if (slider) {
        slider.addEventListener("input", (e) => {
            if (!video.duration) return;
            const seekTime = (e.target.value / 100) * video.duration;
            video.currentTime = seekTime;
        });
    }

    video.addEventListener("loadedmetadata", () => {
        if (timeDisplay) timeDisplay.textContent = `0:00 / ${formatTime(video.duration)}`;
        if (elements.videoControls) elements.videoControls.hidden = false;
    });
}

/* =========================================================================
 * 2. CANVAS MASK PAINTING
 * ========================================================================= */

function setupCanvasEvents() {
    const canvas = elements.canvasMask;
    if (!canvas) return;

    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseleave", stopDrawing);

    canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        startDrawing(touchToMouseEvent(touch, canvas));
    });

    canvas.addEventListener("touchmove", (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        draw(touchToMouseEvent(touch, canvas));
    });

    canvas.addEventListener("touchend", (e) => {
        e.preventDefault();
        stopDrawing();
    });
}


function touchToMouseEvent(touch, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
        offsetX: (touch.clientX - rect.left) * (canvas.width / rect.width),
        offsetY: (touch.clientY - rect.top) * (canvas.height / rect.height),
    };
}


function startDrawing(e) {
    state.isDrawing = true;
    saveMaskState();
    draw(e);
}


function draw(e) {
    if (!state.isDrawing) return;

    const canvas = elements.canvasMask;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let x, y;
    if (e instanceof MouseEvent) {
        x = e.offsetX * scaleX;
        y = e.offsetY * scaleY;
    } else {
        x = e.offsetX;
        y = e.offsetY;
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(255, 60, 80, 0.45)";
    ctx.beginPath();
    ctx.arc(x, y, state.brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
}


function stopDrawing() {
    state.isDrawing = false;
}


function saveMaskState() {
    const canvas = elements.canvasMask;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return;

    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    state.maskHistory.push(imageData);

    if (state.maskHistory.length > state.maxHistorySize) {
        state.maskHistory.shift();
    }
}


function undoMask() {
    if (state.maskHistory.length <= 1) return;

    state.maskHistory.pop();
    const previousState = state.maskHistory[state.maskHistory.length - 1];
    if (elements.canvasMask) {
        const ctx = elements.canvasMask.getContext("2d");
        ctx.putImageData(previousState, 0, 0);
    }
}


function clearMask() {
    const canvas = elements.canvasMask;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    state.maskHistory = [];
    saveMaskState();
}


function exportMaskAsBlob() {
    return new Promise((resolve, reject) => {
        const sourceCanvas = elements.canvasMask;
        if (!sourceCanvas) {
            reject(new Error("Canvas not found"));
            return;
        }
        const ctx = sourceCanvas.getContext("2d");
        const imageData = ctx.getImageData(
            0, 0, sourceCanvas.width, sourceCanvas.height
        );

        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = sourceCanvas.width;
        maskCanvas.height = sourceCanvas.height;
        const maskCtx = maskCanvas.getContext("2d");

        maskCtx.fillStyle = "#000000";
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

        const maskImageData = maskCtx.getImageData(
            0, 0, maskCanvas.width, maskCanvas.height
        );
        const src = imageData.data;
        const dst = maskImageData.data;

        for (let i = 0; i < src.length; i += 4) {
            if (src[i + 3] > 0) {
                dst[i]     = 255;
                dst[i + 1] = 255;
                dst[i + 2] = 255;
                dst[i + 3] = 255;
            }
        }

        maskCtx.putImageData(maskImageData, 0, 0);

        maskCanvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error("Failed to export mask as PNG."));
            }
        }, "image/png");
    });
}


/* =========================================================================
 * 3. TOOLBAR CONTROLS
 * ========================================================================= */

function setupToolbar() {
    if (elements.brushSize) {
        elements.brushSize.addEventListener("input", () => {
            state.brushSize = parseInt(elements.brushSize.value, 10);
            if (elements.brushSizeValue) {
                elements.brushSizeValue.textContent = state.brushSize + "px";
            }
        });
    }

    if (elements.btnUndo) elements.btnUndo.addEventListener("click", undoMask);
    if (elements.btnClear) elements.btnClear.addEventListener("click", clearMask);
}


/* =========================================================================
 * 4. PROCESS AND POLLING
 * ========================================================================= */

function setupActionButtons() {
    if (elements.btnProcess) elements.btnProcess.addEventListener("click", startProcessing);
    if (elements.btnNew) elements.btnNew.addEventListener("click", resetApp);
}


async function startProcessing() {
    if (!state.taskId) {
        showError("No video uploaded. Please upload a video first.");
        return;
    }

    if (elements.btnProcess) elements.btnProcess.disabled = true;

    try {
        const maskBlob = await exportMaskAsBlob();

        const hasContent = await maskHasContent();
        if (!hasContent) {
            showError("Please paint over the watermark area before processing.");
            if (elements.btnProcess) elements.btnProcess.disabled = false;
            return;
        }

        const formData = new FormData();
        formData.append("task_id", state.taskId);
        formData.append("mask", maskBlob, "mask.png");
        formData.append("enhance", elements.toggleEnhance ? elements.toggleEnhance.checked : false);
        formData.append("inpaint_mode", elements.selectAlgorithm ? elements.selectAlgorithm.value : "telea");

        if (elements.fileLogo && elements.fileLogo.files && elements.fileLogo.files.length > 0) {
            formData.append("logo", elements.fileLogo.files[0]);
        }

        const response = await fetch("/process", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || "Failed to start processing.");
        }

        showSection("status");
        startPolling();

    } catch (err) {
        showError(err.message || "Failed to start processing.");
        if (elements.btnProcess) elements.btnProcess.disabled = false;
    }
}


function maskHasContent() {
    return new Promise((resolve) => {
        const canvas = elements.canvasMask;
        if (!canvas) {
            resolve(false);
            return;
        }
        const ctx = canvas.getContext("2d");
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 0) {
                resolve(true);
                return;
            }
        }
        resolve(false);
    });
}


function startPolling() {
    if (state.pollInterval) {
        clearInterval(state.pollInterval);
    }
    pollStatus();
    state.pollInterval = setInterval(pollStatus, 1500);
}


async function pollStatus() {
    if (!state.taskId) return;

    try {
        const response = await fetch("/status/" + encodeURIComponent(state.taskId));
        if (!response.ok) throw new Error("Failed to fetch status.");

        const data = await response.json();

        const progress = Math.min(Math.max(data.progress || 0, 0), 100);
        if (elements.progressBarFill) elements.progressBarFill.style.width = progress + "%";
        if (elements.progressText) elements.progressText.textContent = progress + "%";

        if (data.status === "processing" && elements.progressDetail) {
            if (progress < 10) {
                elements.progressDetail.textContent = "Extracting frames and audio…";
            } else if (progress < 85) {
                elements.progressDetail.textContent = "Running AI inpainting on video frames…";
            } else {
                elements.progressDetail.textContent = "Reassembling video…";
            }
        }

        if (data.status === "complete") {
            clearInterval(state.pollInterval);
            state.pollInterval = null;

            if (elements.btnDownload) {
                elements.btnDownload.href = "/download/" + encodeURIComponent(state.taskId);
            }
            showSection("download");
        }

        if (data.status === "error") {
            clearInterval(state.pollInterval);
            state.pollInterval = null;
            showError(data.error || "Processing failed. Please try again.");
            showSection("mask");
            if (elements.btnProcess) elements.btnProcess.disabled = false;
        }

    } catch (err) {
        // Keep polling on transient errors
    }
}


/* =========================================================================
 * 5. UI HELPERS
 * ========================================================================= */

function showSection(sectionName) {
    const sectionMap = {
        upload:   elements.sectionUpload,
        mask:     elements.sectionMask,
        status:   elements.sectionStatus,
        download: elements.sectionDownload,
    };

    for (const [name, el] of Object.entries(sectionMap)) {
        if (!el) continue;
        if (name === sectionName) {
            el.classList.remove("step-section--hidden");
            el.style.animation = "none";
            void el.offsetHeight;
            el.style.animation = "";
        } else {
            el.classList.add("step-section--hidden");
        }
    }
}


function showError(message) {
    if (elements.toastMessage) elements.toastMessage.textContent = message;
    if (elements.toastError) {
        elements.toastError.hidden = false;
        setTimeout(() => {
            elements.toastError.hidden = true;
        }, 6000);
    }
}


function setupToast() {
    if (elements.toastClose) {
        elements.toastClose.addEventListener("click", () => {
            if (elements.toastError) elements.toastError.hidden = true;
        });
    }
}


function resetApp() {
    if (state.pollInterval) {
        clearInterval(state.pollInterval);
        state.pollInterval = null;
    }

    state.taskId = null;
    state.maskHistory = [];
    state.pollInterval = null;

    if (elements.uploadZoneContent) elements.uploadZoneContent.hidden = false;
    if (elements.uploadProgress) elements.uploadProgress.hidden = true;
    if (elements.fileInput) elements.fileInput.value = "";

    if (elements.progressBarFill) elements.progressBarFill.style.width = "0%";
    if (elements.progressText) elements.progressText.textContent = "Initializing…";
    
    if (elements.videoControls) elements.videoControls.hidden = true;
    if (elements.btnProcess) elements.btnProcess.disabled = false;

    showSection("upload");
}

