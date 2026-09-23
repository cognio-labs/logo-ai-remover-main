export interface DetectedRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  type?: string;
  confidence?: number;
  page?: number;
}

export interface PdfUploadResponse {
  success: boolean;
  jobId: string;
  fileName: string;
  pageCount: number;
  fileSize: number;
  isPdf: boolean;
  previewUrl: string;
}

export interface PdfDetectResponse {
  success: boolean;
  jobId: string;
  page: number;
  regions: DetectedRegion[];
}

export interface PdfProcessResponse {
  success: boolean;
  jobId: string;
  status: string;
  message?: string;
}

export interface PdfStatusResponse {
  jobId: string;
  status: "queued" | "analyzing" | "detecting" | "restoring" | "rebuilding" | "verifying" | "completed" | "failed";
  progress: number;
  stage: string;
  message: string;
  error?: string;
}

export interface PdfResultResponse {
  success: boolean;
  jobId: string;
  status: string;
  fileName: string;
  pageCount: number;
  isPdf: boolean;
  downloadUrl: string;
  cleanedPreviewUrl: string;
  error?: string;
}

const API_ORIGIN =
  ((import.meta as any).env?.VITE_IMAGE_API_URL as string | undefined)?.replace(/\/$/u, "") ??
  "";

export const apiPdfUrl = (path: string) => `${API_ORIGIN}${path}`;

export const pdfPreviewUrl = (jobId: string, page: number = 1, type: "original" | "cleaned" = "original") =>
  apiPdfUrl(`/api/pdf/preview/${encodeURIComponent(jobId)}/${page}?type=${type}`);

export const pdfDownloadUrl = (jobId: string) =>
  apiPdfUrl(`/api/pdf/download/${encodeURIComponent(jobId)}`);

async function parse<T>(response: Response): Promise<T> {
  if (response.ok) return (await response.json()) as T;
  let detail = `Request failed (${response.status})`;
  try {
    const payload = (await response.json()) as { detail?: string; error?: string };
    if (payload.detail) detail = payload.detail;
    else if (payload.error) detail = payload.error;
  } catch {
    // Keep fallback
  }
  throw new Error(detail);
}

export async function uploadPdfDocument(
  file: File,
  jobId?: string,
): Promise<PdfUploadResponse> {
  const form = new FormData();
  form.append("file", file);
  if (jobId) form.append("jobId", jobId);

  const res = await fetch(apiPdfUrl("/api/pdf/upload"), {
    method: "POST",
    body: form,
  });
  return parse<PdfUploadResponse>(res);
}

export async function detectPdfWatermarks(
  jobId: string,
  page: number = 1,
): Promise<PdfDetectResponse> {
  const res = await fetch(
    apiPdfUrl(`/api/pdf/detect/${encodeURIComponent(jobId)}?page=${page}`),
    {
      method: "POST",
    },
  );
  return parse<PdfDetectResponse>(res);
}

export async function processPdfDocument(
  jobId: string,
  options?: {
    mode?: "fast" | "balanced" | "high_quality";
    removeAnnotations?: boolean;
    removeBlueMarker?: boolean;
    manualRegions?: DetectedRegion[];
  },
): Promise<PdfProcessResponse> {
  const form = new FormData();
  if (options?.mode) form.append("mode", options.mode);
  form.append("removeAnnotations", String(options?.removeAnnotations ?? true));
  form.append("removeBlueMarker", String(options?.removeBlueMarker ?? true));
  if (options?.manualRegions && options.manualRegions.length > 0) {
    form.append("manualRegions", JSON.stringify(options.manualRegions));
  }

  const res = await fetch(
    apiPdfUrl(`/api/pdf/process/${encodeURIComponent(jobId)}`),
    {
      method: "POST",
      body: form,
    },
  );
  return parse<PdfProcessResponse>(res);
}

export async function getPdfStatus(jobId: string): Promise<PdfStatusResponse> {
  const res = await fetch(apiPdfUrl(`/api/pdf/status/${encodeURIComponent(jobId)}`), {
    cache: "no-store",
  });
  return parse<PdfStatusResponse>(res);
}

export async function getPdfResult(jobId: string): Promise<PdfResultResponse> {
  const res = await fetch(apiPdfUrl(`/api/pdf/result/${encodeURIComponent(jobId)}`), {
    cache: "no-store",
  });
  return parse<PdfResultResponse>(res);
}
