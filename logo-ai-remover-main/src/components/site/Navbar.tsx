"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  ShieldCheck,
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
    shortName: "Sparkle",
    path: "/gemini-image-watermark-remover",
    icon: Sparkles,
    desc: "Remove corner sparkle from Gemini photos",
  },
  {
    name: "Video cleaner",
    shortName: "Video",
    path: "/gemini-video-watermark-remover",
    icon: ScanLine,
    desc: "Remove Gemini & Veo marks",
  },
  {
    name: "SynthID Verify",
    shortName: "SynthID",
    path: "/synthid-verification",
    icon: ShieldCheck,
    desc: "Verify Google AI watermark signals",
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
  const pathname = usePathname() || "/";

  const isItemActive = (path: string, exact?: boolean) => {
    if (exact) return pathname === path;
    return pathname === path || pathname.startsWith(path + "/");
  };

  const handleNavClick = () => {
    setOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  };

  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white border-b-[3px] border-[#0b0f0d] select-none">
      <nav
        className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-[78px] flex items-center justify-between gap-2 lg:gap-4 xl:gap-6"
        aria-label="Main navigation"
      >
        {/* 1. BRAND LOGO */}
        <div className="shrink-0 flex items-center z-10" onClick={handleNavClick}>
          <BrandLogo href="/" variant="dark" />
        </div>

        {/* 2. DESKTOP NAV LINKS (Neo-Brutalism tabs — crisp #0b0f0d text, fits cleanly inside 1280px) */}
        <div className="hidden lg:flex flex-1 items-center justify-center gap-1.5 2xl:gap-2 min-w-0 px-2 overflow-x-auto no-scrollbar">
          {NAVBAR_NAV_ITEMS.map((item) => {
            const active = isItemActive(item.path, item.exact);
            const isContact = item.name === "Contact";

            return (
              <Link
                key={item.name}
                href={item.path}
                onClick={handleNavClick}
                className={`group inline-flex items-center gap-1.5 px-2.5 py-1.5 2xl:px-3.5 2xl:py-2 rounded-md text-xs 2xl:text-sm font-extrabold border-2 border-[#0b0f0d] transition-all duration-120 cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? "bg-[#d0f471] text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]"
                    : isContact
                    ? "bg-[#a8e6cf] text-[#0b0f0d] hover:bg-[#ffe500] shadow-[2px_2px_0px_#0b0f0d] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0b0f0d]"
                    : "bg-white text-[#0b0f0d] hover:bg-[#ffe500] shadow-[2px_2px_0px_#0b0f0d] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0b0f0d]"
                }`}
              >
                <item.icon
                  size={14}
                  className="shrink-0 text-[#0b0f0d] stroke-[2.4]"
                />
                <span className="hidden 2xl:inline text-[#0b0f0d]">{item.name}</span>
                <span className="lg:inline 2xl:hidden text-[#0b0f0d]">{item.shortName || item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* 3. RIGHT SIDE: ACTIONS */}
        <div className="flex items-center gap-2 shrink-0 z-10">
          <Link
            href="/history"
            onClick={handleNavClick}
            className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 2xl:px-3.5 2xl:py-2 rounded-md bg-white hover:bg-[#ffe500] border-2 border-[#0b0f0d] text-[#0b0f0d] text-xs 2xl:text-sm font-extrabold shadow-[2px_2px_0px_#0b0f0d] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0b0f0d] transition-all cursor-pointer shrink-0 whitespace-nowrap"
            title="View recent history"
          >
            <Clock size={14} className="text-[#0b0f0d] stroke-[2.4]" />
            <span className="text-[#0b0f0d]">History</span>
          </Link>

          <Link
            href="/background-remover"
            onClick={handleNavClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 2xl:px-5 rounded-md bg-[#ffe500] hover:bg-[#d0f471] border-2 border-[#0b0f0d] text-[#0b0f0d] text-xs 2xl:text-sm font-black shadow-[3px_3px_0px_#0b0f0d] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#0b0f0d] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer select-none shrink-0 whitespace-nowrap"
          >
            <PlusCircle size={16} className="shrink-0 text-[#0b0f0d] stroke-[2.5]" />
            <span className="text-[#0b0f0d]">Create with AI</span>
          </Link>

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            className="flex lg:hidden size-10 items-center justify-center rounded-md bg-[#d0f471] border-2 border-[#0b0f0d] text-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d] hover:bg-[#ffe500] transition-colors cursor-pointer"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} className="text-[#0b0f0d] stroke-[2.5]" /> : <Menu size={20} className="text-[#0b0f0d] stroke-[2.5]" />}
          </button>
        </div>
      </nav>

      {/* MOBILE DRAWER */}
      {open && (
        <div className="lg:hidden fixed inset-x-0 top-[75px] bg-[#f7f5ee] border-b-[3px] border-[#0b0f0d] p-4 shadow-[0_8px_0px_#0b0f0d] flex flex-col gap-2.5 z-50">
          {NAVBAR_NAV_ITEMS.map((item) => {
            const active = isItemActive(item.path, item.exact);
            return (
              <Link
                key={item.name}
                href={item.path}
                onClick={handleNavClick}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-[#0b0f0d] text-sm font-extrabold shadow-[3px_3px_0px_#0b0f0d] ${
                  active
                    ? "bg-[#d0f471] text-[#0b0f0d]"
                    : "bg-white text-[#0b0f0d] hover:bg-[#ffe500]"
                }`}
              >
                <item.icon size={18} className="text-[#0b0f0d] stroke-[2.4] shrink-0" />
                <span className="text-[#0b0f0d]">{item.name}</span>
              </Link>
            );
          })}

          <Link
            href="/history"
            onClick={handleNavClick}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-[#0b0f0d] bg-[#a8e6cf] text-sm font-extrabold text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]"
          >
            <Clock size={18} className="text-[#0b0f0d] stroke-[2.4] shrink-0" />
            <span className="text-[#0b0f0d]">History</span>
          </Link>
        </div>
      )}
    </header>
  );
}
