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
  Zap,
  Shield,
  Infinity as InfinityIcon,
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
      className="min-h-screen h-[190vh] sm:h-[220vh] lg:h-[240vh] pt-6 pb-16 overflow-hidden antialiased relative flex flex-col self-auto bg-gradient-to-b from-[#FFF5F8] via-white to-white text-gray-950"
    >
      {/* Background ambient lighting glows */}
      <div className="absolute top-0 left-1/4 size-[650px] bg-gradient-to-br from-[#FFE4E9]/70 via-[#FFF1F4]/40 to-transparent blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 right-10 size-[550px] bg-[#FCE7EC]/60 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute bottom-20 left-1/3 size-[500px] bg-[#FFE4E9]/50 blur-[150px] pointer-events-none rounded-full" />

      {/* Hero Header with Creator Showcase, Features & Social Proof */}
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
    <div className="max-w-7xl relative mx-auto pt-2 pb-10 md:pt-6 md:pb-14 px-4 sm:px-6 lg:px-8 w-full left-0 top-0 z-30">
      {/* ------------------------------------------------------------- */}
      {/* TWO-COLUMN HERO GRID: HEADING + CREATOR SHOWCASE (User Spec)  */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center relative z-20">
        {/* Left Column: Heading, Subtitle, Features, CTAs & Reviews */}
        <div className="lg:col-span-6 space-y-5 text-left">
          {/* Top Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#FCE7EC] shadow-2xs text-xs font-semibold text-[#E11D48] shadow-sm pointer-events-auto">
            <span className="size-2 rounded-full bg-[#E11D48] animate-pulse" />
            <span className="tracking-wide">ALL-IN-ONE AI CREATIVE SUITE</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-bold text-gray-950 tracking-tight leading-[1.12] drop-shadow-xs">
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

          {/* 3 High-Impact Feature Highlights (Exact match to reference design) */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-4 pointer-events-auto">
            {/* 1. AI-Powered */}
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-xl bg-[#FFE4E9] flex items-center justify-center shrink-0 text-[#E11D48]">
                <Zap className="size-4 fill-[#E11D48]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-950 leading-tight">AI-Powered</h4>
                <p className="text-xs text-gray-500 mt-0.5">Next-gen technology</p>
              </div>
            </div>

            {/* 2. Secure & Private */}
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-xl bg-[#FFE4E9] flex items-center justify-center shrink-0 text-[#E11D48]">
                <Shield className="size-4 fill-[#E11D48]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-950 leading-tight">Secure & Private</h4>
                <p className="text-xs text-gray-500 mt-0.5">Your data, protected</p>
              </div>
            </div>

            {/* 3. All-in-One */}
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-xl bg-[#FFE4E9] flex items-center justify-center shrink-0 text-[#E11D48]">
                <InfinityIcon className="size-4 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-950 leading-tight">All-in-One</h4>
                <p className="text-xs text-gray-500 mt-0.5">Multiple tools, one place</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex flex-wrap items-center gap-3.5 pointer-events-auto">
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
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white hover:bg-gray-50 border border-[#FCE7EC] text-gray-800 font-semibold text-sm shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
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

          {/* Social Proof / Creator Reviews */}
          <div className="pt-3 flex items-center gap-4 pointer-events-auto">
            <img
              src="/creative-suite/hero_avatars_stack.png"
              alt="Creators Avatar Stack"
              className="h-8 w-auto object-contain shrink-0"
            />
            <div className="text-xs">
              <p className="text-gray-800 font-medium leading-tight">
                Trusted by <span className="font-bold text-gray-950">500K+ creators worldwide</span>
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="flex text-amber-400 text-sm leading-none">
                  {"★★★★★".split("").map((star, i) => (
                    <span key={i}>{star}</span>
                  ))}
                </div>
                <span className="font-bold text-gray-800 ml-0.5">4.9/5</span>
                <span className="text-gray-500">(10,000+ reviews)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Hero Creator Visual Showcase (Exact match to reference) */}
        <div className="lg:col-span-6 relative flex items-center justify-center pt-4 lg:pt-0">
          <div className="relative w-full max-w-xl">
            {/* Ambient Backlight Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[420px] bg-gradient-to-tr from-[#FFE4E9]/70 via-[#FFF0F3]/40 to-transparent rounded-full blur-3xl -z-10" />

            {/* The Masterpiece Creator Illustration with Floating UI Cards & Interactive Hotspots */}
            <div className="relative rounded-3xl overflow-hidden group">
              <img
                src="/creative-suite/hero_creator_masterpiece.webp"
                alt="Creative Mastermind Showcase"
                loading="eager"
                decoding="async"
                className="w-full h-auto object-contain drop-shadow-sm group-hover:scale-[1.01] transition-transform duration-300"
              />

              {/* Interactive Tool Hotspots */}
              <Link
                to="/video-enhancer"
                className="absolute top-[35%] left-[2%] w-[33%] h-[7%] rounded-lg cursor-pointer hover:bg-[#E11D48]/10 transition-colors"
                title="Open Video Enhancer"
              />
              <Link
                to="/background-remover"
                className="absolute top-[43%] left-[2%] w-[38%] h-[7%] rounded-lg cursor-pointer hover:bg-[#E11D48]/10 transition-colors"
                title="Open Background Remover"
              />
              <Link
                to="/remove-image-watermark"
                className="absolute top-[51%] left-[2%] w-[38%] h-[7%] rounded-lg cursor-pointer hover:bg-[#E11D48]/10 transition-colors"
                title="Open Watermark Remover"
              />
              <Link
                to="/upscale"
                className="absolute top-[59%] left-[2%] w-[34%] h-[7%] rounded-lg cursor-pointer hover:bg-[#E11D48]/10 transition-colors"
                title="Open 8K Upscaler"
              />
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
