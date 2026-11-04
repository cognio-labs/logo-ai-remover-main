import React from "react";
import Link from "next/link";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
}

export function BrandLogo({ className = "", size = "md", href = "/" }: BrandLogoProps) {
  const circleSizes = {
    sm: "size-8",
    md: "size-10 sm:size-11",
    lg: "size-12 sm:size-14",
  };

  const starSizes = {
    sm: "size-4.5",
    md: "size-6",
    lg: "size-7 sm:size-8",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl sm:text-2xl",
    lg: "text-2xl sm:text-3xl",
  };

  const studioSizes = {
    sm: "text-[9px] tracking-[0.2em]",
    md: "text-[10px] sm:text-[11px] tracking-[0.24em]",
    lg: "text-xs sm:text-[13px] tracking-[0.26em]",
  };

  const content = (
    <div className={`group flex items-center gap-3 py-1 select-none cursor-pointer shrink-0 ${className}`}>
      {/* 1. Real Lime Round Circle with 4-Point Black Star */}
      <div
        className={`flex ${circleSizes[size]} shrink-0 items-center justify-center rounded-full bg-[#d0f471] shadow-xs group-hover:scale-105 transition-transform duration-200`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" fill="none" className={`${starSizes[size]} text-[#091712]`}>
          <path
            d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
            fill="currentColor"
          />
        </svg>
      </div>

      {/* 2. Brand Wordmark & Tagline */}
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline leading-none">
          <span className={`${textSizes[size]} font-bold tracking-tight text-white !text-white font-sans`}>
            Bellix Labs
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="h-[1.5px] w-2.5 sm:w-3 bg-[#d0f471]" />
          <span className={`${studioSizes[size]} font-bold text-white !text-white uppercase leading-none font-mono`}>
            AI STUDIO
          </span>
          <span className="h-[1.5px] w-2.5 sm:w-3 bg-[#d0f471]" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block shrink-0 select-none" aria-label="Bellix Labs Home">
        {content}
      </Link>
    );
  }

  return content;
}
