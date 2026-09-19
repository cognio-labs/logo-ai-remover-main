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
      { title: "How It Works — PixelRefine AI Neural Architecture" },
      {
        name: "description",
        content:
          "Discover how PixelRefine AI reconstructs marked video frames and images using 4-stage spatio-temporal neural inpainting without blur or flicker.",
      },
    ],
  }),
  component: HowItWorksPage,
});

function HowItWorksPage() {
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
    { ext: "JPG / JPEG", type: "Image", desc: "Standard photographic format with high compression" },
    { ext: "WebP", type: "Image", desc: "Modern web format with lossy and lossless modes" },
    { ext: "HEIC", type: "Image", desc: "Apple iPhone high-efficiency photos" },
  ];

  const currentStage = stages[activeStage];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-24">
      {/* 1. HERO SECTION */}
      <section className="pt-16 pb-14 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FFF5F8] via-white to-white text-center">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#FCE7EC] text-xs font-bold text-[#E11D48] shadow-2xs">
            <Cpu className="size-3.5" />
            <span>Behind The Scenes • Neural Architecture</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-semibold text-gray-950 tracking-tight">
            How PixelRefine AI{" "}
            <span className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] bg-clip-text text-transparent">
              Restores Every Frame
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-600 font-normal leading-relaxed">
            Unlike legacy tools that simply blur or smudge marked pixels, PixelRefine employs a
            four-stage spatio-temporal pipeline that reconstructs true underlying texture.
          </p>

          <div className="pt-4 flex items-center justify-center gap-4">
            <PinkButton size="lg" className="font-bold shadow-md" asChild>
              <Link to="/gemini-video-watermark-remover">
                <Video className="size-4 mr-2" />
                <span>Test With Your Video</span>
              </Link>
            </PinkButton>
          </div>
        </div>
      </section>

      {/* 2. THE 4-STAGE PIPELINE INTERACTIVE SELECTOR */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto py-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-4xl font-serif font-normal text-gray-950">
            The 4-Stage Spatio-Temporal Pipeline
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Click each stage to inspect the technical process and neural execution.
          </p>
        </div>

        {/* Stage Selector Pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {stages.map((st, i) => (
            <button
              key={st.step}
              onClick={() => setActiveStage(i)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                activeStage === i
                  ? "bg-white border-2 border-[#E11D48] shadow-md shadow-rose-100 ring-2 ring-[#FFF1F4]"
                  : "bg-[#FFFDFC] border-[#FCE7EC] hover:bg-white hover:border-[#FDA4AF]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-semibold text-[#E11D48]">{st.step}</span>
                {activeStage === i && <span className="size-2 rounded-full bg-[#E11D48]" />}
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-gray-950 leading-snug">
                {st.title}
              </h4>
            </button>
          ))}
        </div>

        {/* Active Stage Deep-Dive Card */}
        <div className="rounded-3xl p-8 sm:p-10 bg-[#FFF8FA] border border-[#FCE7EC] shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7 space-y-4 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#FCE7EC] text-xs font-bold text-[#E11D48]">
              {currentStage.icon}
              <span>{currentStage.badge}</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-bold text-gray-950">{currentStage.title}</h3>

            <p className="text-sm text-gray-700 leading-relaxed font-normal">
              {currentStage.summary}
            </p>

            <div className="space-y-2 pt-2 text-xs text-gray-600">
              {currentStage.details.map((d, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                  <span>{d}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#FCE7EC] flex items-center gap-2">
              <span className="text-xs text-gray-400 uppercase font-mono font-bold">
                Neural Engine:
              </span>
              <span className="text-xs font-mono font-bold text-[#E11D48] bg-white px-2.5 py-1 rounded-lg border border-[#FCE7EC]">
                {currentStage.techSpec}
              </span>
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="rounded-2xl bg-white border border-[#FCE7EC] p-4 shadow-sm space-y-3">
              <div className="text-xs font-bold text-gray-800 flex items-center justify-between">
                <span>Real-Time Stage Output</span>
                <span className="text-green-600 font-mono text-[11px]">0.42s Latency</span>
              </div>
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black">
                <img
                  src="/hero-after-clean.png"
                  alt="Stage Result"
                  className="size-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white text-xs">
                  <span className="font-bold">Active Pass: </span>
                  <span className="font-mono text-rose-200">{currentStage.title}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE BEFORE & AFTER SLIDER SHOWCASE */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="space-y-3 mb-8">
          <h2 className="text-3xl font-serif font-normal text-gray-950">
            Inspect the Reconstruction Quality
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 max-w-xl mx-auto">
            Drag the handle to compare original watermarked media with the four-stage AI cleaned
            output.
          </p>
        </div>

        <div className="rounded-3xl p-3 sm:p-4 bg-white border border-[#FCE7EC] shadow-[0_20px_50px_-15px_rgba(225,29,72,0.18)]">
          <BeforeAfterSlider
            beforeSrc="/hero-before-gemini.png"
            src="/hero-after-clean.png"
            labelBefore="Original (Gemini Mark)"
            labelAfter="Neural Inpainted (4K Output)"
            badge="100% Cleaned"
          />
        </div>
      </section>

      {/* 4. SUPPORTED FORMATS GRID */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-3xl font-serif font-normal text-gray-950">
            Supported Media Formats
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            Upload from mobile, desktop, studio cameras, or web exports with full container support.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {formats.map((f) => (
            <div
              key={f.ext}
              className="p-5 rounded-2xl bg-[#FFF8FA] border border-[#FCE7EC] hover:border-[#FDA4AF] transition-all space-y-1.5 text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold font-mono text-[#E11D48]">{f.ext}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white font-bold text-gray-500 border border-gray-100">
                  {f.type}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-snug">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. BEST PRACTICES GUIDE */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="rounded-3xl p-8 bg-white border-2 border-[#FCE7EC] space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <Zap className="size-6 text-[#E11D48]" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Pro Tips for Flawless Results</h3>
              <p className="text-xs text-gray-500">How to get the highest visual fidelity</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-gray-700">
            <div className="space-y-1.5">
              <h4 className="font-bold text-gray-900">1. Upload Highest Native Resolution</h4>
              <p className="text-gray-500 leading-relaxed">
                Whenever possible, provide uncompressed 1080p or 4K files. The more surrounding
                pixel detail available, the sharper the inpainting texture will be.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-gray-900">2. Continuous Frame Continuity</h4>
              <p className="text-gray-500 leading-relaxed">
                Ensure your video clip has at least 1-2 seconds of smooth camera motion around the
                watermark area to allow our optical flow model to synthesize background data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BOTTOM CTA */}
      <section className="py-16 text-center">
        <div className="max-w-xl mx-auto space-y-4 px-4">
          <h2 className="text-3xl font-serif font-normal text-gray-950">
            Experience the neural difference
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            Remove watermarks from your first video or photo right now.
          </p>
          <div className="pt-2 flex items-center justify-center gap-4">
            <PinkButton size="lg" className="font-bold shadow-md" asChild>
              <Link to="/gemini-video-watermark-remover">
                <span>Start Video Remover</span>
                <ArrowRight className="size-4 ml-1.5" />
              </Link>
            </PinkButton>
            <PinkButton variant="outline" size="lg" className="font-bold" asChild>
              <Link to="/pricing">Explore Pricing</Link>
            </PinkButton>
          </div>
        </div>
      </section>
    </div>
  );
}
