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
      { title: "Neural Features & Capabilities — PixelRefine AI" },
      {
        name: "description",
        content:
          "Explore PixelRefine's neural inpainting, 4K/8K super resolution, optical flow temporal tracking, and ultra-fast cloud GPU cluster.",
      },
    ],
  }),
  component: FeaturesPage,
});


function FeaturesPage() {
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
      pixelRefine: "100% Neural Synthesis",
      blurTools: "Smudges with grey haze",
      manualPhotoshop: "Requires hours of painting",
    },
    {
      feature: "Temporal Video Consistency",
      pixelRefine: "60 FPS Optical Flow (No flicker)",
      blurTools: "Heavy flickering / boiling edges",
      manualPhotoshop: "Impossible for video",
    },
    {
      feature: "Google Gemini & Veo Marks",
      pixelRefine: "Automatic Native Detection",
      blurTools: "Manual crop required",
      manualPhotoshop: "Manual frame-by-frame stamping",
    },
    {
      feature: "Export Resolution",
      pixelRefine: "Pristine 4K / 8K UHD",
      blurTools: "Degrades to 720p",
      manualPhotoshop: "Depends on user skill",
    },
    {
      feature: "Turnaround Time",
      pixelRefine: "< 10 seconds (Automated)",
      blurTools: "~ 60 seconds",
      manualPhotoshop: "2 to 4 hours per clip",
    },
  ];

  const current = featureTabs[activeTab];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-24">
      {/* 1. HERO SECTION: INTERACTIVE STUDIO KEYBOARD & CONTROLS */}
      <section className="pt-16 pb-16 px-4 sm:px-6 lg:px-8 bg-[#FAFAFA] border-b border-[#E5E5E5] relative overflow-hidden">
        {/* Subtle ambient light gradient */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-white/70 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative mx-auto max-w-6xl text-center space-y-10">
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFFFFF] border border-[#E5E5E5] text-xs font-bold text-[#171717] tracking-wider uppercase shadow-2xs">
              <span className="size-2 rounded-full bg-[#E11D48] animate-pulse" />
              <span>Tactile Neural Workflow • Mac Hardware Showcase</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#171717]">
              Interactive Studio{" "}
              <span className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] bg-clip-text text-transparent">
                Controls
              </span>
            </h1>

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

      {/* 2. HERO HIGHLIGHTS & INTRO */}
      <section className="pt-16 pb-14 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FFF5F8] via-white to-white text-center border-t border-[#FCE7EC]">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#FCE7EC] text-xs font-bold text-[#E11D48] shadow-2xs">
            <Sparkles className="size-3.5" />
            <span>State-of-the-Art Neural Features</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-semibold text-gray-950 tracking-tight">
            Designed for Creators Who Demand{" "}
            <span className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] bg-clip-text text-transparent">
              Perfection
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-600 font-normal leading-relaxed">
            Explore the advanced neural models powering PixelRefine AI. From spatio-temporal video
            tracking to 8K super-resolution upscaling.
          </p>

          <div className="pt-4 flex items-center justify-center gap-4">
            <PinkButton size="lg" className="font-bold shadow-md" asChild>
              <Link to="/gemini-video-watermark-remover">
                <Video className="size-4 mr-2" />
                <span>Try Video Remover</span>
              </Link>
            </PinkButton>
            <PinkButton variant="outline" size="lg" className="font-bold" asChild>
              <Link to="/pricing">See Pricing Plans</Link>
            </PinkButton>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE FEATURE EXPLORER TABS */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto py-12">
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {featureTabs.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(i)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === i
                  ? "bg-[#E11D48] text-white shadow-md shadow-rose-200"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-[#FCE7EC]"
              }`}
            >
              {tab.title}
            </button>
          ))}
        </div>

        {/* Active Feature Showcase Card */}
        <div className="rounded-3xl p-8 sm:p-12 bg-[#FFF8FA] border border-[#FCE7EC] shadow-sm grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-6 space-y-4 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#FCE7EC] text-xs font-bold text-[#E11D48]">
              <Zap className="size-3.5" />
              <span>{current.tagline}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-semibold text-gray-950">{current.title}</h2>

            <p className="text-sm text-gray-600 leading-relaxed">{current.desc}</p>

            <div className="space-y-2.5 pt-2 text-xs text-gray-700">
              {current.bullets.map((b) => (
                <div key={b} className="flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 text-[#E11D48] shrink-0 mt-0.5" />
                  <span>{b}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#FCE7EC] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-gray-400 block uppercase">
                  Benchmark Result
                </span>
                <span className="text-xl font-semibold text-[#E11D48] font-mono">{current.metric}</span>
              </div>

              <PinkButton size="sm" asChild>
                <Link to="/gemini-video-watermark-remover">Test Live</Link>
              </PinkButton>
            </div>
          </div>

          <div className="md:col-span-6">
            <div className="relative aspect-video rounded-3xl overflow-hidden bg-black border-2 border-white shadow-xl">
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
                <img
                  src={current.preview}
                  alt={current.title}
                  className="size-full object-cover"
                />
              )}
              <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/75 text-white text-[11px] font-bold backdrop-blur-md">
                Active Neural Preview
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. DETAILED COMPARISON TABLE */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-serif font-normal text-gray-950">
            PixelRefine vs Alternative Solutions
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            See how true generative neural reconstruction compares to basic blur filters and manual
            editing.
          </p>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-[#FCE7EC] bg-white shadow-2xs">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-[#FFF8FA] border-b border-[#FCE7EC] text-gray-900">
                <th className="py-4 px-6 font-bold">Feature</th>
                <th className="py-4 px-6 font-bold text-center text-[#E11D48] bg-[#FFF1F4]">
                  PixelRefine AI
                </th>
                <th className="py-4 px-6 font-bold text-center text-gray-600">Generic Blur Tools</th>
                <th className="py-4 px-6 font-bold text-center text-gray-600">Manual Photoshop</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FCE7EC]/60">
              {comparison.map((r) => (
                <tr key={r.feature} className="hover:bg-[#FFFDFC] transition-colors">
                  <td className="py-4 px-6 font-semibold text-gray-900">{r.feature}</td>
                  <td className="py-4 px-6 text-center font-bold text-[#E11D48] bg-[#FFF1F4]/30">
                    {r.pixelRefine}
                  </td>
                  <td className="py-4 px-6 text-center text-gray-500">{r.blurTools}</td>
                  <td className="py-4 px-6 text-center text-gray-500">{r.manualPhotoshop}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. PERFORMANCE BENCHMARKS STATS */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-6 rounded-2xl bg-[#FFF8FA] border border-[#FCE7EC]">
            <h3 className="text-4xl font-semibold text-gray-950 font-mono">0.4s</h3>
            <p className="text-xs text-gray-500 mt-1 font-medium">Watermark Detection</p>
          </div>
          <div className="p-6 rounded-2xl bg-[#FFF8FA] border border-[#FCE7EC]">
            <h3 className="text-4xl font-semibold text-gray-950 font-mono">60 FPS</h3>
            <p className="text-xs text-gray-500 mt-1 font-medium">Optical Flow Tracking</p>
          </div>
          <div className="p-6 rounded-2xl bg-[#FFF8FA] border border-[#FCE7EC]">
            <h3 className="text-4xl font-semibold text-[#E11D48] font-mono">8K</h3>
            <p className="text-xs text-gray-500 mt-1 font-medium">Max Upscale Resolution</p>
          </div>
          <div className="p-6 rounded-2xl bg-[#FFF8FA] border border-[#FCE7EC]">
            <h3 className="text-4xl font-semibold text-gray-950 font-mono">99.9%</h3>
            <p className="text-xs text-gray-500 mt-1 font-medium">Removal Accuracy</p>
          </div>
        </div>
      </section>

      {/* 5. BOTTOM CTA */}
      <section className="py-16 text-center">
        <div className="max-w-xl mx-auto space-y-4 px-4">
          <h2 className="text-3xl font-serif font-normal text-gray-950">
            Ready to enhance your media?
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            Upload any Gemini or Veo video to see neural inpainting in action.
          </p>
          <div className="pt-2 flex items-center justify-center gap-4">
            <PinkButton size="lg" className="font-bold shadow-md" asChild>
              <Link to="/gemini-video-watermark-remover">
                <span>Start Cleaning Now</span>
                <ArrowRight className="size-4 ml-1.5" />
              </Link>
            </PinkButton>
          </div>
        </div>
      </section>
    </div>
  );
}
