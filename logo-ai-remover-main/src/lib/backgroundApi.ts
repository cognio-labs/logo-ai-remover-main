/**
 * Client-Side API Connector for Real Production AI Background Remover
 * Communicates with FastAPI backend on /api/v1/background or /api/background
 */

export type BackgroundType = "transparent" | "color" | "image" | "backdrop";
export type QualityMode = "standard" | "fast" | "ultra_hd";
export type ExportFormat = "png" | "jpg" | "webp";

export interface ShadowConfig {
  enabled: boolean;
  offset_x?: number;
  offset_y?: number;
  blur?: number;
  opacity?: number;
}

export interface BackgroundOptions {
  bg_type?: BackgroundType;
  bg_color?: string;
  backdrop_id?: string;
  quality_mode?: QualityMode;
  export_format?: ExportFormat;
  edge_refinement?: boolean;
  color_decontamination?: boolean;
  shadow?: ShadowConfig;
  jobId?: string;
}

export interface ManualStroke {
  mode: "keep" | "remove";
  points: [number, number][]; // normalized [0, 1]
  brush_size: number;
}

export interface BackgroundJobMetadata {
  width: number;
  height: number;
  channels: number;
  format: string;
  size_bytes: number;
}

export interface BackgroundJobResponse {
  id: string;
  status: "created" | "validating" | "preparing" | "segmenting" | "refining" | "compositing" | "verifying" | "completed" | "failed";
  progress: number;
  stage: string;
  message: string;
  original_filename: string;
  result_path?: string;
  preview_path?: string;
  mask_path?: string;
  original_metadata?: BackgroundJobMetadata;
  result_metadata?: BackgroundJobMetadata;
  processing_time_ms: number;
  error?: string;
}

export interface DirectRemovalResult {
  job_id: string;
  status: string;
  width: number;
  height: number;
  processing_time_ms: number;
  preview_url: string;
  result_url: string;
  mask_url: string;
}

const API_BASE = "/api/v1";

/**
 * Direct synchronous background removal
 */
export async function removeBackgroundDirect(
  file: File | Blob,
  fileName = "image.png",
  options: BackgroundOptions = {}
): Promise<DirectRemovalResult> {
  const formData = new FormData();
  formData.append("image", file, fileName);
  formData.append("bg_type", options.bg_type || "transparent");
  formData.append("bg_color", options.bg_color || "#FFFFFF");
  formData.append("backdrop_id", options.backdrop_id || "luxury-studio");
  formData.append("quality_mode", options.quality_mode || "standard");
  formData.append("export_format", options.export_format || "png");
  formData.append("edge_refinement", String(options.edge_refinement ?? true));
  formData.append("color_decontamination", String(options.color_decontamination ?? true));
  formData.append("shadow_enabled", String(options.shadow?.enabled ?? false));
  formData.append("shadow_opacity", String(options.shadow?.opacity ?? 0.35));

  const res = await fetch(`${API_BASE}/background/remove`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Server error: ${res.status}`);
  }

  return res.json();
}

/**
 * Async background removal job
 */
export async function createBackgroundJob(
  file: File | Blob,
  fileName = "image.png",
  options: BackgroundOptions = {}
): Promise<BackgroundJobResponse> {
  const formData = new FormData();
  formData.append("image", file, fileName);
  formData.append("bg_type", options.bg_type || "transparent");
  formData.append("bg_color", options.bg_color || "#FFFFFF");
  formData.append("backdrop_id", options.backdrop_id || "luxury-studio");
  formData.append("quality_mode", options.quality_mode || "standard");
  formData.append("export_format", options.export_format || "png");
  formData.append("edge_refinement", String(options.edge_refinement ?? true));
  formData.append("color_decontamination", String(options.color_decontamination ?? true));
  formData.append("shadow_enabled", String(options.shadow?.enabled ?? false));
  formData.append("shadow_opacity", String(options.shadow?.opacity ?? 0.35));
  if (options.jobId) {
    formData.append("jobId", options.jobId);
  }

  const res = await fetch(`${API_BASE}/background/process`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Upload failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Poll background job until complete or failed
 */
export async function pollBackgroundJob(
  jobId: string,
  onProgress?: (job: BackgroundJobResponse) => void,
  intervalMs = 400,
  maxTimeoutMs = 120000
): Promise<BackgroundJobResponse> {
  const start = Date.now();

  while (Date.now() - start < maxTimeoutMs) {
    const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
      headers: { "Cache-Control": "no-cache" },
    });

    if (!res.ok) {
      throw new Error(`Failed to check job status: ${res.status}`);
    }

    const job: BackgroundJobResponse = await res.json();
    if (onProgress) {
      onProgress(job);
    }

    if (job.status === "completed") {
      return job;
    }

    if (job.status === "failed") {
      throw new Error(job.error || "Background removal failed");
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error("Job processing timed out");
}

/**
 * Re-composite background live without re-segmenting
 */
export async function recompositeBackground(
  jobId: string,
  options: BackgroundOptions
): Promise<{ status: string; job_id: string; preview_url: string; download_url: string }> {
  const payload = {
    job_id: jobId,
    config: {
      bg_type: options.bg_type || "transparent",
      bg_color: options.bg_color || "#FFFFFF",
      backdrop_id: options.backdrop_id || "luxury-studio",
      export_format: options.export_format || "png",
      quality_mode: options.quality_mode || "standard",
      edge_refinement: options.edge_refinement ?? true,
      color_decontamination: options.color_decontamination ?? true,
      shadow: options.shadow || { enabled: false, offset_x: 0, offset_y: 15, blur: 25, opacity: 0.35 },
    },
  };

  const res = await fetch(`${API_BASE}/background/composite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Re-composite error: ${res.status}`);
  }

  return res.json();
}

/**
 * Apply manual brush refine strokes (keep/remove)
 */
export async function refineMaskStrokes(
  jobId: string,
  strokes: ManualStroke[],
  edgeRefine = true
): Promise<{ status: string; job_id: string; preview_url: string; mask_url: string }> {
  const payload = {
    job_id: jobId,
    strokes,
    edge_refine: edgeRefine,
  };

  const res = await fetch(`${API_BASE}/background/refine`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Refine error: ${res.status}`);
  }

  return res.json();
}

export function getDownloadUrl(jobId: string, format?: string): string {
  return format ? `${API_BASE}/jobs/${jobId}/download?format=${format}` : `${API_BASE}/jobs/${jobId}/download`;
}

export function getPreviewUrl(jobId: string): string {
  return `${API_BASE}/jobs/${jobId}/preview`;
}

export function getMaskUrl(jobId: string): string {
  return `${API_BASE}/jobs/${jobId}/mask`;
}
