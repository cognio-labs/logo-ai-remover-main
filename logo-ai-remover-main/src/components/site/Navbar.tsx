import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, ArrowUpRight, ChevronDown, ImageUp, Scissors, Film, FileText, WandSparkles, ScanLine, Sparkles } from "lucide-react";
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
  const [toolOpen, setToolOpen] = useState(false);

  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); setToolOpen(false); }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  // Close tool panel on outside click
  useEffect(() => {
    if (!toolOpen) return;
    const handler = (e: MouseEvent) => {
      const el = document.getElementById("studio-tool-panel");
      const trigger = document.getElementById("studio-tool-trigger");
      if (el && !el.contains(e.target as Node) && !trigger?.contains(e.target as Node)) {
        setToolOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [toolOpen]);

  return (
    <header className="studio-nav">
      <nav className="studio-nav-inner" aria-label="Main navigation">
        {/* Logo */}
        <Link to="/" aria-label="Bellix home">
          <img src={navbarLogo} alt="Bellix.us" className="studio-nav-logo" />
        </Link>

        {/* Desktop Links */}
        <div className="flex items-center gap-2">
          {/* Tools dropdown */}
          <div className="relative">
            <button
              id="studio-tool-trigger"
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                toolOpen
                  ? "bg-[#FFF1F4] text-[#E11D48] border border-[#FCE7EC] shadow-2xs"
                  : "text-gray-700 hover:text-[#E11D48] hover:bg-[#FFF5F7] border border-transparent"
              }`}
              aria-expanded={toolOpen}
              aria-haspopup="true"
              onClick={() => setToolOpen(v => !v)}
            >
              <span>Tools</span>
              <ChevronDown
                size={13}
                className="transition-transform duration-200"
                style={{ transform: toolOpen ? "rotate(180deg)" : "none" }}
              />
            </button>

            {toolOpen && (
              <div
                id="studio-tool-panel"
                className="absolute top-full left-0 mt-2 w-[420px] rounded-2xl bg-white/95 backdrop-blur-xl border border-[#FCE7EC] shadow-[0_20px_50px_-15px_rgba(225,29,72,0.18)] p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="grid grid-cols-2 gap-1.5">
                  {studioTools.map(t => (
                    <Link
                      key={t.path}
                      to={t.path}
                      onClick={() => setToolOpen(false)}
                      className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#FFF5F7] transition-colors"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#FFF1F4] text-[#E11D48] group-hover:scale-105 group-hover:bg-[#E11D48] group-hover:text-white transition-all">
                        <t.icon size={15} />
                      </span>
                      <div className="flex flex-col min-w-0 pr-1">
                        <strong className="text-xs font-semibold text-gray-900 group-hover:text-[#E11D48] transition-colors truncate">
                          {t.name}
                        </strong>
                        <small className="text-[11px] text-gray-500 truncate leading-snug">
                          {TOOL_DESCRIPTIONS[t.path]}
                        </small>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-[#FCE7EC] flex items-center justify-between px-2 text-xs">
                  <span className="text-[11px] text-gray-400 font-medium">6 Neural Creative Tools</span>
                  <Link
                    to="/tools"
                    onClick={() => setToolOpen(false)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E11D48] hover:underline"
                  >
                    <span>View all tools</span>
                    <ArrowUpRight size={12} />
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link
            to="/pricing"
            className="inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold text-gray-700 hover:text-gray-950 hover:bg-gray-100/70 transition-colors"
          >
            Pricing
          </Link>
        </div>

        {/* Premium CTA Button */}
        <div className="ml-auto hidden sm:flex items-center gap-3">
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
