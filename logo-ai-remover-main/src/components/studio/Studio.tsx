"use client";

import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  ArrowRight,
  ScanLine,
  Upload,
  SlidersHorizontal,
  Download,
  Film,
  ImageUp,
  Scissors,
  FileText,
  WandSparkles,
  Check,
  Sparkles,
  Zap,
  ShieldCheck,
  Star,
  Clock,
  Mail,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";
import { ModelIcon } from "@/components/ModelIcon";
import { AI_MODELS, type AIModelData } from "@/components/models/modelData";
import { CreativeSuiteSection } from "@/components/ui/hero-parallax";
import { BelixMasterHeroSection } from "./BelixMasterHeroSection";

export const studioAssets = {
  coast: "/creative-suite/hero_creator_masterpiece.webp",
  product: "/creative-suite/macro_jewelry_diamond.jpg",
  portrait: "/creative-suite/portrait_restorer.jpg",
};
export const studioTools = [
  { name: "Background", path: "/background-remover", icon: Scissors },
  { name: "PDF cleaner", path: "/pdf-watermark-remover", icon: FileText },
  { name: "Video cleaner", path: "/gemini-video-watermark-remover", icon: ScanLine },
] as const;

/* -------------------------------------------------------------------------- */
/* RUNNING AI PLATFORMS MARQUEE                                               */
/* -------------------------------------------------------------------------- */
function StudioAiMarquee() {
  const renderCard = (m: AIModelData, keyPrefix: string) => (
    <div
      key={`${keyPrefix}-${m.id}`}
      className="group relative inline-flex items-center gap-3.5 px-3 py-1.5 select-none transition-all duration-200 text-left shrink-0 hover:opacity-85"
    >
      <ModelIcon modelId={m.id} name={m.name} size="md" />
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
      <div className="flex items-center gap-1.5 shrink-0 pl-1 text-[11px] font-mono font-medium text-emerald-600">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        <span>{m.mode}</span>
      </div>
    </div>
  );

  return (
    <div className="relative w-full py-4 sm:py-5 bg-white border-y border-gray-100 overflow-hidden whitespace-nowrap select-none shadow-2xs">
      <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-white via-white/90 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-white via-white/90 to-transparent z-10 pointer-events-none" />
      <div className="flex w-max items-center animate-marquee hover:[animation-play-state:paused]">
        <div className="flex items-center gap-4 sm:gap-6 shrink-0 pr-4 sm:pr-6">
          {AI_MODELS.map((m) => renderCard(m, "track1"))}
        </div>
        <div className="flex items-center gap-4 sm:gap-6 shrink-0 pr-4 sm:pr-6" aria-hidden="true">
          {AI_MODELS.map((m) => renderCard(m, "track2"))}
        </div>
      </div>
    </div>
  );
}

export function StudioHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <header className="studio-heading">
      <span className="studio-eyebrow">
        <span />
      </span>
      {eyebrow}
      <h1>{title}</h1>
      <p>{text}</p>
    </header>
  );
}

const GALLERY_SAMPLES = [
  {
    image: "/creative-suite/gallery_portrait_luxury.jpg",
    badge: "Instant Alpha",
    category: "SUB-PIXEL MATTING",
    title: "Portraits with Organic Texture",
    desc: "Reconstruct delicate flyaways, natural skin pores, and soft fringe lighting with zero plastic blur.",
    path: "/background-remover",
  },
  {
    image: "/creative-suite/gallery_product_emerald.jpg",
    badge: "8K Gigapixel",
    category: "COMMERCIAL PRODUCT",
    title: "Crystal Caustics & Liquid Light",
    desc: "Rebuild intricate emerald facets, water ripples, and high-fidelity reflections in true 8K resolution.",
    path: "/upscale",
  },
  {
    image: "/creative-suite/gallery_architecture_alpine.jpg",
    badge: "Neural Inpaint",
    category: "EXPANSIVE HORIZON",
    title: "Alpine Architectural Masterpiece",
    desc: "Restore vast twilight skies, reflective infinity pools, and razor-sharp architectural geometry flawlessly.",
    path: "/remove/image",
  },
];

export function SampleGallery({
  title = "Flawless execution in every single detail.",
}: {
  title?: string;
}) {
  return (
    <section className="studio-section">
      <div className="studio-section-title">
        <div>
          <span className="studio-eyebrow">
            <span />
            CURATED NEURAL SHOWCASE
          </span>
          <h2>{title}</h2>
        </div>
        <p>
          Experience what happens when precision AI models touch every frame. Sub-pixel cutouts,
          crystal caustics, and vast pristine landscapes ready to export.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mt-10">
        {GALLERY_SAMPLES.map((item) => (
          <Link
            key={item.title}
            to={item.path}
            className="group relative flex flex-col rounded-3xl overflow-hidden bg-[#FFF7ED]/95 backdrop-blur-md border border-[#FED7AA]/70 hover:border-[#FCA5A5] shadow-[0_10px_30px_-10px_rgba(225,29,72,0.08)] hover:shadow-[0_20px_45px_-12px_rgba(225,29,72,0.22)] hover:-translate-y-1.5 transition-all duration-300"
          >
            {/* Image Container with Badge */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
              <img
                src={item.image}
                alt={item.title}
                loading="lazy"
                className="size-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />
              <span className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[10px] font-semibold tracking-wider uppercase shadow-sm">
                {item.badge}
              </span>
            </div>

            {/* Content Body */}
            <div className="p-6 flex flex-col flex-1 justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#E11D48]">
                  {item.category}
                </span>
                <h3 className="text-lg font-semibold text-gray-950 mt-1 mb-2 group-hover:text-[#E11D48] transition-colors leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed font-normal">{item.desc}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-500 group-hover:text-[#E11D48] transition-colors">
                  Explore Result
                </span>
                <span className="flex size-8 items-center justify-center rounded-full bg-gray-100 text-gray-700 group-hover:bg-[#E11D48] group-hover:text-white transition-all shadow-xs">
                  <ArrowUpRight size={15} />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function WorkflowCards() {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const processFile = (file: File) => {
    const name = file.name.toLowerCase();
    if (file.type.includes("pdf") || name.endsWith(".pdf")) {
      toast.success(`PDF "${file.name}" detected! Opening PDF Watermark Cleaner...`);
      navigate({ to: "/pdf-watermark-remover" });
    } else if (
      file.type.includes("video") ||
      name.endsWith(".mp4") ||
      name.endsWith(".mov") ||
      name.endsWith(".webm")
    ) {
      toast.success(`Video "${file.name}" detected! Opening Video Enhancer...`);
      navigate({ to: "/video-enhancer" });
    } else {
      toast.success(`Image "${file.name}" detected! Opening AI Image Studio...`);
      navigate({ to: "/remove/image" });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const triggerDownload = (format: "jpg" | "mp4" | "png" | "pdf") => {
    const formatMap = {
      jpg: {
        url: "/upscale/mountain_lake.jpg",
        filename: "bellix-restored-preview.jpg",
        label: "Ultra HD JPG",
      },
      mp4: {
        url: "/gemini-example-before.mp4",
        filename: "bellix-clean-preview.mp4",
        label: "60FPS Video (MP4)",
      },
      png: {
        url: "/upscale/artwork.png",
        filename: "bellix-alpha-cutout.png",
        label: "Lossless Transparent PNG",
      },
      pdf: {
        url: "/samples/sample_blueprint.pdf",
        filename: "bellix-clean-document.pdf",
        label: "Clean Vector PDF",
      },
    };
    const target = formatMap[format];
    const link = document.createElement("a");
    link.href = target.url;
    link.download = target.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exporting ${target.label} sample! Check your downloads.`);
  };

  return (
    <section className="relative w-full py-12 md:py-20 overflow-hidden bg-warm-canvas border-y border-[#FED7AA]/50">
      {/* Background ambient lighting matching the 3D studio ribbons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-5 w-[650px] h-[350px] rounded-full bg-[#FFE4C4]/40 blur-[120px]" />
        <div className="absolute bottom-1/4 right-5 w-[600px] h-[350px] rounded-full bg-[#FCA5A5]/35 blur-[130px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[450px] rounded-full bg-[#FFD6A5]/30 blur-[140px]" />
      </div>

      <div className="relative max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hidden global file input for drag & drop and browse */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,video/*,.pdf"
          onChange={handleFileUpload}
        />

        {/* ─── DESKTOP PANORAMIC 3D BANNER (lg+) ─── */}
        <div className="hidden lg:block relative w-full overflow-hidden rounded-[32px] border border-[#FED7AA] shadow-[0_24px_70px_-20px_rgba(225,29,72,0.12),0_10px_30px_-10px_rgba(253,186,116,0.1)] bg-[#FFF7ED]/90 backdrop-blur-md">
          <div className="relative w-full aspect-[1024/360] select-none">
            {/* Master Banner Graphic */}
            <img
              src="/creative-suite/workflow_banner_master.png"
              alt="From file to finished: Less busywork. More creating."
              className="w-full h-full object-cover pointer-events-none"
              fetchPriority="high"
            />

            {/* 0. HEADER HOTSPOT (Links to all tools) */}
            <Link
              to="/tools"
              title="Explore all Bellix AI creative tools"
              className="absolute rounded-2xl group cursor-pointer"
              style={{ left: "11.2%", top: "11.5%", width: "24.5%", height: "20.5%" }}
            >
              <span className="absolute inset-0 rounded-2xl bg-indigo-500/0 group-hover:bg-indigo-500/5 group-hover:ring-2 group-hover:ring-indigo-400/30 transition-all" />
            </Link>

            {/* ── CARD 01 HOTSPOTS (BRING YOUR ORIGINAL) ── */}
            {/* Floating format badges in Card 01 */}
            <Link
              to="/remove/image"
              title="Image Studio: Clean watermarks & restore images"
              className="absolute rounded-xl group cursor-pointer"
              style={{ left: "15.8%", top: "41.5%", width: "4.8%", height: "11.0%" }}
            >
              <span className="absolute inset-0 rounded-xl bg-blue-500/0 group-hover:bg-blue-500/20 group-hover:ring-2 group-hover:ring-blue-400/60 transition-all shadow-none group-hover:shadow-[0_0_16px_rgba(59,130,246,0.5)]" />
            </Link>

            <Link
              to="/video-enhancer"
              title="Video Enhancer: 4K upscaling & AI motion cleanup"
              className="absolute rounded-xl group cursor-pointer"
              style={{ left: "21.6%", top: "39.5%", width: "5.5%", height: "12.0%" }}
            >
              <span className="absolute inset-0 rounded-xl bg-purple-500/0 group-hover:bg-purple-500/20 group-hover:ring-2 group-hover:ring-purple-400/60 transition-all shadow-none group-hover:shadow-[0_0_16px_rgba(168,85,247,0.5)]" />
            </Link>

            <Link
              to="/pdf-watermark-remover"
              title="PDF Cleaner: Remove stamps, logos & confidential text"
              className="absolute rounded-xl group cursor-pointer"
              style={{ left: "27.6%", top: "42.5%", width: "4.6%", height: "10.5%" }}
            >
              <span className="absolute inset-0 rounded-xl bg-rose-500/0 group-hover:bg-rose-500/20 group-hover:ring-2 group-hover:ring-rose-400/60 transition-all shadow-none group-hover:shadow-[0_0_16px_rgba(244,63,94,0.5)]" />
            </Link>

            {/* Dashed Dropzone interactive box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              title="Click to browse or drop an Image, Video, or PDF file"
              className="absolute rounded-2xl cursor-pointer group transition-all"
              style={{ left: "15.14%", top: "54.17%", width: "17.09%", height: "16.67%" }}
            >
              <span
                className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
                  isDragging
                    ? "bg-indigo-500/25 ring-2 ring-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)] animate-pulse"
                    : "bg-indigo-500/0 group-hover:bg-indigo-500/10 group-hover:ring-2 group-hover:ring-indigo-400/60 group-hover:shadow-[0_4px_20px_rgba(99,102,241,0.25)]"
                }`}
              />
              <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-gray-950/90 text-white text-[10px] font-medium px-2 py-0.5 rounded-full shadow-md z-30">
                📁 Click or drag file here
              </div>
            </div>

            {/* ── CARD 02 HOTSPOTS (MAKE IT YOUR OWN) ── */}
            {/* Sliders Area (Interactive hover) */}
            <Link
              to="/tools"
              title="Fine-tune with precision AI sliders"
              className="absolute rounded-xl group cursor-pointer"
              style={{ left: "41.8%", top: "44.5%", width: "10.5%", height: "23.5%" }}
            >
              <span className="absolute inset-0 rounded-xl bg-purple-500/0 group-hover:bg-purple-500/10 group-hover:ring-1 group-hover:ring-purple-400/40 transition-all" />
            </Link>

            {/* Checklist Tool 1: AI Enhance */}
            <Link
              to="/upscale"
              title="AI Enhance: Boost resolution and reconstruct texture"
              className="absolute rounded-lg group cursor-pointer"
              style={{ left: "53.2%", top: "46.2%", width: "9.2%", height: "4.8%" }}
            >
              <span className="absolute inset-0 rounded-lg bg-indigo-500/0 group-hover:bg-indigo-500/20 group-hover:ring-1.5 group-hover:ring-indigo-500/70 transition-all shadow-none group-hover:shadow-[0_0_12px_rgba(99,102,241,0.4)]" />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-indigo-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-md z-30">
                Open AI Upscaler
              </div>
            </Link>

            {/* Checklist Tool 2: Remove Watermark */}
            <Link
              to="/gemini-video-watermark-remover"
              title="Remove Watermark: Erase logos, stamps and AI labels"
              className="absolute rounded-lg group cursor-pointer"
              style={{ left: "53.2%", top: "51.2%", width: "9.2%", height: "4.8%" }}
            >
              <span className="absolute inset-0 rounded-lg bg-pink-500/0 group-hover:bg-pink-500/20 group-hover:ring-1.5 group-hover:ring-pink-500/70 transition-all shadow-none group-hover:shadow-[0_0_12px_rgba(236,72,153,0.4)]" />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-pink-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-md z-30">
                Open Watermark Remover
              </div>
            </Link>

            {/* Checklist Tool 3: Upscale Quality */}
            <Link
              to="/upscale"
              title="Upscale Quality: 2×, 4×, 8× neural detail synthesis"
              className="absolute rounded-lg group cursor-pointer"
              style={{ left: "53.2%", top: "56.2%", width: "9.2%", height: "4.8%" }}
            >
              <span className="absolute inset-0 rounded-lg bg-purple-500/0 group-hover:bg-purple-500/20 group-hover:ring-1.5 group-hover:ring-purple-500/70 transition-all shadow-none group-hover:shadow-[0_0_12px_rgba(168,85,247,0.4)]" />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-purple-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-md z-30">
                Open 8K Upscaler
              </div>
            </Link>

            {/* Checklist Tool 4: Background Remove */}
            <Link
              to="/background-remover"
              title="Background Remove: Sub-pixel cutout & transparent PNG"
              className="absolute rounded-lg group cursor-pointer"
              style={{ left: "53.2%", top: "61.2%", width: "9.2%", height: "4.8%" }}
            >
              <span className="absolute inset-0 rounded-lg bg-cyan-500/0 group-hover:bg-cyan-500/20 group-hover:ring-1.5 group-hover:ring-cyan-500/70 transition-all shadow-none group-hover:shadow-[0_0_12px_rgba(6,182,212,0.4)]" />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-cyan-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-md z-30">
                Open Background Remover
              </div>
            </Link>

            {/* ── CARD 03 HOTSPOTS (TAKE THE FINAL CUT) ── */}
            {/* Landscape preview stand hotspot */}
            <button
              type="button"
              onClick={() => triggerDownload("jpg")}
              title="Inspect & download high-res landscape preview (4K)"
              className="absolute rounded-2xl group cursor-pointer text-left"
              style={{ left: "67.0%", top: "43.0%", width: "14.5%", height: "20.5%" }}
            >
              <span className="absolute inset-0 rounded-2xl bg-emerald-500/0 group-hover:bg-emerald-500/15 group-hover:ring-2 group-hover:ring-emerald-400/60 transition-all shadow-none group-hover:shadow-[0_0_20px_rgba(16,185,129,0.35)]" />
            </button>

            {/* "Ready to Download" green pill hotspot */}
            <button
              type="button"
              onClick={() => triggerDownload("jpg")}
              title="Download final processed file"
              className="absolute rounded-full group cursor-pointer"
              style={{ left: "68.2%", top: "65.0%", width: "8.4%", height: "5.2%" }}
            >
              <span className="absolute inset-0 rounded-full bg-emerald-500/0 group-hover:bg-emerald-500/25 group-hover:ring-2 group-hover:ring-emerald-400 transition-all shadow-none group-hover:shadow-[0_0_16px_rgba(16,185,129,0.6)]" />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-emerald-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-md z-30">
                ✓ Download Finished File
              </div>
            </button>

            {/* Format 1: JPG Badge */}
            <button
              type="button"
              onClick={() => triggerDownload("jpg")}
              title="Download Ultra HD JPG (Clean & Upscaled)"
              className="absolute rounded-lg group cursor-pointer"
              style={{ left: "82.2%", top: "42.8%", width: "4.8%", height: "6.4%" }}
            >
              <span className="absolute inset-0 rounded-lg bg-purple-500/0 group-hover:bg-purple-500/25 group-hover:ring-2 group-hover:ring-purple-400/70 transition-all shadow-none group-hover:shadow-[0_0_12px_rgba(168,85,247,0.5)]" />
              <div className="absolute -left-20 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-purple-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-md z-30">
                Download JPG
              </div>
            </button>

            {/* Format 2: MP4 Badge */}
            <button
              type="button"
              onClick={() => triggerDownload("mp4")}
              title="Download 60FPS MP4 Video"
              className="absolute rounded-lg group cursor-pointer"
              style={{ left: "82.2%", top: "50.5%", width: "4.8%", height: "6.4%" }}
            >
              <span className="absolute inset-0 rounded-lg bg-pink-500/0 group-hover:bg-pink-500/25 group-hover:ring-2 group-hover:ring-pink-400/70 transition-all shadow-none group-hover:shadow-[0_0_12px_rgba(236,72,153,0.5)]" />
              <div className="absolute -left-20 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-pink-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-md z-30">
                Download MP4
              </div>
            </button>

            {/* Format 3: PNG Badge */}
            <button
              type="button"
              onClick={() => triggerDownload("png")}
              title="Download Lossless Transparent PNG"
              className="absolute rounded-lg group cursor-pointer"
              style={{ left: "82.2%", top: "58.2%", width: "4.8%", height: "6.4%" }}
            >
              <span className="absolute inset-0 rounded-lg bg-cyan-500/0 group-hover:bg-cyan-500/25 group-hover:ring-2 group-hover:ring-cyan-400/70 transition-all shadow-none group-hover:shadow-[0_0_12px_rgba(6,182,212,0.5)]" />
              <div className="absolute -left-20 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-cyan-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-md z-30">
                Download PNG
              </div>
            </button>

            {/* Format 4: PDF Badge */}
            <button
              type="button"
              onClick={() => triggerDownload("pdf")}
              title="Download Clean Vector PDF"
              className="absolute rounded-lg group cursor-pointer"
              style={{ left: "82.2%", top: "66.0%", width: "4.8%", height: "6.4%" }}
            >
              <span className="absolute inset-0 rounded-lg bg-rose-500/0 group-hover:bg-rose-500/25 group-hover:ring-2 group-hover:ring-rose-400/70 transition-all shadow-none group-hover:shadow-[0_0_12px_rgba(244,63,94,0.5)]" />
              <div className="absolute -left-20 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-rose-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-md z-30">
                Download PDF
              </div>
            </button>
          </div>
        </div>

        {/* ─── MOBILE & TABLET RESPONSIVE WORKFLOW (< lg) ─── */}
        <div className="lg:hidden space-y-8">
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-[#E11D48] text-xs font-bold tracking-wider uppercase">
              FROM FILE TO FINISHED
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-950 tracking-tight leading-tight">
              Less busywork.
              <br />
              <span className="bg-gradient-to-r from-violet-600 via-pink-600 to-rose-600 bg-clip-text text-transparent">
                More creating.
              </span>
            </h2>
            <p className="text-sm text-gray-600">
              A familiar workflow, with useful controls at every step.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 01: Bring your original */}
            <div className="relative rounded-3xl bg-[#FFF7ED]/95 backdrop-blur-md border border-[#FED7AA]/70 p-6 sm:p-7 shadow-lg shadow-amber-500/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center justify-center size-8 rounded-full bg-rose-100 text-[#E11D48] font-mono text-sm font-bold">
                    01
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Link
                      to="/remove/image"
                      className="px-2 py-1 rounded-md bg-[#FFE4C4] text-rose-800 text-[11px] font-semibold hover:bg-[#FFD6A5]"
                    >
                      Image
                    </Link>
                    <Link
                      to="/video-enhancer"
                      className="px-2 py-1 rounded-md bg-purple-50 text-purple-600 text-[11px] font-semibold hover:bg-purple-100"
                    >
                      Video
                    </Link>
                    <Link
                      to="/pdf-watermark-remover"
                      className="px-2 py-1 rounded-md bg-rose-50 text-rose-600 text-[11px] font-semibold hover:bg-rose-100"
                    >
                      PDF
                    </Link>
                  </div>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-[#E11D48] bg-rose-50/50 scale-[1.02]"
                      : "border-gray-200 bg-gray-50/60 hover:border-[#E11D48] hover:bg-rose-50/20"
                  }`}
                >
                  <Upload className="size-8 mx-auto text-[#E11D48] mb-2" />
                  <p className="text-sm font-bold text-gray-900">Drag & drop your files</p>
                  <p className="text-xs text-rose-600 font-medium mt-1 underline">
                    or browse from device
                  </p>
                </div>

                <h3 className="text-lg font-bold text-gray-950 mt-5">Bring your original</h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1.5">
                  Choose your image, video or document. Review supported formats before you upload.
                </p>
              </div>
            </div>

            {/* Card 02: Make it your own */}
            <div className="relative rounded-3xl bg-[#FFF7ED]/95 backdrop-blur-md border border-[#FED7AA]/70 p-6 sm:p-7 shadow-lg shadow-amber-500/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center justify-center size-8 rounded-full bg-blue-100 text-blue-600 font-mono text-sm font-bold">
                    02
                  </span>
                  <span className="text-[11px] font-semibold text-gray-400">
                    Settings & AI Tools
                  </span>
                </div>

                <div className="space-y-2 mb-4 bg-white/70 p-3.5 rounded-2xl border border-[#FED7AA]/50">
                  <Link
                    to="/upscale"
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FFF7ED] border border-[#FED7AA]/50 hover:border-indigo-300 hover:text-indigo-600 transition-colors shadow-2xs"
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold text-gray-800">
                      <Check size={14} className="text-indigo-600" /> AI Enhance
                    </span>
                    <ArrowUpRight size={14} className="text-gray-400" />
                  </Link>

                  <Link
                    to="/gemini-video-watermark-remover"
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FFF7ED] border border-[#FED7AA]/50 hover:border-pink-300 hover:text-pink-600 transition-colors shadow-2xs"
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold text-gray-800">
                      <Check size={14} className="text-pink-600" /> Remove Watermark
                    </span>
                    <ArrowUpRight size={14} className="text-gray-400" />
                  </Link>

                  <Link
                    to="/upscale"
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FFF7ED] border border-[#FED7AA]/50 hover:border-purple-300 hover:text-purple-600 transition-colors shadow-2xs"
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold text-gray-800">
                      <Check size={14} className="text-purple-600" /> Upscale Quality
                    </span>
                    <ArrowUpRight size={14} className="text-gray-400" />
                  </Link>

                  <Link
                    to="/background-remover"
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FFF7ED] border border-[#FED7AA]/50 hover:border-cyan-300 hover:text-cyan-600 transition-colors shadow-2xs"
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold text-gray-800">
                      <Check size={14} className="text-cyan-600" /> Background Remove
                    </span>
                    <ArrowUpRight size={14} className="text-gray-400" />
                  </Link>
                </div>

                <h3 className="text-lg font-bold text-gray-950 mt-5">Make it your own</h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1.5">
                  Choose a tool, adjust the settings and follow the actual processing status.
                </p>
              </div>
            </div>

            {/* Card 03: Take the final cut */}
            <div className="relative rounded-3xl bg-[#FFF7ED]/95 backdrop-blur-md border border-[#FED7AA]/70 p-6 sm:p-7 shadow-lg shadow-amber-500/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center justify-center size-8 rounded-full bg-emerald-100 text-emerald-600 font-mono text-sm font-bold">
                    03
                  </span>
                  <button
                    type="button"
                    onClick={() => triggerDownload("jpg")}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    <Check size={12} strokeWidth={3} /> Ready to Download
                  </button>
                </div>

                {/* Preview Image */}
                <div className="relative aspect-[16/10] rounded-2xl overflow-hidden mb-4 border border-gray-100 group">
                  <img
                    src="/upscale/mountain_lake.jpg"
                    alt="Preview Final Cut"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <button
                    type="button"
                    onClick={() => triggerDownload("jpg")}
                    className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 cursor-pointer"
                  >
                    <Download size={16} /> Click to Download Sample
                  </button>
                </div>

                {/* Format Badges */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => triggerDownload("jpg")}
                    className="py-1.5 px-2 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100 border border-purple-200 transition-colors"
                  >
                    JPG
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDownload("mp4")}
                    className="py-1.5 px-2 rounded-lg bg-pink-50 text-pink-700 text-xs font-bold hover:bg-pink-100 border border-pink-200 transition-colors"
                  >
                    MP4
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDownload("png")}
                    className="py-1.5 px-2 rounded-lg bg-cyan-50 text-cyan-700 text-xs font-bold hover:bg-cyan-100 border border-cyan-200 transition-colors"
                  >
                    PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDownload("pdf")}
                    className="py-1.5 px-2 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 border border-rose-200 transition-colors"
                  >
                    PDF
                  </button>
                </div>

                <h3 className="text-lg font-bold text-gray-950 mt-5">Take the final cut</h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1.5">
                  Inspect your result, compare the details and download the finished file.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CreativeWorkflowCards() {
  const cards = [
    {
      number: "01",
      eyebrow: "Start with your file",
      title: "Drop it in. We handle the setup.",
      text: "Upload an image or video and Bellix automatically prepares the right workspace for your file.",
      image: "/creative-suite/background_remover_studio.webp",
      alt: "Headphones product image ready for background removal",
      to: "/background-remover" as const,
      cta: "Upload an image",
      icon: Upload,
    },
    {
      number: "02",
      eyebrow: "Choose your finish",
      title: "Make every detail feel intentional.",
      text: "Remove distractions, restore clarity, and refine the result with controls that stay easy to understand.",
      image: "/creative-suite/hero_portrait_luxury.webp",
      alt: "Portrait enhanced with Bellix creative tools",
      to: "/tools" as const,
      cta: "Explore AI tools",
      icon: WandSparkles,
    },
    {
      number: "03",
      eyebrow: "Export with confidence",
      title: "Ready for the place it needs to go.",
      text: "Preview the finished result and download a clean, high-quality file for your next post, store, or campaign.",
      image: "/upscale/showcase/travel_after.jpg",
      alt: "High-resolution mountain landscape ready to export",
      to: "/upscale" as const,
      cta: "Create an export",
      icon: Download,
    },
  ];

  return (
    <section className="relative overflow-hidden border-y border-rose-100 bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#fff1f2_0%,transparent_45%)]" />
      <div className="relative mx-auto max-w-[1420px]">
        <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-[#E11D48]">
            <Sparkles size={13} />A simpler creative workflow
          </div>
          <h2 className="text-balance text-4xl font-bold tracking-[-0.045em] text-zinc-950 sm:text-5xl lg:text-6xl">
            From first upload to
            <span className="text-[#E11D48]"> finished work.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
            Three clear steps, one focused workspace, and no complicated editing timeline to learn.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card.number}
              className="group relative flex min-h-full flex-col overflow-hidden rounded-[2rem] border border-rose-100 bg-white shadow-[0_22px_60px_-38px_rgba(159,18,57,.35)] transition duration-300 hover:-translate-y-1.5 hover:border-rose-200 hover:shadow-[0_30px_70px_-34px_rgba(159,18,57,.42)]"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-rose-50">
                <img
                  src={card.image}
                  alt={card.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/35 via-transparent to-transparent" />
                <span className="absolute left-5 top-5 grid size-11 place-items-center rounded-2xl border border-white/70 bg-white/90 text-sm font-bold text-[#E11D48] shadow-lg backdrop-blur-md">
                  {card.number}
                </span>
                <span className="absolute bottom-4 right-4 grid size-10 place-items-center rounded-full bg-[#E11D48] text-white shadow-lg shadow-rose-950/20 transition-transform group-hover:rotate-6 group-hover:scale-105">
                  <card.icon size={17} />
                </span>
              </div>

              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#E11D48]">
                  {card.eyebrow}
                </p>
                <h3 className="mt-3 text-2xl font-bold leading-tight tracking-[-0.025em] text-zinc-950">
                  {card.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-zinc-600">{card.text}</p>
                <Link
                  to={card.to}
                  className="mt-7 inline-flex items-center justify-between rounded-full border border-rose-200 bg-rose-50/70 px-5 py-3 text-sm font-semibold text-[#E11D48] transition hover:border-[#E11D48] hover:bg-[#E11D48] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
                >
                  {card.cta}
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const STATS = [
  { value: "500K+", label: "Files processed" },
  { value: "4K", label: "Max resolution" },
  { value: "99.9%", label: "Accuracy" },
  { value: "< 30s", label: "Avg. processing" },
];

const TOOL_FEATURES = [
  {
    icon: ImageUp,
    name: "AI Upscaler",
    desc: "2×, 4×, 8× resolution — preserve natural texture without plastic finish.",
    path: "/upscale",
    accent: "from-violet-500 to-purple-600",
  },
  {
    icon: Scissors,
    name: "Background Remover",
    desc: "Precise hair, fur & edge cutouts. One-click transparent PNG export.",
    path: "/background-remover",
    accent: "from-rose-500 to-pink-600",
  },
  {
    icon: Film,
    name: "Video Enhancer",
    desc: "4K super-resolution, deblock, denoise & 60 FPS interpolation.",
    path: "/video-enhancer",
    accent: "from-orange-500 to-amber-600",
  },
  {
    icon: FileText,
    name: "PDF Cleaner",
    desc: "Remove CONFIDENTIAL stamps, logos & watermarks from any PDF.",
    path: "/pdf-watermark-remover",
    accent: "from-sky-500 to-blue-600",
  },
  {
    icon: ScanLine,
    name: "Video Watermark",
    desc: "Frame-by-frame Gemini & Veo watermark removal at 4K/60FPS.",
    path: "/gemini-video-watermark-remover",
    accent: "from-indigo-500 to-violet-600",
  },
];

/* ═══════════════════════════════════════════════════════════════
   1. GENIFY 3D ARC HERO (WHITE + BLUE + PINK MIXED BACKGROUND)
═══════════════════════════════════════════════════════════════ */

interface HeroFanCard {
  id: string;
  title: string;
  tag: string;
  path: string;
  image: string;
  zIndex: number;
  yOffset: string;
  rotate: string;
  width: string;
  margin: string;
  isCenter?: boolean;
}

const HERO_FAN_CARDS: HeroFanCard[] = [
  {
    id: "fan-1",
    title: "Floral Still Life",
    tag: "All Tools",
    path: "/tools",
    image: "/creative-suite/genify_hero/card_1_floral.jpg",
    zIndex: 10,
    yOffset: "translate-y-4 sm:translate-y-5 md:translate-y-6",
    rotate: "-rotate-2",
    width: "w-[115px] sm:w-[135px] md:w-[155px] lg:w-[175px] xl:w-[185px]",
    margin: "-mr-4 sm:-mr-6 md:-mr-8 lg:-mr-10",
  },
  {
    id: "fan-2",
    title: "Cosmic Nebula",
    tag: "Video Cleaner",
    path: "/gemini-video-watermark-remover",
    image: "/creative-suite/genify_hero/card_2_nebula.jpg",
    zIndex: 20,
    yOffset: "translate-y-2 sm:translate-y-2.5 md:translate-y-3",
    rotate: "-rotate-1",
    width: "w-[125px] sm:w-[145px] md:w-[165px] lg:w-[185px] xl:w-[200px]",
    margin: "-mr-4 sm:-mr-6 md:-mr-8 lg:-mr-10",
  },
  {
    id: "fan-3",
    title: "Golden Hour Glow",
    tag: "Background Remover",
    path: "/background-remover",
    image: "/creative-suite/genify_hero/card_3_auburn.jpg",
    zIndex: 30,
    yOffset: "translate-y-1 sm:translate-y-1 md:translate-y-1.5",
    rotate: "rotate-0",
    width: "w-[135px] sm:w-[155px] md:w-[180px] lg:w-[200px] xl:w-[215px]",
    margin: "-mr-4 sm:-mr-6 md:-mr-8 lg:-mr-10",
  },
  {
    id: "fan-4",
    title: "Iridescent Starlight",
    tag: "AI Creative Studio",
    path: "/background-remover",
    image: "/creative-suite/genify_hero/card_4_glitter.jpg",
    zIndex: 40,
    yOffset: "translate-y-0",
    rotate: "rotate-0",
    width: "w-[145px] sm:w-[170px] md:w-[195px] lg:w-[220px] xl:w-[235px]",
    margin: "",
    isCenter: true,
  },
  {
    id: "fan-5",
    title: "Cybernetic Android",
    tag: "AI Enhancer",
    path: "/tools",
    image: "/creative-suite/genify_hero/card_5_cyborg.jpg",
    zIndex: 30,
    yOffset: "translate-y-1 sm:translate-y-1 md:translate-y-1.5",
    rotate: "rotate-0",
    width: "w-[135px] sm:w-[155px] md:w-[180px] lg:w-[200px] xl:w-[215px]",
    margin: "-ml-4 sm:-ml-6 md:-ml-8 lg:-ml-10",
  },
  {
    id: "fan-6",
    title: "Dark Fantasy Knight",
    tag: "PDF Cleaner",
    path: "/pdf-watermark-remover",
    image: "/creative-suite/genify_hero/card_6_knight.jpg",
    zIndex: 20,
    yOffset: "translate-y-2 sm:translate-y-2.5 md:translate-y-3",
    rotate: "rotate-1",
    width: "w-[125px] sm:w-[145px] md:w-[165px] lg:w-[185px] xl:w-[200px]",
    margin: "-ml-4 sm:-ml-6 md:-ml-8 lg:-ml-10",
  },
  {
    id: "fan-7",
    title: "Celestial Moon Owl",
    tag: "All AI Tools",
    path: "/tools",
    image: "/creative-suite/genify_hero/card_7_owl.jpg",
    zIndex: 10,
    yOffset: "translate-y-4 sm:translate-y-5 md:translate-y-6",
    rotate: "rotate-2",
    width: "w-[115px] sm:w-[135px] md:w-[155px] lg:w-[175px] xl:w-[185px]",
    margin: "-ml-4 sm:-ml-6 md:-ml-8 lg:-ml-10",
  },
];

export function StudioHome() {
  const [active, setActive] = useState<keyof typeof studioAssets>("coast");

  return (
    <main className="studio-page">
      {/* ─── 0. BRAND NEW MASTER HERO SECTION FROM D:\HERO SECTION.jpeg ─── */}
      <BelixMasterHeroSection />

      {/* ─── 2. RUNNING ELEMENTS: AI PLATFORMS TICKER ─── */}
      <StudioAiMarquee />

      {/* ─── 3. RUNNING IMAGES: THIRD IMAGE (RESTORE & ENHANCE + CREATE & PROTECT RAILS) ─── */}
      <CreativeSuiteSection />

      {/* ─── CLEAN BANNER SECTION (Image 3 Matching) ─── */}
      <section className="studio-clean-banner-wrapper">
        <div className="studio-clean-banner">
          {/* Mobile-only: full-width ring image at top (perfectly centered, zero clipping) */}
          <div className="studio-clean-banner-mobile-img">
            <picture>
              <source
                media="(max-width: 900px)"
                srcSet="/creative-suite/clean_section_ring_mobile.png"
              />
              <img
                src="/creative-suite/clean_section_ring_mobile.png"
                alt="Diamond ring on marble — AI image restoration"
                className="w-full h-full object-cover object-center mx-auto"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </picture>
            {/* Gradient fade from image into content below */}
            <div className="studio-clean-banner-mobile-fade" />
          </div>

          <div className="studio-clean-banner-content">
            <div className="studio-clean-banner-eyebrow">
              <span>A cleaner point of view</span>
              <span className="studio-clean-banner-eyebrow-line" />
            </div>

            <h2 className="studio-clean-banner-title">
              Keep the part
              <br />
              you <em>love.</em>
            </h2>

            <p className="studio-clean-banner-desc">
              Give your images and videos a thoughtful finishing touch. Select unwanted marks,
              inspect the result and keep the frame that tells your story.
            </p>

            <ul className="studio-clean-banner-checks">
              <li>
                <span className="studio-clean-banner-check-icon">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span>Tools for images and video</span>
              </li>
              <li>
                <span className="studio-clean-banner-check-icon">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span>Original and result previews</span>
              </li>
              <li>
                <span className="studio-clean-banner-check-icon">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span>Download your processed file</span>
              </li>
            </ul>

            <Link className="studio-clean-banner-btn" to="/gemini-video-watermark-remover">
              <span>Open video cleaner</span>
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <SampleGallery />
      <CreativeWorkflowCards />

      {/* ─── TRUST BADGES ─── */}
      <section className="studio-trust-section">
        <div className="studio-trust-inner">
          <div className="studio-trust-item">
            <ShieldCheck size={20} />
            <span>Zero data retention</span>
          </div>
          <div className="studio-trust-item">
            <Zap size={20} />
            <span>Processing in seconds</span>
          </div>
          <div className="studio-trust-item">
            <Star size={20} />
            <span>4K & 8K export</span>
          </div>
          <div className="studio-trust-item">
            <Check size={20} />
            <span>No watermarks added</span>
          </div>
        </div>
      </section>

      <section className="studio-section studio-end">
        <span className="studio-eyebrow">YOUR NEXT GREAT FRAME STARTS HERE</span>
        <h2>
          Make something
          <br />
          worth a second look.
        </h2>
        <Link to="/tools" className="studio-button">
          Find your tool <ArrowUpRight size={18} />
        </Link>
      </section>
    </main>
  );
}

export function VideoDetails() {
  return (
    <div className="studio-page">
      <section className="studio-section">
        <div className="studio-section-title">
          <div>
            <span className="studio-eyebrow">MOTION DESERVES DETAIL</span>
            <h2>
              Built for the way
              <br />
              you work with video.
            </h2>
          </div>
          <p>
            Resolution, texture and motion are different decisions. Fine-tune each one before
            processing.
          </p>
        </div>
        <div className="studio-video-feature">
          <video src="/gemini-example-before.mp4" controls muted playsInline preload="metadata" />
          <div>
            <span className="studio-caption">SAMPLE SOURCE CLIP</span>
            <h3>
              Inspect the motion.
              <br />
              Then choose your settings.
            </h3>
            <p>
              This source clip demonstrates video playback, not a claimed enhancement result. Upload
              a clip to compare your own processed output.
            </p>
            <a href="/gemini-example-before.mp4" download className="studio-text-link">
              Download source to try <Download size={16} />
            </a>
          </div>
        </div>
        <div className="studio-workflow">
          {[
            [
              "Resolution with context",
              "Choose scale and review target dimensions before running a job.",
            ],
            [
              "Control the finish",
              "Adjust noise reduction, sharpening and compression cleanup to suit your clip.",
            ],
            [
              "Keep the sound",
              "Preserve original audio and inspect your export before downloading.",
            ],
          ].map(([t, c]) => (
            <article key={t}>
              <Film size={24} />
              <h3>{t}</h3>
              <p>{c}</p>
            </article>
          ))}
        </div>
      </section>
      <WorkflowCards />
    </div>
  );
}
