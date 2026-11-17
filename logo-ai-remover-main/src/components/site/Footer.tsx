"use client";

import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  ShieldCheck,
  Heart,
  ArrowRight,
  Mail,
  Zap,
  CheckCircle2,
  Film,
  Scissors,
  Image as ImageIcon,
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";

export function Footer() {
  return (
    <footer className="border-t border-[#d7f3af]/15 bg-[#050d0a] text-emerald-100 overflow-hidden">
      {/* 1. LUXURY NEXT-GEN NEURAL AI STUDIO BRAND HERO */}
      <div className="relative w-full bg-gradient-to-b from-[#050d0a] via-[#081812] to-[#050d0a] py-20 sm:py-28 flex flex-col items-center justify-center overflow-hidden border-b border-[#d7f3af]/15">
        {/* Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-[radial-gradient(ellipse_at_top,rgba(208,244,113,0.18),transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[250px] bg-[radial-gradient(circle,rgba(16,185,129,0.08),transparent_70%)] pointer-events-none" />

        {/* Decorative Grid Mesh */}
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(rgba(208,244,113,0.8) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative z-20 flex flex-col items-center text-center px-4 max-w-4xl mx-auto">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-[#0d221a]/90 border border-[#d0f471]/40 text-xs sm:text-sm font-bold text-[#d0f471] backdrop-blur-xl mb-6 shadow-[0_0_25px_rgba(208,244,113,0.15)] animate-pulse">
            <span className="size-2 rounded-full bg-[#d0f471] shadow-[0_0_8px_#d0f471]" />
            <Sparkles className="size-4 text-[#d0f471]" />
            <span className="tracking-wide uppercase text-[11px] sm:text-xs font-extrabold">Next-Generation Neural AI Studio</span>
          </div>

          {/* Majestic Main Headline */}
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black text-center tracking-tight leading-[1.08] text-white">
            Pristine Visuals.{" "}
            <span className="bg-gradient-to-r from-[#d0f471] via-[#e5ff8f] to-white bg-clip-text text-transparent drop-shadow-[0_4px_30px_rgba(208,244,113,0.3)]">
              Zero Artifacts.
            </span>
          </h2>

          {/* Subheading Copy */}
          <p className="mt-5 max-w-2xl text-base sm:text-lg lg:text-xl text-emerald-100/90 font-medium leading-relaxed">
            Eliminate watermarks and remove backgrounds with neural inpainting. True background reconstruction, zero plastic smudge, and 100% native resolution preserved.
          </p>

          {/* Key Value Feature Pills */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 text-xs sm:text-sm text-emerald-200">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0a1a13] border border-[#d7f3af]/15">
              <CheckCircle2 className="size-3.5 text-[#d0f471]" />
              <span>Sub-Pixel Texture Inpainting</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0a1a13] border border-[#d7f3af]/15">
              <CheckCircle2 className="size-3.5 text-[#d0f471]" />
              <span>Zero Blur or Plastic Patches</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0a1a13] border border-[#d7f3af]/15">
              <CheckCircle2 className="size-3.5 text-[#d0f471]" />
              <span>Original 4K / 8K Kept</span>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/gemini-video-watermark-remover"
              className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-base font-black bg-[#d0f471] hover:bg-[#dbff83] text-[#050d0a] shadow-[0_10px_35px_-4px_rgba(208,244,113,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Film className="size-5 text-[#050d0a] stroke-[2.5]" />
              <span className="text-[#050d0a] font-black text-base">Video Watermark Cleaner</span>
              <ArrowRight className="size-5 text-[#050d0a] stroke-[2.5] group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/gemini-image-watermark-remover"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-base font-bold text-white bg-[#0e241c] hover:bg-[#153429] border border-[#d0f471]/35 backdrop-blur-md shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              <Sparkles className="size-4 text-[#d0f471]" />
              <span>Gemini Image Cleaner</span>
            </Link>

            <Link
              to="/background-remover"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-sm font-semibold text-emerald-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md transition-all"
            >
              <Scissors className="size-4 text-emerald-300" />
              <span>Background Cutout</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. MAIN FOOTER CONTENT */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="mb-2">
              <BrandLogo href="/" size="lg" />
            </div>

            <p className="max-w-md text-sm text-emerald-100/80 leading-relaxed">
              Bellix.us is the next-generation creative studio for digital creators, filmmakers, and brands.
              Clean Gemini AI sparkle marks, reconstruct video backgrounds seamlessly, and remove backgrounds with sub-pixel neural accuracy.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0d221a] border border-[#d7f3af]/15 text-xs text-emerald-200">
                <span className="size-2 rounded-full bg-[#d0f471] animate-ping" />
                <span className="font-semibold text-white">All Systems Operational (99.9%)</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <span className="size-10 rounded-xl bg-[#0d221a] border border-[#d7f3af]/20 flex items-center justify-center text-[#d0f471] shrink-0">
                <Mail className="size-5" />
              </span>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  Direct Support Inquiries
                </span>
                <a
                  href="mailto:bellixus062@gmail.com"
                  className="text-sm font-bold text-white hover:text-[#d0f471] transition-colors"
                >
                  bellixus062@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* AI Tools */}
          <div>
            <h4 className="text-sm uppercase font-bold tracking-wider text-white mb-4 flex items-center gap-2">
              <Zap className="size-4 text-[#d0f471]" />
              <span>AI Studio Tools</span>
            </h4>
            <ul className="space-y-3 text-sm text-emerald-100/90 font-medium">
              <li>
                <Link
                  to="/gemini-video-watermark-remover"
                  className="hover:text-[#d0f471] transition-colors flex items-center gap-2"
                >
                  <Film className="size-3.5 text-[#d0f471]" />
                  <span>Gemini Video Watermark Remover</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/gemini-image-watermark-remover"
                  className="hover:text-[#d0f471] transition-colors flex items-center gap-2"
                >
                  <Sparkles className="size-3.5 text-[#d0f471]" />
                  <span>Gemini Sparkle Image Cleaner</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/background-remover"
                  className="hover:text-[#d0f471] transition-colors flex items-center gap-2"
                >
                  <Scissors className="size-3.5 text-[#d0f471]" />
                  <span>AI Background Cutout</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Help & Support */}
          <div>
            <h4 className="text-sm uppercase font-bold tracking-wider text-white mb-4 flex items-center gap-2">
              <Mail className="size-4 text-[#d0f471]" />
              <span>24/7 Support</span>
            </h4>
            <ul className="space-y-3 text-sm text-emerald-100/90 font-medium">
              <li>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0d221a] hover:bg-[#142e25] border border-[#d0f471]/30 text-[#d0f471] hover:text-white transition-all text-xs font-bold"
                >
                  <Mail className="size-3.5" />
                  <span>Open Contact Form</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </li>
              <li>
                <a
                  href="mailto:bellixus062@gmail.com"
                  className="hover:text-[#d0f471] transition-colors flex items-center gap-2 text-xs"
                >
                  <span className="text-[#8E8E8E]">Primary:</span>
                  <span className="font-semibold text-white">bellixus062@gmail.com</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:aryanthealgohype@gmail.com"
                  className="hover:text-[#d0f471] transition-colors flex items-center gap-2 text-xs"
                >
                  <span className="text-[#8E8E8E]">Direct:</span>
                  <span className="font-semibold text-white">aryanthealgohype@gmail.com</span>
                </a>
              </li>
              <li className="pt-2 text-[11px] text-[#8E8E8E] leading-relaxed">
                Need enterprise custom models, volume processing, or integration? We reply within 2 hours.
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[#d7f3af]/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-emerald-100/75">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-[#d0f471]" />
            <span>Bank-Grade 256-Bit SSL Encrypted. Zero training on user media.</span>
          </div>

          <div className="flex items-center gap-1 text-[#8E8E8E]">
            <span>Crafted with</span>
            <Heart className="size-3 text-[#d0f471] fill-[#d0f471]" />
            <span>for creative artists &amp; filmmakers &copy; {new Date().getFullYear()} Bellix.us</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
