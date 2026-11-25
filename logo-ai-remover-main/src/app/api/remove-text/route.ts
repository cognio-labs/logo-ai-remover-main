import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const workerUrl =
      process.env.IMAGE_WORKER_URL ||
      process.env.VIDEO_WORKER_URL ||
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_VIDEO_API ||
      "http://127.0.0.1:5000";

    const formData = await req.formData();

    const response = await fetch(`${workerUrl}/api/image/remove-text`, {
      method: "POST",
      body: formData,
      signal: req.signal,
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(err, { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("API /api/remove-text proxy error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Text removal worker error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
