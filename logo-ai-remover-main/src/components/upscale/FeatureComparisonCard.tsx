import React from "react";
import type { LucideIcon } from "lucide-react";
import { Sparkles, ArrowRight } from "lucide-react";

export interface FeatureCardData {
  id: string;
  icon: LucideIcon;
  centerIcon?: LucideIcon;
  title: string;
  description: string;
  image: string;
  tag: string;
}

export interface FeatureComparisonCardProps {
  card: FeatureCardData;
  className?: string;
}

export function FeatureComparisonCard({ card, className = "" }: FeatureComparisonCardProps) {
  const Icon = card.icon;

  const scrollToUploader = () => {
    const el =
      document.getElementById("upscale-hero-uploader") ||
      document.querySelector(".up-hero");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <article
      onClick={scrollToUploader}
      className={`group relative flex flex-col rounded-2xl bg-white border border-[#F3DFE7] shadow-[0_4px_24px_rgba(247,37,104,0.05)] hover:border-pink-300 hover:shadow-[0_12px_36px_rgba(247,37,104,0.12)] hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer select-none ${className}`}
    >
      {/* 1. SINGLE HIGH-RESOLUTION PRISTINE 4K IMAGE PREVIEW */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[4/3] bg-neutral-900 overflow-hidden">
        <img
          src={card.image}
          alt={card.title}
          className="size-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />

        {/* Ambient Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

        {/* Top-Right AI Quality Tag */}
        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold tracking-wide border border-white/15 flex items-center gap-1 shadow-sm">
          <Sparkles className="size-2.5 text-pink-400" />
          <span>{card.tag}</span>
        </span>

        {/* Bottom-Left 4K UHD Badge */}
        <span className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-md bg-[#f72568]/90 backdrop-blur-md text-white text-[9.5px] font-bold tracking-wider uppercase shadow-xs">
          4K UHD Master
        </span>
      </div>

      {/* 2. CARD CONTENT & METADATA */}
      <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 bg-gradient-to-b from-white to-[#FFF9FB]">
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="size-8 rounded-xl bg-[#FFF0F5] text-[#F72568] flex items-center justify-center border border-pink-100 group-hover:scale-110 group-hover:bg-[#FFE2EC] transition-all">
              <Icon className="size-4 shrink-0" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 tracking-tight leading-snug group-hover:text-[#F72568] transition-colors">
              {card.title}
            </h3>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed font-normal">
            {card.description}
          </p>
        </div>

        {/* 3. CLEAN SINGLE CONNECTED ACTION */}
        <div className="mt-4 pt-3 border-t border-pink-100/70 flex items-center justify-between text-xs font-semibold text-[#f72568]">
          <span className="group-hover:translate-x-0.5 transition-transform">
            Try on your photo
          </span>
          <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </article>
  );
}

export default FeatureComparisonCard;
