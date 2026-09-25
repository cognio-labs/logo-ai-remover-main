import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, ArrowRight, ScanLine, Upload, SlidersHorizontal, Download, Film, ImageUp, Scissors, FileText, WandSparkles, Check, Sparkles, Zap, ShieldCheck, Star } from "lucide-react";
import { ModelIcon } from "@/components/ModelIcon";
import { AI_MODELS, type AIModelData } from "@/components/models/modelData";
import { CreativeSuiteSection } from "@/components/ui/hero-parallax";

export const studioAssets = { coast: "/creative-suite/hero_creator_masterpiece.webp", product: "/creative-suite/macro_jewelry_diamond.jpg", portrait: "/creative-suite/portrait_restorer.jpg" };
export const studioTools = [
  { name: "Upscale", path: "/upscale", icon: ImageUp },
  { name: "Background", path: "/background-remover", icon: Scissors },
  { name: "Video", path: "/video-enhancer", icon: Film },
  { name: "PDF cleaner", path: "/pdf-watermark-remover", icon: FileText },
  { name: "Image cleaner", path: "/remove/image", icon: WandSparkles },
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
    <div className="relative w-full py-4 sm:py-5 bg-white border-y border-[#FCE7EC] overflow-hidden whitespace-nowrap select-none shadow-2xs">
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

export function StudioHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <header className="studio-heading"><span className="studio-eyebrow"><span /></span>{eyebrow}<h1>{title}</h1><p>{text}</p></header>;
}

export function SampleGallery({ title = "A new perspective on your next project." }: { title?: string }) {
  return (
    <section className="studio-section">
      <div className="studio-section-title">
        <div><span className="studio-eyebrow">THE CREATIVE POSSIBILITIES</span><h2>{title}</h2></div>
        <p>Original AI-generated creative samples. Upload your own image to see its actual processed result.</p>
      </div>
      <div className="studio-gallery">
        {[
          ["portrait", "Portraits with personality", "Hair, fabric and natural skin texture", "/background-remover"],
          ["product", "Products in their best light", "Glass, reflections and considered composition", "/upscale"],
          ["coast", "Spaces worth exploring", "Architecture, landscapes and fine detail", "/remove/image"],
        ].map(([key, title, copy, path]) => (
          <Link key={key} to={path} className="studio-gallery-card">
            <img src={studioAssets[key as keyof typeof studioAssets]} alt={title} loading="lazy" />
            <div>
              <span className="studio-caption">CREATIVE SAMPLE</span>
              <h3>{title}</h3>
              <p>{copy}</p>
              <ArrowUpRight size={20} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function WorkflowCards() {
  return (
    <section className="studio-section">
      <div className="studio-section-title">
        <div><span className="studio-eyebrow">FROM FILE TO FINISHED</span><h2>Less busywork.<br />More creating.</h2></div>
        <p>A familiar workflow, with useful controls at every step.</p>
      </div>
      <div className="studio-workflow">
        {[
          [Upload, "01", "Bring your original", "Choose your image, video or document. Review supported formats before you upload."],
          [SlidersHorizontal, "02", "Make it your own", "Choose a tool, adjust the settings and follow the actual processing status."],
          [Download, "03", "Take the final cut", "Inspect your result, compare the details and download the finished file."],
        ].map(([Icon, number, title, copy]) => {
          const I = Icon as typeof Upload;
          return (
            <article key={number as string}>
              <div className="studio-step-art"><I size={42} /><span>{number as string}</span><div className="studio-step-lines"><i /><i /><i /></div></div>
              <h3>{title as string}</h3>
              <p>{copy as string}</p>
            </article>
          );
        })}
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
  { icon: ImageUp, name: "AI Upscaler", desc: "2×, 4×, 8× resolution — preserve natural texture without plastic finish.", path: "/upscale", accent: "from-violet-500 to-purple-600" },
  { icon: Scissors, name: "Background Remover", desc: "Precise hair, fur & edge cutouts. One-click transparent PNG export.", path: "/background-remover", accent: "from-rose-500 to-pink-600" },
  { icon: Film, name: "Video Enhancer", desc: "4K super-resolution, deblock, denoise & 60 FPS interpolation.", path: "/video-enhancer", accent: "from-orange-500 to-amber-600" },
  { icon: FileText, name: "PDF Cleaner", desc: "Remove CONFIDENTIAL stamps, logos & watermarks from any PDF.", path: "/pdf-watermark-remover", accent: "from-sky-500 to-blue-600" },
  { icon: WandSparkles, name: "Image Cleaner", desc: "Brush-select and erase watermarks, logos & AI artifacts.", path: "/remove/image", accent: "from-emerald-500 to-teal-600" },
  { icon: ScanLine, name: "Video Watermark", desc: "Frame-by-frame Gemini & Veo watermark removal at 4K/60FPS.", path: "/gemini-video-watermark-remover", accent: "from-indigo-500 to-violet-600" },
];

export function StudioHome() {
  const [active, setActive] = useState<keyof typeof studioAssets>("coast");

  return (
    <main className="studio-page">
      {/* ─── 1. WHITE HERO (FRAMELESS IMAGE TOUCHING BACKGROUND) ─── */}
      <section className="studio-hero-v2">
        <div className="studio-hero-bg" />

        <div className="studio-hero-v2-inner">
          {/* Left: copy */}
          <div className="studio-hero-v2-copy">
            <div className="studio-badge">
              <span className="studio-badge-dot" />
              <span>AI Creative Workspace • 6 Pro Tools</span>
            </div>

            <h1 className="studio-hero-v2-title">
              Turn rough ideas into <em>finished work.</em>
            </h1>

            <p className="studio-hero-v2-sub">
              Remove distractions, restore detail, upscale every frame and make your next piece look ready to publish. No technical knowledge required.
            </p>

            <div className="studio-hero-v2-actions">
              <Link className="studio-cta-primary" to="/upscale">
                <Sparkles size={16} /> Start creating free <ArrowUpRight size={17} />
              </Link>
              <Link className="studio-cta-ghost" to="/video-enhancer">
                See how it works <ArrowRight size={16} />
              </Link>
            </div>

            <div className="studio-hero-v2-checks">
              <span><Check size={14} /> Six focused tools</span>
              <span><Check size={14} /> Real processing status</span>
              <span><Check size={14} /> Export-ready results</span>
            </div>

            {/* Stats row */}
            <div className="studio-hero-stats">
              {STATS.map(s => (
                <div key={s.label} className="studio-stat">
                  <strong>{s.value}</strong>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Frameless image seamlessly touching background (Image 1 Matching) */}
          <div className="studio-hero-v2-media-wrap">
            <div className="studio-hero-v2-photo-card">
              <img
                className="studio-hero-v2-photo"
                src={studioAssets[active]}
                alt="Bellix creative workspace sample"
                fetchPriority="high"
              />
              {/* Floating pill badge */}
              <div className="studio-float-pill">
                <span className="text-gray-300">Before</span>
                <span className="text-rose-400">⇄</span>
                <span>After</span>
              </div>
              {/* Floating AI detail restored */}
              <div className="studio-float-card studio-float-top">
                <Sparkles size={15} className="text-[#E11D48]" />
                <span>AI detail restored<small>Natural texture, cleaner edges</small></span>
              </div>
              {/* Floating Growth Graph badge */}
              <div className="studio-float-growth">
                <div className="flex items-center justify-between gap-4 text-xs font-bold text-gray-900 mb-1">
                  <span>Your Growth</span>
                  <span className="text-[#E11D48]">+300%</span>
                </div>
                <div className="flex items-end gap-1 h-6">
                  <span className="w-1.5 h-2 bg-rose-200 rounded-xs" />
                  <span className="w-1.5 h-3 bg-rose-300 rounded-xs" />
                  <span className="w-1.5 h-4 bg-rose-400 rounded-xs" />
                  <span className="w-1.5 h-5 bg-[#FF2E63] rounded-xs" />
                  <span className="w-1.5 h-6 bg-[#E11D48] rounded-xs" />
                </div>
              </div>
              {/* Floating processing ready */}
              <div className="studio-float-card studio-float-bottom">
                <span className="studio-status-dot" />
                <span>Processing ready <strong className="ml-1 px-1.5 py-0.5 rounded bg-rose-50 text-[#E11D48] text-[10px] font-bold">4K</strong></span>
              </div>
              {/* Thumbs switcher */}
              <div className="studio-thumbs-bar">
                {Object.entries(studioAssets).map(([key, src]) => (
                  <button
                    key={key}
                    aria-label={`Show ${key} sample`}
                    aria-pressed={active === key}
                    onClick={() => setActive(key as keyof typeof studioAssets)}
                  >
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. RUNNING ELEMENTS: AI PLATFORMS TICKER ─── */}
      <StudioAiMarquee />

      {/* ─── 3. RUNNING IMAGES: THIRD IMAGE (RESTORE & ENHANCE + CREATE & PROTECT RAILS) ─── */}
      <CreativeSuiteSection />



      {/* ─── CLEAN SECTION ─── */}
      <section className="studio-section studio-clean-section">
        <div className="studio-clean-image">
          <img src={studioAssets.product} alt="Cobalt glass product photography creative sample" loading="lazy" />
          <span>LESS DISTRACTION. MORE FOCUS.</span>
        </div>
        <div>
          <span className="studio-eyebrow">A CLEANER POINT OF VIEW</span>
          <h2>Keep the part<br />you <em>love.</em></h2>
          <p>Give your images and videos a thoughtful finishing touch. Select unwanted marks, inspect the result and keep the frame that tells your story.</p>
          <ul className="studio-check-list">
            <li><Check />Tools for images and video</li>
            <li><Check />Original and result previews</li>
            <li><Check />Download your processed file</li>
          </ul>
          <Link className="studio-button" to="/gemini-video-watermark-remover">
            Open video cleaner <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>

      <SampleGallery />
      <WorkflowCards />

      {/* ─── TRUST BADGES ─── */}
      <section className="studio-trust-section">
        <div className="studio-trust-inner">
          <div className="studio-trust-item"><ShieldCheck size={20} /><span>Zero data retention</span></div>
          <div className="studio-trust-item"><Zap size={20} /><span>Processing in seconds</span></div>
          <div className="studio-trust-item"><Star size={20} /><span>4K & 8K export</span></div>
          <div className="studio-trust-item"><Check size={20} /><span>No watermarks added</span></div>
        </div>
      </section>

      <section className="studio-section studio-end">
        <span className="studio-eyebrow">YOUR NEXT GREAT FRAME STARTS HERE</span>
        <h2>Make something<br />worth a second look.</h2>
        <Link to="/tools" className="studio-button">Find your tool <ArrowUpRight size={18} /></Link>
      </section>
    </main>
  );
}

export function VideoDetails() {
  return (
    <div className="studio-page">
      <section className="studio-section">
        <div className="studio-section-title">
          <div><span className="studio-eyebrow">MOTION DESERVES DETAIL</span><h2>Built for the way<br />you work with video.</h2></div>
          <p>Resolution, texture and motion are different decisions. Fine-tune each one before processing.</p>
        </div>
        <div className="studio-video-feature">
          <video src="/gemini-example-before.mp4" controls muted playsInline preload="metadata" />
          <div>
            <span className="studio-caption">SAMPLE SOURCE CLIP</span>
            <h3>Inspect the motion.<br />Then choose your settings.</h3>
            <p>This source clip demonstrates video playback, not a claimed enhancement result. Upload a clip to compare your own processed output.</p>
            <a href="/gemini-example-before.mp4" download className="studio-text-link">Download source to try <Download size={16} /></a>
          </div>
        </div>
        <div className="studio-workflow">
          {[
            ["Resolution with context", "Choose scale and review target dimensions before running a job."],
            ["Control the finish", "Adjust noise reduction, sharpening and compression cleanup to suit your clip."],
            ["Keep the sound", "Preserve original audio and inspect your export before downloading."],
          ].map(([t, c]) => (
            <article key={t}><Film size={24} /><h3>{t}</h3><p>{c}</p></article>
          ))}
        </div>
      </section>
      <WorkflowCards />
    </div>
  );
}
