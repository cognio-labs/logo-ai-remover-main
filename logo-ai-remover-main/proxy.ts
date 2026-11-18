import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server";
import { trackAICrawlerRequest } from "@datafast/ai-crawl";

/**
 * Records known AI, search, and training crawler requests with DataFast.
 *
 * DataFast uses event.waitUntil internally, so this must stay non-awaited:
 * crawler reporting never delays the page response.
 */
export function proxy(request: NextRequest, event: NextFetchEvent) {
  const websiteId = process.env.DATAFAST_WEBSITE_ID;

  // Keeping the integration disabled until the website ID is configured makes
  // local development and preview deployments safe by default.
  if (websiteId) {
    trackAICrawlerRequest(request, event, {
      websiteId,
      authToken: process.env.DATAFAST_BOT_TOKEN,
    });
  }

  return NextResponse.next();
}

export const config = {
  // Keep crawler-discovery files such as robots.txt, llms.txt, and sitemaps
  // trackable while avoiding proxy invocation for API and Next static requests.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
