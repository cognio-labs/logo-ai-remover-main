/**
 * Video Enhancer API Client
 * Connects directly to the real FastAPI backend on /api/v1/video.
 * Prohibits fake progress, setTimeout animations, and mock placeholders.
 */

export interface VideoStreamMetadata {
  width: number;
  height: number;
  fps: number;
  duration: number;
  frame_count: number;
  pixel_format: string | null;
  video_codec: string | null;
  audio_codec: string | null;
  audio_present: boolean;
  sample_rate: number | null;
  channels: number | null;
  file_size_bytes: number;
  bitrate: number | null;
}

export interface VideoEnhanceOptions {
  scale: number;
  target_resolution: string;
  enhancement: string;
  denoise: string;
  deblock: boolean;
  sharpen: string;
  interpolation: boolean;
  target_fps?: number | null;
  output_format: string;
  codec: string;
  quality: string;
  preserve_audio: boolean;
}

export interface VideoEnhancerJobRecord {
  id: string;
  status:
    | "QUEUED"
    | "VALIDATING"
    | "PROBING"
    | "EXTRACTING"
    | "ENHANCING"
    | "UPSCALING"
    | "INTERPOLATING"
    | "ENCODING"
    | "VALIDATING_OUTPUT"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED";
  stage: string;
  message: string;
  progress: number;
  current_frame: number;
  total_frames: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  original_filename: string;
  original_path: string;
  original_mime: string;
  original_size_bytes: number;
  input_metadata: VideoStreamMetadata | null;
  target_metadata: {
    target_width: number;
    target_height: number;
    target_scale: number;
    codec: string;
  } | null;
  options: VideoEnhanceOptions;
  result_path: string | null;
  preview_path: string | null;
  output_metadata: VideoStreamMetadata | null;
  error: string | null;
  cancelled: boolean;
}

export interface UploadVideoResponse {
  job_id: string;
  status: string;
  filename: string;
  size_bytes: number;
  metadata: VideoStreamMetadata;
  preview_url: string | null;
  original_url: string;
}

export interface VideoInspectionResponse {
  job_id: string;
  source_resolution: string;
  target_resolution: string;
  target_width: number;
  target_height: number;
  scale: number;
  aspect_ratio: number;
  source_fps: number;
  safe: boolean;
  warning: string | null;
  max_supported_resolution: string;
}

export interface VideoCapabilitiesResponse {
  max_upload_mb: number;
  supported_scales: number[];
  supported_resolutions: string[];
  supported_codecs: string[];
  supported_fps: number[];
  supported_containers: string[];
  features: {
    super_resolution: boolean;
    denoise: boolean;
    deblock: boolean;
    sharpen: boolean;
    optical_flow_interpolation: boolean;
    audio_preservation: boolean;
    realtime_sse: boolean;
  };
}
const API_ORIGIN = ((import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.VITE_VIDEO_API_URL || "")?.replace(/\/$/u, "") ?? "";
const API_BASE = `${API_ORIGIN}/api/v1/video`;

/**
 * Uploads a video file and receives true FFprobe metadata & thumbnail preview.
 */
export async function uploadVideo(
  file: File,
  jobId?: string,
  onProgress?: (percent: number) => void
): Promise<UploadVideoResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (jobId) {
    formData.append("jobId", jobId);
  }

  // Use XMLHttpRequest to get upload progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/upload`);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch (e) {
          reject(new Error("Failed to parse upload response"));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData.detail || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Network error during video upload"));
    xhr.send(formData);
  });
}

/**
 * Previews target resolution and safety bounds before starting processing.
 */
export async function inspectVideoSettings(
  jobId: string,
  scale: number,
  targetResolution: string
): Promise<VideoInspectionResponse> {
  const res = await fetch(`${API_BASE}/inspect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      job_id: jobId,
      scale,
      target_resolution: targetResolution,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Inspection failed with status ${res.status}`);
  }

  return res.json();
}

/**
 * Starts the real AI video processing pipeline.
 */
export async function startVideoEnhancement(payload: {
  job_id: string;
  scale: number;
  target_resolution: string;
  enhancement: string;
  denoise: string;
  deblock: boolean;
  sharpen: string;
  interpolation: boolean;
  target_fps?: number | null;
  output_format: string;
  codec: string;
  quality: string;
  preserve_audio: boolean;
}): Promise<{ job_id: string; status: string; message: string; target_dimensions: string }> {
  const res = await fetch(`${API_BASE}/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to start processing: ${res.status}`);
  }

  return res.json();
}

/**
 * Polls or gets the current status of a job.
 */
export async function getJobStatus(jobId: string): Promise<VideoEnhancerJobRecord> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Job ${jobId} not found`);
  }
  return res.json();
}

/**
 * Subscribes to real-time Server-Sent Events (SSE) for live frame progress.
 */
export function subscribeJobEvents(
  jobId: string,
  onUpdate: (data: {
    job_id: string;
    status: string;
    stage: string;
    message: string;
    progress: number;
    current_frame: number;
    total_frames: number;
    output_metadata?: VideoStreamMetadata | null;
    error?: string | null;
  }) => void,
  onError?: (err: Event) => void
): () => void {
  const sseUrl = `${API_BASE}/jobs/${jobId}/events`;
  const eventSource = new EventSource(sseUrl);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onUpdate(data);
      if (data.status === "COMPLETED" || data.status === "FAILED" || data.status === "CANCELLED") {
        eventSource.close();
      }
    } catch (e) {
      console.error("SSE parse error", e);
    }
  };

  eventSource.onerror = (err) => {
    if (onError) onError(err);
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

/**
 * Cancels an ongoing processing job.
 */
export async function cancelJob(jobId: string): Promise<void> {
  await fetch(`${API_BASE}/jobs/${jobId}/cancel`, { method: "POST" });
}

/**
 * Deletes a job from storage.
 */
export async function deleteJob(jobId: string): Promise<void> {
  await fetch(`${API_BASE}/jobs/${jobId}`, { method: "DELETE" });
}

/**
 * Fetches server capabilities and supported features.
 */
export async function getVideoCapabilities(): Promise<VideoCapabilitiesResponse> {
  const res = await fetch(`${API_BASE}/capabilities`);
  if (!res.ok) {
    throw new Error("Failed to load capabilities");
  }
  return res.json();
}

/**
 * URL helpers for streaming video
 */
export function getOriginalVideoUrl(jobId: string): string {
  return `${API_BASE}/jobs/${jobId}/original`;
}

export function getEnhancedVideoUrl(jobId: string): string {
  return `${API_BASE}/jobs/${jobId}/enhanced`;
}

export function getDownloadResultUrl(jobId: string): string {
  return `${API_BASE}/jobs/${jobId}/result`;
}

export function getPreviewThumbnailUrl(jobId: string): string {
  return `${API_BASE}/jobs/${jobId}/preview`;
}
