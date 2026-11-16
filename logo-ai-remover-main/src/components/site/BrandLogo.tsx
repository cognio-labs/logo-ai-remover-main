import React from "react";
import Link from "next/link";

export interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "light" | "dark";
  href?: string;
  showIconOnly?: boolean;
}

export function BrandLogo({
  className = "",
  size = "md",
  variant = "light",
  href = "/",
  showIconOnly = false,
}: BrandLogoProps) {
  // Height sizing mapped to responsive classes (Aspect ratio is ~3.64:1 [946x260])
  const sizeClasses = {
    sm: "h-7 sm:h-8 w-auto",       // ~102px - 116px width
    md: "h-10 sm:h-11 w-auto",     // ~146px - 160px width
    lg: "h-12 sm:h-14 w-auto",     // ~175px - 204px width
    xl: "h-14 sm:h-16 w-auto",     // ~204px - 233px width
  };

  const iconSizeClasses = {
    sm: "h-7 sm:h-8 w-auto",
    md: "h-9 sm:h-10 w-auto",
    lg: "h-11 sm:h-12 w-auto",
    xl: "h-14 sm:h-16 w-auto",
  };

  const logoSrc = showIconOnly
    ? "/brand/bellix-ribbon-icon.png"
    : variant === "dark"
    ? "/brand/bellix-logo-dark.png"
    : "/brand/bellix-logo-white.png";

  const content = (
    <div
      className={`group inline-flex items-center select-none cursor-pointer shrink-0 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99] ${className}`}
    >
      <img
        src={logoSrc}
        alt="Bellix.us — Luxury AI Studio"
        width={showIconOnly ? 217 : 946}
        height={260}
        className={`${showIconOnly ? iconSizeClasses[size] : sizeClasses[size]} object-contain drop-shadow-[0_2px_12px_rgba(236,72,153,0.25)]`}
        loading="eager"
        decoding="async"
      />
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
