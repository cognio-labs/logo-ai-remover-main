"use client";

import React, { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ArrowUpRight, ImageUp, Infinity as InfinityIcon, Shield, Video, WandSparkles, Zap } from "lucide-react";
import { CREATIVE_SUITE_ASSETS, type ProductCardItem } from "@/config/creativeSuiteAssets";

export { type ProductCardItem };
export const DEFAULT_BELLIX_PRODUCTS: ProductCardItem[] = CREATIVE_SUITE_ASSETS;

function ProductRail({ products, label }: { products: ProductCardItem[]; label: string }) {
  const railRef = useRef<HTMLDivElement>(null);
  const move = (direction: number) => railRef.current?.scrollBy({ left: direction * Math.min(460, window.innerWidth * 0.82), behavior: "smooth" });
  return (
    <div className="space-y-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <p className="text-xs uppercase tracking-[0.16em] text-gray-500">{label}</p>
        <div className="hidden items-center gap-2 sm:flex">
          <button type="button" onClick={() => move(-1)} aria-label={`Scroll ${label} left`} className="grid size-9 place-items-center rounded-full border border-rose-100 bg-white text-gray-700 shadow-sm transition hover:border-rose-300 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"><ArrowLeft className="size-4" /></button>
          <button type="button" onClick={() => move(1)} aria-label={`Scroll ${label} right`} className="grid size-9 place-items-center rounded-full border border-rose-100 bg-white text-gray-700 shadow-sm transition hover:border-rose-300 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"><ArrowRight className="size-4" /></button>
        </div>
      </div>
      <div ref={railRef} className="creative-rail flex gap-4 overflow-x-auto px-[max(1rem,calc((100vw-80rem)/2))] pb-4 sm:gap-5">
        {products.map((product, index) => <ProductCard product={product} key={product.id} priority={index < 3} />)}
      </div>
    </div>
  );
}

export const HeroParallax = ({ products = CREATIVE_SUITE_ASSETS, title, subtitle }: { products?: ProductCardItem[]; title?: React.ReactNode; subtitle?: React.ReactNode }) => {
  const cardList = products.length ? products : CREATIVE_SUITE_ASSETS;
  const splitAt = Math.ceil(cardList.length / 2);
  return (
    <section className="relative overflow-hidden border-b border-rose-100 bg-[linear-gradient(180deg,#fff7f9_0%,#ffffff_42%,#fff9fb_100%)] pb-14 pt-6 text-gray-950 sm:pb-20">
      <div className="pointer-events-none absolute -left-28 top-12 size-[32rem] rounded-full bg-rose-100/55 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-56 size-[28rem] rounded-full bg-fuchsia-100/35 blur-3xl" />
      <Header title={title} subtitle={subtitle} />
      <div className="relative z-10 mt-8 space-y-8 sm:mt-12 sm:space-y-10">
        <ProductRail products={cardList.slice(0, splitAt)} label="Restore & enhance" />
        <ProductRail products={cardList.slice(splitAt)} label="Create & protect" />
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
  const content = <><div className="absolute inset-0 bg-[#11131a]"><img src={product.thumbnail} alt="" aria-hidden="true" className="size-full scale-110 object-cover opacity-30 blur-xl" /></div><img src={product.thumbnail} alt={product.title} loading={priority ? "eager" : "lazy"} decoding="async" className="absolute inset-0 size-full object-contain transition-transform duration-500 group-hover/product:scale-[1.015]" /><div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-black/10" />{product.badge && <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-white backdrop-blur-md">{product.badge}</span>}<div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3"><div className="min-w-0">{product.category && <span className="mb-1 block truncate text-[10px] uppercase tracking-[0.14em] text-rose-200">{product.category}</span>}<h2 className="text-base font-normal leading-snug text-white sm:text-lg">{product.title}</h2></div><span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/20 bg-white/15 text-white backdrop-blur-md transition group-hover/product:bg-rose-500"><ArrowUpRight className="size-4" /></span></div></>;
  const className = "group/product relative block aspect-[16/10] w-[min(82vw,25rem)] flex-none snap-start overflow-hidden rounded-[1.4rem] border border-rose-100 bg-gray-950 shadow-[0_12px_32px_-18px_rgba(15,23,42,.45)] transition duration-300 hover:-translate-y-1 hover:border-rose-300 sm:w-[25rem]";
  return isInternal ? <Link to={product.link} className={className}>{content}</Link> : <a href={product.link} target="_blank" rel="noreferrer" className={className}>{content}</a>;
};

