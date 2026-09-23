import { Link } from "@tanstack/react-router";
import { Sparkles, Instagram, Twitter, Linkedin, ShieldCheck, Heart, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PinkButton } from "./PinkButton";
import { SparklesCore } from "@/components/ui/sparkles";
import navbarLogo from "@/assets/navbar-logo.png";
import logoData from "@/assets/logo.json";

export function Footer() {
  const [email, setEmail] = useState("");
  const [logoSrc, setLogoSrc] = useState<string>(navbarLogo);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast.success("Subscribed to Bellix.us newsletter & release updates!");
    setEmail("");
  };

  return (
    <footer className="border-t border-[#FCE7EC] bg-white text-gray-900 overflow-hidden">
      {/* 1. GRAND ACETERNITY SPARKLES BRAND BANNER */}
      <div className="relative w-full bg-[#090204] py-20 sm:py-28 flex flex-col items-center justify-center overflow-hidden border-b border-[#240c14]">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#E11D48]/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-20 flex flex-col items-center text-center px-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-[#FF4FA3] backdrop-blur-md mb-6">
            <Sparkles className="size-3.5 text-[#FF4FA3]" />
            <span>Next-Generation Neural AI Studio</span>
          </div>

          <h2 className="text-4xl sm:text-7xl lg:text-8xl font-semibold text-center tracking-tight text-white drop-shadow-[0_10px_35px_rgba(225,29,72,0.4)]">
            Bellix.us
          </h2>

          <p className="mt-4 max-w-xl text-sm sm:text-base text-gray-300 font-normal leading-relaxed">
            Eliminate watermarks, restore micro-textures, and upscale images & videos to 8K clarity with zero plastic blur.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
            <PinkButton size="lg" className="px-8 py-3.5 text-sm font-bold shadow-[0_10px_30px_rgba(225,29,72,0.5)]" asChild>
              <Link to="/gemini-video-watermark-remover">
                <span>Start Free Studio</span>
                <ArrowRight className="size-4 ml-1.5" />
              </Link>
            </PinkButton>

            <Link
              to="/pdf-watermark-remover"
              className="px-6 py-3 rounded-full text-sm font-bold text-white/90 bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md transition-all"
            >
              Remove PDF Watermark
            </Link>
          </div>
        </div>

        {/* Glowing Beams & Sparkles Core Container */}
        <div className="w-[36rem] sm:w-[50rem] md:w-[64rem] h-48 relative mt-6">
          {/* Gradients */}
          <div className="absolute inset-x-16 sm:inset-x-28 top-0 bg-gradient-to-r from-transparent via-[#E11D48] to-transparent h-[2px] w-3/4 blur-sm" />
          <div className="absolute inset-x-16 sm:inset-x-28 top-0 bg-gradient-to-r from-transparent via-[#E11D48] to-transparent h-px w-3/4" />
          <div className="absolute inset-x-36 sm:inset-x-64 top-0 bg-gradient-to-r from-transparent via-[#FF4FA3] to-transparent h-[5px] w-1/4 blur-sm" />
          <div className="absolute inset-x-36 sm:inset-x-64 top-0 bg-gradient-to-r from-transparent via-[#FF4FA3] to-transparent h-px w-1/4" />

          {/* Core Sparkles Component */}
          <SparklesCore
            background="transparent"
            minSize={0.4}
            maxSize={1.4}
            particleDensity={900}
            className="w-full h-full"
            particleColor="#FFFFFF"
          />

          {/* Radial Gradient to prevent sharp edges */}
          <div className="absolute inset-0 w-full h-full bg-[#090204] [mask-image:radial-gradient(380px_200px_at_top,transparent_20%,white)] pointer-events-none" />
        </div>
      </div>

      {/* 2. MAIN FOOTER CONTENT */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-block">
              <img
                src={logoSrc}
                alt="Bellix.us — Luxury Studio"
                className="h-14 sm:h-16 w-auto max-w-[280px] object-contain hover:scale-105 transition-transform"
                onError={() => {
                  if (logoSrc !== logoData.data) {
                    setLogoSrc(logoData.data);
                  } else {
                    setLogoSrc("/navbar-logo.png");
                  }
                }}
              />
            </Link>

            <p className="max-w-sm text-sm text-gray-600 leading-relaxed">
              Next-generation creative studio for digital creators and brands. Remove watermarks,
              clean AI artifacts, and upscale images and videos to pristine 4K & 8K clarity.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="size-9 rounded-xl bg-[#FFF1F4] border border-[#FCE7EC] flex items-center justify-center text-[#E11D48] hover:bg-[#FFE4E9] hover:scale-105 transition-all"
                aria-label="Instagram"
              >
                <Instagram className="size-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="size-9 rounded-xl bg-[#FFF1F4] border border-[#FCE7EC] flex items-center justify-center text-[#E11D48] hover:bg-[#FFE4E9] hover:scale-105 transition-all"
                aria-label="Twitter"
              >
                <Twitter className="size-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="size-9 rounded-xl bg-[#FFF1F4] border border-[#FCE7EC] flex items-center justify-center text-[#E11D48] hover:bg-[#FFE4E9] hover:scale-105 transition-all"
                aria-label="LinkedIn"
              >
                <Linkedin className="size-4" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-gray-900 mb-4">
              Products
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-600">
              <li>
                <Link to="/upscale" className="hover:text-[#E11D48] transition-colors">
                  4K / 8K Upscaler
                </Link>
              </li>
              <li>
                <Link to="/background-remover" className="hover:text-[#E11D48] transition-colors">
                  AI Background Remover
                </Link>
              </li>
              <li>
                <Link to="/video-enhancer" className="hover:text-[#E11D48] transition-colors">
                  Video Enhancer
                </Link>
              </li>
              <li>
                <Link to="/pdf-watermark-remover" className="hover:text-[#E11D48] transition-colors">
                  PDF Watermark Remover
                </Link>
              </li>
              <li>
                <Link to="/remove/image" className="hover:text-[#E11D48] transition-colors">
                  Image Watermark Remover
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-[#E11D48] transition-colors">
                  Pricing Plans
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-gray-900 mb-4">
              Resources
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-600">
              <li>
                <Link to="/how-it-works" className="hover:text-[#E11D48] transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-[#E11D48] transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-[#E11D48] transition-colors">
                  FAQ & Docs
                </Link>
              </li>
              <li>
                <Link to="/api-reference" className="hover:text-[#E11D48] transition-colors">
                  API Reference
                </Link>
              </li>
              <li>
                <Link to="/affiliate" className="hover:text-[#E11D48] transition-colors">
                  Affiliate Program
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-gray-900 mb-4">
              Get Updates
            </h4>
            <p className="text-xs text-gray-500 mb-3">
              Weekly AI editing tips, new model drops & creative prompts.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creator@studio.com"
                className="w-full px-3.5 py-2 rounded-xl text-xs border border-[#FCE7EC] bg-white focus:outline-none focus:ring-2 focus:ring-[#E11D48]"
              />
              <PinkButton type="submit" size="sm" className="w-full text-xs">
                Subscribe
              </PinkButton>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-14 pt-8 border-t border-[#FCE7EC] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-[#E11D48]" />
            <span>Bank-Grade 256-Bit SSL Encrypted. Zero training on user media.</span>
          </div>

          <div className="flex items-center gap-6">
            <span className="hover:text-gray-900 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-gray-900 cursor-pointer">Terms of Service</span>
            <span className="hover:text-gray-900 cursor-pointer">Security</span>
          </div>

          <div className="flex items-center gap-1 text-gray-400">
            <span>Crafted with</span>
            <Heart className="size-3 text-[#E11D48] fill-[#E11D48]" />
            <span>for creative artists & studios</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
