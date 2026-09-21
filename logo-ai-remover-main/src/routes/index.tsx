import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Film,
  ImageUp,
  Layers,
  LockKeyhole,
  MonitorSmartphone,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Upload,
  Video,
  WandSparkles,
  Zap,
} from "lucide-react";
import { PinkButton } from "@/components/site/PinkButton";
import { Keyboard } from "@/components/ui/keyboard";
import Scene from "@/Scene";
import { ModelIcon } from "@/components/ModelIcon";
import { AI_MODELS, type AIModelData } from "@/components/models/modelData";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Erase Gemini, Veo & AI Watermarks in Seconds — PixelRefine AI" },
      {
        name: "description",
        content:
          "Remove visible Google Gemini stars, Veo timestamps, stock stamps & logos in seconds. Powered by temporal neural inpainting that reconstructs covered textures with 100% original 4K fidelity.",
      },
    ],
  }),
  component: HomePage,
});

/* -------------------------------------------------------------------------- */
/* 1. HERO SECTION WITH BEFORE & AFTER SLIDER & AUTO SLIDE-RUN               */
/* -------------------------------------------------------------------------- */
function HeroSection() {
  const [sliderPos, setSliderPos] = useState(52);
  const [isAutoRunning, setIsAutoRunning] = useState(true);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Auto-running "Slide Run" animation: smoothly sweeps back and forth
  useEffect(() => {
    if (!isAutoRunning) return;
    let forward = true;
    const interval = setInterval(() => {
      setSliderPos((prev) => {
        if (prev >= 82) forward = false;
        if (prev <= 18) forward = true;
        return forward ? prev + 0.4 : prev - 0.4;
      });
    }, 28);
    return () => clearInterval(interval);
  }, [isAutoRunning]);

  const handlePointerMove = (clientX: number) => {
    const el = sliderRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(95, Math.max(5, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(x);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FFF5F8] via-white to-white pt-10 pb-16 sm:pt-16 sm:pb-24 px-4 sm:px-6 lg:px-8 border-b border-[#FCE7EC]">
      {/* Subtle background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-br from-[#FFE4E9]/50 via-[#FFF1F4]/20 to-transparent blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* Left Column: Heading, Subheading & High-Converting CTAs */}
          <div className="lg:col-span-6 space-y-6 text-left">
            {/* High-Converting Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#FCE7EC] shadow-2xs">
              <span className="flex size-2 rounded-full bg-[#E11D48] animate-pulse" />
              <span className="text-xs font-bold text-[#E11D48] tracking-wide">
                Next-Gen Neural Watermark Removal Engine
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-semibold text-gray-950 tracking-tight leading-[1.08]">
              Erase Gemini, Veo & AI Watermarks in{" "}
              <span className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] bg-clip-text text-transparent">
                Seconds
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-gray-600 font-normal leading-relaxed max-w-xl">
              Clean visible AI generator marks, Google Gemini stars, and Veo timestamps with
              frame-by-frame precision. Reconstruct original textures and lighting with zero blur.
            </p>

            {/* Primary Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <PinkButton size="lg" className="px-7 py-3 text-sm font-bold shadow-lg" asChild>
                <Link to="/gemini-video-watermark-remover" className="flex items-center gap-2">
                  <Video className="size-4" />
                  <span>Gemini Video Remover</span>
                  <ArrowRight className="size-4" />
                </Link>
              </PinkButton>

              <PinkButton variant="outline" size="lg" className="px-6 py-3 text-sm font-bold" asChild>
                <Link to="/remove/image" className="flex items-center gap-2">
                  <WandSparkles className="size-4" />
                  <span>Open Image Cleaner</span>
                </Link>
              </PinkButton>
            </div>

            {/* Micro Stats Grid */}
            <div className="pt-4 grid grid-cols-3 gap-6 border-t border-gray-100 max-w-md">
              <div>
                <h4 className="text-2xl sm:text-3xl font-semibold text-gray-950">100%</h4>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Texture Retention</p>
              </div>
              <div>
                <h4 className="text-2xl sm:text-3xl font-semibold text-gray-950">60 FPS</h4>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Motion Smoothness</p>
              </div>
              <div>
                <h4 className="text-2xl sm:text-3xl font-semibold text-gray-950">4K HDR</h4>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Clean Exports</p>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Before/After Comparison Card with Slide Run */}
          <div className="lg:col-span-6">
            <div className="rounded-3xl p-3 sm:p-4 bg-white border-2 border-[#FCE7EC] shadow-[0_20px_50px_-15px_rgba(225,29,72,0.22)]">
              {/* Slider Container */}
              <div
                ref={sliderRef}
                className="relative aspect-[16/10] w-full cursor-ew-resize select-none overflow-hidden rounded-2xl border border-gray-100 bg-gray-900 group"
                onPointerDown={(e) => {
                  isDragging.current = true;
                  setIsAutoRunning(false); // pause auto run when user grabs handle
                  e.currentTarget.setPointerCapture(e.pointerId);
                  handlePointerMove(e.clientX);
                }}
                onPointerMove={(e) => {
                  if (isDragging.current) handlePointerMove(e.clientX);
                }}
                onPointerUp={() => {
                  isDragging.current = false;
                }}
              >
                {/* BEFORE LAYER (Original with Gemini Logo & Compression Artifacts) */}
                <img
                  src="/hero-before-gemini.png"
                  alt="Original with Gemini Logo"
                  className="absolute inset-0 size-full object-cover"
                  draggable={false}
                />

                {/* AFTER LAYER (Clean 4K Result, Logo Removed) */}
                <div
                  className="absolute inset-0 overflow-hidden transition-none"
                  style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
                >
                  <img
                    src="/hero-after-clean.png"
                    alt="Cleaned Result"
                    className="size-full object-cover"
                    draggable={false}
                  />
                </div>

                {/* RED SLIDER LINE & DRAGGABLE HANDLE */}
                <div
                  className="absolute inset-y-0 w-1 bg-gradient-to-b from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] shadow-[0_0_12px_rgba(225,29,72,0.9)] z-20"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-gradient-to-tr from-[#E11D48] to-[#FF4FA3] text-white shadow-[0_4px_18px_rgba(225,29,72,0.6)] group-hover:scale-110 active:scale-95 transition-transform cursor-ew-resize">
                    <span className="text-xs font-semibold select-none tracking-tighter">⇄</span>
                  </div>
                </div>

                {/* BADGES ON TOP OF SLIDER */}
                <div className="absolute top-3 left-3 z-10 pointer-events-none">
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/65 border border-white/20 text-white text-[11px] font-bold backdrop-blur-md">
                    <span className="size-1.5 rounded-full bg-red-400" />
                    <span>Low Quality (✦ Gemini Logo)</span>
                  </span>
                </div>

                <div className="absolute top-3 right-3 z-10 pointer-events-none">
                  <span className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/95 border border-[#FCE7EC] text-[#E11D48] text-[11px] font-semibold backdrop-blur-md shadow-xs">
                    <Sparkles className="size-3 text-[#E11D48]" />
                    <span>High 4K Clean (Logo Removed)</span>
                  </span>
                </div>
              </div>

              {/* Slider Controls Bar Below Card */}
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500 px-2">
                <button
                  onClick={() => setIsAutoRunning((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                    isAutoRunning
                      ? "bg-[#FFF1F4] border-[#FCE7EC] text-[#E11D48]"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                  title="Toggle continuous auto slide run"
                >
                  <span className={`size-2 rounded-full ${isAutoRunning ? "bg-[#E11D48] animate-ping" : "bg-gray-400"}`} />
                  <span>{isAutoRunning ? "Slide Run: Active" : "Start Slide Run"}</span>
                </button>

                <span className="flex items-center gap-1 text-[#E11D48] font-mono font-bold text-xs">
                  <CheckCircle2 className="size-3.5 text-green-600" />
                  <span>100% Logo Free • 4K Detail</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* 2. INFINITE SLIDE RUN MARQUEE (SUPPORTED AI PLATFORMS WITH REAL LOGOS)     */
/* -------------------------------------------------------------------------- */
function SlideRunMarquee() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const renderCard = (m: AIModelData, keyPrefix: string) => {
    return (
      <div
        key={`${keyPrefix}-${m.id}`}
        role="button"
        tabIndex={0}
        onClick={() => setSelectedId(m.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedId(m.id);
          }
        }}
        className="group relative inline-flex items-center gap-3.5 px-4 py-2.5 rounded-2xl cursor-pointer select-none transition-all duration-200 border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20 hover:-translate-y-0.5 text-left shrink-0"
      >
        {/* Left: Official Brand Vector Logo Container (36x36 desktop, 32x32 mobile, rounded-10px) */}
        <ModelIcon modelId={m.id} name={m.name} size="md" />

        {/* Center: Model Details */}
        <div className="flex flex-col text-left min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm sm:text-base font-semibold text-white tracking-tight truncate group-hover:text-gray-100 transition-colors">
              {m.name}
            </span>
            <span className="size-1.5 rounded-full bg-emerald-500/60 shrink-0" />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-400 tracking-tight">
            <span className="truncate text-gray-300 font-semibold">{m.version}</span>
            <span className="text-gray-600 hidden sm:inline">•</span>
            <span className="text-gray-500 text-[10px] hidden sm:inline truncate max-w-[150px]">
              {m.description}
            </span>
          </div>
        </div>

        {/* Right: Supported Mode Text (No box) */}
        <div className="flex items-center gap-1.5 shrink-0 pl-1 text-[11px] font-mono font-medium text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          <span>{m.mode}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full py-5 sm:py-6 bg-gradient-to-r from-[#050203] via-[#0D0408] to-[#050203] border-y border-[#290E16] overflow-hidden whitespace-nowrap select-none shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
      {/* Edge gradient masks for seamless smooth fade */}
      <div className="absolute left-0 top-0 bottom-0 w-20 md:w-36 bg-gradient-to-r from-[#050203] via-[#050203]/90 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 md:w-36 bg-gradient-to-l from-[#050203] via-[#050203]/90 to-transparent z-10 pointer-events-none" />

      {/* Infinite Single-Line Sliding Track */}
      <div className="flex w-max items-center animate-marquee hover:[animation-play-state:paused]">
        {/* Track 1 */}
        <div className="flex items-center gap-4 sm:gap-6 shrink-0 pr-4 sm:pr-6">
          {AI_MODELS.map((m) => renderCard(m, "track1"))}
        </div>

        {/* Track 2 (Seamless Infinite Duplication) */}
        <div className="flex items-center gap-4 sm:gap-6 shrink-0 pr-4 sm:pr-6" aria-hidden="true">
          {AI_MODELS.map((m) => renderCard(m, "track2"))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. USER-REQUESTED SYNCHRONIZED VIDEO CLEANUP RESULT SECTION               */
/* (Matches user's exact screenshot "See a real video cleanup result")        */
/* -------------------------------------------------------------------------- */
function VideoCleanupResultSection() {
  const vBeforeRef = useRef<HTMLVideoElement>(null);
  const vAfterRef = useRef<HTMLVideoElement>(null);

  // Synchronize playback between both video players
  useEffect(() => {
    const v1 = vBeforeRef.current;
    const v2 = vAfterRef.current;
    if (!v1 || !v2) return;

    const handleSync = () => {
      if (Math.abs(v2.currentTime - v1.currentTime) > 0.08) {
        v2.currentTime = v1.currentTime;
      }
    };

    v1.addEventListener("timeupdate", handleSync);
    return () => v1.removeEventListener("timeupdate", handleSync);
  }, []);

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white border-b border-[#FCE7EC]">
      <div className="mx-auto max-w-5xl text-center space-y-4">
        {/* Exact Heading from User's Screenshot */}
        <h2 className="text-3xl sm:text-5xl font-serif font-normal text-gray-950 tracking-tight">
          See a real video cleanup result
        </h2>

        {/* Exact Subheading from User's Screenshot */}
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-gray-600 leading-relaxed font-normal">
          The same three-second clip plays in sync: the original keeps the visible Gemini mark at
          the lower right, while the processed version removes it and preserves the subject,
          lighting, and motion.
        </p>

        {/* Exact Link from User's Screenshot */}
        <div className="pt-1 pb-4">
          <Link
            to="/remove/image"
            className="text-xs sm:text-sm font-medium text-gray-500 hover:text-[#E11D48] underline underline-offset-4 transition-colors"
          >
            Working with images too? Open the Gemini Image Watermark Remover
          </Link>
        </div>

        {/* Dual Video Comparison Card */}
        <div className="relative mx-auto max-w-4xl rounded-3xl overflow-hidden border-2 border-[#FCE7EC] bg-black shadow-[0_20px_60px_-15px_rgba(225,29,72,0.20)]">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
            {/* Left: BEFORE (With Gemini Watermark at lower right) */}
            <div className="relative aspect-[4/3] sm:aspect-video overflow-hidden bg-black flex items-center justify-center">
              <span className="absolute top-4 left-4 z-20 px-3.5 py-1 rounded-full bg-black/70 text-white text-[11px] font-bold tracking-wider uppercase backdrop-blur-md border border-white/20">
                BEFORE
              </span>

              <video
                ref={vBeforeRef}
                src="/gemini-example-before.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="size-full object-cover pointer-events-none"
              />

              {/* Gemini watermark only on BEFORE video */}
              <div className="absolute bottom-4 right-4 z-20 flex size-9 items-center justify-center rounded-full border border-white/20 bg-black/60 p-2 shadow-lg backdrop-blur-md">
                <img src="/gemini-logo.png" alt="Gemini Mark" className="size-full object-contain" />
              </div>
            </div>

            {/* Right: AFTER (Cleaned with watermark completely removed) */}
            <div className="relative aspect-[4/3] sm:aspect-video overflow-hidden bg-black flex items-center justify-center">
              <span className="absolute top-4 left-4 z-20 px-3.5 py-1 rounded-full bg-emerald-600/90 text-white text-[11px] font-bold tracking-wider uppercase backdrop-blur-md border border-emerald-400/30 flex items-center gap-1.5 shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                AFTER · 100% CLEAN
              </span>

              <video
                ref={vAfterRef}
                src="/gemini-example-after.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="size-full object-cover pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* CTA Banner below video */}
        <div className="pt-6 flex items-center justify-center gap-4">
          <PinkButton size="md" className="px-6 py-2.5 font-bold shadow-md" asChild>
            <Link to="/gemini-video-watermark-remover" className="flex items-center gap-2">
              <Video className="size-4" />
              <span>Clean Your Gemini Video Now</span>
              <ArrowRight className="size-4" />
            </Link>
          </PinkButton>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. REAL-WORLD RESULTS & COMPARISON GALLERY                                 */
/* -------------------------------------------------------------------------- */
function RealWorldResults() {
  const [activeTab, setActiveTab] = useState(0);
  const showcases = [
    {
      title: "Graduation & Studio Portraits",
      desc: "After large proof overlays and copyright stamps are erased, facial features, skin tone, eyelashes, and hair follicles are reconstructed naturally.",
      before: "/hero-before-gemini.png",
      after: "/hero-after-clean.png",
    },
    {
      title: "E-Commerce & Product Photography",
      desc: "Brand logos, price tags, and promotional badges disappear cleanly. Background textures and reflective lighting remain 100% intact.",
      before: "/inspirations/insp_4.webp",
      after: "/inspirations/insp_4.webp",
    },
    {
      title: "Stock Previews & 4K Wallpapers",
      desc: "Semi-transparent diagonal tiled watermarks are removed without leaving behind hazy gray shadows or blotchy artifacts.",
      before: "/inspirations/insp_2.webp",
      after: "/inspirations/insp_2.webp",
    },
  ];

  const current = showcases[activeTab];

  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[#FFF8FA] border-b border-[#FCE7EC]">
      <div className="mx-auto max-w-5xl">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#FCE7EC] text-xs font-bold text-[#E11D48]">
            <WandSparkles className="size-3.5" />
            <span>Real-World Benchmark Results</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-normal text-gray-950">
            More than erasing. Complete texture restoration.
          </h2>
          <p className="text-sm text-gray-600">
            Our multi-scale neural inpainting model rebuilds the covered area using spatial context.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {showcases.map((s, i) => (
            <button
              key={s.title}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === i
                  ? "bg-[#E11D48] text-white shadow-md shadow-rose-200"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* Active Tab Preview Card */}
        <div className="rounded-3xl bg-white border border-[#FCE7EC] p-6 sm:p-8 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-5 space-y-4 text-left">
            <h3 className="text-2xl font-bold text-gray-900">{current.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{current.desc}</p>
            <div className="pt-2">
              <PinkButton size="sm" asChild>
                <Link to="/remove/image">Try Image Cleaner</Link>
              </PinkButton>
            </div>
          </div>

          <div className="md:col-span-7">
            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden border border-gray-100 shadow-inner">
              <img src={current.before} alt={current.title} className="size-full object-cover" />
              <span className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-black/75 text-white text-[11px] font-bold backdrop-blur-md">
                Neural Cleaned
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. WHY CHOOSE PIXELREFINE AI (BENTO GRID)                                  */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* 5. WHY CHOOSE PIXELREFINE AI (MODERN BENTO GRID)                           */
/* -------------------------------------------------------------------------- */
function BentoFeatures() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-[#FFF9FA] to-white border-b border-[#FCE7EC] relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-rose-100/40 blur-[120px] pointer-events-none rounded-full" />

      <div className="mx-auto max-w-6xl relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-[#E11D48] tracking-wider uppercase">
            <Sparkles className="size-3.5 text-[#E11D48]" />
            NEXT-GEN INPAINTING ARCHITECTURE
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-normal text-gray-950 tracking-tight">
            Why creators choose PixelRefine AI
          </h2>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed font-normal">
            Engineered specifically for AI-generated media from Google Gemini, Veo, Runway, and Midjourney.
          </p>
        </div>

        {/* 3 Modern Luxury Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Sub-Pixel Texture Recovery */}
          <div className="group relative p-8 rounded-3xl bg-white/90 backdrop-blur-md border border-[#FCE7EC] hover:border-[#FDA4AF] shadow-[0_15px_35px_-10px_rgba(225,29,72,0.08)] hover:shadow-[0_25px_50px_-12px_rgba(225,29,72,0.18)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-6">
                <div className="size-12 rounded-2xl bg-gradient-to-tr from-[#E11D48] to-[#FF4FA3] text-white flex items-center justify-center shadow-md shadow-rose-300 group-hover:scale-110 transition-transform">
                  <Sparkles className="size-6" />
                </div>
                <span className="text-[11px] font-bold font-mono uppercase px-2.5 py-1 rounded-full bg-rose-50 text-[#E11D48] border border-rose-100">
                  99.9% Fidelity
                </span>
              </div>

              <h3 className="text-xl font-bold text-gray-950 mb-2.5">
                Sub-Pixel Texture Recovery
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6">
                Never leaves a blurred smudge or grey haze. Synthesizes original micro-textures, skin pores, and natural lighting.
              </p>
            </div>

            {/* Micro Visual Preview */}
            <div className="p-3.5 rounded-2xl bg-[#FFF8FA] border border-[#FCE7EC] space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase">
                <span>Micro Inpaint Analysis</span>
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Zero Smudge
                </span>
              </div>
              <div className="h-1.5 w-full bg-rose-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#E11D48] to-emerald-500 w-full rounded-full" />
              </div>
            </div>
          </div>

          {/* Card 2: 60 FPS Motion Continuity */}
          <div className="group relative p-8 rounded-3xl bg-white/90 backdrop-blur-md border border-[#FCE7EC] hover:border-[#FDA4AF] shadow-[0_15px_35px_-10px_rgba(225,29,72,0.08)] hover:shadow-[0_25px_50px_-12px_rgba(225,29,72,0.18)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-6">
                <div className="size-12 rounded-2xl bg-gradient-to-tr from-[#E11D48] to-[#FF4FA3] text-white flex items-center justify-center shadow-md shadow-rose-300 group-hover:scale-110 transition-transform">
                  <Film className="size-6" />
                </div>
                <span className="text-[11px] font-bold font-mono uppercase px-2.5 py-1 rounded-full bg-rose-50 text-[#E11D48] border border-rose-100">
                  Optical Flow AI
                </span>
              </div>

              <h3 className="text-xl font-bold text-gray-950 mb-2.5">
                60 FPS Motion Continuity
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6">
                Optical flow ensures watermarks are tracked frame-by-frame with zero jitter, temporal flicker, or edge tearing.
              </p>
            </div>

            {/* Micro Visual Preview */}
            <div className="p-3.5 rounded-2xl bg-[#FFF8FA] border border-[#FCE7EC] space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase">
                <span>Frame Coherence</span>
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> 60 FPS Locked
                </span>
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                {[40, 75, 60, 95, 80, 100, 90, 85, 98, 92].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-[#E11D48] to-[#FF6B8B] rounded-full"
                    style={{ height: `${h * 0.16}px` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Card 3: Privacy & Zero Storage */}
          <div className="group relative p-8 rounded-3xl bg-white/90 backdrop-blur-md border border-[#FCE7EC] hover:border-[#FDA4AF] shadow-[0_15px_35px_-10px_rgba(225,29,72,0.08)] hover:shadow-[0_25px_50px_-12px_rgba(225,29,72,0.18)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-6">
                <div className="size-12 rounded-2xl bg-gradient-to-tr from-[#E11D48] to-[#FF4FA3] text-white flex items-center justify-center shadow-md shadow-rose-300 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="size-6" />
                </div>
                <span className="text-[11px] font-bold font-mono uppercase px-2.5 py-1 rounded-full bg-rose-50 text-[#E11D48] border border-rose-100">
                  RAM Isolated
                </span>
              </div>

              <h3 className="text-xl font-bold text-gray-950 mb-2.5">
                Privacy &amp; Zero Storage
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6">
                Uploaded files are processed entirely in transient GPU memory and deleted immediately. We never train on your media.
              </p>
            </div>

            {/* Micro Visual Preview */}
            <div className="p-3.5 rounded-2xl bg-[#FFF8FA] border border-[#FCE7EC] space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase">
                <span>Storage Policy</span>
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Auto-Purge 0s
                </span>
              </div>
              <div className="text-[11px] font-mono text-gray-500 flex items-center gap-1.5">
                <LockKeyhole className="size-3 text-[#E11D48]" />
                <span>Encrypted Transient Pipeline</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. 3-STEP WORKFLOW (ELEVATED MODERN CARDS)                                 */
/* -------------------------------------------------------------------------- */
function StepsSection() {
  const steps = [
    {
      num: "01",
      badge: "Fast Upload",
      title: "Upload Media",
      desc: "Drag and drop any video (MP4, MOV, WebM) or image (PNG, JPG, WebP) with watermarks.",
      icon: <Upload className="size-5 text-[#E11D48]" />,
      detail: "Supports up to 4K 60FPS · 50MB",
    },
    {
      num: "02",
      badge: "Deep Synthesis",
      title: "AI Detection & Inpainting",
      desc: "Neural network automatically localizes the watermark and reconstructs covered visual context.",
      icon: <WandSparkles className="size-5 text-[#E11D48]" />,
      detail: "Temporal Optical Flow Tracking",
    },
    {
      num: "03",
      badge: "Instant Export",
      title: "Export in Pristine 4K",
      desc: "Preview the result instantly side-by-side and download watermark-free media in original resolution.",
      icon: <Download className="size-5 text-[#E11D48]" />,
      detail: "100% Lossless Video & Image",
    },
  ];

  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#FFF8FA] border-b border-[#FCE7EC] relative overflow-hidden">
      <div className="mx-auto max-w-6xl text-center relative z-10">
        
        <div className="max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-[#E11D48] tracking-wider uppercase">
            <Zap className="size-3.5 text-[#E11D48]" />
            LIGHTNING FAST WORKFLOW
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-normal text-gray-950 tracking-tight">
            Remove watermarks in 3 simple steps
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            No technical knowledge needed. Our neural models handle frame reconstruction automatically.
          </p>
        </div>

        {/* 3 Steps Modern Connected Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          {steps.map((s, idx) => (
            <div
              key={s.num}
              className="group relative p-8 rounded-3xl bg-white border border-[#FCE7EC] hover:border-[#FDA4AF] shadow-[0_15px_35px_-10px_rgba(225,29,72,0.06)] hover:shadow-[0_25px_50px_-12px_rgba(225,29,72,0.16)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden"
            >
              {/* Giant background number watermark */}
              <span className="absolute -top-3 -right-2 text-7xl font-semibold text-rose-50/70 font-mono select-none pointer-events-none group-hover:text-rose-100/90 transition-colors">
                {s.num}
              </span>

              <div>
                {/* Top Step Number & Icon Row */}
                <div className="flex items-center justify-between gap-2 mb-6 relative z-10">
                  <div className="size-12 rounded-2xl bg-rose-50 border border-rose-200 text-[#E11D48] flex items-center justify-center font-semibold text-lg font-mono shadow-xs group-hover:bg-[#E11D48] group-hover:text-white transition-all">
                    {s.num}
                  </div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                    {s.badge}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2.5 relative z-10">
                  {s.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6 relative z-10">
                  {s.desc}
                </p>
              </div>

              {/* Bottom detail pill */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 relative z-10">
                <span className="font-semibold text-gray-700">{s.detail}</span>
                <span className="size-7 rounded-full bg-rose-50 text-[#E11D48] flex items-center justify-center group-hover:bg-[#E11D48] group-hover:text-white transition-colors">
                  <ArrowRight className="size-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. INTERACTIVE STUDIO KEYBOARD SECTION                                     */
/* -------------------------------------------------------------------------- */
function InteractiveKeyboardSection() {
  return (
    <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#FAFAFA] border-y border-[#E5E5E5] relative overflow-hidden">
      {/* Subtle ambient light gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-white/70 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative mx-auto max-w-6xl text-center space-y-10">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFFFFF] border border-[#E5E5E5] text-xs font-bold text-[#171717] tracking-wider uppercase shadow-2xs">
            <span className="size-2 rounded-full bg-[#E11D48] animate-pulse" />
            <span>Tactile Neural Workflow • Mac Hardware Showcase</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#171717]">
            Interactive Studio{" "}
            <span className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] bg-clip-text text-transparent">
              Controls
            </span>
          </h2>

          <p className="text-sm sm:text-base text-[#737373] max-w-2xl mx-auto leading-relaxed">
            Control PixelRefine AI at the speed of thought. Press keys on your physical keyboard, click the virtual keycaps, or interact with the precision wireless mouse to trigger neural shortcuts with authentic switch acoustics.
          </p>
        </div>

        {/* Mac-Style White Studio Keyboard & Wireless Mouse Showcase */}
        <div className="relative pb-2">
          <Keyboard enableSound />
        </div>

        {/* Action quick links */}
        <div className="pt-2 pb-2 flex flex-wrap items-center justify-center gap-4">
          <PinkButton size="lg" className="px-8 py-3.5 font-bold shadow-md shadow-rose-200" asChild>
            <Link to="/gemini-video-watermark-remover">
              <span>Launch Studio Shortcut Hub</span>
              <ArrowRight className="size-4 ml-1.5" />
            </Link>
          </PinkButton>

          <Link
            to="/upscale"
            className="px-6 py-3.5 rounded-full text-sm font-bold text-[#171717] bg-[#FFFFFF] hover:bg-[#F5F5F5] border border-[#E5E5E5] shadow-xs transition-all hover:border-[#D4D4D4]"
          >
            Try 8K Upscaler (Key U)
          </Link>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 8. FINAL CALL TO ACTION BANNER                                             */
/* -------------------------------------------------------------------------- */
function FinalCTA() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-tr from-[#FFF0F4] via-[#FFE4E9]/60 to-white text-center">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="size-14 mx-auto rounded-3xl bg-[#E11D48] text-white flex items-center justify-center shadow-lg shadow-rose-300">
          <Sparkles className="size-7" />
        </div>
        <h2 className="text-3xl sm:text-5xl font-serif font-normal text-gray-950">
          Clear the watermark. Keep 100% of the image.
        </h2>
        <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto">
          Start for free in your browser. No software installation, credit card, or account required.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
          <PinkButton size="lg" className="px-8 py-3 font-bold shadow-md" asChild>
            <Link to="/gemini-video-watermark-remover">
              <span>Try Video Remover</span>
              <ArrowRight className="size-4 ml-1.5" />
            </Link>
          </PinkButton>
          <PinkButton variant="outline" size="lg" className="px-7 py-3 font-bold" asChild>
            <Link to="/pricing">View Pricing Plans</Link>
          </PinkButton>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* MAIN HOME PAGE COMPONENT                                                   */
/* -------------------------------------------------------------------------- */
function HomePage() {
  return (
    <>
      <Scene />
      <SlideRunMarquee />
      <VideoCleanupResultSection />
      <RealWorldResults />
      <BentoFeatures />
      <StepsSection />
      <InteractiveKeyboardSection />
      <FinalCTA />
    </>
  );
}
