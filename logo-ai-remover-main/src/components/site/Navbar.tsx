import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, ArrowUpRight, ImageUp, Scissors, Film, FileText, WandSparkles, ScanLine, Sparkles } from "lucide-react";
import navbarLogo from "@/assets/navbar-logo.png";
import { studioTools } from "@/components/studio/Studio";

const TOOL_DESCRIPTIONS: Record<string, string> = {
  "/upscale":                         "2×, 4×, 8× upscaling",
  "/background-remover":              "One-click PNG cutout",
  "/video-enhancer":                  "4K 60FPS restoration",
  "/pdf-watermark-remover":           "Clean any PDF stamp",
  "/remove/image":                    "Brush & erase marks",
  "/gemini-video-watermark-remover":  "Remove Gemini & Veo marks",
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
        {/* Logo */}
        <Link to="/" aria-label="Bellix home">
          <img src={navbarLogo} alt="Bellix.us" className="studio-nav-logo" />
        </Link>

        {/* Desktop Links: All tool buttons shown directly in the navbar section */}
        <div className="hidden md:flex flex-1 items-center justify-center gap-1 lg:gap-1.5 xl:gap-2">
          {studioTools.map((t) => (
            <Link
              key={t.path}
              to={t.path}
              className="group inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 hover:text-[#E11D48] hover:bg-[#FFE4C4]/50 transition-all cursor-pointer whitespace-nowrap"
              activeProps={{
                className: "bg-[#FFE4C4] text-[#E11D48] border border-[#FED7AA] shadow-2xs font-bold",
              }}
            >
              <t.icon size={13} className="shrink-0 text-gray-500 group-hover:text-[#E11D48] group-[.bg-\[\#FFE4C4\]]:text-[#E11D48] transition-colors" />
              <span>{t.name}</span>
            </Link>
          ))}

          <Link
            to="/pricing"
            className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 hover:text-[#E11D48] hover:bg-[#FFE4C4]/50 transition-all cursor-pointer whitespace-nowrap"
            activeProps={{
              className: "bg-[#FFE4C4] text-[#E11D48] border border-[#FED7AA] shadow-2xs font-bold",
            }}
          >
            Pricing
          </Link>
        </div>

        {/* Premium CTA Button */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            to="/video-enhancer"
            className="relative group inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-xs tracking-tight text-white bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] shadow-[0_4px_18px_rgba(225,29,72,0.38)] hover:shadow-[0_6px_26px_rgba(225,29,72,0.52)] hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-1.5">
              <span>Try Video Enhancer</span>
              <Sparkles className="size-3.5 text-white/95 group-hover:rotate-12 transition-transform duration-300" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
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
            {studioTools.map(t => (
              <Link key={t.path} to={t.path} onClick={() => setOpen(false)} className="studio-nav-mobile-tool">
                <t.icon size={16} />
                <span>
                  <strong>{t.name}</strong>
                  <small>{TOOL_DESCRIPTIONS[t.path]}</small>
                </span>
                <ArrowUpRight size={13} />
              </Link>
            ))}
          </div>
          <Link to="/pricing" onClick={() => setOpen(false)} className="studio-nav-mobile-link">Pricing</Link>
          <Link to="/tools" onClick={() => setOpen(false)} className="studio-nav-mobile-cta">
            Open studio <ArrowUpRight size={15} />
          </Link>
        </nav>
      )}
    </header>
  );
}
