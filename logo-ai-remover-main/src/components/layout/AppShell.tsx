"use client";

import React, { useState, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Toaster } from "@/components/ui/sonner";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const pathname = usePathname() || "/";
  const isAdmin = pathname.startsWith("/admin");

  return (
    <QueryClientProvider client={queryClient}>
      {isAdmin ? (
        <div className="min-h-screen bg-[#F6F7FB] text-slate-900 flex flex-col font-sans">
          <Suspense fallback={null}>{children}</Suspense>
          <Toaster richColors position="top-right" />
        </div>
      ) : (
        <div className="flex min-h-screen flex-col bg-white text-gray-900 relative">
          <Navbar />
          <main className="flex-1 w-full overflow-x-hidden bg-white">
            <Suspense fallback={null}>{children}</Suspense>
          </main>
          <Footer />
          <Toaster richColors position="top-right" />
        </div>
      )}
    </QueryClientProvider>
  );
}
