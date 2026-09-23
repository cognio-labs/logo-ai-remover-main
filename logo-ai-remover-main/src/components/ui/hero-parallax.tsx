"use client";
import React, { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  MotionValue,
} from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, WandSparkles, Video, Sparkles } from "lucide-react";
import {
  CREATIVE_SUITE_ASSETS,
  type ProductCardItem,
} from "@/config/creativeSuiteAssets";

export { type ProductCardItem };
export const DEFAULT_PIXELREFINE_PRODUCTS: ProductCardItem[] = CREATIVE_SUITE_ASSETS;

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

  const springConfig = { stiffness: 280, damping: 30, bounce: 60 };

  // Fluid horizontal parallax motion across scroll progress
  const translateX = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, 850]),
    springConfig
  );
  const translateXReverse = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, -850]),
    springConfig
  );

  // 3D perspective subtle rotation
  const rotateX = useSpring(
    useTransform(scrollYProgress, [0, 0.3], [14, 0]),
    springConfig
  );
  const opacity = useSpring(
    useTransform(scrollYProgress, [0, 0.25], [0.95, 1]),
    springConfig
  );
  const rotateZ = useSpring(
    useTransform(scrollYProgress, [0, 0.3], [-10, 0]),
    springConfig
  );

  // Dynamic vertical tracking that distributes cards throughout the entire scroll depth, eliminating dead black void
  const translateY = useSpring(
    useTransform(scrollYProgress, [0, 0.85], [-80, 180]),
    springConfig
  );

  return (
    <div
      ref={ref}
      className="min-h-screen h-[230vh] sm:h-[260vh] lg:h-[280vh] pt-14 pb-20 overflow-hidden antialiased relative flex flex-col self-auto [perspective:1000px] [transform-style:preserve-3d] bg-gradient-to-b from-[#070204] via-[#090306] to-[#0D0408] text-white"
    >
      {/* Background ambient lighting glows */}
      <div className="absolute top-0 left-1/4 size-[650px] bg-gradient-to-br from-[#E11D48]/20 via-[#FF2E63]/10 to-transparent blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 right-10 size-[550px] bg-[#FF4FA3]/15 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute bottom-20 left-1/3 size-[500px] bg-[#E11D48]/12 blur-[150px] pointer-events-none rounded-full" />

      {/* Hero Header */}
      <Header title={title} subtitle={subtitle} />

      {/* 3D Parallax Card Grid — 4 Rows of 5 Cards each */}
      <motion.div
        style={{
          rotateX,
          rotateZ,
          translateY,
          opacity,
        }}
        className="relative z-10 space-y-10 sm:space-y-12 md:space-y-14"
      >
        {/* Row 1 — Flagship Neural Engines */}
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-6 sm:space-x-10">
          {firstRow.map((product) => (
            <ProductCard
              product={product}
              translate={translateX}
              key={product.id || product.title}
            />
          ))}
        </motion.div>

        {/* Row 2 — Generative Inpainting & Restoration */}
        <motion.div className="flex flex-row space-x-6 sm:space-x-10">
          {secondRow.map((product) => (
            <ProductCard
              product={product}
              translate={translateXReverse}
              key={product.id || product.title}
            />
          ))}
        </motion.div>

        {/* Row 3 — Infrastructure, Intelligence & Security */}
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-6 sm:space-x-10">
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
          <motion.div className="flex flex-row space-x-6 sm:space-x-10 pb-10">
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
      <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-[#0D0408] to-transparent pointer-events-none z-20" />
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
    <div className="max-w-7xl relative mx-auto pt-6 pb-12 md:pt-14 md:pb-20 px-4 sm:px-6 lg:px-8 w-full left-0 top-0 z-30">
      {/* Top Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.08] border border-white/[0.15] text-xs font-semibold text-[#FF4FA3] backdrop-blur-md mb-6 shadow-md pointer-events-auto">
        <span className="size-2 rounded-full bg-[#E11D48] animate-pulse" />
        <span className="tracking-wide">ALL-IN-ONE AI CREATIVE SUITE</span>
      </div>

      {/* Main Heading */}
      <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.1] max-w-4xl">
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
      <p className="max-w-2xl text-base sm:text-lg md:text-xl mt-6 text-gray-300 font-normal leading-relaxed pointer-events-auto">
        {subtitle ||
          "Unleash the full potential of your visual creations with our comprehensive AI-powered suite. From crystal-clear video enhancement to seamless background removal and intelligent watermark elimination, elevate your workflow with cutting-edge neural processing."}
      </p>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-wrap items-center gap-4 pointer-events-auto">
        <Link
          to="/gemini-video-watermark-remover"
          className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] text-white font-semibold text-sm shadow-[0_0_25px_rgba(225,29,72,0.4)] hover:shadow-[0_0_35px_rgba(225,29,72,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <WandSparkles className="size-4" />
          <span>Try AI Inpainter Free</span>
          <ArrowUpRight className="size-4 ml-0.5" />
        </Link>
        <Link
          to="/video-enhancer"
          className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.18] text-white font-semibold text-sm backdrop-blur-md hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Video className="size-4 text-[#FF4FA3]" />
          <span>Explore Video Enhancer</span>
        </Link>
        <Link
          to="/background-remover"
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.12] text-gray-300 hover:text-white font-medium text-sm transition-all"
        >
          <span>Background Remover</span>
        </Link>
      </div>
    </div>
  );
};

export const ProductCard = ({
  product,
  translate,
}: {
  product: ProductCardItem;
  translate: MotionValue<number>;
}) => {
  const isInternal = product.link.startsWith("/");

  const CardContent = (
    <>
      <img
        src={product.thumbnail}
        alt={product.title}
        loading="lazy"
        className="object-cover object-center absolute inset-0 size-full group-hover/product:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 size-full bg-gradient-to-t from-black/95 via-black/45 to-transparent group-hover/product:opacity-85 opacity-75 transition-opacity" />

      {/* Top Badge */}
      {product.badge && (
        <span className="absolute top-4 left-4 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#E11D48]/90 text-white tracking-wider shadow-md backdrop-blur-sm z-20">
          {product.badge}
        </span>
      )}

      {/* Bottom Info */}
      <div className="absolute bottom-5 left-5 right-5 z-20">
        {product.category && (
          <span className="text-[11px] font-mono text-[#FF75A0] uppercase tracking-wider block mb-1">
            {product.category}
          </span>
        )}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight group-hover/product:text-[#FF75A0] transition-colors leading-snug">
            {product.title}
          </h2>
          <span className="size-8 shrink-0 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white group-hover/product:bg-[#E11D48] group-hover/product:scale-110 transition-all">
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
        y: -14,
      }}
      key={product.id || product.title}
      className="group/product h-72 sm:h-80 w-[22rem] sm:w-[26rem] md:w-[28rem] relative flex-shrink-0 rounded-3xl overflow-hidden border border-white/10 hover:border-white/25 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.85)] bg-[#12060B] transition-colors duration-300"
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
