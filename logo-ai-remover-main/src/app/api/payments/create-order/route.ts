import { postApi } from "@/lib/server/bellix-api";
export const runtime = "nodejs";
export function POST(request: Request) {
  return postApi(request, ["orders"]);
}
