"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Download,
  Upload,
  ArrowRight,
  ShieldCheck,
  FileVideo,
  Monitor,
  Crop,
  Layers,
  Check,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { JobVideoCleaner } from "@/components/site/JobVideoCleaner";
import { VideoTrustBadges } from "@/components/site/VideoTrustBadges";
import { HowItWorksGuide } from "@/components/site/HowItWorksGuide";
import { howItWorksGuides } from "@/data/howItWorksGuides";

export const Route = createFileRoute("/gemini-video-watermark-remover")({
  head: () => ({
    meta: [
      { title: "AI Video Watermark Remover — Remove Gemini & Veo Watermarks | Bellix.us" },
      {
        name: "description",
        content:
          "Remove Google Gemini stars and Veo video watermarks frame by frame with AI. Restore clean video with consistent motion and no blur — supports MP4 and MOV.",
      },
      { rel: "canonical", href: "https://www.bellix.us/gemini-video-watermark-remover" },
      { property: "og:url", content: "https://www.bellix.us/gemini-video-watermark-remover" },
      { property: "og:title", content: "AI Video Watermark Remover — Remove Gemini & Veo Watermarks" },
      {
        property: "og:description",
        content:
          "Remove Google Gemini stars and Veo video watermarks with AI. Supports MP4 and MOV. Clean, flicker-free results.",
      },
      { property: "og:image", content: "https://www.bellix.us/og-image.jpg" },
      { property: "og:image:secure_url", content: "https://www.bellix.us/og-image.jpg" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Bellix.us — AI Video Watermark Remover" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "AI Video Watermark Remover — Remove Gemini & Veo Watermarks" },
      {
        name: "twitter:description",
        content:
          "Remove Google Gemini stars and Veo video watermarks with AI. Supports MP4 and MOV. Clean, flicker-free results.",
      },
      { name: "twitter:image", content: "https://www.bellix.us/og-image.jpg" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "AI Video Watermark Remover",
          url: "https://www.bellix.us/gemini-video-watermark-remover",
          applicationCategory: "VideoEditor",
          operatingSystem: "Web",
          description:
            "Remove Google Gemini and Veo video watermarks online using AI frame reconstruction. Supports MP4 and MOV formats.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          provider: { "@type": "Organization", name: "Bellix.us", url: "https://www.bellix.us/" },
        }),
      },
    ],
  }),
  component: GeminiVideoRemoverPage,
});

const INSPIRATION_ITEMS = [
  {
    id: 1,
    img: "/inspirations/insp_1.webp",
    title: "Cool Puppy Sunglasses",
    category: "Character Design",
    prompt:
      "A stylish cute golden puppy wearing sunglasses and yellow turtleneck knitted sweater, soft lighting, 8k",
  },
  {
    id: 2,
    img: "/inspirations/insp_2.webp",
    title: "Astronaut in Floral Cave",
    category: "Illustration",
    prompt:
      "An astronaut standing in a surreal blooming orange flower cavern tunnel, golden hour glow, volumetric rays",
  },
  {
    id: 3,
    img: "/inspirations/insp_3.webp",
    title: "Baseball Batter Motion",
    category: "Video Storyboard",
    prompt:
      "Dynamic slow motion shot of a professional baseball player hitting a fastball under stadium floodlights",
  },
  {
    id: 4,
    img: "/inspirations/insp_4.webp",
    title: "Cyberpunk VR Visor",
    category: "Product Design",
    prompt:
      "Futuristic VR headset eyewear worn by a model in a neon purple cyber room, photorealistic reflections",
  },
  {
    id: 5,
    img: "/inspirations/insp_5.webp",
    title: "Pastel Flower Portrait",
    category: "Poster Advertising",
    prompt:
      "Editorial beauty portrait of a Korean woman holding pink wildflowers against vivid sky blue background",
  },
  {
    id: 6,
    img: "/inspirations/insp_6.webp",
    title: "Pop Art Mouth Logo",
    category: "Brand Design",
    prompt:
      "Bold minimalist vector illustration of an open smiling mouth with teeth and red tongue, sticker art style",
  },
  {
    id: 7,
    img: "/inspirations/insp_7.webp",
    title: "Neon Studio Headphones",
    category: "UI Design",
    prompt:
      "Woman with closed eyes enjoying music with wireless headphones, split green and magenta neon gel lighting",
  },
  {
    id: 8,
    img: "/inspirations/insp_8.webp",
    title: "Classic B&W Editorial",
    category: "Poster Advertising",
    prompt:
      "High fashion black and white studio portrait with dramatic textured concrete backdrop and soft directional light",
  },
  {
    id: 9,
    img: "/inspirations/insp_9.webp",
    title: "Futuristic Sports Car",
    category: "Product Design",
    prompt:
      "Sleek aerodynamic concept hypercar glowing with red rear LED lightbars parked in a reflective wet hangar",
  },
  {
    id: 10,
    img: "/inspirations/insp_10.webp",
    title: "Glassmorphism UI Concept",
    category: "UI Design",
    prompt:
      "Ultra-modern iOS and web dashboard with transparent frosted glass widgets, pink accents and smooth charts",
  },
  {
    id: 11,
    img: "/inspirations/insp_11.webp",
    title: "Architectural Villa Sunset",
    category: "Architecture Design",
    prompt:
      "Minimalist concrete desert villa with infinity pool reflecting warm orange sunset and silhouette palms",
  },
  {
    id: 12,
    img: "/inspirations/insp_12.webp",
    title: "Anime City Sunset",
    category: "Illustration",
    prompt:
      "Makoto Shinkai style anime rooftop overlooking Tokyo metropolis during golden dusk with fluffy clouds",
  },
  {
    id: 13,
    img: "/inspirations/insp_13.webp",
    title: "Liquid Splash Cosmetics",
    category: "Product Design",
    prompt:
      "Luxury glass perfume bottle emerging from crystal clear aqua water ripples with floating rose petals",
  },
  {
    id: 14,
    img: "/inspirations/insp_14.webp",
    title: "Fantasy Dragon Castle",
    category: "Video Storyboard",
    prompt:
      "Cinematic drone shot flying through jagged mountain peaks towards a glowing mystical medieval citadel",
  },
  {
    id: 15,
    img: "/inspirations/insp_15.webp",
    title: "Vibrant Typography Poster",
    category: "Poster Advertising",
    prompt:
      "Swiss style typography poster with overlapping 3D gradient letters, geometric shapes and chromatic aberration",
  },
  {
    id: 16,
    img: "/inspirations/insp_16.webp",
    title: "Vintage Cinema Color Grading",
    category: "Video Storyboard",
    prompt:
      "35mm film still with warm nostalgic amber tones of a couple sitting in an American diner at midnight",
  },
  {
    id: 17,
    img: "/inspirations/insp_17.webp",
    title: "Isometric Smart Home",
    category: "Architecture Design",
    prompt:
      "3D isometric cutaway diagram of an eco-friendly modern smart home with solar panels and rooftop garden",
  },
  {
    id: 18,
    img: "/inspirations/insp_18.webp",
    title: "Geometric Brand Identity",
    category: "Brand Design",
    prompt:
      "Stationery mockup showcasing minimalist embossed business cards, copper foil logo and linen paper textures",
  },
  {
    id: 19,
    img: "/inspirations/insp_19.webp",
    title: "Cybernetic Android Robot",
    category: "Character Design",
    prompt:
      "Close up portrait of an elegant white ceramic humanoid android with glowing blue optical sensors",
  },
  {
    id: 20,
    img: "/inspirations/insp_20.webp",
    title: "Bioluminescent Jellyfish",
    category: "Illustration",
    prompt:
      "Deep ocean underwater shot of translucent glowing jellyfish emitting soft cyan and violet light pulses",
  },
  {
    id: 21,
    img: "/inspirations/insp_21.webp",
    title: "Claymation Retro Drive",
    category: "Character Design",
    prompt:
      "Stop-motion claymation animated scene of a girl with wavy clay hair driving a vintage teal convertible at sunset",
  },
];

const VIDEO_FAQS = [
  {
    question: "Can I upload my own video?",
    answer:
      "Choose an MP4, MOV, WebM or MKV clip up to 500 MB.",
  },
  {
    question: "Will the output keep the original quality?",
    answer:
      "The MP4 export keeps the source dimensions and frame timing. H.264 re-encodes the picture, and incompatible audio tracks are converted to AAC.",
  },
  {
    question: "Where is the Gemini mark shown?",
    answer:
      "In the demonstration, the Gemini mark is shown only on the Before frame. The After frame stays clean so the comparison is easy to inspect.",
  },
  {
    question: "Can I download the result?",
    answer:
      "Yes. Video downloads as MP4 and images download as full-resolution PNG. JPG uploads also get a quality-95 JPG option.",
  },
];

const CATEGORIES = [
  "All",
  "UI Design",
  "Poster Advertising",
  "Product Design",
  "Brand Design",
  "Illustration",
  "Character Design",
  "Video Storyboard",
  "Architecture Design",
  "Other",
];

export default function GeminiVideoRemoverPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeModalItem, setActiveModalItem] = useState<(typeof INSPIRATION_ITEMS)[0] | null>(null);

  const filteredInspirations =
    selectedCategory === "All"
      ? INSPIRATION_ITEMS
      : INSPIRATION_ITEMS.filter((item) => item.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#f7f5ee] text-[#0b0f0d] font-sans pb-24">
      {/* 1. HERO & UPLOAD SECTION */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 lg:px-8 bg-white text-[#0b0f0d] border-b-[3px] border-[#0b0f0d] overflow-hidden">
        <div className="relative mx-auto max-w-7xl z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Copy (lg:col-span-5) */}
            <div className="lg:col-span-5 space-y-6 text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]">
                <img src="/gemini-logo.png" alt="Gemini" className="size-4 object-contain" />
                <span className="text-xs sm:text-sm font-black text-[#0b0f0d] tracking-wide uppercase font-mono">
                  Gemini &amp; Veo Video Cleaner
                </span>
              </div>

              {/* Main Heading */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-[#0b0f0d] tracking-tight leading-[1.04]">
                Remove Gemini and Veo Video Watermarks.
              </h1>

              {/* Subheading */}
              <p className="text-lg sm:text-xl text-[#26302b] font-semibold leading-relaxed max-w-xl">
                Remove supported visible sparkle marks from your original Gemini or Veo export.
                Processing starts as soon as you choose a video.
              </p>

              {/* 3 Value Points — High-contrast Brutalist Cards */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#d0f471] border-2 border-[#0b0f0d] text-xs sm:text-sm font-black text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]">
                  <CheckCircle2 className="size-4 text-[#0b0f0d] shrink-0 stroke-[2.5]" />
                  <span>Original resolution</span>
                </span>
                <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-white border-2 border-[#0b0f0d] text-xs sm:text-sm font-black text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]">
                  <ShieldCheck className="size-4 text-[#0b0f0d] shrink-0 stroke-[2.5]" />
                  <span>100% Private &amp; secure</span>
                </span>
                <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#a8e6cf] border-2 border-[#0b0f0d] text-xs sm:text-sm font-black text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]">
                  <Zap className="size-4 text-[#0b0f0d] shrink-0 stroke-[2.5]" />
                  <span>Fast AI inpainting</span>
                </span>
              </div>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white hover:bg-[#ffe500] border-2 border-[#0b0f0d] text-sm font-black text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] transition-all"
              >
                <span>See how it works</span>
                <ArrowRight className="size-4 stroke-[2.5]" />
              </a>
            </div>

            {/* Right: JobVideoCleaner Upload Area (lg:col-span-7) */}
            <div className="lg:col-span-7 w-full">
              <JobVideoCleaner />
            </div>
          </div>

          {/* Trust Guarantees */}
          <div className="mt-12 sm:mt-16 pt-8 border-t-[2.5px] border-[#0b0f0d]">
            <VideoTrustBadges />
          </div>
        </div>
      </section>

      <HowItWorksGuide guide={howItWorksGuides.en.geminiVideo} />

      {/* 2. BENTO GRID FEATURES SECTION */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#f7f5ee] border-b-[3px] border-[#0b0f0d]">
        <div className="mx-auto max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]">
              <img src="/gemini-logo.png" alt="Gemini Logo" className="size-3.5" />
              <span className="text-xs font-black text-[#0b0f0d] uppercase font-mono">Fixed sparkle matte</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-[#0b0f0d] tracking-tight">
              Remove the visible mark while keeping the full frame and smooth motion
            </h2>
          </div>

          {/* Feature cards — 2x2 bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: ShieldCheck,
                title: "Restore the marked area frame by frame",
                desc: "Detect visible Gemini and Veo marks across adjacent frames while aiming to keep motion, color, and texture consistent.",
                badge: "Reverse alpha blending",
                accent: "bg-[#d0f471]",
              },
              {
                icon: FileVideo,
                title: "Full-length video processing",
                desc: "Upload MP4, MOV, WebM or MKV and export an MP4 at source resolution.",
                badge: "4 upload formats",
                accent: "bg-[#ffe500]",
              },
              {
                icon: Monitor,
                title: "Dedicated video worker",
                desc: "The worker deletes the upload after processing and keeps the result available for 15 minutes.",
                badge: "Temporary storage",
                accent: "bg-[#a8e6cf]",
              },
              {
                icon: Crop,
                title: "Full-frame aware cleanup",
                desc: "Cleans the watermark area directly instead of cutting away the edges, so the original frame stays intact at full resolution.",
                badge: "Zero crop",
                accent: "bg-[#bae6fd]",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="p-7 sm:p-9 rounded-xl bg-white border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0px_#0b0f0d] transition-all duration-150 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className={`size-14 rounded-lg ${card.accent} border-2 border-[#0b0f0d] text-[#0b0f0d] flex items-center justify-center shadow-[3px_3px_0px_#0b0f0d]`}>
                      <card.icon className="size-7 stroke-[2.3]" />
                    </div>
                    <span className="px-3 py-1 rounded-md text-xs font-black bg-[#f7f5ee] text-[#0b0f0d] border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]">
                      {card.badge}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-[#0b0f0d]">{card.title}</h3>
                  <p className="text-sm sm:text-base text-[#26302b] font-medium leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. "REMOVE A GEMINI VIDEO WATERMARK IN 3 STEPS" SECTION */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white border-b-[3px] border-[#0b0f0d]">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0b0f0d] tracking-tight mb-14">
            Remove a Gemini video watermark in 3 steps
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-7 sm:p-8 rounded-xl bg-[#d0f471] border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d]">
              <div className="size-16 rounded-lg bg-white border-2 border-[#0b0f0d] text-[#0b0f0d] flex items-center justify-center mb-5 shadow-[3px_3px_0px_#0b0f0d]">
                <Upload className="size-7 stroke-[2.4]" />
              </div>
              <span className="px-2.5 py-0.5 rounded bg-[#0b0f0d] text-[#d0f471] text-xs font-black uppercase tracking-widest mb-3 font-mono">
                Step 01
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#0b0f0d] mb-2">Upload your clip</h3>
              <p className="text-sm sm:text-base text-[#0b0f0d] leading-relaxed font-semibold">
                Choose an MP4, MOV, WebM or MKV file up to 500 MB.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-7 sm:p-8 rounded-xl bg-[#ffe500] border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d]">
              <div className="size-16 rounded-lg bg-white border-2 border-[#0b0f0d] text-[#0b0f0d] flex items-center justify-center mb-5 shadow-[3px_3px_0px_#0b0f0d]">
                <Sparkles className="size-7 stroke-[2.4]" />
              </div>
              <span className="px-2.5 py-0.5 rounded bg-[#0b0f0d] text-[#ffe500] text-xs font-black uppercase tracking-widest mb-3 font-mono">
                Step 02
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#0b0f0d] mb-2">Mark and clean the logo</h3>
              <p className="text-sm sm:text-base text-[#0b0f0d] leading-relaxed font-semibold">
                The worker detects the sparkle automatically. Use Manual position to point it at the
                sparkle if automatic detection misses.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-7 sm:p-8 rounded-xl bg-[#a8e6cf] border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d]">
              <div className="size-16 rounded-lg bg-white border-2 border-[#0b0f0d] text-[#0b0f0d] flex items-center justify-center mb-5 shadow-[3px_3px_0px_#0b0f0d]">
                <Download className="size-7 stroke-[2.4]" />
              </div>
              <span className="px-2.5 py-0.5 rounded bg-[#0b0f0d] text-[#a8e6cf] text-xs font-black uppercase tracking-widest mb-3 font-mono">
                Step 03
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#0b0f0d] mb-2">Download the result</h3>
              <p className="text-sm sm:text-base text-[#0b0f0d] leading-relaxed font-semibold">
                When processing finishes, download the cleaned MP4 from the task result.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FAQ: Clear Answers */}
      <section className="border-b-[3px] border-[#0b0f0d] bg-[#f7f5ee] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div>
            <span className="inline-block px-3 py-1 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d] text-xs font-black uppercase tracking-wider font-mono text-[#0b0f0d]">
              Clear answers
            </span>
            <h2 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight text-[#0b0f0d]">
              Questions before you start
            </h2>
            <p className="mt-4 max-w-md text-base sm:text-lg font-medium leading-relaxed text-[#26302b]">
              A simple workflow, an easy-to-read comparison, and clear expectations about processing
              and downloads.
            </p>
          </div>
          <div className="divide-y-2 divide-[#0b0f0d] rounded-xl border-[2.5px] border-[#0b0f0d] bg-white px-6 sm:px-8 shadow-[6px_6px_0px_#0b0f0d]">
            {VIDEO_FAQS.map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-left text-base sm:text-lg font-black text-[#0b0f0d] marker:content-none">
                  {faq.question}
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md border-2 border-[#0b0f0d] bg-[#f7f5ee] text-xl font-black text-[#0b0f0d] group-open:bg-[#d0f471] transition-transform group-open:rotate-45 shadow-[2px_2px_0px_#0b0f0d]">
                    +
                  </span>
                </summary>
                <p className="max-w-xl pt-4 text-sm sm:text-base font-medium leading-relaxed text-[#26302b]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 7. "DISCOVER INSPIRATIONS" GALLERY SECTION (21 High-Definition AI Images) */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white" id="inspirations">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#a8e6cf] border-2 border-[#0b0f0d] text-xs font-black text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] font-mono uppercase">
              <Layers className="size-3.5 text-[#0b0f0d]" />
              <span>Prompt Inspiration Library</span>
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0b0f0d] tracking-tight">
              Discover Inspirations
            </h2>
            <p className="text-base sm:text-lg font-medium text-[#26302b]">
              Pick a prompt you love and start creating high-definition videos &amp; imagery
            </p>
          </div>

          {/* Category Filter Tabs (Pills) */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-12">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-md text-xs font-black border-2 border-[#0b0f0d] transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-[#d0f471] text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]"
                    : "bg-white text-[#0b0f0d] hover:bg-[#ffe500] shadow-[2px_2px_0px_#0b0f0d]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid of 21 User Inspiration Cards with Visible Prompts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredInspirations.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveModalItem(item)}
                className="group relative rounded-xl overflow-hidden bg-white border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0px_#0b0f0d] transition-all duration-150 cursor-pointer flex flex-col justify-between"
              >
                {/* Visual Card Image */}
                <div className="relative aspect-[4/3] sm:aspect-[3/4] overflow-hidden bg-[#0b0f0d]">
                  <img
                    src={item.img}
                    alt={item.title}
                    loading="lazy"
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <span className="px-2.5 py-0.5 rounded bg-[#ffe500] border-2 border-[#0b0f0d] text-[10px] font-black text-[#0b0f0d] uppercase tracking-wider shadow-[2px_2px_0px_#0b0f0d]">
                      {item.category}
                    </span>
                  </div>
                </div>

                {/* Card Details: Title & Prompt */}
                <div className="p-4 sm:p-5 bg-white flex flex-col justify-between flex-1 border-t-[2.5px] border-[#0b0f0d] space-y-3">
                  <div className="flex items-center justify-between gap-1.5">
                    <h4 className="text-sm sm:text-base font-black text-[#0b0f0d] truncate leading-snug">
                      {item.title}
                    </h4>
                    <span className="shrink-0 text-[10px] font-mono font-black text-[#0b0f0d] bg-[#d0f471] px-2 py-0.5 rounded border border-[#0b0f0d]">
                      Prompt
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-[#26302b] line-clamp-2 leading-relaxed bg-[#f7f5ee] p-3 rounded-lg border-2 border-[#0b0f0d] font-medium">
                    "{item.prompt}"
                  </p>

                  <div className="pt-1 flex items-center justify-between text-xs text-[#0b0f0d] font-black">
                    <span className="group-hover:underline">Tap to inspect</span>
                    <ArrowRight className="size-4 text-[#0b0f0d] group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox Modal for Inspirations */}
      {activeModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setActiveModalItem(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-white rounded-xl overflow-hidden shadow-[8px_8px_0px_#d0f471] p-6 sm:p-8 text-left space-y-4 border-[3px] border-[#0b0f0d] text-[#0b0f0d]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black border-2 border-[#0b0f0d]">
              <img
                src={activeModalItem.img}
                alt={activeModalItem.title}
                className="size-full object-contain"
              />
            </div>

            <div>
              <span className="inline-block px-2.5 py-0.5 rounded bg-[#ffe500] border-2 border-[#0b0f0d] text-xs font-black text-[#0b0f0d] uppercase tracking-wider">
                {activeModalItem.category}
              </span>
              <h3 className="text-2xl font-black text-[#0b0f0d] mt-2">{activeModalItem.title}</h3>
              <div className="mt-3 p-3.5 rounded-lg bg-[#f7f5ee] border-2 border-[#0b0f0d] text-sm text-[#0b0f0d] font-mono">
                <span className="font-black text-[#0b0f0d] block mb-1">Prompt:</span>"
                {activeModalItem.prompt}"
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveModalItem(null)}
                className="px-5 py-2.5 rounded-lg border-2 border-[#0b0f0d] bg-white text-sm font-black text-[#0b0f0d] hover:bg-[#ffe500] shadow-[3px_3px_0px_#0b0f0d] cursor-pointer"
              >
                Close
              </button>
              <Link
                href="/remove/video"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-black bg-[#d0f471] text-[#0b0f0d] border-2 border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] hover:bg-[#ffe500] transition-all"
              >
                <span>Clean Similar Video</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
