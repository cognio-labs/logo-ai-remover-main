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
import { BeforeAfterSlider } from "@/components/site/BeforeAfterSlider";
import { VideoTrustBadges } from "@/components/site/VideoTrustBadges";

export const Route = createFileRoute("/gemini-video-watermark-remover")({
  head: () => ({
    meta: [
      { title: "Remove Gemini and Veo Video Watermarks Online — Bellix.us" },
      {
        name: "description",
        content:
          "Easily remove visible Google Gemini and Veo video watermarks online. Reconstruct frames with 100% full-frame clarity, temporal consistency, and smooth motion.",
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

function GeminiVideoRemoverPage() {
  // Sync Video comparison state
  const videoBeforeRef = useRef<HTMLVideoElement>(null);
  const videoAfterRef = useRef<HTMLVideoElement>(null);

  // Inspiration category filter & modal
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeModalItem, setActiveModalItem] = useState<(typeof INSPIRATION_ITEMS)[0] | null>(
    null,
  );

  // Synchronize the Before & After video players
  useEffect(() => {
    const v1 = videoBeforeRef.current;
    const v2 = videoAfterRef.current;
    if (!v1 || !v2) return;

    const handleSync = () => {
      if (Math.abs(v2.currentTime - v1.currentTime) > 0.08) {
        v2.currentTime = v1.currentTime;
      }
    };

    v1.addEventListener("timeupdate", handleSync);
    return () => v1.removeEventListener("timeupdate", handleSync);
  }, []);

  const filteredInspirations =
    selectedCategory === "All"
      ? INSPIRATION_ITEMS
      : INSPIRATION_ITEMS.filter((item) => item.category === selectedCategory);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-24">
      {/* 1. HERO & UPLOAD SECTION */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FFF0F4]/60 via-white to-white">
        <div className="mx-auto max-w-5xl text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFF1F4] border border-[#FCE7EC] shadow-2xs">
            <img src="/gemini-logo.png" alt="Gemini" className="size-4 object-contain" />
            <span className="text-xs font-bold text-[#E11D48] tracking-wide">
              Official Gemini & Veo Watermark Removal Engine
            </span>
          </div>

          {/* Main User-Requested Heading */}
          <h1 className="text-4xl sm:text-6xl font-semibold text-gray-950 tracking-tight leading-[1.12]">
            Remove Gemini and Veo Video{" "}
            <span className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] bg-clip-text text-transparent">
              Watermarks Online
            </span>
          </h1>

          {/* Subheading */}
          <p className="max-w-2xl mx-auto text-base sm:text-xl text-gray-600 font-normal leading-relaxed">
            Detect and erase visible Google Gemini and Veo marks across every frame. Keep 100% full
            resolution, smooth camera movement, and natural lighting.
          </p>

          {/* Primary Upload Area */}
          <div className="pt-6 max-w-3xl mx-auto">
            <JobVideoCleaner />
          </div>

          {/* Trust Guarantees: 100% Local Processing | No Upload Required | Open Source Pipeline */}
          <VideoTrustBadges />
        </div>
      </section>

      {/* 2. "SEE A REAL VIDEO CLEANUP RESULT" SECTION (Screenshot 1 Matching) */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white border-t border-[#FCE7EC]">
        <div className="mx-auto max-w-5xl text-center space-y-4">
          <h2 className="text-3xl sm:text-5xl font-serif font-normal text-gray-950 tracking-tight">
            See a real video cleanup result
          </h2>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-gray-600 leading-relaxed font-normal">
            The same three-second clip plays in sync: the original keeps the visible Gemini mark at
            the lower right, while the processed version removes it and preserves the subject,
            lighting, and motion.
          </p>

          <div className="pt-1 pb-4">
            <Link
              to="/remove/image"
              className="text-xs sm:text-sm font-medium text-gray-500 hover:text-[#E11D48] underline underline-offset-4 transition-colors"
            >
              Working with images too? Open the Gemini Image Watermark Remover
            </Link>
          </div>

          {/* Sync Video Card: BEFORE & AFTER Side by Side */}
          <div className="relative mx-auto max-w-4xl rounded-3xl overflow-hidden border border-[#FCE7EC] bg-black shadow-[0_20px_60px_-15px_rgba(225,29,72,0.18)]">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
              {/* Left: BEFORE */}
              <div className="relative aspect-[4/3] sm:aspect-video overflow-hidden bg-black flex items-center justify-center">
                <span className="absolute top-4 left-4 z-20 px-3 py-1 rounded-full bg-black/60 text-white text-[11px] font-bold tracking-wider uppercase backdrop-blur-md border border-white/20">
                  Before
                </span>

                <video
                  ref={videoBeforeRef}
                  src="/gemini-example-before.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="size-full object-cover pointer-events-none"
                />
              </div>

              {/* Right: AFTER */}
              <div className="relative aspect-[4/3] sm:aspect-video overflow-hidden bg-black flex items-center justify-center">
                <span className="absolute top-4 left-4 z-20 px-3 py-1 rounded-full bg-black/60 text-white text-[11px] font-bold tracking-wider uppercase backdrop-blur-md border border-white/20">
                  After
                </span>

                <video
                  ref={videoAfterRef}
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
        </div>
      </section>

      {/* 3. BENTO GRID FEATURES SECTION (Screenshot 2 Matching) */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#FFF8FA] border-y border-[#FCE7EC]">
        <div className="mx-auto max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-5xl font-serif font-normal text-gray-950 tracking-tight">
              Remove the visible mark while keeping the full frame and smooth motion
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Restore marked area */}
            <div className="p-8 sm:p-10 rounded-3xl bg-white border border-[#FCE7EC] shadow-[0_10px_30px_-10px_rgba(225,29,72,0.06)] hover:shadow-[0_20px_45px_-10px_rgba(225,29,72,0.15)] transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-950">
                  Restore the marked area frame by frame
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Detect visible Gemini and Veo marks across adjacent frames while aiming to keep
                  motion, color, and texture consistent.
                </p>
              </div>
              <div className="mt-8 flex justify-end">
                <div className="size-16 rounded-2xl bg-[#FFF1F4] border border-[#FCE7EC] flex items-center justify-center text-[#E11D48] shadow-xs">
                  <ShieldCheck className="size-8" />
                </div>
              </div>
            </div>

            {/* Card 2: Supports 7 formats */}
            <div className="p-8 sm:p-10 rounded-3xl bg-white border border-[#FCE7EC] shadow-[0_10px_30px_-10px_rgba(225,29,72,0.06)] hover:shadow-[0_20px_45px_-10px_rgba(225,29,72,0.15)] transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-950">
                  Supports 7 formats, videos up to 15 seconds
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Upload MP4, MOV, WebM, AVI, MPG, MPEG, or MKV. Each video costs 3 credits, and the
                  result is delivered as an MP4.
                </p>
              </div>
              <div className="mt-8 flex justify-end">
                <div className="size-16 rounded-2xl bg-[#FFF1F4] border border-[#FCE7EC] flex items-center justify-center text-[#E11D48] shadow-xs">
                  <FileVideo className="size-8" />
                </div>
              </div>
            </div>

            {/* Card 3: Cloud processing */}
            <div className="p-8 sm:p-10 rounded-3xl bg-white border border-[#FCE7EC] shadow-[0_10px_30px_-10px_rgba(225,29,72,0.06)] hover:shadow-[0_20px_45px_-10px_rgba(225,29,72,0.15)] transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-950">
                  Private local processing
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Your media stays in browser memory and is never sent to a server. Keep this tab
                  open until the full-quality export finishes.
                </p>
              </div>
              <div className="mt-8 flex justify-end">
                <div className="size-16 rounded-2xl bg-[#FFF1F4] border border-[#FCE7EC] flex items-center justify-center text-[#E11D48] shadow-xs">
                  <Monitor className="size-8" />
                </div>
              </div>
            </div>

            {/* Card 4: Full-frame aware cleanup */}
            <div className="p-8 sm:p-10 rounded-3xl bg-white border border-[#FCE7EC] shadow-[0_10px_30px_-10px_rgba(225,29,72,0.06)] hover:shadow-[0_20px_45px_-10px_rgba(225,29,72,0.15)] transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-950">
                  Full-frame aware cleanup
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Cleans the mark area instead of cutting away the edges, so the original frame
                  stays intact.
                </p>
              </div>
              <div className="mt-8 flex justify-end">
                <div className="size-16 rounded-2xl bg-[#FFF1F4] border border-[#FCE7EC] flex items-center justify-center text-[#E11D48] shadow-xs">
                  <Crop className="size-8" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. "REMOVE A GEMINI VIDEO WATERMARK IN 3 STEPS" SECTION (Screenshot 3 Matching) */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl sm:text-5xl font-serif font-normal text-gray-950 tracking-tight mb-16">
            Remove a Gemini video watermark in 3 steps
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-6 rounded-3xl bg-white border border-[#FCE7EC] shadow-2xs hover:-translate-y-1 transition-transform">
              <div className="size-20 rounded-3xl bg-[#FFF1F4] text-[#E11D48] flex items-center justify-center mb-6 border border-[#FCE7EC] shadow-xs">
                <Upload className="size-8" />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                Step 01
              </span>
              <h3 className="text-lg font-bold text-gray-950 mb-2">Upload your clip</h3>
              <p className="text-sm text-gray-600 leading-relaxed font-normal">
                Choose an MP4, MOV, WebM, AVI, MPG, MPEG, or MKV file up to 15 seconds.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-6 rounded-3xl bg-white border border-[#FCE7EC] shadow-2xs hover:-translate-y-1 transition-transform">
              <div className="size-20 rounded-3xl bg-[#FFF1F4] text-[#E11D48] flex items-center justify-center mb-6 border border-[#FCE7EC] shadow-xs">
                <Sparkles className="size-8" />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                Step 02
              </span>
              <h3 className="text-lg font-bold text-gray-950 mb-2">Mark and clean the logo</h3>
              <p className="text-sm text-gray-600 leading-relaxed font-normal">
                Place the editor box over the logo, adjust padding, and start the local FFmpeg
                cleanup. Auto-detect can suggest a starting area.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-6 rounded-3xl bg-white border border-[#FCE7EC] shadow-2xs hover:-translate-y-1 transition-transform">
              <div className="size-20 rounded-3xl bg-[#FFF1F4] text-[#E11D48] flex items-center justify-center mb-6 border border-[#FCE7EC] shadow-xs">
                <Download className="size-8" />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                Step 03
              </span>
              <h3 className="text-lg font-bold text-gray-950 mb-2">Download the result</h3>
              <p className="text-sm text-gray-600 leading-relaxed font-normal">
                When processing finishes, download the cleaned MP4 from the task result.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. USER'S VEO FRAME SPOTLIGHT (From D:\videoframe_375.png) */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[#FFF8FA] border-y border-[#FCE7EC]">
        <div className="mx-auto max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#E11D48]">
              Google Veo Claymation Model
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif font-normal text-gray-950 tracking-tight mt-2">
              Clean High-Detail AI Claymation & Animation
            </h2>
            <p className="mt-3 text-sm sm:text-base text-gray-600">
              Notice the Google Gemini star mark in the lower right of the windshield. Our neural
              in-painting erases the mark while preserving the girl's hand, wheel, and palm tree
              motion.
            </p>
          </div>

          <div className="rounded-3xl overflow-hidden border border-[#FCE7EC] shadow-[0_20px_50px_-15px_rgba(225,29,72,0.15)] bg-white p-3 sm:p-5 space-y-6">
            <div className="relative rounded-2xl overflow-hidden">
              <BeforeAfterSlider
                beforeSrc="/videoframe_375_watermarked.png"
                src="/videoframe_375_clean.png"
                labelBefore="Veo Claymation (✦ Official Gemini Logo)"
                labelAfter="Cleaned Result (100% Logo Free)"
                badge="✦ Gemini Inpainting"
              />
            </div>

            {/* Bottom Controls & Downloads */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-[#FCE7EC] px-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFF1F4] border border-[#FCE7EC] text-xs font-bold text-[#E11D48]">
                  <img src="/gemini-logo.png" alt="Gemini Logo" className="size-4 object-contain" />
                  <span>Google Gemini Logo Embedded</span>
                </div>
                <span className="text-xs text-gray-500 font-medium hidden md:inline">
                  Drag the red line to see the Gemini logo erase cleanly.
                </span>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="/videoframe_375_watermarked.png"
                  download="gemini-veo-claymation-watermarked.png"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-[#FCE7EC] bg-white text-gray-800 hover:bg-[#FFF5F7] hover:border-[#E11D48] transition-all shadow-2xs"
                >
                  <Download className="size-3.5 text-[#E11D48]" />
                  <span>Download Watermarked PNG</span>
                </a>

                <a
                  href="/videoframe_375_clean.png"
                  download="gemini-veo-claymation-clean.png"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#E11D48] text-white hover:bg-[#BE123C] transition-all shadow-xs"
                >
                  <Sparkles className="size-3.5" />
                  <span>Download Clean PNG</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ: clear answers close to the demo and download controls. */}
      <section className="border-y border-[#FCE7EC] bg-[#FFF8FA] px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E11D48]">
              Clear answers
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight text-gray-950 sm:text-5xl">
              Questions before you start
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-gray-600">
              A simple workflow, an easy-to-read comparison, and clear expectations about processing
              and downloads.
            </p>
          </div>
          <div className="divide-y divide-[#F7DCE4] rounded-3xl border border-[#FCE7EC] bg-white px-5 shadow-[0_18px_45px_-30px_rgba(225,29,72,0.35)] sm:px-7">
            {VIDEO_FAQS.map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-left text-sm font-bold text-gray-900 marker:content-none">
                  {faq.question}
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FFF1F4] text-lg font-normal text-[#E11D48] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="max-w-xl pt-3 text-sm leading-relaxed text-gray-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      {/* 6. "DISCOVER INSPIRATIONS" GALLERY SECTION (Screenshot 4 Matching) */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white" id="inspirations">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-3xl sm:text-5xl font-serif font-normal text-gray-950 tracking-tight">
              Discover Inspirations
            </h2>
            <p className="mt-3 text-sm sm:text-base text-gray-500">
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
                    ? "bg-black text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid of 21 User Inspiration Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredInspirations.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveModalItem(item)}
                className="group relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gray-100 border border-gray-100 shadow-2xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              >
                <div className="aspect-[3/4] overflow-hidden bg-gray-200">
                  <img
                    src={item.img}
                    alt={item.title}
                    loading="lazy"
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Hover overlay with title & tag */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end text-white">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#FF8CC6]">
                    {item.category}
                  </span>
                  <h4 className="text-sm font-bold leading-tight mt-0.5">{item.title}</h4>
                  <p className="text-[11px] text-gray-300 line-clamp-2 mt-1">{item.prompt}</p>
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
            className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 text-left space-y-4"
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
              <span className="text-xs font-bold text-[#E11D48] uppercase tracking-wider">
                {activeModalItem.category}
              </span>
              <h3 className="text-xl font-bold text-gray-950 mt-1">{activeModalItem.title}</h3>
              <div className="mt-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-700 font-mono">
                <span className="font-bold text-gray-500 block mb-1">Prompt:</span>"
                {activeModalItem.prompt}"
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={() => setActiveModalItem(null)}
                className="px-5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors"
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
