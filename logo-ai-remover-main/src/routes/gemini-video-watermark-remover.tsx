"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Download,
  Upload,
  CheckCircle2,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Film,
  FileVideo,
  Monitor,
  Smartphone,
  Crop,
  ExternalLink,
  Eye,
  Sliders,
  Check,
} from "lucide-react";
import { PinkButton } from "@/components/site/PinkButton";
import { JobVideoCleaner } from "@/components/site/JobVideoCleaner";
import { VideoTrustBadges } from "@/components/site/VideoTrustBadges";

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
      "Yes. Choose an MP4, MOV, WebM, AVI, MPG, MPEG, or MKV clip up to 15 seconds. The uploader checks the file before processing starts.",
  },
  {
    question: "Will the output keep the original quality?",
    answer:
      "Yes. Full export keeps the source dimensions, frame rate, duration, and audio while using high-quality H.264 encoding.",
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
  // Inspiration category filter & modal
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeModalItem, setActiveModalItem] = useState<(typeof INSPIRATION_ITEMS)[0] | null>(
    null,
  );

  const filteredInspirations =
    selectedCategory === "All"
      ? INSPIRATION_ITEMS
      : INSPIRATION_ITEMS.filter((item) => item.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#f3f4ee] text-[#10241e] font-sans pb-24">
      {/* 1. HERO & UPLOAD SECTION */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 lg:px-8 bg-[#f3f4ee]">
        <div className="mx-auto max-w-5xl text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#10241e]/15 shadow-md px-5 py-2">
            <img src="/gemini-logo.png" alt="Gemini" className="size-4 object-contain" />
            <span className="text-xs sm:text-sm font-bold text-[#10241e] tracking-wide">
              Official Gemini & Veo Watermark Removal Engine
            </span>
          </div>

          {/* Main User-Requested Heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-[#10241e] tracking-tight leading-[1.08]">
            Remove Gemini and Veo Video{" "}
            <span className="text-[#10241e] underline decoration-[#d0f471] decoration-4">
              Watermarks Online
            </span>
          </h1>

          {/* Subheading */}
          <p className="max-w-3xl mx-auto text-lg sm:text-2xl text-[#37433d] font-normal leading-relaxed">
            Detect and erase visible Google Gemini and Veo marks across every frame. Keep 100% full
            resolution, smooth camera movement, and natural lighting.
          </p>

          {/* Primary Upload Area */}
          <div className="pt-6 max-w-6xl mx-auto w-full">
            <JobVideoCleaner />
          </div>

          {/* Trust Guarantees: 100% Local Processing | No Upload Required | Open Source Pipeline */}
          <VideoTrustBadges />
        </div>
      </section>

      {/* 4. "REMOVE A GEMINI VIDEO WATERMARK IN 3 STEPS" SECTION (Screenshot 3 Matching) */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white border-y border-[#10241e]/10">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-[#10241e] tracking-tight mb-16">
            Remove a Gemini video watermark in 3 steps
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-8 sm:p-10 rounded-3xl bg-[#f3f4ee] border border-[#10241e]/15 shadow-xl hover:shadow-2xl hover:border-[#10241e]/40 hover:-translate-y-1 transition-transform">
              <div className="size-20 rounded-2xl bg-[#10241e] text-[#d0f471] flex items-center justify-center mb-6 shadow-md">
                <Upload className="size-8" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-[#637069] uppercase tracking-widest mb-2 font-mono">
                Step 01
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-[#10241e] mb-3">Upload your clip</h3>
              <p className="text-base sm:text-lg text-[#37433d] leading-relaxed font-normal">
                Choose an MP4, MOV, WebM, AVI, MPG, MPEG, or MKV file up to 15 seconds.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-8 sm:p-10 rounded-3xl bg-[#f3f4ee] border border-[#10241e]/15 shadow-xl hover:shadow-2xl hover:border-[#10241e]/40 hover:-translate-y-1 transition-transform">
              <div className="size-20 rounded-2xl bg-[#10241e] text-[#d0f471] flex items-center justify-center mb-6 shadow-md">
                <Sparkles className="size-8" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-[#637069] uppercase tracking-widest mb-2 font-mono">
                Step 02
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-[#10241e] mb-3">Mark and clean the logo</h3>
              <p className="text-base sm:text-lg text-[#37433d] leading-relaxed font-normal">
                Place the editor box over the logo, adjust padding, and start the local FFmpeg
                cleanup. Auto-detect can suggest a starting area.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-8 sm:p-10 rounded-3xl bg-[#f3f4ee] border border-[#10241e]/15 shadow-xl hover:shadow-2xl hover:border-[#10241e]/40 hover:-translate-y-1 transition-transform">
              <div className="size-20 rounded-2xl bg-[#10241e] text-[#d0f471] flex items-center justify-center mb-6 shadow-md">
                <Download className="size-8" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-[#637069] uppercase tracking-widest mb-2 font-mono">
                Step 03
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-[#10241e] mb-3">Download the result</h3>
              <p className="text-base sm:text-lg text-[#37433d] leading-relaxed font-normal">
                When processing finishes, download the cleaned MP4 from the task result.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ: clear answers close to the demo and download controls. */}
      <section className="border-b border-[#10241e]/10 bg-[#f3f4ee] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-[#10241e]">
              Clear answers
            </p>
            <h2 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-[#10241e]">
              Questions before you start
            </h2>
            <p className="mt-5 max-w-md text-base sm:text-lg leading-relaxed text-[#37433d]">
              A simple workflow, an easy-to-read comparison, and clear expectations about processing
              and downloads.
            </p>
          </div>
          <div className="divide-y divide-[#10241e]/10 rounded-3xl border border-[#10241e]/15 bg-white px-6 sm:px-8 shadow-xl">
            {VIDEO_FAQS.map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-left text-base sm:text-lg font-bold text-[#10241e] marker:content-none">
                  {faq.question}
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#e9ece4] text-xl font-bold text-[#10241e] group-open:bg-[#10241e] group-open:text-[#d0f471] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="max-w-xl pt-4 text-base sm:text-lg leading-relaxed text-[#37433d]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      {/* 6. "DISCOVER INSPIRATIONS" GALLERY SECTION (Screenshot 4 Matching) */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white" id="inspirations">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-[#10241e] tracking-tight">
              Discover Inspirations
            </h2>
            <p className="mt-3 text-base sm:text-lg text-[#637069]">
              Pick a prompt you love and start creating
            </p>
          </div>

          {/* Category Filter Tabs (Pills) */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-[#10241e] text-[#d0f471] font-bold shadow-md"
                    : "bg-[#e9ece4] text-[#10241e] font-semibold hover:bg-[#dbe0d6]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid of 21 User Inspiration Cards with Visible Prompts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredInspirations.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveModalItem(item)}
                className="group relative rounded-2xl sm:rounded-3xl overflow-hidden bg-[#f3f4ee] border border-[#10241e]/15 shadow-md hover:shadow-xl hover:border-[#10241e]/40 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                {/* Visual Card Image */}
                <div className="relative aspect-[4/3] sm:aspect-[3/4] overflow-hidden bg-gray-100">
                  <img
                    src={item.img}
                    alt={item.title}
                    loading="lazy"
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[9px] font-bold text-white uppercase tracking-wider border border-white/10 shadow-xs">
                      {item.category}
                    </span>
                  </div>
                </div>

                {/* Card Details: Title & Prompt (Always Visible on Mobile & Laptop) */}
                <div className="p-4 sm:p-5 bg-white flex flex-col justify-between flex-1 border-t border-[#10241e]/10 space-y-3">
                  <div className="flex items-center justify-between gap-1.5">
                    <h4 className="text-sm sm:text-base font-bold text-[#10241e] truncate leading-snug">
                      {item.title}
                    </h4>
                    <span className="shrink-0 text-[10px] font-mono font-bold text-[#10241e] bg-[#e9ece4] px-2 py-0.5 rounded border border-[#10241e]/15">
                      Prompt
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-[#37433d] line-clamp-2 leading-relaxed bg-[#f3f4ee] p-3 rounded-xl border border-[#10241e]/10 font-sans">
                    "{item.prompt}"
                  </p>

                  <div className="pt-1 flex items-center justify-between text-[10px] text-gray-400 font-medium">
                    <span className="text-[#10241e] group-hover:underline font-bold">Tap to inspect</span>
                    <ArrowRight className="size-4 text-[#10241e] group-hover:translate-x-1 transition-transform" />
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setActiveModalItem(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 text-left space-y-4 border border-[#10241e]/15 text-[#10241e]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black">
              <img
                src={activeModalItem.img}
                alt={activeModalItem.title}
                className="size-full object-contain"
              />
            </div>

            <div>
              <span className="text-xs sm:text-sm font-bold text-[#10241e] uppercase tracking-wider">
                {activeModalItem.category}
              </span>
              <h3 className="text-2xl font-bold text-[#10241e] mt-1">{activeModalItem.title}</h3>
              <div className="mt-3 p-3.5 rounded-xl bg-[#f3f4ee] border border-[#10241e]/15 text-sm text-[#37433d] font-mono">
                <span className="font-bold text-[#8E8E8E] block mb-1">Prompt:</span>"
                {activeModalItem.prompt}"
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={() => setActiveModalItem(null)}
                className="px-5 py-2 rounded-xl border border-[#10241e]/20 text-sm font-bold text-[#10241e] hover:bg-[#e9ece4] transition-colors"
              >
                Close
              </button>
              <PinkButton size="sm" asChild>
                <Link to="/remove/video">Clean Similar Video</Link>
              </PinkButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
