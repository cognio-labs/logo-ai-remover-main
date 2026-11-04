/**
 * imageRemoverApi.ts
 * Client for the local Flask watermark-removal backend.
 *
 * Endpoints used:
 *   POST /api/image/upload   → { job_id, batch_id, status }
 *   GET  /api/image/status/:job_id → { status, progress, error }
 *   GET  /api/image/result/:job_id → PNG blob (when status === "completed")
 *   GET  /api/image/download/:job_id → download
 */

const API_BASE =
  (typeof import.meta !== "undefined" &&
    (import.meta as Record<string, unknown>).env &&
    ((import.meta as Record<string, unknown>).env as Record<string, string>)
      .VITE_IMAGE_API_URL) ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://watermark-backend-weld.vercel.app");

export interface ImageJob {
  job_id: string;
  batch_id: string | null;
  filename: string | null;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  error: string | null;
}

export interface UploadResult {
  job_id: string;
  batch_id: string;
  status: string;
}

/**
 * Upload a single image for watermark removal.
 * @param file     The image File object
 * @param box      Optional pixel box [x, y, w, h] for manual watermark region
 */
export async function uploadImageForCleaning(
  file: File,
  box?: [number, number, number, number]
): Promise<UploadResult> {
  const fd = new FormData();
  fd.append("image", file);
  if (box) fd.append("box", box.join(","));

  const res = await fetch(`${API_BASE}/api/image/upload`, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) {
    let msg = `Upload failed (${res.status})`;
    try {
      const json = await res.json();
      if (json.error) msg = json.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<UploadResult>;
}

/**
 * Poll job status until completed or failed.
 * Returns the final ImageJob object.
 * Calls onProgress on every tick.
 */
export async function pollJobStatus(
  jobId: string,
  onProgress: (job: ImageJob) => void,
  intervalMs = 1200,
  signal?: AbortSignal
): Promise<ImageJob> {
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      if (signal?.aborted) {
        return reject(new Error("Cancelled"));
      }
      try {
        const res = await fetch(`${API_BASE}/api/image/status/${jobId}`, {
          signal,
        });
        if (!res.ok) throw new Error(`Status poll failed (${res.status})`);
        const job: ImageJob = await res.json();
        onProgress(job);
        if (job.status === "completed" || job.status === "failed") {
          resolve(job);
        } else {
          timer = setTimeout(check, intervalMs);
        }
      } catch (err) {
        if (signal?.aborted) {
          reject(new Error("Cancelled"));
        } else {
          reject(err);
        }
      }
    };

    check();
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new Error("Cancelled"));
    });
  });
}

/**
 * Fetch the cleaned image as a Blob URL.
 */
export async function fetchCleanedImageUrl(jobId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/image/result/${jobId}`);
  if (!res.ok) throw new Error(`Could not fetch result (${res.status})`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/**
 * Return the download URL for a completed job.
 */
export function getDownloadUrl(jobId: string): string {
  return `${API_BASE}/api/image/download/${jobId}`;
}

/**
 * Check if the Flask backend is reachable.
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

