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

  const pathname = usePathname() || "/";
  const isAdmin = pathname.startsWith("/admin");

  return (
    <QueryClientProvider client={queryClient}>
      <ScrollToTop />
      <AuthSessionSync />
      {isAdmin ? (
        <div className="min-h-screen bg-[#F6F7FB] text-slate-900 flex flex-col font-sans">
          {children}
          <Toaster richColors position="top-right" />
        </div>
      ) : (
        <div className="flex min-h-screen flex-col bg-[#f3f4ee] text-[#10241e] relative">
          <Navbar />
          <main className="flex-1 w-full overflow-x-hidden bg-[#f3f4ee]">{children}</main>
          <Footer />
          <Toaster richColors position="top-right" />
        </div>
      )}
    </QueryClientProvider>
  );
}
