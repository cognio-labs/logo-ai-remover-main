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

    // Let the worker select its configured default; explicit choices survive proxying.
    const outbound = new FormData();
    outbound.append("image", imageFile, imageFile.name || "image.png");
    for (const key of ["model", "image_type", "text_mode"] as const) {
      const value = formData.get(key);
      if (typeof value === "string" && value) outbound.append(key, value);
    }

    const response = await fetch(`${workerUrl}/api/background/remove-advanced`, {
      method: "POST",
      body: outbound,
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
        "X-Bellix-Model": response.headers.get("X-Bellix-Model") || "unknown",
        "X-Bellix-Quality-Pass": response.headers.get("X-Bellix-Quality-Pass") || "false",
        "X-Bellix-Text-Mode": response.headers.get("X-Bellix-Text-Mode") || "auto",
        "X-Bellix-Has-Text": response.headers.get("X-Bellix-Has-Text") || "false",
        "X-Bellix-Operation":
          response.headers.get("X-Bellix-Operation") || "neural-background-removal",
      },
    });
  } catch (error: unknown) {
    console.error("API /api/remove-bg proxy error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Background worker error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
