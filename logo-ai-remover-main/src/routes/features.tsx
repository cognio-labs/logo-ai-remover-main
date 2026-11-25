"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Eye,
  Film,
  Flame,
  Layers,
  Lock,
  Minus,
  Play,
  ShieldCheck,
  Sparkles,
  Video,
  WandSparkles,
  Zap,
} from "lucide-react";
import { PinkButton } from "@/components/site/PinkButton";
import { Keyboard } from "@/components/ui/keyboard";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "AI Tool Features — Background Remover, Image & Video Cleaner | Bellix.us" },
      {
        name: "description",
        content:
          "Explore all Bellix.us AI tool features: smart edge matting for background removal, brush-based watermark inpainting, PDF layer cleaning, and video frame reconstruction.",
      },
      { rel: "canonical", href: "https://www.bellix.us/features" },
      { property: "og:url", content: "https://www.bellix.us/features" },
      { property: "og:title", content: "AI Tool Features — Background Remover, Image & Video Cleaner" },
      { property: "og:image", content: "https://www.bellix.us/og-image.jpg" },
      { property: "og:image:secure_url", content: "https://www.bellix.us/og-image.jpg" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://www.bellix.us/og-image.jpg" },
    ],
  }),
  component: FeaturesPage,
});

export default function FeaturesPage() {
  const [activeTab, setActiveTab] = useState(0);

  const featureTabs = [
    {
      id: "temporal",
      title: "Temporal Consistency",
      tagline: "60 FPS Fluid Motion",
      desc: "Legacy tools process frames individually, causing distracting edge flicker and jitter. Our spatio-temporal model tracks motion vectors across adjacent frames for glass-smooth video playback.",
      bullets: [
        "Bidirectional optical flow prevents temporal shimmering",
        "Tracks watermarks across panning, zooming, and dynamic camera movements",
        "Tested up to 60 FPS 4K high-bitrate video clips",
      ],
      metric: "0% Edge Flicker",
      preview: "/gemini-example-after.mp4",
      isVideo: true,
    },
    {
      id: "inpainting",
      title: "Sub-Pixel Inpainting",
      tagline: "True Texture Reconstruction",
      desc: "Instead of smudging or blurring pixels, latent diffusion models synthesize the exact grain, lighting angle, skin pore structure, and background textures that originally existed.",
      bullets: [
        "Synthesizes natural skin tones, hair follicles, and complex patterns",
        "Maintains specular light reflections and liquid ripples",
        "Guarantees crisp borders without muddy discoloration",
      ],
      metric: "100% Texture Detail",
      preview: "/hero-after-clean.png",
      isVideo: false,
    },
    {
      id: "upscale",
      title: "4K / 8K Super Resolution",
      tagline: "Lossless High-Pass Polish",
      desc: "Cleaned outputs undergo a neural super-resolution pass that sharpens fine detail and expands dynamic range, producing broadcast-grade video masters.",
      bullets: [
        "Upscales 1080p source clips to crystal 4K UHD",
        "Enhances micro-contrast on text, edges, and fine foliage",
        "Compatible with HDR10 and 10-bit color depths",
      ],
      metric: "4X Pixel Density",
      preview: "/hero-ai-content.png",
      isVideo: false,
    },
    {
      id: "cloud",
      title: "NVIDIA H100 Cloud Speed",
      tagline: "< 3s Instant Processing",
      desc: "Backed by enterprise NVIDIA H100 Tensor Core GPUs, your videos and images are processed in seconds with dedicated high-throughput cloud queues.",
      bullets: [
        "Sub-3 second turnaround for standard images",
        "Handles 120-second 4K video clips in under 15 seconds",
        "99.99% server availability SLA with global CDN edge caching",
      ],
      metric: "10X Faster Rendering",
      preview: "/hero-after-clean.png",
      isVideo: false,
    },
  ];

  const comparison = [
    {
      feature: "Reconstructs Original Texture",
      bellix: "100% Neural Synthesis",
      blurTools: "Smudges with grey haze",
      manualPhotoshop: "Requires hours of painting",
    },
    {
      feature: "Temporal Video Consistency",
      bellix: "60 FPS Optical Flow (No flicker)",
      blurTools: "Heavy flickering / boiling edges",
      manualPhotoshop: "Impossible for video",
    },
    {
      feature: "Google Gemini & Veo Marks",
      bellix: "Automatic Native Detection",
      blurTools: "Manual crop required",
      manualPhotoshop: "Manual frame-by-frame stamping",
    },
    {
      feature: "Export Resolution",
      bellix: "Pristine 4K / 8K UHD",
      blurTools: "Degrades to 720p",
      manualPhotoshop: "Depends on user skill",
    },
    {
      feature: "Turnaround Time",
      bellix: "< 10 seconds (Automated)",
      blurTools: "~ 60 seconds",
      manualPhotoshop: "2 to 4 hours per clip",
    },
  ];

  const current = featureTabs[activeTab];

  return (
    <div className="min-h-screen bg-[#f7f5ee] text-[#0b0f0d] font-sans pb-24">
      {/* 1. HERO SECTION: INTERACTIVE STUDIO KEYBOARD & CONTROLS */}
      <section className="pt-16 pb-16 px-4 sm:px-6 lg:px-8 bg-[#f7f5ee] border-b-[3px] border-[#0b0f0d] relative overflow-hidden">
        <div className="relative mx-auto max-w-6xl text-center space-y-10">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] text-xs font-black text-[#0b0f0d] tracking-wider uppercase shadow-[3px_3px_0px_#0b0f0d]">
              <span className="size-2.5 rounded-sm bg-[#0b0f0d]" />
              <span>Tactile Neural Workflow • Hardware Showcase</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#0b0f0d]">
              Interactive Studio{" "}
              <span className="inline-block bg-[#d0f471] px-3 py-0.5 border-[2.5px] border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] text-[#0b0f0d]">
                Controls
              </span>
            </h1>

            <p className="text-sm sm:text-base text-[#1f2924] font-medium max-w-2xl mx-auto leading-relaxed">
              Control Bellix.us at the speed of thought. Press keys on your physical keyboard, click
              the virtual keycaps, or interact with the precision wireless mouse to trigger neural
              shortcuts with authentic switch acoustics.
            </p>
          </div>

          {/* Mac-Style White Studio Keyboard & Wireless Mouse Showcase */}
          <div className="relative pb-2">
            <Keyboard enableSound />
          </div>

          {/* Action quick links */}
          <div className="pt-2 pb-2 flex flex-wrap items-center justify-center gap-4">
            <PinkButton
              size="lg"
              className="px-8 py-3.5 font-black"
              asChild
            >
              <Link to="/gemini-video-watermark-remover">
                <span>Launch Studio Shortcut Hub</span>
                <ArrowRight className="size-4 ml-1.5" />
              </Link>
            </PinkButton>

            <Link
              to="/background-remover"
              className="px-6 py-3.5 rounded-lg text-sm font-black uppercase tracking-wide text-[#0b0f0d] bg-white hover:bg-[#ffe500] border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] transition-all"
            >
              Try Background Remover
            </Link>
          </div>
        </div>
      </section>

      {/* 2. HERO HIGHLIGHTS & INTRO */}
      <section className="pt-16 pb-14 px-4 sm:px-6 lg:px-8 bg-white text-center border-b-[3px] border-[#0b0f0d]">
        <div className="mx-auto max-w-4xl space-y-5">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#a8e6cf] border-2 border-[#0b0f0d] text-xs font-black uppercase tracking-wider text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]">
            <Sparkles className="size-3.5 text-[#0b0f0d]" />
            <span>State-of-the-Art Neural Features</span>
          </div>

          <h2 className="text-4xl sm:text-6xl font-black text-[#0b0f0d] tracking-tight">
            Designed for Creators Who Demand{" "}
            <span className="inline-block bg-[#ffe500] px-3 py-0.5 border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] text-[#0b0f0d]">
              Perfection
            </span>
          </h2>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#1f2924] font-medium leading-relaxed">
            Explore the advanced neural models powering Bellix.us. From spatio-temporal video
            tracking to AI background removal.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <PinkButton size="lg" className="font-black" asChild>
              <Link to="/gemini-video-watermark-remover">
                <Video className="size-4 mr-2" />
                <span>Try Video Remover</span>
              </Link>
            </PinkButton>
            <PinkButton variant="outline" size="lg" className="font-black" asChild>
              <Link to="/background-remover">Background Remover</Link>
            </PinkButton>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE FEATURE EXPLORER TABS */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto py-12">
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-10">
          {featureTabs.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(i)}
              className={`px-5 py-2.5 rounded-md text-xs font-black border-2 border-[#0b0f0d] transition-all cursor-pointer ${
                activeTab === i
                  ? "bg-[#d0f471] text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]"
                  : "bg-white text-[#0b0f0d] hover:bg-[#ffe500] shadow-[2px_2px_0px_#0b0f0d]"
              }`}
            >
              {tab.title}
            </button>
          ))}
        </div>

        {/* Active Feature Showcase Card */}
        <div className="rounded-xl p-8 sm:p-12 bg-white border-[2.5px] border-[#0b0f0d] shadow-[6px_6px_0px_#0b0f0d] grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-6 space-y-4 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] text-xs font-black text-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]">
              <Zap className="size-3.5" />
              <span>{current.tagline}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-[#0b0f0d]">{current.title}</h2>

            <p className="text-sm text-[#26302b] font-medium leading-relaxed">{current.desc}</p>

            <div className="space-y-2.5 pt-2 text-xs text-[#0b0f0d] font-bold">
              {current.bullets.map((b) => (
                <div key={b} className="flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 text-[#0b0f0d] shrink-0 mt-0.5 stroke-[2.5]" />
                  <span>{b}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t-2 border-[#0b0f0d] flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-mono text-[#26302b] font-bold block uppercase">
                  Benchmark Result
                </span>
                <span className="text-xl font-black text-[#0b0f0d] font-mono">
                  {current.metric}
                </span>
              </div>

              <Link
                to="/gemini-video-watermark-remover"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#d0f471] hover:bg-[#ffe500] text-[#0b0f0d] font-black text-xs border-2 border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]"
              >
                Test Live
              </Link>
            </div>
          </div>

          <div className="md:col-span-6">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d]">
              {current.isVideo ? (
                <video
                  src={current.preview}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="size-full object-cover"
                />
              ) : (
                <img src={current.preview} alt={current.title} className="size-full object-cover" />
              )}
              <div className="absolute top-3 right-3 px-3 py-1 rounded bg-[#d0f471] border-2 border-[#0b0f0d] text-[#0b0f0d] text-[11px] font-black">
                Active Neural Preview
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. DETAILED COMPARISON TABLE */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black text-[#0b0f0d]">
            Bellix.us vs Alternative Solutions
          </h2>
          <p className="text-xs sm:text-sm text-[#26302b] font-medium mt-2">
            See how true generative neural reconstruction compares to basic blur filters and manual
            editing.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border-[2.5px] border-[#0b0f0d] bg-white shadow-[6px_6px_0px_#0b0f0d]">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-[#ffe500] border-b-[2.5px] border-[#0b0f0d] text-[#0b0f0d]">
                <th className="py-4 px-6 font-black">Feature</th>
                <th className="py-4 px-6 font-black text-center bg-[#d0f471] border-x-2 border-[#0b0f0d]">
                  Bellix.us
                </th>
                <th className="py-4 px-6 font-black text-center">
                  Generic Blur Tools
                </th>
                <th className="py-4 px-6 font-black text-center">Manual Photoshop</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#0b0f0d]">
              {comparison.map((r) => (
                <tr key={r.feature} className="hover:bg-[#f7f5ee] transition-colors">
                  <td className="py-4 px-6 font-black text-[#0b0f0d]">{r.feature}</td>
                  <td className="py-4 px-6 text-center font-black text-[#0b0f0d] bg-[#d0f471]/35 border-x-2 border-[#0b0f0d]">
                    {r.bellix}
                  </td>
                  <td className="py-4 px-6 text-center font-medium text-[#26302b]">{r.blurTools}</td>
                  <td className="py-4 px-6 text-center font-medium text-[#26302b]">{r.manualPhotoshop}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. PERFORMANCE BENCHMARKS STATS */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 text-center">
          <div className="p-6 rounded-xl bg-[#d0f471] border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d]">
            <h3 className="text-4xl font-black text-[#0b0f0d] font-mono">0.4s</h3>
            <p className="text-xs text-[#0b0f0d] mt-1 font-bold">Watermark Detection</p>
          </div>
          <div className="p-6 rounded-xl bg-[#ffe500] border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d]">
            <h3 className="text-4xl font-black text-[#0b0f0d] font-mono">60 FPS</h3>
            <p className="text-xs text-[#0b0f0d] mt-1 font-bold">Optical Flow Tracking</p>
          </div>
          <div className="p-6 rounded-xl bg-[#a8e6cf] border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d]">
            <h3 className="text-4xl font-black text-[#0b0f0d] font-mono">8K</h3>
            <p className="text-xs text-[#0b0f0d] mt-1 font-bold">Max Upscale Resolution</p>
          </div>
          <div className="p-6 rounded-xl bg-white border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d]">
            <h3 className="text-4xl font-black text-[#0b0f0d] font-mono">99.9%</h3>
            <p className="text-xs text-[#0b0f0d] mt-1 font-bold">Removal Accuracy</p>
          </div>
        </div>
      </section>

      {/* 5. BOTTOM CTA */}
      <section className="py-16 text-center">
        <div className="max-w-xl mx-auto space-y-4 px-6 py-10 rounded-xl bg-[#ffe500] border-[3px] border-[#0b0f0d] shadow-[6px_6px_0px_#0b0f0d]">
          <h2 className="text-3xl font-black text-[#0b0f0d]">
            Ready to enhance your media?
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-[#0b0f0d]">
            Upload any Gemini or Veo video to see neural inpainting in action.
          </p>
          <div className="pt-2 flex items-center justify-center gap-4">
            <Link
              to="/gemini-video-watermark-remover"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-[#d0f471] hover:bg-white text-[#0b0f0d] font-black text-sm border-2 border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d]"
            >
              <span>Start Cleaning Now</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
