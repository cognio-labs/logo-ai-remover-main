import { Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  Sparkles,
  X,
  Video,
  FileText,
  Eraser,
  ChevronDown,
  Layers,
  ArrowRight,
  Film,
  Scissors,
} from "lucide-react";
import { PinkButton } from "./PinkButton";
import navbarLogo from "@/assets/navbar-logo.png";
import logoData from "@/assets/logo.json";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [logoSrc, setLogoSrc] = useState<string>(navbarLogo);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setToolsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const dockSpring = { type: "spring" as const, stiffness: 450, damping: 17 };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#FCE7EC] bg-white/95 backdrop-blur-xl transition-all">
      <nav className="mx-auto flex h-24 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* User's New Brand Logo — Large, prominent & crisp text with Spring Hover */}
        <Link to="/" className="flex items-center gap-3 group py-1 shrink-0">
          <motion.img
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.96 }}
            transition={dockSpring}
            src={logoSrc}
            alt="PixelRefine AI — Luxury Studio"
            className="h-14 sm:h-16 md:h-18 lg:h-20 w-auto max-w-[240px] sm:max-w-[320px] md:max-w-[400px] object-contain drop-shadow-xs cursor-pointer"
            onError={() => {
              if (logoSrc !== logoData.data) {
                setLogoSrc(logoData.data);
              } else {
                setLogoSrc("/navbar-logo.png");
              }
            }}
          />
        </Link>

        {/* Clean, spacious desktop navigation with Floating Dock Magnification Physics */}
        <div className="hidden lg:flex items-center gap-3 xl:gap-5 px-3 py-1.5 rounded-full bg-white/60 border border-[#FCE7EC]/80 shadow-[0_4px_20px_rgba(225,29,72,0.05)] backdrop-blur-md">
          {/* 1. Tools Dropdown with Spring Magnification */}
          <div
            className="relative"
            ref={dropdownRef}
            onMouseEnter={() => setToolsOpen(true)}
            onMouseLeave={() => setToolsOpen(false)}
          >
            <motion.button
              whileHover={{ scale: 1.12, y: -3 }}
              whileTap={{ scale: 0.94 }}
              transition={dockSpring}
              type="button"
              onClick={() => setToolsOpen((v) => !v)}
              className={`text-sm font-semibold flex items-center gap-1.5 py-2 px-3.5 rounded-2xl transition-colors cursor-pointer ${
                toolsOpen
                  ? "text-[#E11D48] bg-[#FFF1F4] shadow-xs"
                  : "text-gray-800 hover:text-[#E11D48] hover:bg-[#FFF5F7]"
              }`}
              aria-expanded={toolsOpen}
            >
              <span>Tools</span>
              <ChevronDown
                className={`size-4 transition-transform duration-200 ${
                  toolsOpen ? "rotate-180 text-[#E11D48]" : "text-gray-500"
                }`}
              />
            </motion.button>

            {/* Dropdown Card matching Screenshot with all products */}
            <AnimatePresence>
              {toolsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full pt-2 w-96 z-50"
                >
                  <div className="rounded-2xl bg-white border border-[#FCE7EC] p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.12)] space-y-1">
                    {/* Tool 1: Remove PDF Watermark */}
                    <Link
                      to="/pdf-watermark-remover"
                      onClick={() => setToolsOpen(false)}
                      className="flex items-start gap-3.5 p-2.5 rounded-xl hover:bg-[#FFF5F7] transition-colors group"
                    >
                      <div className="size-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 group-hover:border-[#FCE7EC] group-hover:bg-white text-gray-700 group-hover:text-[#E11D48] transition-colors">
                        <FileText className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#E11D48] transition-colors leading-snug">
                          Remove PDF Watermark
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                          Structural removal keeps PDFs editable & clean...
                        </p>
                      </div>
                    </Link>

                    {/* Tool 2: Remove Gemini Watermark / Image Cleaner */}
                    <Link
                      to="/remove/image"
                      onClick={() => setToolsOpen(false)}
                      className="flex items-start gap-3.5 p-2.5 rounded-xl hover:bg-[#FFF5F7] transition-colors group"
                    >
                      <div className="size-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 group-hover:border-[#FCE7EC] group-hover:bg-white text-gray-700 group-hover:text-[#E11D48] transition-colors">
                        <Eraser className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#E11D48] transition-colors leading-snug">
                          Remove Gemini Watermark
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                          Upload Gemini images or videos and let AI restore...
                        </p>
                      </div>
                    </Link>

                    {/* Tool 3: Gemini Video Watermark Remover */}
                    <Link
                      to="/gemini-video-watermark-remover"
                      onClick={() => setToolsOpen(false)}
                      className="flex items-start gap-3.5 p-2.5 rounded-xl bg-[#FFF1F4]/70 border border-[#FCE7EC]/80 hover:bg-[#FFF1F4] transition-colors group"
                    >
                      <div className="size-10 rounded-xl bg-[#FFF1F4] border border-[#FCE7EC] flex items-center justify-center shrink-0 text-[#E11D48] group-hover:bg-white transition-colors">
                        <Video className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#E11D48] transition-colors leading-snug">
                            Gemini Video Watermark Remover
                          </h4>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-[#E11D48] text-white tracking-wide">
                            New
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                          Upload Gemini or Veo clips and let AI remove watermarks...
                        </p>
                      </div>
                    </Link>

                    {/* Tool 4: AI Video Enhancer */}
                    <Link
                      to="/video-enhancer"
                      onClick={() => setToolsOpen(false)}
                      className="flex items-start gap-3.5 p-2.5 rounded-xl hover:bg-[#FFF5F7] transition-colors group"
                    >
                      <div className="size-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 group-hover:border-[#FCE7EC] group-hover:bg-white text-gray-700 group-hover:text-[#E11D48] transition-colors">
                        <Film className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#E11D48] transition-colors leading-snug">
                          Video Enhancer
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                          Upscale clips to 4K 60 FPS & restore frame clarity...
                        </p>
                      </div>
                    </Link>

                    {/* Tool 5: 4K / 8K Upscaler */}
                    <Link
                      to="/upscale"
                      onClick={() => setToolsOpen(false)}
                      className="flex items-start gap-3.5 p-2.5 rounded-xl hover:bg-[#FFF5F7] transition-colors group"
                    >
                      <div className="size-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 group-hover:border-[#FCE7EC] group-hover:bg-white text-gray-700 group-hover:text-[#E11D48] transition-colors">
                        <Layers className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#E11D48] transition-colors leading-snug">
                          4K / 8K Upscaler
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                          Super resolution for images, designs & AI artworks...
                        </p>
                      </div>
                    </Link>

                    {/* Tool 6: AI Background Remover */}
                    <Link
                      to="/background-remover"
                      onClick={() => setToolsOpen(false)}
                      className="flex items-start gap-3.5 p-2.5 rounded-xl hover:bg-[#FFF5F7] transition-colors group"
                    >
                      <div className="size-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 group-hover:border-[#FCE7EC] group-hover:bg-white text-gray-700 group-hover:text-[#E11D48] transition-colors">
                        <Scissors className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#E11D48] transition-colors leading-snug">
                          AI Background Remover
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                          One-click cutout with alpha transparency mask...
                        </p>
                      </div>
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 2. Pricing Link with Spring Magnification */}
          <motion.div whileHover={{ scale: 1.12, y: -3 }} whileTap={{ scale: 0.94 }} transition={dockSpring}>
            <Link
              to="/pricing"
              className="text-sm font-semibold text-gray-800 hover:text-[#E11D48] transition-colors py-2 px-3.5 rounded-2xl hover:bg-[#FFF5F7] block"
              activeProps={{ className: "text-[#E11D48] font-bold bg-[#FFF1F4]" }}
            >
              Pricing
            </Link>
          </motion.div>

          {/* 3. AI Upscaler with Spring Magnification */}
          <motion.div whileHover={{ scale: 1.12, y: -3 }} whileTap={{ scale: 0.94 }} transition={dockSpring}>
            <Link
              to="/upscale"
              className="text-sm font-semibold text-gray-800 hover:text-[#E11D48] transition-colors flex items-center gap-1.5 py-2 px-3.5 rounded-2xl hover:bg-[#FFF5F7]"
              activeProps={{ className: "text-[#E11D48] font-bold bg-[#FFF1F4] shadow-2xs" }}
            >
              <Layers className="size-4 text-[#E11D48]" />
              <span>AI Upscaler</span>
            </Link>
          </motion.div>

          {/* 4. Video Enhancer with Spring Magnification */}
          <motion.div whileHover={{ scale: 1.12, y: -3 }} whileTap={{ scale: 0.94 }} transition={dockSpring}>
            <Link
              to="/video-enhancer"
              className="text-sm font-semibold text-gray-800 hover:text-[#E11D48] transition-colors py-2 px-3.5 rounded-2xl hover:bg-[#FFF5F7] block"
              activeProps={{ className: "text-[#E11D48] font-bold bg-[#FFF1F4]" }}
            >
              Video Enhancer
            </Link>
          </motion.div>

          {/* 5. PDF Remover with Spring Magnification */}
          <motion.div whileHover={{ scale: 1.12, y: -3 }} whileTap={{ scale: 0.94 }} transition={dockSpring}>
            <Link
              to="/pdf-watermark-remover"
              className="text-sm font-semibold text-gray-800 hover:text-[#E11D48] transition-colors py-2 px-3.5 rounded-2xl hover:bg-[#FFF5F7] block"
              activeProps={{ className: "text-[#E11D48] font-bold bg-[#FFF1F4]" }}
            >
              PDF Remover
            </Link>
          </motion.div>

          {/* 6. Features with Spring Magnification */}
          <motion.div whileHover={{ scale: 1.12, y: -3 }} whileTap={{ scale: 0.94 }} transition={dockSpring}>
            <Link
              to="/features"
              className="text-sm font-semibold text-gray-800 hover:text-[#E11D48] transition-colors py-2 px-3.5 rounded-2xl hover:bg-[#FFF5F7] block"
              activeProps={{ className: "text-[#E11D48] font-bold bg-[#FFF1F4]" }}
            >
              Features
            </Link>
          </motion.div>
        </div>

        {/* Right CTA Button - Try Video Remover with Floating Spring Magnification & Glow */}
        <div className="hidden lg:flex items-center gap-4">
          <motion.div
            whileHover={{ scale: 1.14, y: -3 }}
            whileTap={{ scale: 0.94 }}
            transition={dockSpring}
          >
            <PinkButton
              size="md"
              className="px-6 py-2.5 rounded-full text-sm font-bold shadow-[0_6px_20px_-3px_rgba(225,29,72,0.4)] hover:shadow-[0_12px_32px_-3px_rgba(225,29,72,0.6)] transition-all cursor-pointer"
              asChild
            >
              <Link to="/gemini-video-watermark-remover" className="flex items-center gap-2">
                <span>Try Video Remover</span>
                <Sparkles className="size-4 animate-pulse" />
              </Link>
            </PinkButton>
          </motion.div>
        </div>

        {/* Mobile menu toggle button */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            className="rounded-xl p-2.5 text-gray-700 hover:bg-[#FFF5F7] cursor-pointer"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="size-6 text-[#E11D48]" /> : <Menu className="size-6 text-[#E11D48]" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {open && (
        <div className="border-t border-[#FCE7EC] bg-white px-5 py-5 lg:hidden animate-in slide-in-from-top-2 shadow-lg max-h-[85vh] overflow-y-auto">
          <div className="flex flex-col gap-2">
            <div className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-gray-400">
              Products & AI Tools
            </div>

            {/* 1. Gemini Video Watermark Remover */}
            <Link
              to="/gemini-video-watermark-remover"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 p-3 rounded-2xl bg-[#FFF1F4] border border-[#FCE7EC] font-bold text-gray-900"
            >
              <Video className="size-5 text-[#E11D48]" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span>Gemini Video Remover</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#E11D48] text-white">NEW</span>
                </div>
                <p className="text-xs text-gray-500 font-normal">Veo & Gemini synchronized dual cleanup</p>
              </div>
            </Link>

            {/* 2. AI Image Cleaner */}
            <Link
              to="/remove/image"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FFF5F7] font-bold text-gray-800"
            >
              <Eraser className="size-5 text-[#E11D48]" />
              <div className="flex-1">
                <span>AI Image Cleaner / Gemini Watermark</span>
                <p className="text-xs text-gray-500 font-normal">Images & stills inpainting restoration</p>
              </div>
            </Link>

            {/* 3. Remove PDF Watermark */}
            <Link
              to="/pdf-watermark-remover"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FFF5F7] font-bold text-gray-800"
            >
              <FileText className="size-5 text-[#E11D48]" />
              <div className="flex-1">
                <span>Remove PDF Watermark</span>
                <p className="text-xs text-gray-500 font-normal">Structural non-destructive removal</p>
              </div>
            </Link>

            {/* 4. Video Enhancer */}
            <Link
              to="/video-enhancer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FFF5F7] font-bold text-gray-800"
            >
              <Film className="size-5 text-[#E11D48]" />
              <div className="flex-1">
                <span>Video Enhancer</span>
                <p className="text-xs text-gray-500 font-normal">4K 60 FPS motion smoothing</p>
              </div>
            </Link>

            {/* 5. 4K / 8K Upscaler */}
            <Link
              to="/upscale"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FFF5F7] font-bold text-gray-800"
            >
              <Layers className="size-5 text-[#E11D48]" />
              <div className="flex-1">
                <span>4K / 8K AI Upscaler</span>
                <p className="text-xs text-gray-500 font-normal">Super resolution for visuals</p>
              </div>
            </Link>

            {/* 6. Background Remover */}
            <Link
              to="/background-remover"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FFF5F7] font-bold text-gray-800"
            >
              <Scissors className="size-5 text-[#E11D48]" />
              <div className="flex-1">
                <span>AI Background Remover</span>
                <p className="text-xs text-gray-500 font-normal">Instant alpha cutout & transparent PNG</p>
              </div>
            </Link>

            <div className="px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-wider text-gray-400 border-t border-gray-100">
              Pages & Navigation
            </div>

            <Link
              to="/pricing"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FFF5F7] font-bold text-gray-800"
            >
              <span>Pricing Plans</span>
            </Link>

            <Link
              to="/features"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FFF5F7] font-bold text-gray-800"
            >
              <span>Features & Neural Tech</span>
            </Link>

            <Link
              to="/faq"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FFF5F7] font-bold text-gray-800"
            >
              <span>FAQ & Documentation</span>
            </Link>

            <div className="pt-3 border-t border-gray-100">
              <PinkButton size="lg" className="w-full justify-center" asChild>
                <Link to="/gemini-video-watermark-remover" onClick={() => setOpen(false)}>
                  <span>Try Video Remover</span>
                  <ArrowRight className="size-4 ml-1" />
                </Link>
              </PinkButton>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
