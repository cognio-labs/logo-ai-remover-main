"use client";

import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Menu,
  X,
  Home,
  Scissors,
  ScanLine,
  Mail,
  Sparkles,
  Clock,
  PlusCircle,
  FileText,
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";

export interface NavItem {
  name: string;
  shortName?: string;
  path: string;
  icon: typeof Home;
  exact?: boolean;
  desc?: string;
}

export const NAVBAR_NAV_ITEMS: NavItem[] = [
  {
    name: "Home",
    shortName: "Home",
    path: "/",
    icon: Home,
    exact: true,
    desc: "Studio overview & workspace",
  },
  {
    name: "Background remover",
    shortName: "Background",
    path: "/background-remover",
    icon: Scissors,
    desc: "One-click PNG cutout",
  },
  {
    name: "Gemini Sparkle",
    shortName: "Gemini Sparkle",
    path: "/gemini-image-watermark-remover",
    icon: Sparkles,
    desc: "Remove corner sparkle from Gemini photos",
  },
  {
    name: "Video cleaner",
    shortName: "Video cleaner",
    path: "/gemini-video-watermark-remover",
    icon: ScanLine,
    desc: "Remove Gemini & Veo marks",
  },
  {
    name: "PDF Watermark",
    shortName: "PDF Watermark",
    path: "/pdf-watermark-remover",
    icon: FileText,
    desc: "Remove marks from PDF documents",
  },
  {
    name: "Contact",
    shortName: "Contact",
    path: "/contact",
    icon: Mail,
    desc: "24/7 Support & inquiries",
  },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const isItemActive = (path: string, exact?: boolean) => {
    if (exact) return currentPath === path;
    return currentPath === path || currentPath.startsWith(path + "/");
  };

  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-[#091712]/95 backdrop-blur-md border-b border-[#d7f3af]/15 shadow-sm select-none">
      <nav
        className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-[76px] flex items-center justify-between gap-2 lg:gap-4 xl:gap-6"
        aria-label="Main navigation"
      >
        {/* 1. BRAND LOGO (Always shrink-0 and clean margin so Home never overlaps) */}
        <div className="shrink-0 flex items-center z-10 mr-2 lg:mr-4 xl:mr-6">
          <BrandLogo href="/" />
        </div>

        {/* 2. DESKTOP NAV LINKS (Centered with zero clipping and high contrast) */}
        <div className="hidden lg:flex flex-1 items-center justify-center gap-1 xl:gap-2.5 min-w-0 px-1">
          {NAVBAR_NAV_ITEMS.map((item) => {
            const active = isItemActive(item.path, item.exact);
            const isContact = item.name === "Contact";

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`group inline-flex items-center gap-1.5 px-3 py-1.5 xl:px-3.5 xl:py-2 rounded-full text-xs xl:text-sm font-semibold transition-all duration-180 cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? "bg-[#142e25] text-[#d0f471] font-bold border border-[#d7f3af]/35 shadow-xs"
                    : isContact
                    ? "bg-[#142e25]/70 text-white font-bold hover:text-[#d0f471] hover:bg-[#1a3d31] border border-[#d7f3af]/25 hover:border-[#d0f471]/40"
                    : "text-emerald-100/85 hover:text-white hover:bg-[#142e25]/60"
                }`}
              >
                <item.icon
                  size={15}
                  className={`shrink-0 transition-colors ${
                    active
                      ? "text-[#d0f471]"
                      : isContact
                      ? "text-[#d0f471] group-hover:scale-110"
                      : "text-emerald-300/70 group-hover:text-white"
                  }`}
                />
                <span className="lg:hidden xl:inline">{item.name}</span>
                <span className="hidden lg:inline xl:hidden">{item.shortName || item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* 3. RIGHT SIDE: ACTIONS */}
        <div className="flex items-center gap-2 xl:gap-3 shrink-0 z-10 ml-2 lg:mr-0">
          <Link
            to="/history"
            className="hidden xl:inline-flex items-center gap-1.5 px-3.5 py-1.5 xl:px-4 xl:py-2 rounded-full bg-[#142e25] border border-[#d7f3af]/20 text-emerald-100 hover:text-white hover:bg-[#1a3d31] text-xs xl:text-sm font-semibold transition-all cursor-pointer shrink-0"
            title="View recent history"
          >
            <Clock size={15} className="text-emerald-300/80" />
            <span>History</span>
          </Link>

          <Link
            to="/background-remover"
            className="inline-flex items-center gap-1.5 px-4 py-2 sm:px-4.5 sm:py-2 xl:px-5 xl:py-2.5 rounded-full bg-[#d0f471] hover:bg-[#dbff83] !text-[#091712] text-[#091712] text-xs xl:text-sm font-bold shadow-md shadow-lime-950/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer select-none shrink-0"
          >
            <PlusCircle size={16} className="shrink-0" />
            <span>Create with AI</span>
          </Link>

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            className="flex lg:hidden size-10 items-center justify-center rounded-xl bg-[#142e25] border border-[#d7f3af]/20 text-white hover:bg-[#1a3d31] transition-colors cursor-pointer"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* MOBILE DRAWER */}
      {open && (
        <div className="lg:hidden fixed inset-x-0 top-18 bg-[#091712] border-b border-[#d7f3af]/20 p-5 shadow-2xl flex flex-col gap-2 z-50">
          {NAVBAR_NAV_ITEMS.map((item) => {
            const active = isItemActive(item.path, item.exact);
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-base font-semibold ${
                  active
                    ? "bg-[#142e25] text-[#d0f471] font-bold border border-[#d7f3af]/30"
                    : "text-emerald-100/90 hover:bg-[#142e25]/60 hover:text-white"
                }`}
              >
                <item.icon size={18} className={active ? "text-[#d0f471]" : "text-emerald-300/80"} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          <Link
            to="/history"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-base font-semibold text-emerald-100/90 hover:bg-[#142e25]/60 hover:text-white border-t border-[#d7f3af]/10 mt-1"
          >
            <Clock size={18} className="text-emerald-300/80" />
            <span>History</span>
          </Link>
        </div>
      )}
    </header>
  );
}
