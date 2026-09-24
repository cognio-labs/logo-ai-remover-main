export type VideoMetadata = {
  width: number;
  height: number;
  fps: number;
  duration: number;
  frameCount: number;
  hasAudio: boolean;
  videoCodec?: string | null;
  audioCodec?: string | null;
};

export type UploadResult = {
  success: boolean;
  jobId: string;
  job_id?: string;
  status: string;
  originalVideoUrl?: string;
  metadata?: VideoMetadata;
  filename?: string;
  width?: number;
  height?: number;
  fps?: number;
  duration?: number;
};

export type JobStatus = {
  jobId: string;
  job_id?: string;
  status:
    | "idle"
    | "uploading"
    | "uploaded"
    | "queued"
    | "analyzing"
    | "detecting"
    | "tracking"
    | "generating_preview"
    | "processing"
    | "encoding"
    | "verifying"
    | "completed"
    | "failed"
    | "cancelled"
    | string;
  progress: number;
  stage: string;
  message: string;
  processedFrames?: number;
  totalFrames?: number;
  hasPreview?: boolean;
  previewUrl?: string | null;
  preview_url?: string | null;
  outputs?: Record<string, string>;
  error?: string | null;
};

export type VideoResult = {
  success: boolean;
  jobId: string;
  status: "completed" | string;
  originalVideoUrl: string;
  cleanedVideoUrl: string;
  metadata: VideoMetadata;
  resultVersion: number;
  downloadUrls?: Record<string, string>;
};

const API_ORIGIN = (import.meta.env.VITE_VIDEO_API_URL as string | undefined)?.replace(/\/$/u, "") ?? "";

export const apiUrl = (path: string) => `${API_ORIGIN}${path}`;

/**
 * Section D Compliant Centralized API Request Helper.
 * Handles HTTP 400, 413, 415, 422, 500, connection errors, and JSON/non-JSON payloads safely.
 */
async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  let bodyData: any = null;
  let rawText = "";

  try {
    if (isJson) {
      bodyData = await response.json();
    } else {
      rawText = await response.text();
    }
  } catch (err) {
    throw new Error(`Failed to read response from server (${response.status}): ${err instanceof Error ? err.message : String(err)}`);
  }

  if (response.ok) {
    return (bodyData !== null ? bodyData : { text: rawText }) as T;
  }

  // Extract clean error message from structured JSON or raw text
  let errorMessage = "";
  if (bodyData && typeof bodyData === "object") {
    if (bodyData.error?.message) {
      errorMessage = bodyData.error.message;
    } else if (bodyData.detail) {
      errorMessage = typeof bodyData.detail === "string" ? bodyData.detail : JSON.stringify(bodyData.detail);
    } else if (bodyData.message) {
      errorMessage = bodyData.message;
    }
  }

  if (!errorMessage && rawText) {
    errorMessage = rawText.slice(0, 300);
  }

  if (!errorMessage) {
    switch (response.status) {
      case 400:
        errorMessage = "Invalid video request. Please verify the video file.";
        break;
      case 413:
        errorMessage = "Video file is too large. Maximum supported size is 500 MB.";
        break;
      case 415:
        errorMessage = "Unsupported video format. Please upload MP4, MOV, WebM, AVI, or MKV.";
        break;
      case 422:
        errorMessage = "Video validation failed. The video stream could not be decoded.";
        break;
      case 500:
        errorMessage = "Internal server processing error. Please retry in a moment.";
        break;
      default:
        errorMessage = `Server returned HTTP ${response.status}`;
    }
  }

  throw new Error(errorMessage);
}

/**
 * Safe fetch wrapper that handles network drops and timeouts
 */
async function safeFetch<T>(url: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, init);
    return await parseResponse<T>(res);
  } catch (err) {
    if (err instanceof TypeError && err.message.includes("fetch")) {
      throw new Error("Cannot connect to video processing service. Ensure the backend server is running.");
    }
    throw err;
  }
}

export async function uploadVideo(file: File, jobId: string, signal?: AbortSignal): Promise<UploadResult> {
  const form = new FormData();
  // Field name MUST be "file" to match FastAPI UploadFile parameter exactly
  form.append("file", file, file.name);
  form.append("jobId", jobId);
  form.append("job_id", jobId);

  // DO NOT set Content-Type header manually when sending FormData; browser auto-sets boundary
  return safeFetch<UploadResult>(apiUrl("/api/video-watermark/upload"), {
    method: "POST",
    body: form,
    cache: "no-store",
    signal,
  });
}

export async function processVideo(jobId: string, signal?: AbortSignal) {
  return safeFetch<{ success: boolean; jobId: string; status: "queued" }>(
    apiUrl("/api/video-watermark/process"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
      cache: "no-store",
      signal,
    },
  );
}

export async function getVideoStatus(jobId: string, signal?: AbortSignal): Promise<JobStatus> {
  return safeFetch<JobStatus>(
    apiUrl(`/api/video-watermark/status/${encodeURIComponent(jobId)}?t=${Date.now()}`),
    {
      cache: "no-store",
      signal,
    },
  );
}

export async function cancelVideoJob(jobId: string, signal?: AbortSignal) {
  return safeFetch<{ success: boolean; jobId: string; status: "cancelled" }>(
    apiUrl(`/api/video-watermark/cancel/${encodeURIComponent(jobId)}`),
    {
      method: "POST",
      cache: "no-store",
      signal,
    },
  );
}

export async function getVideoResult(jobId: string, signal?: AbortSignal): Promise<VideoResult> {
  return safeFetch<VideoResult>(
    apiUrl(`/api/video-watermark/result/${encodeURIComponent(jobId)}?t=${Date.now()}`),
    {
      cache: "no-store",
      signal,
    },
  );
}

export function getDownloadUrl(jobId: string, quality?: "720p" | "1080p" | "4k") {
  const query = quality ? `/${quality}` : "";
  return apiUrl(`/api/video-watermark/download/${encodeURIComponent(jobId)}${query}`);
}

