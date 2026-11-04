"use client";

import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  Instagram,
  Twitter,
  Linkedin,
  ShieldCheck,
  Heart,
  ArrowRight,
  Mail,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PinkButton } from "./PinkButton";
import { BrandLogo } from "./BrandLogo";
import navbarLogo from "@/assets/navbar-logo.png";
import logoData from "@/assets/logo.json";

export function Footer() {
  const [email, setEmail] = useState("");
  const [logoSrc, setLogoSrc] = useState<string>(typeof navbarLogo === "object" && (navbarLogo as any)?.src ? (navbarLogo as any).src : (typeof navbarLogo === "string" ? navbarLogo : "/navbar-logo.png"));

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast.success("Subscribed to Bellix.us newsletter & release updates!");
    setEmail("");
  };

  return (
    <footer className="border-t border-[#d7f3af]/15 bg-[#091712] text-emerald-100 overflow-hidden">
      {/* 1. GRAND ACETERNITY SPARKLES BRAND BANNER */}
      <div className="relative w-full bg-[#091712] py-20 sm:py-28 flex flex-col items-center justify-center overflow-hidden border-b border-[#d7f3af]/15">
        

        <div className="relative z-20 flex flex-col items-center text-center px-4">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#142e25] border border-[#d0f471]/40 text-xs sm:text-sm font-bold text-[#d0f471] backdrop-blur-md mb-6 shadow-md">
            <Sparkles className="size-4 text-[#d0f471]" />
            <span>Next-Generation Neural AI Studio</span>
          </div>

          <h2 className="text-5xl sm:text-7xl lg:text-8xl font-black text-center tracking-tight !text-white text-white drop-shadow-[0_12px_40px_rgba(208,244,113,0.35)]">
            Bellix.us
          </h2>

          <p className="mt-5 max-w-2xl text-base sm:text-lg lg:text-xl text-[#e2ece6] !text-[#e2ece6] font-medium leading-relaxed">
            Eliminate watermarks, restore micro-textures, and enhance images &amp; videos with zero plastic blur.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/gemini-video-watermark-remover"
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-base font-black bg-[#d0f471] hover:bg-[#dbff83] !text-[#091712] text-[#091712] shadow-[0_10px_35px_-4px_rgba(208,244,113,0.6)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <span className="!text-[#091712] font-black text-base">Start Free Studio</span>
              <ArrowRight className="size-5 !text-[#091712] stroke-[2.5]" />
            </Link>

            <Link
              to="/pdf-watermark-remover"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-base font-bold text-white bg-[#142e25] hover:bg-[#1c3f33] border border-[#d0f471]/30 backdrop-blur-md shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              Remove PDF Watermark
            </Link>
          </div>
        </div>

        
      </div>

      {/* 2. MAIN FOOTER CONTENT */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="mb-2">
              <BrandLogo href="/" size="lg" />
            </div>

            <p className="max-w-sm text-sm text-emerald-100 leading-relaxed">
              Next-generation creative studio for digital creators and brands. Remove watermarks,
              clean AI artifacts, and enhance images and videos with pristine clarity.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="size-9 rounded-xl bg-[#142e25] border border-[#d7f3af]/15 flex items-center justify-center text-[#d0f471] hover:bg-[#252525] hover:scale-105 transition-all"
                aria-label="Instagram"
              >
                <Instagram className="size-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="size-9 rounded-xl bg-[#142e25] border border-[#d7f3af]/15 flex items-center justify-center text-[#d0f471] hover:bg-[#252525] hover:scale-105 transition-all"
                aria-label="Twitter"
              >
                <Twitter className="size-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="size-9 rounded-xl bg-[#142e25] border border-[#d7f3af]/15 flex items-center justify-center text-[#d0f471] hover:bg-[#252525] hover:scale-105 transition-all"
                aria-label="LinkedIn"
              >
                <Linkedin className="size-4" />
              </a>
            </div>

            <div className="pt-2 flex items-center gap-2.5">
              <span className="size-9 rounded-xl bg-[#142e25] border border-[#d7f3af]/15 flex items-center justify-center text-[#d0f471] shrink-0">
                <Mail className="size-4" />
              </span>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                  Email Support
                </span>
                <a
                  href="mailto:bellixus062@gmail.com"
                  className="text-xs sm:text-sm font-semibold text-white hover:text-[#d0f471] transition-colors"
                >
                  bellixus062@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-sm uppercase font-bold tracking-wider text-white !text-white mb-4">
              Products
            </h4>
            <ul className="space-y-2.5 text-sm text-emerald-100">
              <li>
                <Link to="/background-remover" className="hover:text-[#d0f471] transition-colors">
                  AI Background Remover
                </Link>
              </li>
              <li>
                <Link to="/gemini-image-watermark-remover" className="hover:text-[#d0f471] transition-colors">
                  Gemini Sparkle Remover
                </Link>
              </li>
              <li>
                <Link
                  to="/gemini-video-watermark-remover"
                  className="hover:text-[#d0f471] transition-colors"
                >
                  Gemini Video Watermark Remover
                </Link>
              </li>
              <li>
                <Link
                  to="/pdf-watermark-remover"
                  className="hover:text-[#d0f471] transition-colors"
                >
                  PDF Watermark Remover
                </Link>
              </li>
              <li>
                <Link
                  to="/video-enhancer"
                  className="hover:text-[#d0f471] transition-colors"
                >
                  AI Video Enhancer
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm uppercase font-bold tracking-wider text-white !text-white mb-4">
              Resources
            </h4>
            <ul className="space-y-2.5 text-sm text-emerald-100/90">
              <li>
                <Link to="/how-it-works" className="hover:text-[#d0f471] transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-[#d0f471] transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-[#d0f471] transition-colors">
                  FAQ & Docs
                </Link>
              </li>
              <li>
                <Link to="/api-reference" className="hover:text-[#d0f471] transition-colors">
                  API Reference
                </Link>
              </li>
              <li>
                <Link to="/affiliate" className="hover:text-[#d0f471] transition-colors">
                  Affiliate Program
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#d0f471] transition-colors">
                  Contact Us (24/7)
                </Link>
              </li>
              <li>
                <a
                  href="mailto:bellixus062@gmail.com"
                  className="hover:text-[#d0f471] transition-colors flex items-center gap-1.5 font-medium"
                >
                  <Mail className="size-3 text-[#d0f471]" />
                  <span>bellixus062@gmail.com</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-sm uppercase font-bold tracking-wider text-white !text-white mb-4">
              Get Updates
            </h4>
            <p className="text-xs text-emerald-100/90 mb-3">
              Weekly AI editing tips, new model drops & creative prompts.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creator@studio.com"
                className="w-full px-3.5 py-2 rounded-xl text-xs border border-[#d7f3af]/15 bg-[#142e25] text-white placeholder-[#8E8E8E] focus:outline-none focus:ring-2 focus:ring-[#d0f471]"
              />
              <PinkButton type="submit" size="sm" className="w-full text-xs">
                Subscribe
              </PinkButton>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-14 pt-8 border-t border-[#d7f3af]/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-emerald-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-[#d0f471]" />
            <span>Bank-Grade 256-Bit SSL Encrypted. Zero training on user media.</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <span className="hover:text-white cursor-pointer">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer">Terms of Service</span>
            <a
              href="mailto:bellixus062@gmail.com"
              className="hover:text-[#d0f471] text-emerald-100 font-medium transition-colors"
            >
              bellixus062@gmail.com
            </a>
          </div>

          <div className="flex items-center gap-1 text-[#8E8E8E]">
            <span>Crafted with</span>
            <Heart className="size-3 text-[#d0f471] fill-[#d0f471]" />
            <span>for creative artists & studios</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
