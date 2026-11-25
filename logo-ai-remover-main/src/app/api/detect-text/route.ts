import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const worker =
    process.env.IMAGE_WORKER_URL ||
    process.env.VIDEO_WORKER_URL ||
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_VIDEO_API ||
    "http://127.0.0.1:5000";
  try {
    const response = await fetch(`${worker}/api/image/detect-text`, {
      method: "POST",
      body: await request.formData(),
      signal: request.signal,
    });
    return new Response(await response.arrayBuffer(), {
      status: response.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { detail: "Local OCR unavailable. Select text manually." },
      { status: 503 },
    );
  }
}
