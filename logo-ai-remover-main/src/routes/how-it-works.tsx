"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Eye,
  FileVideo,
  Film,
  Layers,
  MonitorSmartphone,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Video,
  WandSparkles,
  Zap,
} from "lucide-react";
import { PinkButton } from "@/components/site/PinkButton";
import { BeforeAfterSlider } from "@/components/site/BeforeAfterSlider";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — AI Background Removal & Watermark Cleaning | Bellix.us" },
      {
        name: "description",
        content:
          "Learn how Bellix.us AI tools work: background removal with edge matting, watermark detection and inpainting, and video frame reconstruction — step by step.",
      },
      { rel: "canonical", href: "https://www.bellix.us/how-it-works" },
      { property: "og:url", content: "https://www.bellix.us/how-it-works" },
      { property: "og:title", content: "How It Works — AI Background Removal & Watermark Cleaning" },
      { property: "og:image", content: "https://www.bellix.us/og-image.jpg" },
      { property: "og:image:secure_url", content: "https://www.bellix.us/og-image.jpg" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://www.bellix.us/og-image.jpg" },
    ],
  }),
  component: HowItWorksPage,
});

export default function HowItWorksPage() {
  const [activeStage, setActiveStage] = useState(0);

  const stages = [
    {
      step: "01",
      title: "Sub-Pixel Watermark Localization",
      badge: "Stage 1: Detection",
      icon: <ScanSearch className="size-6 text-[#E11D48]" />,
      summary:
        "High-sensitivity neural segmentation localizes transparent watermarks, Gemini 4-point stars, and dynamic timestamps down to sub-pixel coordinates.",
      details: [
        "Identifies dynamic moving logos across non-static backgrounds",
        "Generates dynamic alpha-matte masks with soft boundary feathering",
        "Distinguishes between original video highlights and overlaid watermark pixels",
      ],
      techSpec: "Dual-Path U-Net Segmentation (IoU > 0.985)",
    },
    {
      step: "02",
      title: "Bidirectional Optical Flow Tracking",
      badge: "Stage 2: Motion Alignment",
      icon: <Film className="size-6 text-[#E11D48]" />,
      summary:
        "Analyzes past and future frames to understand camera pan, zoom, and subject motion behind the watermark.",
      details: [
        "Samples unoccluded pixel data from adjacent frames (±15 frames)",
        "Compensates for 60 FPS fast action, water ripples, and motion blur",
        "Prevents temporal jitter, edge boiling, and ghosting artifacts",
      ],
      techSpec: "RAFT Spatio-Temporal Optical Flow",
    },
    {
      step: "03",
      title: "Contextual Latent Diffusion Inpainting",
      badge: "Stage 3: Deep Synthesis",
      icon: <WandSparkles className="size-6 text-[#E11D48]" />,
      summary:
        "Where occluded pixels cannot be borrowed from neighboring frames, generative diffusion synthesizes plausible texture matching local lighting and grain.",
      details: [
        "Rebuilds complex textures: skin pores, fabric weaves, waves, tree foliage",
        "Matches directional sunlight, specular highlights, and natural shadow gradients",
        "Guarantees 100% full-frame clarity with zero blurred patches or smudges",
      ],
      techSpec: "Latent Inpainting Diffusion with Cross-Attention",
    },
    {
      step: "04",
      title: "4K / 8K Super-Resolution Pass",
      badge: "Stage 4: High-Pass Polish",
      icon: <Layers className="size-6 text-[#E11D48]" />,
      summary:
        "High-pass neural filters restore micro-contrast and edge sharpness before compiling the clean video or image container.",
      details: [
        "Applies edge-aware sharpening that matches native camera lens characteristics",
        "Preserves original film grain and color profiles (sRGB, Rec.709, DCI-P3)",
        "Delivers broadcast-ready pristine MP4 (H.264 / H.265) or PNG exports",
      ],
      techSpec: "Real-ESRGAN+ High-Frequency Texture Enhancer",
    },
  ];

  const formats = [
    { ext: "MP4", type: "Video", desc: "H.264 & H.265 high-definition video files" },
    { ext: "MOV", type: "Video", desc: "Apple QuickTime video with ProRes support" },
    { ext: "WebM", type: "Video", desc: "VP9 web video format from online sources" },
    { ext: "AVI / MKV", type: "Video", desc: "High-bitrate studio master containers" },
    { ext: "PNG", type: "Image", desc: "Lossless 8-bit and 16-bit transparent images" },
    {
      ext: "JPG / JPEG",
      type: "Image",
      desc: "Standard photographic format with high compression",
    },
    { ext: "WebP", type: "Image", desc: "Modern web format with lossy and lossless modes" },
    { ext: "HEIC", type: "Image", desc: "Apple iPhone high-efficiency photos" },
  ];

  const currentStage = stages[activeStage];

  return (
    <div className="min-h-screen bg-[#f7f5ee] text-[#0b0f0d] font-sans pb-24">
      {/* 1. HERO SECTION */}
      <section className="pt-16 pb-14 px-4 sm:px-6 lg:px-8 bg-white border-b-[3px] border-[#0b0f0d] text-center">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] text-xs font-black text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] font-mono uppercase">
            <Cpu className="size-3.5" />
            <span>Behind The Scenes • Neural Architecture</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-[#0b0f0d] tracking-tight">
            How Bellix.us{" "}
            <span className="inline-block px-3 py-0.5 rounded-md bg-[#d0f471] border-2 border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d]">
              Restores Every Frame
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#26302b] font-semibold leading-relaxed">
            Unlike legacy tools that simply blur or smudge marked pixels, Bellix.us employs a
            four-stage spatio-temporal pipeline that reconstructs true underlying texture.
          </p>

          <div className="pt-4 flex items-center justify-center gap-4">
            <Link
              to="/gemini-video-watermark-remover"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-[#d0f471] hover:bg-[#ffe500] text-[#0b0f0d] font-black text-sm border-2 border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d]"
            >
              <Video className="size-4" />
              <span>Test With Your Video</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. THE 4-STAGE PIPELINE INTERACTIVE SELECTOR */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto py-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-4xl font-black text-[#0b0f0d]">
            The 4-Stage Spatio-Temporal Pipeline
          </h2>
          <p className="text-xs sm:text-sm text-[#26302b] font-medium mt-1">
            Click each stage to inspect the technical process and neural execution.
          </p>
        </div>

        {/* Stage Selector Pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {stages.map((st, i) => (
            <button
              key={st.step}
              onClick={() => setActiveStage(i)}
              className={`p-4 rounded-xl border-2 border-[#0b0f0d] text-left transition-all cursor-pointer ${
                activeStage === i
                  ? "bg-[#d0f471] shadow-[4px_4px_0px_#0b0f0d]"
                  : "bg-white hover:bg-[#ffe500] shadow-[2px_2px_0px_#0b0f0d]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-black text-[#0b0f0d]">{st.step}</span>
                {activeStage === i && <span className="size-2.5 rounded-full bg-[#0b0f0d]" />}
              </div>
              <h4 className="text-xs sm:text-sm font-black text-[#0b0f0d] leading-snug">
                {st.title}
              </h4>
            </button>
          ))}
        </div>

        {/* Active Stage Deep-Dive Card */}
        <div className="rounded-xl p-8 sm:p-10 bg-white border-[2.5px] border-[#0b0f0d] shadow-[6px_6px_0px_#0b0f0d] grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7 space-y-4 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] text-xs font-black text-[#0b0f0d]">
              {currentStage.icon}
              <span>{currentStage.badge}</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-[#0b0f0d]">{currentStage.title}</h3>

            <p className="text-sm text-[#26302b] leading-relaxed font-medium">
              {currentStage.summary}
            </p>

            <div className="space-y-2 pt-2 text-xs text-[#0b0f0d] font-bold">
              {currentStage.details.map((d, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-[#0b0f0d] shrink-0 mt-0.5" />
                  <span>{d}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t-2 border-[#0b0f0d] flex flex-wrap items-center gap-2">
              <span className="text-xs text-[#26302b] uppercase font-mono font-black">
                Neural Engine:
              </span>
              <span className="text-xs font-mono font-black text-[#0b0f0d] bg-[#d0f471] px-2.5 py-1 rounded border-2 border-[#0b0f0d]">
                {currentStage.techSpec}
              </span>
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="rounded-xl bg-[#f7f5ee] border-2 border-[#0b0f0d] p-4 shadow-[4px_4px_0px_#0b0f0d] space-y-3">
              <div className="text-xs font-black text-[#0b0f0d] flex items-center justify-between">
                <span>Real-Time Stage Output</span>
                <span className="bg-[#d0f471] px-2 py-0.5 rounded border border-[#0b0f0d] font-mono text-[11px]">0.42s Latency</span>
              </div>
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-black border-2 border-[#0b0f0d]">
                <img
                  src="/hero-after-clean.png"
                  alt="Stage Result"
                  className="size-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 to-transparent text-white text-xs">
                  <span className="font-bold">Active Pass: </span>
                  <span className="font-mono text-[#d0f471]">{currentStage.title}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE BEFORE & AFTER SLIDER SHOWCASE */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="space-y-3 mb-8">
          <h2 className="text-3xl sm:text-4xl font-black text-[#0b0f0d]">
            Inspect the Reconstruction Quality
          </h2>
          <p className="text-xs sm:text-sm text-[#26302b] font-medium max-w-xl mx-auto">
            Drag the handle to compare original watermarked media with the four-stage AI cleaned
            output.
          </p>
        </div>

        <div className="rounded-xl p-3 sm:p-4 bg-white border-[2.5px] border-[#0b0f0d] shadow-[6px_6px_0px_#0b0f0d]">
          <BeforeAfterSlider
            beforeSrc="/creative-suite/watermark_remover_city.jpg"
            src="/creative-suite/upscaler_macro_8k.jpg"
            labelBefore="Original (Stock Watermark)"
            labelAfter="Neural Inpainted (8K Output)"
            badge="100% Cleaned"
          />
        </div>
      </section>

      {/* 4. SUPPORTED FORMATS GRID */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-3xl sm:text-4xl font-black text-[#0b0f0d]">Supported Media Formats</h2>
          <p className="text-xs sm:text-sm text-[#26302b] font-medium">
            Upload from mobile, desktop, studio cameras, or web exports with full container support.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {formats.map((f) => (
            <div
              key={f.ext}
              className="p-5 rounded-xl bg-white border-2 border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] space-y-1.5 text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-black font-mono text-[#0b0f0d]">{f.ext}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#ffe500] font-black text-[#0b0f0d] border border-[#0b0f0d]">
                  {f.type}
                </span>
              </div>
              <p className="text-xs text-[#26302b] font-medium leading-snug">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. BEST PRACTICES GUIDE */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="rounded-xl p-8 bg-white border-[2.5px] border-[#0b0f0d] shadow-[6px_6px_0px_#0b0f0d] space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b-2 border-[#0b0f0d]">
            <Zap className="size-6 text-[#0b0f0d]" />
            <div>
              <h3 className="text-lg font-black text-[#0b0f0d]">Pro Tips for Flawless Results</h3>
              <p className="text-xs font-medium text-[#26302b]">How to get the highest visual fidelity</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-[#0b0f0d]">
            <div className="space-y-1.5">
              <h4 className="font-black text-[#0b0f0d]">1. Upload Highest Native Resolution</h4>
              <p className="text-[#26302b] font-medium leading-relaxed">
                Whenever possible, provide uncompressed 1080p or 4K files. The more surrounding
                pixel detail available, the sharper the inpainting texture will be.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-black text-[#0b0f0d]">2. Continuous Frame Continuity</h4>
              <p className="text-[#26302b] font-medium leading-relaxed">
                Ensure your video clip has at least 1-2 seconds of smooth camera motion around the
                watermark area to allow our optical flow model to synthesize background data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BOTTOM CTA */}
      <section className="py-16 text-center px-4">
        <div className="max-w-xl mx-auto space-y-4 px-6 py-10 rounded-xl bg-[#ffe500] border-[3px] border-[#0b0f0d] shadow-[6px_6px_0px_#0b0f0d]">
          <h2 className="text-3xl font-black text-[#0b0f0d]">
            Experience the neural difference
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-[#0b0f0d]">
            Remove watermarks from your first video or photo right now.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/gemini-video-watermark-remover"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#d0f471] hover:bg-white text-[#0b0f0d] font-black text-sm border-2 border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d]"
            >
              <span>Start Video Remover</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/background-remover"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white hover:bg-[#a8e6cf] text-[#0b0f0d] font-black text-sm border-2 border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d]"
            >
              Background Remover
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
