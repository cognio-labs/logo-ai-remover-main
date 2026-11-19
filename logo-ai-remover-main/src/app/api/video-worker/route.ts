export const dynamic = "force-dynamic";

export function GET() {
  const configured =
    process.env.VIDEO_WORKER_URL ||
    process.env.NEXT_PUBLIC_VIDEO_API ||
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL;

  // A browser on bellix.us cannot use the server's loopback address. Returning
  // one here made production uploads fail with the unhelpful browser message
  // "Failed to fetch" whenever the worker environment variable was missing.
  if (!configured) {
    return Response.json(
      {
        detail:
          "Video processing is not configured. Set VIDEO_WORKER_URL to the public HTTPS URL of the video worker and redeploy.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const url = new URL(configured);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      (url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
      url.username ||
      url.password
    ) {
      throw new Error("Invalid video worker origin");
    }
    return Response.json({ origin: url.origin }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { detail: "The configured video worker URL is invalid." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
