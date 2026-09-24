"use client";

import React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ImageUp, Infinity as InfinityIcon, Shield, Video, WandSparkles, Zap } from "lucide-react";
import { CREATIVE_SUITE_ASSETS, type ProductCardItem } from "@/config/creativeSuiteAssets";

export { type ProductCardItem };
export const DEFAULT_BELLIX_PRODUCTS: ProductCardItem[] = CREATIVE_SUITE_ASSETS;

function ProductRail({
  products,
  label,
  direction = "left",
}: {
  products: ProductCardItem[];
  label: string;
  direction?: "left" | "right";
}) {
  const isLeft = direction === "left";
  const duplicated = [...products, ...products];

  return (
    <div className="space-y-2.5">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-rose-500" />
          <p className="text-xs uppercase tracking-[0.16em] font-medium text-gray-500">{label}</p>
        </div>
      </div>
      <div className="creative-marquee-wrapper overflow-hidden py-1">
        <div className="flex w-max">
          <div
            className={`flex shrink-0 gap-3.5 sm:gap-4 pr-3.5 sm:pr-4 ${
              isLeft ? "animate-marquee-scroll-left" : "animate-marquee-scroll-right"
            }`}
          >
            {duplicated.map((product, index) => (
              <ProductCard
                product={product}
                key={`track1-${product.id}-${index}`}
                priority={index < 2}
              />
            ))}
          </div>
          <div
            className={`flex shrink-0 gap-3.5 sm:gap-4 pr-3.5 sm:pr-4 ${
              isLeft ? "animate-marquee-scroll-left" : "animate-marquee-scroll-right"
            }`}
            aria-hidden="true"
          >
            {duplicated.map((product, index) => (
              <ProductCard
                product={product}
                key={`track2-${product.id}-${index}`}
                priority={false}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export const HeroParallax = ({
  products = CREATIVE_SUITE_ASSETS,
  title,
  subtitle,
}: {
  products?: ProductCardItem[];
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
}) => {
  const cardList = products.length ? products : CREATIVE_SUITE_ASSETS;
  const splitAt = Math.ceil(cardList.length / 2);
  return (
    <section className="relative overflow-hidden border-b border-rose-100 bg-[linear-gradient(180deg,#fff7f9_0%,#ffffff_42%,#fff9fb_100%)] pb-14 pt-6 text-gray-950 sm:pb-20">
      <div className="pointer-events-none absolute -left-28 top-12 size-[32rem] rounded-full bg-rose-100/55 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-56 size-[28rem] rounded-full bg-fuchsia-100/35 blur-3xl" />
      <Header title={title} subtitle={subtitle} />
      <div className="relative z-10 mt-8 space-y-7 sm:mt-12 sm:space-y-8">
        <ProductRail products={cardList.slice(0, splitAt)} label="Restore & enhance" direction="left" />
        <ProductRail products={cardList.slice(splitAt)} label="Create & protect" direction="right" />
      </div>
    </section>
  );
};

export const Header = ({ title, subtitle }: { title?: React.ReactNode; subtitle?: React.ReactNode }) => (
  <div className="relative z-20 mx-auto w-full max-w-7xl px-4 pb-4 pt-2 sm:px-6 md:pt-6 lg:px-8">
    <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-6">
      <div className="space-y-5 text-left lg:col-span-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white px-3.5 py-1.5 text-xs text-rose-600 shadow-sm"><span className="size-2 rounded-full bg-rose-500" /><span className="tracking-wide">All-in-one AI creative suite</span></div>
        <h1 className="text-4xl font-normal leading-[1.06] tracking-[-0.045em] text-gray-950 sm:text-5xl lg:text-[3.45rem]">{title || <span>Make every frame look<span className="block bg-gradient-to-r from-rose-600 to-fuchsia-500 bg-clip-text text-transparent">intentionally perfect.</span></span>}</h1>
        <p className="max-w-xl text-base font-normal leading-7 text-gray-600 sm:text-lg">{subtitle || "Remove watermarks, restore detail, upscale footage, and isolate backgrounds in one focused AI workspace."}</p>
        <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-3">
          {[[Zap, "AI-powered", "Fast processing"], [Shield, "Private", "Zero retention"], [InfinityIcon, "All-in-one", "One workspace"]].map(([Icon, name, detail]) => {
            const ItemIcon = Icon as typeof Zap;
            return <div key={name as string} className="flex items-center gap-2.5"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600"><ItemIcon className="size-4" /></span><span><span className="block text-sm text-gray-900">{name as string}</span><span className="block text-xs text-gray-500">{detail as string}</span></span></div>;
          })}
        </div>
        <div className="grid gap-2.5 pt-2 sm:grid-cols-2">
          <Link to="/video-enhancer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-600 to-pink-500 px-5 text-sm text-white shadow-[0_10px_24px_rgba(225,29,72,.22)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(225,29,72,.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"><WandSparkles className="size-4" />Try Video Enhancer<ArrowUpRight className="size-4" /></Link>
          <Link to="/gemini-video-watermark-remover" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-rose-200 bg-white px-5 text-sm text-gray-800 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"><Video className="size-4 text-rose-600" />Remove Watermarks</Link>
          <Link to="/background-remover" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white/85 px-5 text-sm text-gray-700 transition hover:border-rose-200 hover:text-rose-600">Background Remover</Link>
          <Link to="/upscale" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white/85 px-5 text-sm text-gray-700 transition hover:border-rose-200 hover:text-rose-600"><ImageUp className="size-4" />AI Image Upscaler</Link>
        </div>
      </div>
      <div className="relative flex items-center justify-end lg:col-span-7 lg:-mr-8 xl:-mr-14">
        <div className="pointer-events-none absolute right-8 top-1/2 size-[26rem] -translate-y-1/2 rounded-full bg-rose-100/70 blur-3xl" />
        <div className="relative ml-auto w-full max-w-3xl overflow-hidden rounded-[2rem]"><img src="/creative-suite/hero_creator_masterpiece.webp" alt="Creator using Bellix AI tools" loading="eager" decoding="async" className="h-auto w-full object-contain" /></div>
      </div>
    </div>
  </div>
);

export const ProductCard = ({ product, priority = false }: { product: ProductCardItem; priority?: boolean }) => {
  const isInternal = product.link.startsWith("/");
  const content = (
    <>
      <div className="absolute inset-0 bg-[#11131a]">
        <img
          src={product.thumbnail}
          alt=""
          aria-hidden="true"
          className="size-full scale-110 object-cover opacity-25 blur-xl"
        />
      </div>
      <img
        src={product.thumbnail}
        alt={product.title}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover/product:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/10" />
      {product.badge && (
        <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-white/90 backdrop-blur-md">
          {product.badge}
        </span>
      )}
      <div className="absolute inset-x-3.5 bottom-3.5 flex items-end justify-between gap-2.5">
        <div className="min-w-0">
          {product.category && (
            <span className="mb-0.5 block truncate text-[9px] uppercase tracking-[0.14em] text-rose-300 font-medium">
              {product.category}
            </span>
          )}
          <h2 className="text-xs sm:text-sm font-normal leading-snug text-white truncate">
            {product.title}
          </h2>
        </div>
        <span className="grid size-7 shrink-0 place-items-center rounded-full border border-white/20 bg-white/15 text-white backdrop-blur-md transition-colors duration-200 group-hover/product:bg-rose-500 group-hover/product:border-rose-400">
          <ArrowUpRight className="size-3.5" />
        </span>
      </div>
    </>
  );

  const className =
    "group/product relative block aspect-[16/10] w-[14.5rem] sm:w-[16.5rem] md:w-[17.5rem] flex-none overflow-hidden rounded-2xl border border-rose-100/70 bg-gray-950 shadow-[0_8px_20px_-10px_rgba(15,23,42,.35)] transition-all duration-300 hover:-translate-y-1 hover:border-rose-300 hover:shadow-[0_12px_28px_-10px_rgba(225,29,72,.25)]";

  return isInternal ? (
    <Link to={product.link} className={className}>
      {content}
    </Link>
  ) : (
    <a href={product.link} target="_blank" rel="noreferrer" className={className}>
      {content}
    </a>
  );
};


