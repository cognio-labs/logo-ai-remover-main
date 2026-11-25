"use client";

import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Toaster } from "@/components/ui/sonner";
import { AuthSessionSync } from "@/components/account/AuthSessionSync";

function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Immediate scroll to top on any route transition
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname]);

  return null;
}

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
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ScrollToTop />
      <AuthSessionSync />
      <div className="flex min-h-screen flex-col bg-[#f7f5ee] text-[#0b0f0d] relative overflow-x-hidden w-full max-w-full">
        <Navbar />
        <main className="flex-1 w-full overflow-x-hidden bg-[#f7f5ee] text-[#0b0f0d]">{children}</main>
        <Footer />
        <Toaster richColors position="top-right" />
      </div>
    </QueryClientProvider>
  );
}
