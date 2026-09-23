import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Layers,
  WandSparkles,
  ArrowRight,
  Target,
  HeartHandshake,
  Cpu,
} from "lucide-react";
import { PinkButton } from "@/components/site/PinkButton";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — Bellix.us" },
      {
        name: "description",
        content:
          "Learn about Bellix.us, our mission to empower creators with next-generation neural inpainting, and our visual fidelity technology.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FFF5F8] via-white to-[#FAFAFA] pt-16 pb-20 px-4 sm:px-6 lg:px-8 border-b border-[#FCE7EC]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-80 bg-gradient-to-br from-[#FFE4E9]/60 via-[#FFF1F4]/30 to-transparent blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#FCE7EC] shadow-2xs">
            <span className="flex size-2 rounded-full bg-[#E11D48] animate-pulse" />
            <span className="text-xs font-bold text-[#E11D48] tracking-wide">
              Craft Meets Next-Gen Artificial Intelligence
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-semibold text-gray-950 tracking-tight leading-[1.15]">
            Empowering Creators with{" "}
            <span className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] bg-clip-text text-transparent">
              Flawless Visual Freedom
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Bellix.us was founded on a simple vision: to give designers, video editors, and digital creators the power to restore, clean, and elevate any visual asset in seconds with zero loss in quality.
          </p>
        </div>
      </section>

      {/* Main Story & Philosophy */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-16">
          {/* Grid: Mission & Story */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm space-y-4">
              <div className="size-12 rounded-2xl bg-[#FFF1F4] flex items-center justify-center text-[#E11D48]">
                <Target className="size-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Our Mission</h2>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                We bridge the gap between creative craft and state-of-the-art neural computation. Where traditional editing software requires hours of meticulous manual retouching and cloning, Bellix.us’s deep learning models reconstruct covered textures, lighting angles, and grain instantly — letting solo creators ship work that previously required entire post-production studios.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm space-y-4">
              <div className="size-12 rounded-2xl bg-[#FFF1F4] flex items-center justify-center text-[#E11D48]">
                <Cpu className="size-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">The Technology</h2>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                Rather than applying crude blurs or smudged pixel fills, our neural inpainting engine uses multi-frame spatio-temporal flow vectors and latent diffusion. This guarantees pristine 4K/8K resolution fidelity, zero temporal flickering in video playback, and natural texture synthesis across every frame.
              </p>
            </div>
          </div>

          {/* Core Values / Features */}
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-semibold text-gray-900">What We Stand For</h2>
              <p className="text-gray-600 text-sm sm:text-base">Built by creators for creators, with speed, privacy, and precision at the core.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-xs space-y-3">
                <div className="size-10 rounded-xl bg-pink-50 flex items-center justify-center text-[#E11D48]">
                  <WandSparkles className="size-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Uncompromising Fidelity</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Every pixel matters. We train our algorithms to preserve fine details, natural skin tones, micro-textures, and high dynamic range lighting.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-xs space-y-3">
                <div className="size-10 rounded-xl bg-pink-50 flex items-center justify-center text-[#E11D48]">
                  <Zap className="size-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Instant Browser Workflows</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  No hefty installations or complex plugins needed. Access pro-grade AI video and image processing tools straight from your web browser.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-xs space-y-3">
                <div className="size-10 rounded-xl bg-pink-50 flex items-center justify-center text-[#E11D48]">
                  <ShieldCheck className="size-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Privacy & Security</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Your creative files are processed with end-to-end encryption and automatically purged from our cloud servers after download.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Banner */}
          <div className="rounded-3xl bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white p-8 sm:p-12 text-center space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#E11D48]/20 rounded-full blur-3xl pointer-events-none" />
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Ready to experience true visual clarity?
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm sm:text-base">
              Try our neural watermark remover and video enhancer directly online with zero setup required.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-4">
              <Link to="/">
                <PinkButton size="lg" className="px-8 shadow-lg">
                  <Sparkles className="size-4 mr-2" />
                  Try Free Now
                  <ArrowRight className="size-4 ml-2" />
                </PinkButton>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

