import React from "react";
import Link from "next/link";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
}

export function BrandLogo({ className = "", size = "md", href = "/" }: BrandLogoProps) {
  const iconSizes = {
    sm: "h-8 sm:h-9 w-auto",
    md: "h-11 sm:h-12 w-auto",
    lg: "h-14 sm:h-16 w-auto",
  };

  const textSizes = {
    sm: "text-lg sm:text-xl",
    md: "text-2xl sm:text-[26px]",
    lg: "text-3xl sm:text-4xl",
  };

  const studioSizes = {
    sm: "text-[9px] sm:text-[10px]",
    md: "text-[10px] sm:text-[11.5px]",
    lg: "text-xs sm:text-sm",
  };

  const content = (
    <div className={`group flex items-center gap-3 sm:gap-3.5 py-1 select-none cursor-pointer shrink-0 ${className}`}>
      {/* 1. Official Bellix.us 3D Ribbon Sparkle Mark (Enlarged, crisp & zero artifacts) */}
      <div
        className="relative shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-200"
        aria-hidden="true"
      >
        <img
          src="/brand/bellix-ribbon-icon.png"
          alt="Bellix.us"
          className={`${iconSizes[size]} object-contain drop-shadow-[0_2px_14px_rgba(236,72,153,0.4)]`}
        />
      </div>

      {/* 2. Brand Wordmark & Tagline (Pristine White & Crisp Silver Sans-Serif, ZERO green) */}
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline leading-none">
          <span
            className={`${textSizes[size]} font-black tracking-tight text-white !text-white font-sans`}
            style={{ color: "#FFFFFF" }}
          >
            Bellix.us
          </span>
        </div>
        <div className="mt-1">
          <span
            className={`${studioSizes[size]} font-extrabold uppercase leading-none font-sans text-white/90 !text-white/90 tracking-[0.24em]`}
            style={{ color: "#E4E4E7", letterSpacing: "0.24em" }}
          >
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
