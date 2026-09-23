export type ImageMetadata = {
  width: number;
  height: number;
  channels: number;
  format: string;
  size_bytes: number;
};

export type UpscaleJobStatus = {
  jobId: string;
  status: "queued" | "analyzing" | "upscaling" | "enhancing" | "encoding" | "verifying" | "completed" | "failed";
  progress: number;
  stage: string;
  message: string;
  error?: string | null;
};

export type UpscaleJobResult = {
  success: true;
  jobId: string;
  status: "completed";
  originalImageUrl: string;
  upscaledImageUrl: string;
  downloadUrl: string;
  metadata: {
    originalWidth: number;
    originalHeight: number;
    upscaledWidth: number;
    upscaledHeight: number;
    scale: number;
    mode: string;
    format: string;
    fileSizeBytes: number;
  };
  resultVersion: number;
};

const API_ORIGIN = ((import.meta as any).env?.VITE_IMAGE_API_URL as string | undefined)?.replace(/\/$/u, "") ?? "";

export const apiImageUrl = (path: string) => `${API_ORIGIN}${path}`;

async function parse<T>(response: Response): Promise<T> {
  if (response.ok) return (await response.json()) as T;
  let detail = `Request failed (${response.status})`;
  try {
    const payload = (await response.json()) as { detail?: string };
    if (payload.detail) detail = payload.detail;
  } catch {
    // Keep status fallback
  }
  throw new Error(detail);
}

export async function upscaleImage(
  file: File,
  scale: number,
  mode: string,
  outputFormat: string,
  jobId?: string,
  signal?: AbortSignal
): Promise<{ success: true; jobId: string; status: "queued" }> {
  const form = new FormData();
  form.append("image", file, file.name);
  form.append("scale", String(scale));
  form.append("mode", mode.toLowerCase());
  form.append("outputFormat", outputFormat.toLowerCase());
  if (jobId) form.append("jobId", jobId);

  return parse(
    await fetch(apiImageUrl("/api/image/upscale"), {
      method: "POST",
      body: form,
      cache: "no-store",
      signal,
    })
  );
}

export async function getImageStatus(jobId: string, signal?: AbortSignal): Promise<UpscaleJobStatus> {
  return parse<UpscaleJobStatus>(
    await fetch(apiImageUrl(`/api/image/status/${encodeURIComponent(jobId)}`), {
      cache: "no-store",
      signal,
    })
  );
}

export async function getImageResult(jobId: string, signal?: AbortSignal): Promise<UpscaleJobResult> {
  return parse<UpscaleJobResult>(
    await fetch(apiImageUrl(`/api/image/result/${encodeURIComponent(jobId)}`), {
      cache: "no-store",
      signal,
    })
  );
}
