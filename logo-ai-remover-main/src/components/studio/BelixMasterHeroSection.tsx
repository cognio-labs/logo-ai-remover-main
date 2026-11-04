"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  ArrowRight,
  Play,
  Check,
  ChevronLeft,
  ChevronRight,
  Scissors,
  Zap,
  Layers,
  WandSparkles,
  ShieldCheck,
  Star,
  Image as ImageIcon,
} from "lucide-react";

interface ShowcaseSlide {
  id: string;
  toolName: string;
  headline: string;
  tagline: string;
  image: string;
  targetLink: string;
  buttonText: string;
  accentColor: string;
  gradient: string;
}

const SHOWCASE_SLIDES: ShowcaseSlide[] = [
  {
    id: "bg-remover",
    toolName: "AI Background Remover",
    headline: "Pixel-Perfect Cutouts in Seconds",
    tagline: "Instant sub-pixel subject isolation with automatic edge feathering and hair refinement.",
    image: "/showcase/shoes_transparent.png",
    targetLink: "/background-remover",
    buttonText: "Remove Background Free",
    accentColor: "from-rose-500 to-pink-500",
    gradient: "from-rose-500/15 via-pink-500/10 to-transparent",
  },
  {
    id: "upscaler",
    toolName: "8K AI Image Upscaler",
    headline: "Ultra-Clarity Sub-Pixel Restoration",
    tagline: "Enlarge photos up to 800% while reviving micro-textures, reflections, and fine details.",
    image: "/upscale/jewelry.png",
    targetLink: "/upscale",
    buttonText: "Upscale Image to 8K",
    accentColor: "from-violet-500 to-purple-500",
    gradient: "from-violet-500/15 via-purple-500/10 to-transparent",
  },
  {
    id: "fashion-studio",
    toolName: "AI Creative Studio",
    headline: "High-Fashion Editorial Lighting",
    tagline: "Commercial-grade scene generation with realistic studio shadows and environmental lighting.",
    image: "/creative-suite/fashion_ecommerce_model.webp",
    targetLink: "/tools",
    buttonText: "Open AI Studio",
    accentColor: "from-amber-500 to-rose-500",
    gradient: "from-amber-500/15 via-rose-500/10 to-transparent",
  },
  {
    id: "landscape-restore",
    toolName: "Landscape & Scene AI",
    headline: "Breathtaking Dynamic Range",
    tagline: "AI reconstruction that unmasks cinematic colors, depth gradients, and atmospheric lighting.",
    image: "/upscale/mountain_lake.webp",
    targetLink: "/upscale",
    buttonText: "Enhance Scenic Photos",
    accentColor: "from-sky-500 to-blue-600",
    gradient: "from-sky-500/15 via-blue-500/10 to-transparent",
  },
  {
    id: "automotive",
    toolName: "Commercial Vehicle Cutout",
    headline: "Precision Multi-Object Masking",
    tagline: "Flawless transparent isolation with curved metallic reflection and ground shadow preservation.",
    image: "/showcase/cars_transparent.png",
    targetLink: "/background-remover",
    buttonText: "Try Precision Cutout",
    accentColor: "from-emerald-500 to-teal-500",
    gradient: "from-emerald-500/15 via-teal-500/10 to-transparent",
  },
  {
    id: "digital-art",
    toolName: "Generative Art Enhancer",
    headline: "Flawless 4K Texture Upscaling",
    tagline: "Deep neural filtering that eliminates compression noise while amplifying vibrant brush strokes.",
    image: "/upscale/artwork.png",
    targetLink: "/upscale",
    buttonText: "Enhance Artwork",
    accentColor: "from-fuchsia-500 to-indigo-500",
    gradient: "from-fuchsia-500/15 via-indigo-500/10 to-transparent",
  },
];

const STATS = [
  { value: "50M+", label: "Visuals Processed", desc: "Trusted worldwide" },
  { value: "< 3s", label: "Average Inference", desc: "Instant HD output" },
  { value: "99.9%", label: "Edge Precision", desc: "Sub-pixel accuracy" },
  { value: "4.9 ★", label: "Creator Rating", desc: "150K+ verified reviews" },
];

export function BelixMasterHeroSection() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-slide every 4.5 seconds
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % SHOWCASE_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused]);

  const nextSlide = useCallback(() => {
    setActiveIdx((prev) => (prev + 1) % SHOWCASE_SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setActiveIdx((prev) => (prev - 1 + SHOWCASE_SLIDES.length) % SHOWCASE_SLIDES.length);
  }, []);

  const active = SHOWCASE_SLIDES[activeIdx];

  return (
    <section
      className="relative isolate overflow-hidden bg-white text-slate-900 border-b border-slate-100"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ─── VIBRANT GLOWING COLOR BACKGROUND DESIGN ─── */}
      <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
        {/* Subtle mesh grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(225,29,72,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(225,29,72,0.035)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_35%,#000_70%,transparent_100%)]" />

        {/* Multi-color ambient glows */}
        <div className="absolute -top-36 left-1/2 -translate-x-1/2 h-[520px] w-[980px] rounded-full bg-gradient-to-tr from-rose-200/55 via-purple-100/60 to-amber-100/50 blur-[110px]" />
        <div className="absolute top-[28%] -left-32 h-[450px] w-[500px] rounded-full bg-gradient-to-br from-pink-200/40 via-rose-100/35 to-transparent blur-[95px]" />
        <div className="absolute top-[22%] -right-32 h-[500px] w-[540px] rounded-full bg-gradient-to-bl from-purple-200/45 via-indigo-100/35 to-rose-100/30 blur-[100px]" />
        <div className="absolute -bottom-24 left-1/3 h-[320px] w-[480px] rounded-full bg-rose-100/40 blur-[85px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-20 lg:px-8 lg:pt-20 lg:pb-24">
        {/* ─── HEADER / BADGE / TITLE / CTAS ─── */}
        <div className="flex flex-col items-center text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-rose-200/80 bg-white/90 px-4 py-1.5 shadow-xs backdrop-blur-md transition-all hover:border-rose-300">
            <span className="flex size-5 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-xs">
              <Sparkles className="size-3" />
            </span>
            <span className="text-xs font-semibold text-slate-800 tracking-wide">
              Bellix AI Creative Suite <span className="text-rose-500 font-bold">•</span> Next-Gen Visual Studio
            </span>
            <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">
              PRO
            </span>
          </div>

          {/* Main Hero Headline */}
          <h1 className="mt-6 max-w-4xl text-balance text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl sm:leading-[1.1] lg:text-[4.25rem]">
            Create Visuals That Stand Out With{" "}
            <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
              Studio-Grade AI
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 max-w-2xl text-balance text-base text-slate-600 sm:text-lg sm:leading-relaxed">
            One unified creative suite to remove backgrounds, upscale images to 8K, and clean video watermarks with instantaneous precision.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
            <Link
              to="/background-remover"
              className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-rose-500/35 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
            >
              <WandSparkles className="size-4" />
              <span>Start Creating Free</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              to="/tools"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200/90 bg-white/90 px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-xs backdrop-blur-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <Play className="size-3.5 fill-current text-rose-500" />
              <span>Explore All Tools</span>
            </Link>
          </div>

          {/* Trust elements */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-500 stroke-[3]" />
              Free to start, no card required
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-rose-500 stroke-[2.5]" />
              Private & secure processing
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star className="size-3.5 text-amber-500 fill-amber-500" />
              Full 4K / 8K resolution exports
            </span>
          </div>
        </div>

        {/* ─── REAL HERO SHOWCASE IMAGE SLIDER (NO FAKE WINDOW, PURE CINEMATIC VISUALS) ─── */}
        <div className="relative mt-12 sm:mt-14">
          {/* Main Visual Slide Stage */}
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-slate-50 to-white shadow-2xl shadow-rose-950/5">
            {/* Slide Image Background and Display */}
            <div className="relative aspect-[16/9] sm:aspect-[2.1/1] w-full overflow-hidden bg-slate-900/5">
              {/* Subtle Checkerboard for transparency indication */}
              <div className="absolute inset-0 bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%),linear-gradient(-45deg,#f3f4f6_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f3f4f6_75%),linear-gradient(-45deg,transparent_75%,#f3f4f6_75%)] bg-[size:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0px]" />

              {/* Ambient Glow behind image */}
              <div
                className={`absolute inset-0 bg-gradient-to-r ${active.gradient} transition-colors duration-700 pointer-events-none`}
              />

              {/* Active Image with smooth crossfade */}
              <img
                key={active.id}
                src={active.image}
                alt={active.headline}
                className="absolute inset-0 h-full w-full object-contain p-4 sm:p-8 transition-all duration-700 ease-out animate-fadeIn"
                loading="eager"
              />

              {/* Top floating pill: Tool Name */}
              <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-md backdrop-blur-md">
                  <span className={`size-2 rounded-full bg-gradient-to-r ${active.accentColor}`} />
                  {active.toolName}
                </span>
              </div>

              {/* Slide Navigation Buttons (Glass Arrows) */}
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Previous slide"
                className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 flex size-10 sm:size-11 items-center justify-center rounded-full border border-white/90 bg-white/90 text-slate-700 shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:bg-white hover:text-slate-950 active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="size-5" />
              </button>

              <button
                type="button"
                onClick={nextSlide}
                aria-label="Next slide"
                className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 flex size-10 sm:size-11 items-center justify-center rounded-full border border-white/90 bg-white/90 text-slate-700 shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:bg-white hover:text-slate-950 active:scale-95 cursor-pointer"
              >
                <ChevronRight className="size-5" />
              </button>

              {/* Bottom Info Overlay inside Slide */}
              <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-5 sm:p-8 text-white backdrop-blur-[2px]">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="max-w-xl">
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-sm">
                      {active.headline}
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-slate-200 line-clamp-2 drop-shadow-sm">
                      {active.tagline}
                    </p>
                  </div>

                  <Link
                    to={active.targetLink}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-slate-900 shadow-lg transition-all hover:scale-105 hover:bg-rose-50 hover:text-rose-600 active:scale-95"
                  >
                    <span>{active.buttonText}</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Slider Bottom Thumbnail Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white/95 px-5 py-3 sm:px-6">
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {SHOWCASE_SLIDES.map((slide, idx) => {
                  const isSelected = idx === activeIdx;
                  return (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => setActiveIdx(idx)}
                      className={`group relative flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full transition-transform ${
                          isSelected ? "bg-rose-400 scale-125" : "bg-slate-300 group-hover:bg-slate-400"
                        }`}
                      />
                      <span>{slide.toolName}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dot Indicators */}
              <div className="flex items-center gap-1.5">
                {SHOWCASE_SLIDES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Jump to slide ${i + 1}`}
                    onClick={() => setActiveIdx(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      i === activeIdx ? "w-6 bg-rose-500" : "w-1.5 bg-slate-200 hover:bg-slate-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── BOTTOM TRUST METRICS BAR ─── */}
        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
          {STATS.map((item) => (
            <div
              key={item.label}
              className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white/70 p-4 text-center shadow-xs backdrop-blur-sm transition-all hover:border-rose-100 hover:shadow-md"
            >
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                {item.value}
              </div>
              <div className="mt-0.5 text-xs font-semibold text-slate-700">
                {item.label}
              </div>
              <div className="text-[11px] text-slate-400">
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
