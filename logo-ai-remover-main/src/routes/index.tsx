"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Check,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Mountain,
  Film,
  Scissors,
  Expand,
  Eraser,
  FileText,
  Crop,
  ScanFace,
  Clapperboard,
  Type,
  AudioLines,
  FileImage,
  Layers,
  Cloud,
  LockKeyhole,
  WandSparkles,
  Gem,
  Zap,
  Image as ImageIcon,
  Timer,
  Fingerprint,
  BadgeCheck,
} from "lucide-react";

// Brand Star Mark
function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 34 34" fill="none">
        <path
          d="M17 2.8 21.25 12.75 31.2 17l-9.95 4.25L17 31.2l-4.25-9.95L2.8 17l9.95-4.25L17 2.8Z"
          fill="currentColor"
        />
        <circle cx="17" cy="17" r="3.1" fill="#10221e" />
      </svg>
    </span>
  );
}

// 1. HERO SECTION
function HeroSection() {
  return (
    <section className="hero" id="top">
      <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
      <div className="hero-orbit hero-orbit-two" aria-hidden="true" />
      <div className="hero-inner">
        <div className="hero-copy">
          <p className="eyebrow eyebrow-light">
            <span className="eyebrow-pip" /> THE CREATIVE FINISHING STUDIO
          </p>
          <h1>
            Remove Image <br />
            Backgrounds and <br />
            <em className="!text-white not-italic font-bold text-white">
              Clean Supported Watermarks
            </em>
          </h1>
          <p className="hero-description !text-white/95">
            Choose background remover or supported Gemini image and video watermark cleanup. Preview your edited media before exporting.
          </p>
          <div className="hero-actions">
            <Link className="button button-lime cursor-pointer font-bold" href="/#tools">
              Choose an Editing Tool <ArrowRight size={17} />
            </Link>
            <Link className="button button-outline-light cursor-pointer font-medium" href="/tools">
              <span className="text-[#d0f471] text-xs">▶</span> Explore All Tools
            </Link>
          </div>
          <div className="hero-assurances" aria-label="Product assurances from supplied copy">
            <span>
              <Check size={14} /> Free to start, no card required
            </span>
            <span>
              <ShieldCheck size={14} /> Review results before use
            </span>
            <span>
              <Sparkles size={14} /> Tool-specific formats and limits
            </span>
          </div>
        </div>
        <div className="hero-art-wrap">
          <div className="hero-art" role="img" aria-label="Cinematic alpine lake and mountains at blue hour">
            <img
              src="/bellix-manus/image-1.webp"
              alt="Cinematic alpine lake and mountain range at blue hour"
            />
            <div className="hero-art-topline">
              <span>
                <span className="live-dot" /> BELLIX SCENE STUDY
              </span>
              <span>01 / 03</span>
            </div>
            <div className="hero-art-caption">
              <div>
                <span className="image-kicker">LANDSCAPE & SCENE AI</span>
                <h2>
                  Breathtaking<br />
                  dynamic range.
                </h2>
              </div>
              <span className="image-arrow" aria-hidden="true">
                <ArrowUpRight size={20} />
              </span>
            </div>
            <div className="hero-art-note">
              <span className="note-icon">
                <Sparkles size={15} />
              </span>
              <span>
                <strong>Depth, restored</strong>
                <small>Cinematic color · atmospheric light</small>
              </span>
            </div>
            <div className="hero-image-grain" aria-hidden="true" />
          </div>
          <div className="hero-float-tag">
            <span className="float-tag-icon">
              <Mountain size={15} />
            </span>
            <span>LANDSCAPE / SCENE AI</span>
          </div>
          <div className="hero-side-label">BELLIX CREATIVE SYSTEM — 2026</div>
        </div>
      </div>
      <div className="hero-bottomline">
        <span>MAKE EVERY DETAIL FEEL INTENTIONAL</span>
        <Link href="/tools">
          Explore AI Studio <ArrowDownRight size={15} />
        </Link>
      </div>
    </section>
  );
}

// 2. METRICS / TRUST SECTION
function MetricsSection() {
  const metrics = [
    { value: "50M+", label: "Visuals processed", note: "Trusted worldwide", icon: ImageIcon },
    { value: "< 3s", label: "Average inference", note: "Instant HD output", icon: Timer },
    { value: "99.9%", label: "Edge precision", note: "Sub-pixel accuracy", icon: Fingerprint },
    { value: "4.9 <span>★</span>", label: "Creator rating", note: "150K+ verified reviews", icon: BadgeCheck },
  ];

  return (
    <section className="metrics-section" aria-label="Supplied Bellix marketing metrics">
      <div className="metrics-inner">
        <div className="metrics-intro">
          <span className="section-index">01 / TRUST</span>
          <p>
            Made for the<br />
            <em>final 5%.</em>
          </p>
        </div>
        <div className="metrics-grid">
          {metrics.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="metric-card">
                <Icon size={18} strokeWidth={1.7} className="metric-icon" aria-hidden="true" />
                <strong className="metric-value" dangerouslySetInnerHTML={{ __html: item.value }} />
                <span className="metric-label">{item.label}</span>
                <small>{item.note}</small>
              </div>
            );
          })}
        </div>
      </div>
      <p className="claim-note">
        Metrics and capability statements on this page are supplied marketing copy.
      </p>
    </section>
  );
}

// 3. CURATED NEURAL SHOWCASE SECTION
const showcaseItems = [
  {
    number: "01",
    label: "SUB-PIXEL MATTING",
    title: "Portraits with organic texture",
    description: "Reconstruct delicate flyaways, natural skin pores, and soft fringe lighting with zero plastic blur.",
    image: "/bellix-manus/image-3.webp",
    alt: "Natural editorial portrait with delicate hair and skin texture",
    className: "showcase-portrait",
    icon: ScanFace,
  },
  {
    number: "02",
    label: "COMMERCIAL PRODUCT",
    title: "Crystal caustics & liquid light",
    description: "Rebuild intricate emerald facets, water ripples, and high-fidelity reflections in true 8K resolution.",
    image: "/bellix-manus/image-4.webp",
    alt: "Emerald gemstone with crisp facets and liquid light reflections",
    className: "showcase-crystal",
    icon: Gem,
  },
  {
    number: "03",
    label: "EXPANSIVE HORIZON",
    title: "Alpine architectural masterpiece",
    description: "Restore vast twilight skies, reflective infinity pools, and razor-sharp architectural geometry flawlessly.",
    image: "/bellix-manus/image-5.webp",
    alt: "Modern alpine architecture and an infinity pool at twilight",
    className: "showcase-architecture",
    icon: Mountain,
  },
];

function ShowcaseSection() {
  return (
    <section className="showcase-section section-wrap" id="showcase">
      <div className="section-heading showcase-heading">
        <div>
          <span className="section-index">02 / CURATED NEURAL SHOWCASE</span>
          <h2>
            Flawless execution in<br />
            <em>every single detail.</em>
          </h2>
        </div>
        <p>
          Experience what happens when precision AI models touch every frame. Sub-pixel cutouts, crystal caustics, and vast pristine landscapes ready to export.
        </p>
      </div>
      <div className="showcase-grid">
        {showcaseItems.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.number} className={`showcase-card ${item.className}`}>
              <div className="showcase-image">
                <img src={item.image} alt={item.alt} loading="lazy" />
                <span className="showcase-number">{item.number}</span>
                <span className="showcase-corner-icon">
                  <Icon size={16} strokeWidth={1.7} />
                </span>
                <span className="showcase-image-label">BELLIX / NEURAL SHOWCASE</span>
              </div>
              <div className="showcase-card-copy">
                <span className="image-kicker">{item.label}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <Link className="text-link" href="/tools">
                  Explore the toolkit <ArrowUpRight size={15} />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// 4. THE TOOLKIT SECTION
interface ToolItem {
  title: string;
  descriptor: string;
  promise: string;
  icon: LucideIcon;
  href?: string;
}

const toolsGroupA: ToolItem[] = [
  { title: "AI Video Watermark Remover", descriptor: "Gemini & Veo", promise: "Frame-by-frame restoration", icon: Film, href: "/gemini-video-watermark-remover" },
  { title: "Gemini Sparkle Watermark Remover", descriptor: "Corner Sparkle", promise: "Exact 15.6% AI restoration", icon: Sparkles, href: "/gemini-image-watermark-remover" },
  { title: "AI Background Remover", descriptor: "Instant Alpha", promise: "Neural AI cutout (< 3s)", icon: Scissors, href: "/background-remover" },
  { title: "4K AI Photo Upscaler & Cleaner", descriptor: "Ultra HD", promise: "Neural texture enhancement", icon: Sparkles, href: "/gemini-image-watermark-remover" },
  { title: "4K Neural Frame Interpolator", descriptor: "60 FPS Boost", promise: "RIFE flow synthesis", icon: Clapperboard, href: "/video-enhancer" },
  { title: "Vector & Typography Reconstruction", descriptor: "Lossless Paths", promise: "Vector synthesis", icon: Type, href: "/tools" },
  { title: "Cinematic HDR Color Grading", descriptor: "HDR 10-Bit", promise: "Neural colorimetry", icon: Sparkles, href: "/tools" },
  { title: "Audio Temporal & Stem Cleaner", descriptor: "Studio Grade", promise: "Temporal frequency", icon: AudioLines, href: "/tools" },
];

const toolsGroupB: ToolItem[] = [
  { title: "High-Resolution Image Restoration", descriptor: "Sub-Pixel Clean", promise: "Zero residual artifacts", icon: FileImage, href: "/gemini-image-watermark-remover" },
  { title: "Neural Texture Synthesizer", descriptor: "Sub-Pixel Detail", promise: "Deep neural fill", icon: Layers, href: "/tools" },
  { title: "Ultra-Fast GPU Cloud Processing", descriptor: "NVIDIA H100", promise: "High-throughput cluster", icon: Cloud, href: "/tools" },
  { title: "Zero-Retention Privacy Vault", descriptor: "256-Bit SSL", promise: "Transient in-memory", icon: LockKeyhole, href: "/tools" },
  { title: "8K Neural Drone Stabilizer", descriptor: "Gyroscopic 8K", promise: "Aerial cinematography", icon: Mountain, href: "/tools" },
  { title: "Haute Couture Model & Luxury Couple Studio", descriptor: "Glamour 8K", promise: "Fashion editorial", icon: Sparkles, href: "/tools" },
  { title: "Anime Pet & Character Background Remover", descriptor: "Instant Alpha", promise: "AI pet & anime cutout", icon: WandSparkles, href: "/background-remover" },
  { title: "Macro Jewelry & Diamond Refiner", descriptor: "Prismatic 8K", promise: "Commercial macro", icon: Gem, href: "/tools" },
  { title: "Zero-Lux Night Vision Denoising", descriptor: "Sub-Lux ISO", promise: "Low-light enhancement", icon: Zap, href: "/tools" },
  { title: "Cinematic Neural Restoration", descriptor: "Studio Restore", promise: "Film & texture recovery", icon: Film, href: "/video-enhancer" },
  { title: "Private Media Processing", descriptor: "Zero Retention", promise: "Secure local pipeline", icon: ShieldCheck, href: "/tools" },
];

function ToolCard({ tool, index }: { tool: ToolItem; index: number; key?: React.Key }) {
  const Icon = tool.icon;
  const cardContent = (
    <article className="tool-card">
      <div className="tool-card-top">
        <span className="tool-number">{String(index + 1).padStart(2, "0")}</span>
        <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
      </div>
      <h3>{tool.title}</h3>
      <p className="tool-descriptor">{tool.promise}</p>
      <span className="tool-model">{tool.descriptor}</span>
    </article>
  );

  if (tool.href) {
    return (
      <Link href={tool.href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
        {cardContent}
      </Link>
    );
  }
  return cardContent;
}

function ToolkitSection() {
  return (
    <section className="tools-section" id="tools">
      <div className="tools-inner section-wrap">
        <div className="tools-heading">
          <div className="tools-title-block">
            <span className="section-index section-index-light">03 / THE TOOLKIT</span>
            <h2>
              All the right tools.<br />
              <em>One clear point of view.</em>
            </h2>
          </div>
          <p>
            Thoughtful finishing tools for the details that make the whole image feel right.
          </p>
        </div>

        {/* Group A */}
        <div className="tool-group">
          <div className="tool-group-heading">
            <span className="group-marker">A</span>
            <div>
              <span className="eyebrow eyebrow-light">RESTORE & ENHANCE</span>
              <p>Sharper detail. Cleaner frames.</p>
            </div>
            <span className="group-count">11 TOOLS</span>
          </div>
          <div className="tool-grid">
            {toolsGroupA.map((tool, idx) => (
              <ToolCard key={tool.title} tool={tool} index={idx} />
            ))}
          </div>
        </div>

        {/* Group B */}
        <div className="tool-group tool-group-protect">
          <div className="tool-group-heading">
            <span className="group-marker group-marker-lime">B</span>
            <div>
              <span className="eyebrow eyebrow-light">CREATE & PROTECT</span>
              <p>Space to make. Care built in.</p>
            </div>
            <span className="group-count">11 TOOLS</span>
          </div>
          <div className="tool-grid">
            {toolsGroupB.map((tool, idx) => (
              <ToolCard key={tool.title} tool={tool} index={idx + toolsGroupA.length} />
            ))}
          </div>
        </div>

        <p className="tool-note">
          <LockKeyhole size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
          Tool names and descriptors reflect the Bellix creative suite; click any tool to open its dedicated studio.
        </p>
      </div>
    </section>
  );
}

// 5. WORKFLOW SECTION
const workflowSteps = [
  {
    number: "01",
    title: "Start with your file",
    description: "Drop it in. We handle the setup. Upload an image or video and Bellix automatically prepares the right workspace for your file.",
    action: "Upload an image",
    icon: FileImage,
    href: "/background-remover",
  },
  {
    number: "02",
    title: "Choose your finish",
    description: "Make every detail feel intentional. Remove distractions, restore clarity, and refine the result with controls that stay easy to understand.",
    action: "Explore AI tools",
    icon: WandSparkles,
    href: "#tools",
  },
  {
    number: "03",
    title: "Export with confidence",
    description: "Ready for the place it needs to go. Preview the finished result and download a clean, high-quality file for your next post, store, or campaign.",
    action: "Create an export",
    icon: ArrowUpRight,
    href: "/gemini-video-watermark-remover",
  },
];

function WorkflowSection() {
  return (
    <section className="workflow-section section-wrap" id="workflow">
      <div className="workflow-intro">
        <span className="section-index">04 / A SIMPLER CREATIVE WORKFLOW</span>
        <h2>
          From first upload<br />
          to <em>finished work.</em>
        </h2>
        <p>
          Three clear steps, one focused workspace, and no complicated editing timeline to learn.
        </p>
        <Link className="button button-dark" href="/tools">
          Find your tool <ArrowUpRight size={17} />
        </Link>
        <div className="workflow-side-note">
          <span className="side-note-line" />
          BUILT FOR YOUR NEXT GREAT FRAME
        </div>
      </div>
      <div className="workflow-steps">
        {workflowSteps.map((step) => {
          const Icon = step.icon;
          return (
            <article key={step.number} className="workflow-step">
              <div className="step-top">
                <span className="step-number">{step.number}</span>
                <span className="step-icon">
                  <Icon size={19} strokeWidth={1.7} />
                </span>
              </div>
              <div className="step-copy">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                <Link href={step.href}>
                  {step.action} <ArrowRight size={15} />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// 6. INTERACTIVE BEFORE/AFTER CLEANUP DEMO
function DemoSection() {
  const [split, setSplit] = useState(53);
  const style = { "--split": `${split}%` } as React.CSSProperties;

  return (
    <section className="demo-section" id="results">
      <div className="demo-inner section-wrap">
        <div className="demo-copy">
          <span className="section-index section-index-light">05 / A CLEANER POINT OF VIEW</span>
          <h2>
            Keep the part<br />
            <em>you love.</em>
          </h2>
          <p className="demo-lead">
            Give your images and videos a thoughtful finishing touch. Select unwanted marks, inspect the result and keep the frame that tells your story.
          </p>
          <ul className="demo-benefits">
            <li>
              <CheckCircle2 size={16} /> Tools for images and video
            </li>
            <li>
              <CheckCircle2 size={16} /> Original and result previews
            </li>
            <li>
              <CheckCircle2 size={16} /> Download your processed file
            </li>
          </ul>
          <Link className="button button-lime" href="/gemini-video-watermark-remover">
            Open video cleaner <ArrowUpRight size={17} />
          </Link>
          <p className="prototype-note">
            <ShieldCheck size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
            Synchronized frame engine · sub-pixel edge matting
          </p>
        </div>

        <div className="demo-visual-column">
          <div className="demo-window-heading">
            <span>
              <span className="demo-status-dot" /> SAMPLE FRAME / 00:03
            </span>
            <span>BEFORE + AFTER</span>
          </div>
          <div className="comparison-frame" style={style}>
            <img
              className="compare-base"
              src="/bellix-manus/image-2.webp"
              alt="Cinematic coastal travel scene shown as the original sample frame"
              loading="lazy"
            />
            <div className="original-badge" aria-hidden="true">
              <Sparkles size={13} /> Gemini
            </div>
            <img
              className="compare-clean"
              src="/bellix-manus/image-2.webp"
              alt="The same sample frame presented as a clean preview concept"
              loading="lazy"
            />
            <span className="comparison-label comparison-after">
              <Check size={12} /> AFTER / CLEAN PREVIEW
            </span>
            <span className="comparison-label comparison-before">BEFORE / MARK VISIBLE</span>
            <span className="comparison-divider" aria-hidden="true">
              <span>
                <ChevronDown size={14} />
              </span>
            </span>
            <span className="comparison-frame-index">FIG. 01 — SAMPLE</span>
          </div>

          <div className="comparison-control">
            <label htmlFor="comparison-slider">
              <span>AFTER</span>
              <span className="control-caption">Drag to compare this sample frame</span>
              <span>BEFORE</span>
            </label>
            <input
              id="comparison-slider"
              type="range"
              min="18"
              max="82"
              value={split}
              onChange={(e) => setSplit(Number(e.target.value))}
              aria-label="Adjust the illustrative before and after split"
            />
          </div>

          <p className="demo-disclaimer">
            Illustrative static preview based on our high-resolution neural inpainting pipeline. It represents our synchronized multi-frame cleanup engine, removing lower-right Gemini watermark artifacts while preserving natural dynamic range, edge clarity, and fine textures.
          </p>
        </div>
      </div>
    </section>
  );
}

// 7. REAL-WORLD BENCHMARKS SECTION
const benchmarkItems = [
  {
    title: "Graduation & studio portraits",
    description: "After large proof overlays and copyright stamps are erased, facial features, skin tone, eyelashes, and hair follicles are reconstructed naturally.",
    icon: ScanFace,
  },
  {
    title: "E-commerce & product photography",
    description: "Bring back the small material details, crisp edges, and clean reflections that help a product image feel ready for its next setting.",
    icon: Gem,
  },
  {
    title: "Stock previews & 4K wallpapers",
    description: "Restore the fine texture, atmosphere, and edge detail in expansive images while keeping the composition that makes them memorable.",
    icon: ImageIcon,
  },
];

function BenchmarksSection() {
  return (
    <section className="benchmark-section section-wrap">
      <div className="benchmark-heading">
        <span className="section-index">06 / REAL-WORLD BENCHMARK RESULTS</span>
        <div>
          <h2>
            More than erasing.<br />
            <em>Complete texture restoration.</em>
          </h2>
          <p>Our multi-scale neural inpainting model rebuilds the covered area using spatial context.</p>
        </div>
      </div>
      <div className="benchmark-grid">
        {benchmarkItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="benchmark-card">
              <div className="benchmark-card-top">
                <span>0{idx + 1}</span>
                <Icon size={18} strokeWidth={1.6} />
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <span className="benchmark-arrow">
                <ArrowUpRight size={18} />
              </span>
            </article>
          );
        })}
      </div>
      <div className="benchmark-foot">
        <span>
          <ShieldCheck size={16} /> Zero data retention
        </span>
        <span>
          <Zap size={16} /> Processing in seconds
        </span>
        <span>
          <Expand size={16} /> 4K & 8K export
        </span>
        <span>
          <BadgeCheck size={16} /> No watermarks added
        </span>
      </div>
    </section>
  );
}

// 8. FINAL CLOSING CTA SECTION
const toolGuides = [
  {
    id: "background-remover",
    title: "Remove an image background",
    description: "Isolate a product, person or object for listings, graphics and layouts.",
    image: "/tool-guides/background.webp",
    alt: "Amber perfume bottle shown in a forest-green set and isolated on a pale background",
    steps: ["Upload a PNG, JPG or WebP.", "Preview the cutout and refine the edges.", "Download a transparent PNG."],
    action: "Open Background Remover",
  },
  {
    id: "gemini-image-watermark-remover",
    title: "Clean a Gemini image",
    description: "Remove a supported visible sparkle from an original Gemini image.",
    image: "/tool-guides/image.webp",
    alt: "An ivory villa among olive trees in a split-view image",
    steps: ["Upload the original Gemini image.", "Run cleanup and inspect the corner.", "Download the processed image."],
    action: "Open Gemini Image Cleaner",
  },
  {
    id: "gemini-video-watermark-remover",
    title: "Clean a Gemini or Veo video",
    description: "Remove a supported visible sparkle and compare both videos at the same playback position.",
    image: "/tool-guides/video.webp",
    alt: "Cinematic comparison stills of a blue car driving through a pine forest",
    steps: ["Upload the original video.", "Review the original and processed sides in the player.", "Download the processed MP4."],
    action: "Open Video Cleaner",
  },
];

function HomeToolGuides() {
  return (
    <section className="home-tool-guides" id="tools" aria-labelledby="home-tool-guides-title">
      <div className="home-tool-guides-inner">
        <h2 id="home-tool-guides-title">Choose your editing tool</h2>
        {toolGuides.map(({ id, title, description, image, alt, steps, action }) => (
          <section key={id} aria-labelledby={id + "-guide"} className="home-tool-guide">
            <div className="home-tool-guide-image">
              <img src={image} alt={alt} width={960} height={600} loading="lazy" decoding="async" />
            </div>
            <div className="home-tool-guide-copy">
              <h3 id={id + "-guide"}>{title}</h3>
              <p>{description}</p>
              <ol>
                {steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
              <Link className="home-tool-guide-link" href={`/${id}`}>
                {action} <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="final-cta" id="final-cta">
      <div className="cta-orbit cta-orbit-one" aria-hidden="true" />
      <div className="cta-orbit cta-orbit-two" aria-hidden="true" />
      <div className="final-cta-inner section-wrap">
        <div className="cta-side-label">
          <span className="eyebrow eyebrow-light">YOUR NEXT GREAT FRAME STARTS HERE</span>
          <span className="cta-vertical-text">BELLIX CREATIVE STUDIO / 2026</span>
        </div>
        <div className="cta-copy">
          <h2>
            Make something<br />
            <em>worth a second look.</em>
          </h2>
          <p>Clear the watermark. Keep 100% of the image.</p>
          <Link className="button button-lime" href="/#tools">
            Find your tool <ArrowUpRight size={17} />
          </Link>
          <span className="cta-reassurance">
            <Check size={14} /> Choose a tool to see its supported files and requirements.
          </span>
        </div>
        <div className="cta-stamp" aria-hidden="true">
          <BrandMark />
          <span>
            MAKE<br />
            A LITTLE<br />
            <em>MAGIC</em>
          </span>
          <ArrowDownRight size={17} />
        </div>
      </div>
    </section>
  );
}

// ROOT HOME PAGE COMPONENT
export default function HomePage() {
  return (
    <div className="home-page">
      <HeroSection />
      <HomeToolGuides />
      <FinalCTASection />
    </div>
  );
}
