import { getApi, postApi } from "@/lib/server/bellix-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path?: string[] }> | { path?: string[] } };

export async function GET(request: Request, context: Context) {
  try {
    const rawParams = await Promise.resolve(context.params);
    const path = rawParams?.path || [];
    return await getApi(request, path);
  } catch (err: any) {
    console.error("GET /api/bellix error:", err);
    return Response.json(
      { error: err?.message || "Internal Server Error" },
      { status: err?.status || 500 },
    );
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const rawParams = await Promise.resolve(context.params);
    const path = rawParams?.path || [];
    return await postApi(request, path);
  } catch (err: any) {
    console.error("POST /api/bellix error:", err);
    return Response.json(
      { error: err?.message || "Internal Server Error" },
      { status: err?.status || 500 },
    );
  }
}
