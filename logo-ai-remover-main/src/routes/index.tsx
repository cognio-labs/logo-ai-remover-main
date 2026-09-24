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
import { HeroParallax } from "@/components/ui/hero-parallax";
import { ModelIcon } from "@/components/ModelIcon";
import { AI_MODELS, type AIModelData } from "@/components/models/modelData";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Erase Gemini, Veo & AI Watermarks in Seconds — Bellix.us" },
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
  const [sliderPos, setSliderPos] = useState(50);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

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
                  <Sparkles className="size-4" />
                  <span>Gemini Video Watermark Remover</span>
                  <ArrowRight className="size-4" />
                </Link>
              </PinkButton>

              <PinkButton variant="outline" size="lg" className="px-6 py-3 text-sm font-bold" asChild>
                <Link to="/video-enhancer" className="flex items-center gap-2">
                  <Video className="size-4" />
                  <span>Video Enhancer</span>
                </Link>
              </PinkButton>

              <PinkButton variant="outline" size="lg" className="px-6 py-3 text-sm font-bold" asChild>
                <Link to="/remove/image" className="flex items-center gap-2">
                  <WandSparkles className="size-4" />
                  <span>Image Cleaner</span>
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

          {/* Right Column: Interactive Before/After Comparison Card */}
          <div className="lg:col-span-6 flex flex-col justify-center">
              {/* Slider Container */}
              <div
                ref={sliderRef}
                className="group relative aspect-[3/2] w-full touch-none cursor-ew-resize select-none overflow-hidden rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.22)] bg-gray-900"
                onPointerDown={(e) => {
                  isDragging.current = true;
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
                    <span className="sm:hidden">Original</span><span className="hidden sm:inline">Low Quality (✦ Gemini Logo)</span>
                  </span>
                </div>

                <div className="absolute top-3 right-3 z-10 pointer-events-none">
                  <span className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/95 border border-[#FCE7EC] text-[#E11D48] text-[11px] font-semibold backdrop-blur-md shadow-xs">
                    <Sparkles className="size-3 text-[#E11D48]" />
                    <span className="sm:hidden">Clean 4K</span><span className="hidden sm:inline">High 4K Clean (Logo Removed)</span>
                  </span>
                </div>
              </div>

              {/* Slider Controls Bar Below Card */}
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500 px-2">
                <span className="text-gray-500 font-medium">Drag slider to compare</span>
                <span className="flex items-center gap-1 text-[#E11D48] font-mono font-bold text-xs">
                  <CheckCircle2 className="size-3.5 text-green-600" />
                  <span>100% Logo Free • 4K Detail</span>
                </span>
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
        className="group relative inline-flex items-center gap-3.5 px-3 py-1.5 cursor-pointer select-none transition-all duration-200 text-left shrink-0 hover:opacity-85"
      >
        {/* Left: Official Brand Vector Logo Container */}
        <ModelIcon modelId={m.id} name={m.name} size="md" />

        {/* Center: Model Details */}
        <div className="flex flex-col text-left min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-900 tracking-tight truncate group-hover:text-rose-600 transition-colors">
              {m.name}
            </span>
            <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-500 tracking-tight">
            <span className="truncate text-gray-700 font-semibold">{m.version}</span>
            <span className="text-gray-300 hidden sm:inline">•</span>
            <span className="text-gray-500 text-[10px] hidden sm:inline truncate max-w-[160px]">
              {m.description}
            </span>
          </div>
        </div>

        {/* Right: Supported Mode Text */}
        <div className="flex items-center gap-1.5 shrink-0 pl-1 text-[11px] font-mono font-medium text-emerald-600">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          <span>{m.mode}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full py-5 sm:py-6 bg-white border-y border-[#FCE7EC] overflow-hidden whitespace-nowrap select-none shadow-2xs">
      {/* Edge gradient masks for seamless smooth fade */}
      <div className="absolute left-0 top-0 bottom-0 w-20 md:w-36 bg-gradient-to-r from-white via-white/90 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 md:w-36 bg-gradient-to-l from-white via-white/90 to-transparent z-10 pointer-events-none" />

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
              <span className="absolute top-4 left-4 z-20 px-3.5 py-1 rounded-full bg-black/70 text-white text-[11px] font-bold tracking-wider uppercase backdrop-blur-md border border-white/20">
                AFTER
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
            <Link to="/video-enhancer" className="flex items-center gap-2">
              <Video className="size-4" />
              <span>Enhance Your Video Now</span>
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
      before: "/creative-suite/portrait_restorer.jpg",
      after: "/creative-suite/portrait_restorer.jpg",
    },
    {
      title: "E-Commerce & Product Photography",
      desc: "Brand logos, price tags, and promotional badges disappear cleanly. Background textures and reflective lighting remain 100% intact.",
      before: "/creative-suite/fashion_ecommerce_model.jpg",
      after: "/creative-suite/fashion_ecommerce_model.jpg",
    },
    {
      title: "Stock Previews & 4K Wallpapers",
      desc: "Semi-transparent diagonal tiled watermarks are removed without leaving behind hazy gray shadows or blotchy artifacts.",
      before: "/creative-suite/inpainter_landscape.jpg",
      after: "/creative-suite/inpainter_landscape.jpg",
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
/* 5. WHY CHOOSE BELLIX AI (BENTO GRID)                                  */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* 5. WHY CHOOSE BELLIX AI (MODERN BENTO GRID)                           */
/* -------------------------------------------------------------------------- */
function BentoFeatures() {
  const features = [
    {
      title: "Sub-pixel texture recovery",
      label: "99.9% visual fidelity",
      description:
        "Rebuild fine hair, skin texture, natural grain, and lighting without the soft blur left by basic removers.",
      icon: <ScanSearch className="size-5" />,
      facts: ["Edge-aware reconstruction", "Natural texture matching"],
    },
    {
      title: "Smooth motion at 60 FPS",
      label: "Frame-consistent output",
      description:
        "Tracks the covered area across motion so restored pixels stay stable without flicker, jitter, or edge tearing.",
      icon: <Film className="size-5" />,
      facts: ["Temporal motion tracking", "Stable frame transitions"],
    },
    {
      title: "Private by default",
      label: "Zero-retention processing",
      description:
        "Media is processed in transient memory and cleared after the job. Your uploads are never used for training.",
      icon: <ShieldCheck className="size-5" />,
      facts: ["Encrypted transfer", "Automatic file deletion"],
    },
  ];

  return (
    <section className="relative overflow-hidden border-b border-rose-100 bg-[radial-gradient(circle_at_50%_0%,#fff1f5_0%,#fff_48%,#fafafa_100%)] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3.5 py-1.5 text-xs uppercase tracking-[0.12em] text-rose-600">
            <Sparkles className="size-3.5" />
            Built for real media
          </div>
          <h2 className="text-3xl font-normal tracking-[-0.035em] text-gray-950 sm:text-5xl">
            Clean results without the artificial finish
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm font-normal leading-6 text-gray-600 sm:text-base">
            Three practical advantages you can see in the final export, from the first frame to the last.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group flex min-h-[22rem] flex-col rounded-[1.75rem] border border-gray-200/80 bg-white p-6 shadow-[0_18px_55px_-35px_rgba(15,23,42,.32)] transition duration-300 hover:-translate-y-1 hover:border-rose-200 hover:shadow-[0_24px_60px_-32px_rgba(225,29,72,.22)] sm:p-7"
            >
              <div className="mb-8 flex items-start justify-between gap-4">
                <span className="grid size-11 place-items-center rounded-xl bg-gray-950 text-white transition group-hover:bg-rose-600">
                  {feature.icon}
                </span>
                <span className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-gray-600">
                  {feature.label}
                </span>
              </div>

              <h3 className="text-xl font-normal tracking-[-0.025em] text-gray-950">{feature.title}</h3>
              <p className="mt-3 text-sm font-normal leading-6 text-gray-600">{feature.description}</p>

              <div className="mt-auto border-t border-gray-100 pt-5">
                {feature.facts.map((fact) => (
                  <div key={fact} className="flex items-center gap-2 py-1.5 text-xs text-gray-600">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    <span>{fact}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
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
/* 7. FINAL CALL TO ACTION BANNER                                             */
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
            <Link to="/video-enhancer">
              <span>Try Video Enhancer</span>
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
      <HeroParallax />
      <HeroSection />
      <SlideRunMarquee />
      <VideoCleanupResultSection />
      <RealWorldResults />
      <BentoFeatures />
      <StepsSection />
      <FinalCTA />
    </>
  );
}


