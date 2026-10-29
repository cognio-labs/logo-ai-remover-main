import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Menu,
  X,
  ArrowUpRight,
  Home,
  Scissors,
  ScanLine,
  LayoutGrid,
  Clock,
  Mail,
  PlusCircle,
  Sparkles,
} from "lucide-react";

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
    name: "Video cleaner",
    shortName: "Video cleaner",
    path: "/gemini-video-watermark-remover",
    icon: ScanLine,
    desc: "Remove Gemini & Veo marks",
  },
  {
    name: "All tools",
    shortName: "All tools",
    path: "/tools",
    icon: LayoutGrid,
    desc: "Browse 20+ creative AI tools",
  },
  {
    name: "History",
    shortName: "History",
    path: "/history",
    icon: Clock,
    desc: "Past edits & outputs",
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
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/90 shadow-2xs select-none">
      <nav
        className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[70px] flex items-center justify-between gap-3 lg:gap-6"
        aria-label="Main navigation"
      >
        {/* ─── 1. BRAND LOGO ─── */}
        <Link
          to="/"
          className="group flex items-center gap-2.5 sm:gap-3 py-1 select-none cursor-pointer shrink-0"
          aria-label="Bellix.us home"
        >
          <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 border border-gray-200 shadow-xs group-hover:border-rose-400 group-hover:scale-105 transition-all">
            <img
              src="/creative-suite/bellix_mark.png"
              alt="Bellix Labs"
              className="size-6 sm:size-7 object-contain drop-shadow-[0_2px_8px_rgba(225,29,72,0.3)]"
            />
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-baseline leading-none">
              <span className="text-lg sm:text-xl font-black tracking-tight text-gray-950 font-sans">
                Bellix
              </span>
              <span className="text-lg sm:text-xl font-black text-[#E11D48] tracking-tight ml-0.5">
                Labs
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-[1px] w-2 sm:w-2.5 bg-[#E11D48]/70" />
              <span className="text-[9px] sm:text-[9.5px] font-extrabold tracking-[0.2em] text-[#E11D48] uppercase leading-none font-sans">
                AI STUDIO
              </span>
              <span className="h-[1px] w-2 sm:w-2.5 bg-[#E11D48]/70" />
            </div>
          </div>
        </Link>

        {/* ─── 2. DESKTOP NAV LINKS (CONVERTED FROM SIDEBAR) ─── */}
        <div className="hidden lg:flex flex-1 items-center justify-center gap-1 xl:gap-1.5 min-w-0">
          {NAVBAR_NAV_ITEMS.map((item) => {
            const active = isItemActive(item.path, item.exact);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`group inline-flex items-center gap-1.5 px-3 py-1.5 xl:px-3.5 xl:py-2 rounded-full text-xs xl:text-[13px] font-semibold transition-all duration-180 cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? "bg-rose-50 text-[#E11D48] font-bold border border-rose-200/80 shadow-2xs"
                    : "text-gray-700 hover:text-gray-950 hover:bg-gray-100/90"
                }`}
              >
                <item.icon
                  size={14}
                  className={`shrink-0 transition-colors ${
                    active
                      ? "text-[#E11D48]"
                      : "text-gray-400 group-hover:text-gray-800"
                  }`}
                />
                <span>
                  <span className="hidden xl:inline">{item.name}</span>
                  <span className="xl:hidden">{item.shortName || item.name}</span>
                </span>
              </Link>
            );
          })}
        </div>

        {/* ─── 3. RIGHT SIDE: PRIMARY CTA & MOBILE TOGGLE ─── */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Primary "+ Create with AI" Button from sidebar */}
          <Link
            to="/tools"
            className="relative group inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4.5 sm:py-2 rounded-full font-bold text-xs sm:text-[13px] tracking-tight text-white bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] shadow-[0_4px_16px_rgba(225,29,72,0.32)] hover:shadow-[0_6px_24px_rgba(225,29,72,0.45)] hover:scale-[1.03] active:scale-[0.98] transition-all overflow-hidden cursor-pointer whitespace-nowrap"
            title="Create with AI Tools"
          >
            <PlusCircle className="size-3.5 sm:size-4 shrink-0 text-white" />
            <span>Create with AI</span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
          </Link>

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            className="flex lg:hidden size-9 items-center justify-center rounded-xl bg-gray-50 border border-gray-200 text-gray-800 hover:bg-gray-100 hover:text-[#E11D48] transition-colors cursor-pointer"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* ─── 4. MOBILE DROPDOWN MENU (CONVERTED FROM SIDEBAR) ─── */}
      {open && (
        <div className="lg:hidden border-t border-gray-200 bg-white/98 backdrop-blur-md px-4 py-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            {NAVBAR_NAV_ITEMS.map((item) => {
              const active = isItemActive(item.path, item.exact);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] transition-colors ${
                    active
                      ? "bg-rose-50 text-[#E11D48] font-bold border border-rose-200/80 shadow-2xs"
                      : "text-gray-700 hover:text-gray-950 hover:bg-gray-50"
                  }`}
                >
                  <item.icon
                    size={17}
                    className={active ? "text-[#E11D48]" : "text-gray-400"}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="block font-semibold truncate">{item.name}</span>
                    {item.desc && (
                      <span className="block text-[11px] text-gray-400 truncate">
                        {item.desc}
                      </span>
                    )}
                  </div>
                  <ArrowUpRight size={13} className="text-gray-400" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
