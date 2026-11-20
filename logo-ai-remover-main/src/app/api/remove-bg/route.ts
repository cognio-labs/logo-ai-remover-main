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
    const imageFile = formData.get("image") as File | null;
    if (!imageFile) {
      return new Response(JSON.stringify({ error: "No image file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build clean outbound FormData with isnet-general-use for ultra-fast < 3s execution
    const outbound = new FormData();
    outbound.append("image", imageFile, imageFile.name || "image.png");
    outbound.append("model", "isnet-general-use");

    const response = await fetch(`${workerUrl}/api/background/remove-advanced`, {
      method: "POST",
      body: outbound,
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
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("API /api/remove-bg proxy error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Background worker error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
