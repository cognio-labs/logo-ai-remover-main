"use client";
import React, { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  MotionValue,
} from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  WandSparkles,
  Video,
  Sparkles,
  CheckCircle2,
  Zap,
  Shield,
  Layers,
} from "lucide-react";
import {
  CREATIVE_SUITE_ASSETS,
  type ProductCardItem,
} from "@/config/creativeSuiteAssets";

export { type ProductCardItem };
export const DEFAULT_BELLIX_PRODUCTS: ProductCardItem[] = CREATIVE_SUITE_ASSETS;

export const HeroParallax = ({
  products = CREATIVE_SUITE_ASSETS,
  title,
  subtitle,
}: {
  products?: ProductCardItem[];
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
}) => {
  const cardList = products && products.length > 0 ? products : CREATIVE_SUITE_ASSETS;

  // 4 Full Rows of 5 Unique AI-Generated Cards each (20 distinct products, 0 duplicates)
  const firstRow = cardList.slice(0, 5);
  const secondRow = cardList.slice(5, 10);
  const thirdRow = cardList.slice(10, 15);
  const fourthRow = cardList.slice(15, 20);

  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // 60-120 FPS Buttery-Smooth Direct GPU Transforms (No heavy spring oscillation)
  const translateX = useTransform(scrollYProgress, [0, 1], [0, 700]);
  const translateXReverse = useTransform(scrollYProgress, [0, 1], [0, -700]);
  const translateY = useTransform(scrollYProgress, [0, 0.85], [-30, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [0.96, 1]);

  return (
    <div
      ref={ref}
      className="min-h-screen h-[190vh] sm:h-[220vh] lg:h-[240vh] pt-8 pb-16 overflow-hidden antialiased relative flex flex-col self-auto bg-gradient-to-b from-[#FFF5F8] via-white to-white text-gray-950"
    >
      {/* Background ambient lighting glows */}
      <div className="absolute top-0 left-1/4 size-[650px] bg-gradient-to-br from-[#FFE4E9]/70 via-[#FFF1F4]/40 to-transparent blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 right-10 size-[550px] bg-[#FCE7EC]/60 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute bottom-20 left-1/3 size-[500px] bg-[#FFE4E9]/50 blur-[150px] pointer-events-none rounded-full" />

      {/* Hero Header with Rich Background Visuals & Showcase */}
      <Header title={title} subtitle={subtitle} />

      {/* GPU-Accelerated Parallax Card Grid — 4 Rows of 5 Cards each */}
      <motion.div
        style={{
          translateY,
          opacity,
        }}
        className="relative z-10 space-y-8 sm:space-y-10 md:space-y-12 transform-gpu will-change-transform"
      >
        {/* Row 1 — Flagship Neural Engines */}
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-6 sm:space-x-8 transform-gpu will-change-transform">
          {firstRow.map((product) => (
            <ProductCard
              product={product}
              translate={translateX}
              key={product.id || product.title}
              priority
            />
          ))}
        </motion.div>

        {/* Row 2 — Generative Inpainting & Restoration */}
        <motion.div className="flex flex-row space-x-6 sm:space-x-8 transform-gpu will-change-transform">
          {secondRow.map((product) => (
            <ProductCard
              product={product}
              translate={translateXReverse}
              key={product.id || product.title}
            />
          ))}
        </motion.div>

        {/* Row 3 — Infrastructure, Intelligence & Security */}
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-6 sm:space-x-8 transform-gpu will-change-transform">
          {thirdRow.map((product) => (
            <ProductCard
              product={product}
              translate={translateX}
              key={product.id || product.title}
            />
          ))}
        </motion.div>

        {/* Row 4 — Advanced Cinema & Macro Refinement (Fills lower void completely) */}
        {fourthRow.length > 0 && (
          <motion.div className="flex flex-row space-x-6 sm:space-x-8 pb-10 transform-gpu will-change-transform">
            {fourthRow.map((product) => (
              <ProductCard
                product={product}
                translate={translateXReverse}
                key={product.id || product.title}
              />
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Seamless bottom fade into the next section */}
      <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-white via-white/50 to-transparent pointer-events-none z-20" />
    </div>
  );
};

export const Header = ({
  title,
  subtitle,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
}) => {
  return (
    <div className="max-w-7xl relative mx-auto pt-4 pb-10 md:pt-10 md:pb-16 px-4 sm:px-6 lg:px-8 w-full left-0 top-0 z-30">
      {/* ------------------------------------------------------------- */}
      {/* BACKGROUND FLOATING IMAGES BEHIND HEADING (Requested by User) */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        {/* Floating Background Card 1 — Cyber City Lights (behind top right of heading) */}
        <div className="absolute top-2 right-12 lg:right-1/4 w-72 lg:w-96 h-44 lg:h-60 rounded-3xl overflow-hidden opacity-25 lg:opacity-35 -rotate-6 blur-[0.5px] border border-white/70 shadow-2xl transition-opacity">
          <img
            src="/creative-suite/hero_ai_cyber_city.jpg"
            alt="Cyber City Neural Backdrop"
            loading="eager"
            decoding="async"
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-white/80 via-white/20 to-transparent" />
        </div>

        {/* Floating Background Card 2 — Luxury Portrait (tucked behind top-center of heading) */}
        <div className="absolute -top-6 left-1/3 w-60 lg:w-80 h-40 lg:h-52 rounded-3xl overflow-hidden opacity-20 lg:opacity-30 rotate-12 blur-[0.8px] border border-[#FCE7EC] shadow-xl">
          <img
            src="/creative-suite/hero_portrait_luxury.jpg"
            alt="AI Luxury Portrait Backdrop"
            loading="eager"
            decoding="async"
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/85 via-transparent to-transparent" />
        </div>

        {/* Ambient Radial Mesh Glow */}
        <div className="absolute top-0 left-1/4 w-[550px] h-[380px] bg-gradient-to-br from-[#FFE4E9]/60 via-[#FFF1F4]/40 to-transparent blur-3xl rounded-full" />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TWO-COLUMN HERO GRID: HEADING + FLOATING SHOWCASE DECK        */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center relative z-20">
        {/* Left Column: Heading, Subtitle & Action CTAs */}
        <div className="lg:col-span-7 space-y-6 text-left">
          {/* Top Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#FCE7EC] shadow-2xs text-xs font-semibold text-[#E11D48] shadow-sm pointer-events-auto">
            <span className="size-2 rounded-full bg-[#E11D48] animate-pulse" />
            <span className="tracking-wide">ALL-IN-ONE AI CREATIVE SUITE</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-gray-950 tracking-tight leading-[1.1] max-w-2xl drop-shadow-xs">
            {title || (
              <span>
                The Ultimate Creative Suite <br />
                For{" "}
                <span className="bg-gradient-to-r from-[#FF4FA3] via-[#FF2E63] to-[#E11D48] bg-clip-text text-transparent">
                  Digital Masterminds
                </span>
              </span>
            )}
          </h1>

          {/* Subtitle */}
          <p className="max-w-xl text-base sm:text-lg text-gray-600 font-normal leading-relaxed pointer-events-auto">
            {subtitle ||
              "Unleash the full potential of your visual creations with our comprehensive AI-powered suite. From crystal-clear video enhancement to seamless background removal and intelligent watermark elimination, elevate your workflow with cutting-edge neural processing."}
          </p>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-4 pointer-events-auto">
            <Link
              to="/video-enhancer"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] text-white font-semibold text-sm shadow-[0_4px_20px_rgba(225,29,72,0.3)] hover:shadow-[0_6px_25px_rgba(225,29,72,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <WandSparkles className="size-4" />
              <span>Try Video Enhancer</span>
              <ArrowUpRight className="size-4 ml-0.5" />
            </Link>
            <Link
              to="/video-enhancer"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white hover:bg-gray-50 border border-[#FCE7EC] text-gray-800 font-semibold text-sm shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Video className="size-4 text-[#E11D48]" />
              <span>Explore Video Enhancer</span>
            </Link>
            <Link
              to="/background-remover"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white/90 hover:bg-white border border-[#FCE7EC] text-gray-700 hover:text-gray-950 font-medium text-sm shadow-sm transition-all"
            >
              <span>Background Remover</span>
            </Link>
          </div>

          {/* Feature Highlights Pills */}
          <div className="pt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-gray-600 pointer-events-auto">
            <span className="inline-flex items-center gap-1.5 bg-white/80 px-3 py-1 rounded-full border border-[#FCE7EC] shadow-2xs">
              <Zap className="size-3.5 text-[#E11D48]" />
              60 FPS Neural Inpainting
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/80 px-3 py-1 rounded-full border border-[#FCE7EC] shadow-2xs">
              <Sparkles className="size-3.5 text-[#E11D48]" />
              8K Lossless Upscaling
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/80 px-3 py-1 rounded-full border border-[#FCE7EC] shadow-2xs">
              <Shield className="size-3.5 text-emerald-600" />
              100% Studio Privacy
            </span>
          </div>
        </div>

        {/* Right Column: High-Aesthetic Floating Visual Showcase Deck */}
        <div className="lg:col-span-5 relative pt-4 lg:pt-0">
          <div className="relative w-full max-w-md mx-auto lg:max-w-none">
            {/* Ambient Backlight Glow */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-[#FFE4E9]/70 via-[#FFF0F3]/40 to-transparent rounded-3xl blur-2xl -z-10" />

            {/* Main Showcase Centerpiece Card */}
            <div className="relative rounded-3xl overflow-hidden border border-white/90 shadow-[0_20px_40px_-10px_rgba(225,29,72,0.18)] bg-white group transition-transform duration-300 hover:scale-[1.02]">
              <div className="relative h-60 sm:h-64 w-full overflow-hidden">
                <img
                  src="/creative-suite/hero_neural_mastermind.jpg"
                  alt="AI Creative Mastermind"
                  loading="eager"
                  decoding="async"
                  className="size-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/30 to-transparent" />

                {/* Top Badge */}
                <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-gradient-to-r from-[#E11D48] to-[#FF4FA3] text-white shadow-md backdrop-blur-sm flex items-center gap-1.5">
                    <Sparkles className="size-3" />
                    AI MASTERMIND • 8K
                  </span>
                </div>

                {/* Bottom Overlay Info */}
                <div className="absolute bottom-4 inset-x-4 flex items-end justify-between">
                  <div>
                    <p className="text-[11px] font-mono uppercase tracking-wider text-[#FFB3C7] mb-0.5">
                      Next-Gen Neural Restoration
                    </p>
                    <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                      Creative Synthesis & Watermark Removal
                    </h3>
                  </div>
                  <Link
                    to="/video-enhancer"
                    className="size-9 rounded-full bg-white/20 backdrop-blur-md hover:bg-[#E11D48] text-white flex items-center justify-center transition-all shadow-md shrink-0 ml-3"
                  >
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Floating Overlapping Card: Anime Dog Background Remover Cutout */}
            <div className="absolute -bottom-6 -left-4 sm:-left-6 w-44 sm:w-48 rounded-2xl overflow-hidden border border-white shadow-[0_12px_28px_rgba(0,0,0,0.12)] bg-white/95 backdrop-blur-md transform -rotate-3 hover:rotate-0 transition-transform duration-300 z-20">
              <div className="relative h-24 sm:h-28 w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:8px_8px] bg-gray-50">
                <img
                  src="/creative-suite/anime_dog_cutout.jpg"
                  alt="AI Cutout"
                  loading="eager"
                  decoding="async"
                  className="size-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-white/90 text-[#E11D48] border border-[#FCE7EC] shadow-2xs">
                  ALPHA CUTOUT
                </div>
              </div>
              <div className="p-2 bg-white">
                <p className="text-[10px] font-semibold text-gray-900 truncate">Shiba Inu AI Cutout</p>
                <p className="text-[9px] text-[#E11D48] font-medium">0.2s Clean Background</p>
              </div>
            </div>

            {/* Floating Overlapping Card: Luxury Couple Portrait / 8K Reconstruct */}
            <div className="absolute -top-6 -right-4 sm:-right-6 w-44 sm:w-48 rounded-2xl overflow-hidden border border-white shadow-[0_12px_28px_rgba(0,0,0,0.12)] bg-white/95 backdrop-blur-md transform rotate-3 hover:rotate-0 transition-transform duration-300 z-20 hidden sm:block">
              <div className="relative h-24 sm:h-28 w-full">
                <img
                  src="/creative-suite/attractive_couple_portrait.jpg"
                  alt="AI High Fashion Portrait"
                  loading="eager"
                  decoding="async"
                  className="size-full object-cover"
                />
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-black/60 text-white backdrop-blur-xs">
                  ULTRA HDR
                </div>
              </div>
              <div className="p-2 bg-white">
                <p className="text-[10px] font-semibold text-gray-900 truncate">Studio Portrait 8K</p>
                <p className="text-[9px] text-emerald-600 font-medium">Flawless Texture Recon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProductCard = ({
  product,
  translate,
  priority = false,
}: {
  product: ProductCardItem;
  translate: MotionValue<number>;
  priority?: boolean;
}) => {
  const isInternal = product.link.startsWith("/");

  const CardContent = (
    <>
      <img
        src={product.thumbnail}
        alt={product.title}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="object-cover object-center absolute inset-0 size-full group-hover/product:scale-105 transition-transform duration-300"
      />
      <div className="absolute inset-0 size-full bg-gradient-to-t from-black/90 via-black/40 to-transparent group-hover/product:opacity-85 opacity-75 transition-opacity" />

      {/* Top Badge */}
      {product.badge && (
        <span className="absolute top-4 left-4 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#E11D48]/95 text-white tracking-wider shadow-sm backdrop-blur-sm z-20">
          {product.badge}
        </span>
      )}

      {/* Bottom Info */}
      <div className="absolute bottom-5 left-5 right-5 z-20">
        {product.category && (
          <span className="text-[11px] font-mono text-[#FF9BB8] uppercase tracking-wider block mb-1">
            {product.category}
          </span>
        )}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight group-hover/product:text-[#FFB3C7] transition-colors leading-snug">
            {product.title}
          </h2>
          <span className="size-8 shrink-0 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white group-hover/product:bg-[#E11D48] group-hover/product:scale-110 transition-all">
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </div>
    </>
  );

  return (
    <motion.div
      style={{
        x: translate,
      }}
      whileHover={{
        y: -8,
        transition: { duration: 0.2 },
      }}
      key={product.id || product.title}
      className="group/product h-72 sm:h-80 w-[22rem] sm:w-[26rem] md:w-[28rem] relative flex-shrink-0 rounded-3xl overflow-hidden border border-[#FCE7EC] hover:border-[#FDA4AF] shadow-[0_10px_25px_-5px_rgba(225,29,72,0.12),0_4px_10px_-2px_rgba(0,0,0,0.04)] bg-white transition-all duration-200 transform-gpu will-change-transform"
    >
      {isInternal ? (
        <Link to={product.link} className="block size-full">
          {CardContent}
        </Link>
      ) : (
        <a
          href={product.link}
          target="_blank"
          rel="noreferrer"
          className="block size-full"
        >
          {CardContent}
        </a>
      )}
    </motion.div>
  );
};
