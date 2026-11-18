export const dynamic = "force-dynamic";

export function GET() {
  const configured =
    process.env.VIDEO_WORKER_URL ||
    process.env.NEXT_PUBLIC_VIDEO_API ||
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:5000";

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
    return Response.json({ origin: "http://127.0.0.1:5000" }, { headers: { "Cache-Control": "no-store" } });
  }
}
