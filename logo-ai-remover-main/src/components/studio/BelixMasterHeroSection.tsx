import React, { useState, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Sparkles,
  Play,
  ArrowRight,
  Upload,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { VideoPlayerModal } from "./VideoPlayerModal";
import { CardItem } from "./VideoTemplatesSection";

export function BelixMasterHeroSection() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDemoVideoOpen, setIsDemoVideoOpen] = useState(false);

  // Demo card for the video modal player
  const demoVideoCard: CardItem = {
    id: "belix-hero-demo",
    title: "Belix AI Creative Suite — Complete Platform Overview",
    image: "/hero-after-clean.png",
    video: "/hero-demo-video.mp4",
    views: "2.8M",
    ratio: "16:9",
    badge: "OFFICIAL DEMO",
    badgeType: "pink",
  };

  const handleStartCreatingClick = () => {
    // Trigger direct image upload dialog if desired, or navigate to background remover
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      navigate({ to: "/background-remover" });
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Store object URL or flag in sessionStorage for immediate processing
      const url = URL.createObjectURL(file);
      try {
        sessionStorage.setItem("pending_upload_image", url);
        sessionStorage.setItem("pending_upload_name", file.name);
      } catch {}
      navigate({ to: "/background-remover" });
    }
  };

  const scrollToTemplates = () => {
    const target = document.getElementById("box-featured") || document.getElementById("box-ugc-style");
    if (target) {
      const topOffset = target.getBoundingClientRect().top + window.pageYOffset - 140;
      window.scrollTo({ top: topOffset, behavior: "smooth" });
    } else {
      navigate({ to: "/background-remover" });
    }
  };

  return (
    <section className="relative w-full bg-white text-gray-900 overflow-hidden select-none border-b border-gray-100">
      {/* Hidden file input for "Start creating free" button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* ─── DESKTOP & TABLET HIGH-DEF MASTER HERO CANVAS (1600 × 900) ─── */}
      <div className="relative w-full max-w-[1720px] mx-auto">
        <div className="relative w-full aspect-[16/9] max-h-[880px] bg-sky-50 overflow-hidden">
          {/* Main Visual Image Banner (Optimized WebP, Zero CLS) */}
          <picture>
            <source srcSet="/hero-section-banner.webp" type="image/webp" />
            <img
              src="/hero-section-banner.jpg"
              alt="Belix AI Creative Workspace — Turn your ideas into finished work"
              width={1600}
              height={900}
              className="w-full h-full object-cover object-top select-none pointer-events-none"
              loading="eager"
              fetchPriority="high"
              decoding="sync"
            />
          </picture>

          {/* ─── INTERACTIVE CLICKABLE HOTSPOTS WITH HOVER RIPPLES ─── */}

          {/* 1. TOP NAVBAR HOTSPOTS */}
          {/* Logo link */}
          <Link
            to="/"
            className="absolute top-[2.2%] left-[3.2%] w-[8.5%] h-[5.2%] rounded-xl z-20 cursor-pointer hover:bg-black/5 active:scale-95 transition-all"
            title="Belix Home"
          />

          {/* Nav: Home */}
          <Link
            to="/"
            className="absolute top-[2.4%] left-[21.5%] w-[4.5%] h-[4.8%] rounded-full z-20 cursor-pointer hover:bg-black/5 transition-all"
            title="Home"
          />

          {/* Nav: Tools */}
          <Link
            to="/tools"
            className="absolute top-[2.4%] left-[27.2%] w-[4.2%] h-[4.8%] rounded-full z-20 cursor-pointer hover:bg-black/5 transition-all"
            title="AI Tools"
          />

          {/* Nav: Templates */}
          <button
            onClick={scrollToTemplates}
            className="absolute top-[2.4%] left-[32.6%] w-[6.2%] h-[4.8%] rounded-full z-20 cursor-pointer hover:bg-black/5 transition-all"
            title="Explore Templates"
          />

          {/* Nav: Resources */}
          <Link
            to="/how-it-works"
            className="absolute top-[2.4%] left-[40.0%] w-[6.2%] h-[4.8%] rounded-full z-20 cursor-pointer hover:bg-black/5 transition-all"
            title="Resources & Guides"
          />

          {/* Nav: Pricing */}
          <Link
            to="/pricing"
            className="absolute top-[2.4%] left-[47.4%] w-[4.8%] h-[4.8%] rounded-full z-20 cursor-pointer hover:bg-black/5 transition-all"
            title="Pricing Plans"
          />

          {/* Nav Right: Try Belix Pro Button */}
          <Link
            to="/pricing"
            className="group absolute top-[2.0%] right-[3.2%] w-[10.5%] h-[5.4%] rounded-full z-20 cursor-pointer hover:shadow-lg hover:shadow-pink-500/30 hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center overflow-hidden"
            title="Try Belix Pro"
          >
            <span className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors rounded-full" />
          </Link>

          {/* 2. PRIMARY ACTION BUTTON: "✦ Start creating free ->" */}
          <div
            onClick={handleStartCreatingClick}
            className="group absolute top-[51.8%] left-[4.8%] w-[17.2%] h-[6.8%] rounded-full z-20 cursor-pointer hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center overflow-hidden"
            title="Start Creating Free — Click to upload photo or open editor"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleStartCreatingClick();
            }}
          >
            {/* Subtle interactive hover highlight */}
            <span className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors rounded-full" />
            <span className="sr-only">Start creating free</span>
          </div>

          {/* 3. SECONDARY ACTION BUTTON: "▷ Watch video" */}
          <div
            onClick={() => setIsDemoVideoOpen(true)}
            className="group absolute top-[51.8%] left-[22.8%] w-[12.0%] h-[6.8%] rounded-full z-20 cursor-pointer hover:shadow-xl hover:shadow-black/20 hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center overflow-hidden"
            title="Watch Video Demo"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setIsDemoVideoOpen(true);
            }}
          >
            <span className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-full" />
            <span className="sr-only">Watch video demo</span>
          </div>

          {/* 4. FLOATING INTERACTIVE FEATURE CARDS HOTSPOTS */}
          {/* Card: AI Image Generator */}
          <div
            onClick={() => navigate({ to: "/background-remover" })}
            className="group absolute top-[16.5%] left-[44.2%] w-[13.5%] h-[26.5%] rounded-2xl z-20 cursor-pointer hover:shadow-2xl hover:scale-[1.03] hover:-translate-y-1 transition-all"
            title="Open AI Image Generator"
          >
            <span className="absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:ring-rose-400/50 transition-all pointer-events-none" />
          </div>

          {/* Card: Video Generation */}
          <div
            onClick={scrollToTemplates}
            className="group absolute top-[13.8%] left-[63.0%] w-[15.2%] h-[23.0%] rounded-2xl z-20 cursor-pointer hover:shadow-2xl hover:scale-[1.03] hover:-translate-y-1 transition-all"
            title="Explore AI Video Generation"
          >
            <span className="absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:ring-blue-400/50 transition-all pointer-events-none" />
          </div>

          {/* Card: AI Writer */}
          <div
            onClick={() => navigate({ to: "/about" })}
            className="group absolute top-[21.5%] left-[80.8%] w-[15.0%] h-[18.5%] rounded-2xl z-20 cursor-pointer hover:shadow-2xl hover:scale-[1.03] hover:-translate-y-1 transition-all"
            title="AI Writer"
          >
            <span className="absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:ring-purple-400/50 transition-all pointer-events-none" />
          </div>

          {/* Card: Design Studio */}
          <div
            onClick={() => navigate({ to: "/tools" })}
            className="group absolute top-[41.2%] left-[78.8%] w-[15.8%] h-[18.2%] rounded-2xl z-20 cursor-pointer hover:shadow-2xl hover:scale-[1.03] hover:-translate-y-1 transition-all"
            title="Open Design Studio"
          >
            <span className="absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:ring-pink-400/50 transition-all pointer-events-none" />
          </div>
        </div>

        {/* ─── MOBILE COMPANION ACTION DOCK (Visible on smaller mobile screens) ─── */}
        <div className="md:hidden px-4 py-4 bg-white border-t border-gray-100 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartCreatingClick}
              className="flex-1 py-3 px-4 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-bold text-sm shadow-md shadow-pink-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform"
            >
              <Sparkles className="size-4" />
              <span>Start creating free</span>
              <ArrowRight className="size-4" />
            </button>

            <button
              onClick={() => setIsDemoVideoOpen(true)}
              className="py-3 px-4 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-sm border border-gray-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
            >
              <Play className="size-4 fill-gray-800" />
              <span>Watch</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium px-1">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-600" />
              AI-powered tools
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-600" />
              Export-ready HD
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-600" />
              No card required
            </span>
          </div>
        </div>
      </div>

      {/* ─── DEMO VIDEO MODAL (Rendered only on demand) ─── */}
      {isDemoVideoOpen && (
        <VideoPlayerModal
          isOpen={isDemoVideoOpen}
          onClose={() => setIsDemoVideoOpen(false)}
          card={demoVideoCard}
          categoryName="Official Platform Demo"
        />
      )}
    </section>
  );
}
