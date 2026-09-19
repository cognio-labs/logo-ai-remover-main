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
import { Sparkles, ArrowUpRight } from "lucide-react";

export interface ProductCardItem {
  title: string;
  link: string;
  thumbnail: string;
  badge?: string;
  category?: string;
}

export const HeroParallax = ({
  products,
  title,
  subtitle,
}: {
  products: ProductCardItem[];
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
}) => {
  const firstRow = products.slice(0, 5);
  const secondRow = products.slice(5, 10);
  const thirdRow = products.slice(10, 15);

  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const springConfig = { stiffness: 300, damping: 30, bounce: 100 };

  const translateX = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, 1000]),
    springConfig
  );
  const translateXReverse = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, -1000]),
    springConfig
  );
  const rotateX = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [15, 0]),
    springConfig
  );
  const opacity = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [0.2, 1]),
    springConfig
  );
  const rotateZ = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [20, 0]),
    springConfig
  );
  const translateY = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [-700, 300]),
    springConfig
  );

  return (
    <div
      ref={ref}
      className="h-[280vh] py-32 overflow-hidden antialiased relative flex flex-col self-auto [perspective:1000px] [transform-style:preserve-3d] bg-gradient-to-b from-[#090204] via-[#0E0609] to-[#0A0406] text-white"
    >
      <Header title={title} subtitle={subtitle} />
      <motion.div
        style={{
          rotateX,
          rotateZ,
          translateY,
          opacity,
        }}
      >
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-12 mb-16">
          {firstRow.map((product) => (
            <ProductCard
              product={product}
              translate={translateX}
              key={product.title}
            />
          ))}
        </motion.div>
        <motion.div className="flex flex-row mb-16 space-x-12">
          {secondRow.map((product) => (
            <ProductCard
              product={product}
              translate={translateXReverse}
              key={product.title}
            />
          ))}
        </motion.div>
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-12">
          {thirdRow.map((product) => (
            <ProductCard
              product={product}
              translate={translateX}
              key={product.title}
            />
          ))}
        </motion.div>
      </motion.div>
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
    <div className="max-w-7xl relative mx-auto py-12 md:py-24 px-4 sm:px-6 w-full left-0 top-0 z-30">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-[#FF4FA3] backdrop-blur-md mb-6 shadow-md">
        <Sparkles className="size-3.5 text-[#FF4FA3]" />
        <span>PixelRefine Neural Studio Ecosystem</span>
      </div>

      <h1 className="text-3xl sm:text-6xl lg:text-7xl font-semibold text-white tracking-tight leading-tight">
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

      <p className="max-w-2xl text-base md:text-xl mt-6 text-gray-300 font-normal leading-relaxed">
        {subtitle ||
          "Explore the complete suite of AI-powered tools designed to restore, clean, and upscale your creative media with pristine 8K fidelity."}
      </p>
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
        className="object-cover object-center absolute inset-0 size-full group-hover/product:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 size-full bg-gradient-to-t from-black/90 via-black/30 to-transparent group-hover/product:opacity-90 opacity-70 transition-opacity" />

      {/* Top Badge */}
      {product.badge && (
        <span className="absolute top-4 left-4 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase bg-[#E11D48] text-white tracking-wide shadow-md z-20">
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight group-hover/product:text-[#FF75A0] transition-colors">
            {product.title}
          </h2>
          <span className="size-8 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white group-hover/product:bg-[#E11D48] group-hover/product:scale-110 transition-all">
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
        y: -20,
      }}
      key={product.title}
      className="group/product h-80 w-[24rem] sm:w-[28rem] relative flex-shrink-0 rounded-3xl overflow-hidden border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] bg-[#14080D]"
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
