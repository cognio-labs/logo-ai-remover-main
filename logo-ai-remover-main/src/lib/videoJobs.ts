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
  success: true;
  jobId: string;
  originalVideoUrl: string;
  metadata: VideoMetadata;
};

export type JobStatus = {
  jobId: string;
  status: string;
  progress: number;
  stage: string;
  message: string;
  error?: string | null;
};

export type VideoResult = {
  success: true;
  jobId: string;
  status: "completed";
  originalVideoUrl: string;
  cleanedVideoUrl: string;
  metadata: VideoMetadata;
  resultVersion: number;
};

const API_ORIGIN = (import.meta.env.VITE_VIDEO_API_URL as string | undefined)?.replace(/\/$/u, "") ?? "";

export const apiUrl = (path: string) => `${API_ORIGIN}${path}`;

async function parse<T>(response: Response): Promise<T> {
  if (response.ok) return (await response.json()) as T;
  let detail = `Request failed (${response.status})`;
  try {
    const payload = (await response.json()) as { detail?: string };
    if (payload.detail) detail = payload.detail;
  } catch {
    // Keep the status-based message for non-JSON server failures.
  }
  throw new Error(detail);
}

export async function uploadVideo(file: File, jobId: string, signal?: AbortSignal) {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("jobId", jobId);
  return parse<UploadResult>(
    await fetch(apiUrl("/api/video/upload"), {
      method: "POST",
      body: form,
      cache: "no-store",
      signal,
    }),
  );
}

export async function processVideo(jobId: string, signal?: AbortSignal) {
  return parse<{ success: true; jobId: string; status: "queued" }>(
    await fetch(apiUrl("/api/video/process"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
      cache: "no-store",
      signal,
    }),
  );
}

export async function getVideoStatus(jobId: string, signal?: AbortSignal) {
  return parse<JobStatus>(
    await fetch(apiUrl(`/api/video/status/${encodeURIComponent(jobId)}`), {
      cache: "no-store",
      signal,
    }),
  );
}

export async function getVideoResult(jobId: string, signal?: AbortSignal) {
  return parse<VideoResult>(
    await fetch(apiUrl(`/api/video/result/${encodeURIComponent(jobId)}`), {
      cache: "no-store",
      signal,
    }),
  );
}
