import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Bellix.us — AI Creative Studio" },
      {
        name: "description",
        content:
          "Bellix.us is an AI creative studio with tools to remove backgrounds, clean watermarks from images and PDFs, enhance video quality, and upscale photos up to 4K.",
      },
      { name: "author", content: "Bellix.us" },
      // Open Graph — per-page routes will override these defaults
      { property: "og:site_name", content: "Bellix.us" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.bellix.us/" },
      { property: "og:title", content: "Bellix.us — AI Creative Studio" },
      {
        property: "og:description",
        content:
          "Bellix.us is an AI creative studio with tools to remove backgrounds, clean watermarks from images and PDFs, enhance video quality, and upscale photos up to 4K.",
      },
      { property: "og:image", content: "https://www.bellix.us/creative-suite/bellix-hero-section.png" },
      // Twitter Card
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@bellix_us" },
      { name: "twitter:image", content: "https://www.bellix.us/creative-suite/bellix-hero-section.png" },
      // Google Search Console
      { name: "google-site-verification", content: "bikuobkAr5CwX5mR65nkqvX7yUyQLeI6j2MBY58NHJ8" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/logo.png", type: "image/png" },
      { rel: "sitemap", type: "application/xml", href: "/sitemap.xml" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { Toaster } from "@/components/ui/sonner";
import { useRouterState } from "@tanstack/react-router";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-[#F6F7FB] text-slate-900 flex flex-col font-sans">
          <Outlet />
          <Toaster richColors position="top-right" />
        </div>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col bg-[#FFF7ED] text-gray-900 relative">
        {/* Global Warm Background Canvas (Cream: #FFF7ED, Soft Peach: #FFE4C4, Light Coral: #FFD6A5, Pink: #FCA5A5) */}
        <div
          className="fixed inset-0 pointer-events-none -z-10 bg-[#FFF7ED] bg-cover bg-center bg-no-repeat opacity-95"
          style={{ backgroundImage: "url('/warm-gradient-bg.png')" }}
        />
        <Navbar />
        <main className="flex-1 w-full overflow-x-hidden">
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </main>
        <Footer />

        <Toaster richColors position="top-right" />
      </div>
    </QueryClientProvider>
  );
}
