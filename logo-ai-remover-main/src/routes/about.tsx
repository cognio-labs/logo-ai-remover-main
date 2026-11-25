"use client";

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
      { title: "About Bellix.us — AI Creative Studio for Creators" },
      {
        name: "description",
        content:
          "Bellix.us is an AI creative studio built to help creators, developers, and businesses clean, restore, and enhance their media. Learn about our tools and values.",
      },
      { rel: "canonical", href: "https://www.bellix.us/about" },
      { property: "og:url", content: "https://www.bellix.us/about" },
      { property: "og:title", content: "About Bellix.us — AI Creative Studio for Creators" },
      { property: "og:image", content: "https://www.bellix.us/og-image.jpg" },
      { property: "og:image:secure_url", content: "https://www.bellix.us/og-image.jpg" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://www.bellix.us/og-image.jpg" },
    ],
  }),
  component: AboutPage,
});

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f7f5ee] text-[#0b0f0d]">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-white pt-16 pb-20 px-4 sm:px-6 lg:px-8 border-b-[3px] border-[#0b0f0d]">
        <div className="relative mx-auto max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]">
            <span className="flex size-2 rounded-full bg-[#0b0f0d]" />
            <span className="text-xs font-black text-[#0b0f0d] tracking-wide font-mono uppercase">
              Craft Meets Next-Gen Artificial Intelligence
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#0b0f0d] tracking-tight leading-[1.08]">
            Empowering Creators with{" "}
            <span className="inline-block px-3 py-0.5 rounded-md bg-[#d0f471] border-2 border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d]">
              Flawless Visual Freedom
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-[#26302b] font-semibold max-w-2xl mx-auto leading-relaxed">
            Bellix.us was founded on a simple vision: to give designers, video editors, and digital
            creators the power to restore, clean, and elevate any visual asset in seconds with zero
            loss in quality.
          </p>
        </div>
      </section>

      {/* Main Story & Philosophy */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-16">
          {/* Grid: Mission & Story */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            <div className="p-8 rounded-xl bg-white border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d] space-y-4">
              <div className="size-12 rounded-lg bg-[#d0f471] border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d] flex items-center justify-center text-[#0b0f0d]">
                <Target className="size-6 stroke-[2.4]" />
              </div>
              <h2 className="text-2xl font-black text-[#0b0f0d]">Our Mission</h2>
              <p className="text-[#26302b] font-medium leading-relaxed text-sm sm:text-base">
                We bridge the gap between creative craft and state-of-the-art neural computation.
                Where traditional editing software requires hours of meticulous manual retouching
                and cloning, Bellix.us’s deep learning models reconstruct covered textures, lighting
                angles, and grain instantly — letting solo creators ship work that previously
                required entire post-production studios.
              </p>
            </div>

            <div className="p-8 rounded-xl bg-white border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d] space-y-4">
              <div className="size-12 rounded-lg bg-[#ffe500] border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d] flex items-center justify-center text-[#0b0f0d]">
                <Cpu className="size-6 stroke-[2.4]" />
              </div>
              <h2 className="text-2xl font-black text-[#0b0f0d]">The Technology</h2>
              <p className="text-[#26302b] font-medium leading-relaxed text-sm sm:text-base">
                Rather than applying crude blurs or smudged pixel fills, our neural inpainting
                engine uses multi-frame spatio-temporal flow vectors and latent diffusion. This
                guarantees pristine 4K/8K resolution fidelity, zero temporal flickering in video
                playback, and natural texture synthesis across every frame.
              </p>
            </div>
          </div>

          {/* Core Values / Features */}
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl sm:text-4xl font-black text-[#0b0f0d]">What We Stand For</h2>
              <p className="text-[#26302b] font-medium text-sm sm:text-base">
                Built by creators for creators, with speed, privacy, and precision at the core.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl bg-white border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] space-y-3">
                <div className="size-10 rounded-lg bg-[#d0f471] border-2 border-[#0b0f0d] flex items-center justify-center text-[#0b0f0d]">
                  <WandSparkles className="size-5" />
                </div>
                <h3 className="text-lg font-black text-[#0b0f0d]">Uncompromising Fidelity</h3>
                <p className="text-[#26302b] font-medium text-sm leading-relaxed">
                  Every pixel matters. We train our algorithms to preserve fine details, natural
                  skin tones, micro-textures, and high dynamic range lighting.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-white border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] space-y-3">
                <div className="size-10 rounded-lg bg-[#ffe500] border-2 border-[#0b0f0d] flex items-center justify-center text-[#0b0f0d]">
                  <Zap className="size-5" />
                </div>
                <h3 className="text-lg font-black text-[#0b0f0d]">Instant Browser Workflows</h3>
                <p className="text-[#26302b] font-medium text-sm leading-relaxed">
                  No hefty installations or complex plugins needed. Access pro-grade AI video and
                  image processing tools straight from your web browser.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-white border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] space-y-3">
                <div className="size-10 rounded-lg bg-[#a8e6cf] border-2 border-[#0b0f0d] flex items-center justify-center text-[#0b0f0d]">
                  <ShieldCheck className="size-5" />
                </div>
                <h3 className="text-lg font-black text-[#0b0f0d]">Privacy &amp; Security</h3>
                <p className="text-[#26302b] font-medium text-sm leading-relaxed">
                  Your creative files are processed with end-to-end encryption and automatically
                  purged from our cloud servers after download.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Banner */}
          <div className="rounded-xl bg-[#ffe500] border-[3px] border-[#0b0f0d] text-[#0b0f0d] p-8 sm:p-12 text-center space-y-5 shadow-[7px_7px_0px_#0b0f0d]">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[#0b0f0d]">
              Ready to experience true visual clarity?
            </h2>
            <p className="text-[#0b0f0d] font-semibold max-w-xl mx-auto text-sm sm:text-base">
              Try our neural watermark remover and video enhancer directly online with zero setup
              required.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-4">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-[#d0f471] hover:bg-white text-[#0b0f0d] font-black border-2 border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] transition-all"
              >
                <Sparkles className="size-4" />
                <span>Try Free Now</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
