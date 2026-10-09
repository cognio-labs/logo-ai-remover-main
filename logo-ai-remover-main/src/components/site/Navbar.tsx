import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Menu,
  X,
  ArrowUpRight,
  ImageUp,
  Scissors,
  Film,
  FileText,
  WandSparkles,
  ScanLine,
  Sparkles,
} from "lucide-react";
import navbarLogo from "@/assets/navbar-logo.png";
import { studioTools } from "@/components/studio/Studio";

const TOOL_DESCRIPTIONS: Record<string, string> = {
  "/upscale": "2×, 4×, 8× upscaling",
  "/background-remover": "One-click PNG cutout",
  "/pdf-watermark-remover": "Clean any PDF stamp",
  "/remove/image": "Brush & erase marks",
  "/gemini-video-watermark-remover": "Remove Gemini & Veo marks",
};

export function Navbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  return (
    <header className="studio-nav">
      <nav className="studio-nav-inner" aria-label="Main navigation">
        {/* Logo with enlarged mark and crisp vector subtitle */}
        <Link
          to="/"
          className="group flex items-center gap-2.5 sm:gap-3 py-1 select-none cursor-pointer"
          aria-label="Bellix.us home"
        >
          <img
            src="/creative-suite/bellix_mark.png"
            alt="Bellix.us mark"
            className="h-10 sm:h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-105 drop-shadow-xs"
          />
          <div className="flex flex-col justify-center">
            <div className="flex items-baseline leading-none">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-gray-950 font-sans">
                Bellix
              </span>
              <span className="text-xl sm:text-2xl font-black text-[#E11D48] tracking-tight ml-0.5">
                .us
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="h-[1px] w-2.5 sm:w-3.5 bg-[#E11D48]/70" />
              <span className="text-[9.5px] sm:text-[10.5px] font-extrabold tracking-[0.22em] text-[#E11D48] uppercase leading-none font-sans">
                LUXURY AI STUDIO
              </span>
              <span className="h-[1px] w-2.5 sm:w-3.5 bg-[#E11D48]/70" />
            </div>
          </div>
        </Link>

        {/* Desktop Links: Enlarged tool buttons with stylish typography & icons */}
        <div className="hidden lg:flex flex-1 items-center justify-center gap-1.5 xl:gap-2.5">
          {studioTools.map((t) => (
            <Link
              key={t.path}
              to={t.path}
              className="group inline-flex items-center gap-2 px-3.5 xl:px-4 py-2 rounded-full text-[13px] xl:text-[13.5px] font-semibold text-gray-700 hover:text-[#E11D48] hover:bg-white/90 hover:shadow-xs transition-all duration-180 cursor-pointer whitespace-nowrap"
              activeProps={{
                className:
                  "bg-white text-[#E11D48] border border-rose-200/70 shadow-xs font-bold",
              }}
            >
              <t.icon
                size={15}
                className="shrink-0 text-gray-500 group-hover:text-[#E11D48] group-[.bg-white]:text-[#E11D48] transition-colors"
              />
              <span>{t.name}</span>
            </Link>
          ))}
        </div>

        {/* Premium CTA Button: Larger & more prominent */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            to="/background-remover"
            className="relative group inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full font-bold text-xs sm:text-sm tracking-tight text-white bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] shadow-[0_4px_20px_rgba(225,29,72,0.36)] hover:shadow-[0_6px_28px_rgba(225,29,72,0.52)] hover:scale-[1.03] active:scale-[0.98] transition-all overflow-hidden cursor-pointer whitespace-nowrap"
          >
            <span className="relative z-10 flex items-center gap-2">
              <span>Try Background Remover</span>
              <Sparkles className="size-4 text-white/95 group-hover:rotate-12 transition-transform duration-300" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="studio-nav-toggle"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="studio-mobile-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile Nav */}
      {open && (
        <nav id="studio-mobile-nav" className="studio-nav-mobile" aria-label="Mobile navigation">
          <div className="studio-nav-mobile-section">
            <span className="studio-nav-mobile-label">Tools</span>
            {studioTools.map((t) => (
              <Link
                key={t.path}
                to={t.path}
                onClick={() => setOpen(false)}
                className="studio-nav-mobile-tool"
              >
                <t.icon size={16} />
                <span>
                  <strong>{t.name}</strong>
                  <small>{TOOL_DESCRIPTIONS[t.path]}</small>
                </span>
                <ArrowUpRight size={13} />
              </Link>
            ))}
          </div>
          <Link to="/tools" onClick={() => setOpen(false)} className="studio-nav-mobile-cta">
            Open studio <ArrowUpRight size={15} />
          </Link>
        </nav>
      )}
    </header>
  );
}
