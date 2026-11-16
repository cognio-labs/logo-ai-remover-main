import React from "react";
import Link from "next/link";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
}

export function BrandLogo({ className = "", size = "md", href = "/" }: BrandLogoProps) {
  const iconSizes = {
    sm: "h-7 w-auto",
    md: "h-9 sm:h-10 w-auto",
    lg: "h-11 sm:h-12 w-auto",
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
      {/* 1. Official Bellix.us 3D Ribbon Sparkle Mark */}
      <div
        className="relative shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-200"
        aria-hidden="true"
      >
        <img
          src="/brand/bellix-ribbon-icon.png"
          alt="Bellix.us"
          className={`${iconSizes[size]} object-contain drop-shadow-[0_2px_12px_rgba(236,72,153,0.35)]`}
        />
      </div>

      {/* 2. Brand Wordmark & Tagline */}
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline leading-none">
          <span className={`${textSizes[size]} font-extrabold tracking-tight text-white !text-white font-sans`}>
            Bellix.us
          </span>
        </div>
        <div className="mt-1">
          <span className={`${studioSizes[size]} font-bold text-zinc-400 !text-zinc-400 uppercase leading-none font-mono`}>
            LUXURY AI STUDIO
          </span>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block shrink-0 select-none" aria-label="Bellix.us Home">
        {content}
      </Link>
    );
  }

  return content;
}
