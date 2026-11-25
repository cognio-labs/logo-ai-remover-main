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
    <footer className="border-t-[3px] border-[#0b0f0d] bg-[#0b0f0d] text-white overflow-hidden">
      {/* 1. NEO-BRUTALISM STUDIO HERO BANNER */}
      <div className="relative w-full bg-[#d0f471] text-[#0b0f0d] py-16 sm:py-24 flex flex-col items-center justify-center overflow-hidden border-b-[3px] border-[#0b0f0d]">
        {/* Brutalist Dot Grid */}
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#0b0f0d 1.5px, transparent 1.5px)`,
            backgroundSize: "20px 20px",
          }}
        />

        <div className="relative z-20 flex flex-col items-center text-center px-4 max-w-4xl mx-auto">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] text-xs sm:text-sm font-black text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] mb-6">
            <Sparkles className="size-4 text-[#0b0f0d] stroke-[2.5]" />
            <span className="tracking-wider uppercase font-mono">Next-Generation Neural AI Studio</span>
          </div>

          {/* Main Headline */}
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black text-center tracking-tight leading-[1.06] text-[#0b0f0d]">
            Pristine Visuals.{" "}
            <span className="inline-block bg-[#0b0f0d] text-[#d0f471] px-3 py-0.5 rounded-md border-2 border-[#0b0f0d] shadow-[4px_4px_0px_#ffffff]">
              Zero Artifacts.
            </span>
          </h2>

          {/* Subheading Copy */}
          <p className="mt-5 max-w-2xl text-base sm:text-lg lg:text-xl text-[#0b0f0d] font-semibold leading-relaxed">
            Eliminate watermarks and remove backgrounds with neural inpainting. True background reconstruction, zero plastic smudge, and 100% native resolution preserved.
          </p>

          {/* Key Value Feature Tags */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 text-xs sm:text-sm font-bold text-[#0b0f0d]">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-white border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]">
              <CheckCircle2 className="size-4 text-[#0b0f0d] stroke-[2.5]" />
              <span>Sub-Pixel Texture Inpainting</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-white border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]">
              <CheckCircle2 className="size-4 text-[#0b0f0d] stroke-[2.5]" />
              <span>Zero Blur or Plastic Patches</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-white border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]">
              <CheckCircle2 className="size-4 text-[#0b0f0d] stroke-[2.5]" />
              <span>Original 4K / 8K Kept</span>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/gemini-video-watermark-remover"
              className="group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-lg text-base font-black bg-[#ffe500] hover:bg-white text-[#0b0f0d] border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#0b0f0d] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all cursor-pointer"
            >
              <Film className="size-5 text-[#0b0f0d] stroke-[2.5]" />
              <span>Video Watermark Cleaner</span>
              <ArrowRight className="size-5 text-[#0b0f0d] stroke-[2.5] group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/gemini-image-watermark-remover"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-base font-black text-[#0b0f0d] bg-white hover:bg-[#a8e6cf] border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#0b0f0d] transition-all"
            >
              <Sparkles className="size-4 text-[#0b0f0d] stroke-[2.5]" />
              <span>Gemini Image Cleaner</span>
            </Link>

            <Link
              to="/background-remover"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-black text-white bg-[#0b0f0d] hover:bg-[#1f2924] border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#ffffff] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#ffffff] transition-all"
            >
              <Scissors className="size-4 text-[#d0f471]" />
              <span>Background Cutout</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. MAIN FOOTER CONTENT */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 bg-[#0b0f0d] text-white">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="mb-2">
              <BrandLogo href="/" size="lg" variant="light" />
            </div>

            <p className="max-w-md text-sm text-zinc-200 leading-relaxed font-medium">
              Bellix.us is the next-generation creative studio for digital creators, filmmakers, and brands.
              Clean Gemini AI sparkle marks, reconstruct video backgrounds seamlessly, and remove backgrounds with sub-pixel neural accuracy.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#d0f471] border-2 border-white text-xs text-[#0b0f0d] font-black">
                <span className="size-2 rounded-full bg-[#0b0f0d] animate-ping" />
                <span>All Systems Operational (99.9%)</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <span className="size-10 rounded-md bg-[#ffe500] border-2 border-white flex items-center justify-center text-[#0b0f0d] shrink-0">
                <Mail className="size-5 stroke-[2.4]" />
              </span>
              <div className="flex flex-col">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#d0f471]">
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
            <h4 className="text-sm uppercase font-black tracking-wider text-[#d0f471] mb-4 flex items-center gap-2 font-mono">
              <Zap className="size-4 text-[#d0f471]" />
              <span>AI Studio Tools</span>
            </h4>
            <ul className="space-y-3 text-sm text-zinc-100 font-semibold">
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
              <li>
                <Link
                  to="/synthid-verification"
                  className="hover:text-[#d0f471] transition-colors flex items-center gap-2"
                >
                  <ShieldCheck className="size-3.5 text-[#d0f471]" />
                  <span>SynthID Verification Studio</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Help & Support */}
          <div>
            <h4 className="text-sm uppercase font-black tracking-wider text-[#ffe500] mb-4 flex items-center gap-2 font-mono">
              <Mail className="size-4 text-[#ffe500]" />
              <span>24/7 Support</span>
            </h4>
            <ul className="space-y-3 text-sm text-zinc-100 font-medium">
              <li>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#ffe500] hover:bg-[#d0f471] border-2 border-white text-[#0b0f0d] transition-all text-xs font-black shadow-[3px_3px_0px_#d0f471]"
                >
                  <Mail className="size-3.5 text-[#0b0f0d]" />
                  <span>Open Contact Form</span>
                  <ArrowRight className="size-3.5 text-[#0b0f0d]" />
                </Link>
              </li>
              <li>
                <a
                  href="mailto:bellixus062@gmail.com"
                  className="hover:text-[#d0f471] transition-colors flex items-center gap-2 text-xs"
                >
                  <span className="text-zinc-400">Primary:</span>
                  <span className="font-bold text-white">bellixus062@gmail.com</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:aryanthealgohype@gmail.com"
                  className="hover:text-[#d0f471] transition-colors flex items-center gap-2 text-xs"
                >
                  <span className="text-zinc-400">Direct:</span>
                  <span className="font-bold text-white">aryanthealgohype@gmail.com</span>
                </a>
              </li>
              <li className="pt-2 text-xs text-zinc-300 leading-relaxed">
                Need enterprise custom models, volume processing, or integration? We reply within 2 hours.
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t-2 border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-[#d0f471]" />
            <span>Bank-Grade 256-Bit SSL Encrypted. Zero training on user media.</span>
          </div>

          <div className="flex items-center gap-1 text-zinc-300">
            <span>Crafted with</span>
            <Heart className="size-3 text-[#d0f471] fill-[#d0f471]" />
            <span>for creative artists &amp; filmmakers &copy; {new Date().getFullYear()} Bellix.us</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
