import React from "react";
import { ShieldCheck, Zap, CheckCircle2 } from "lucide-react";

/**
 * Laurel branch SVG component (Left side).
 * Features classical upward-sprouting laurel leaves along an elegant arc.
 * Right side is mirrored via `-scale-x-100`.
 */
function LaurelBranch({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 68"
      fill="currentColor"
      className={`h-12 w-6 sm:h-14 sm:w-7 md:h-16 md:w-8 shrink-0 select-none text-[#1E293B] ${className}`}
      aria-hidden="true"
    >
      {/* Stem arc */}
      <path
        d="M 24 64 C 14 53, 7 36, 12 18 C 14 12, 19 6, 23 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Top tip leaf */}
      <path d="M 23 3 C 25 -0.5, 30 0.5, 30 4.5 C 28 6.5, 25 6, 23 3 Z" />

      {/* Outer leaves (facing left & tilted upwards) */}
      <path d="M 18 13 C 12 9, 12 3.5, 15 2 C 18.5 5, 19.5 9, 18 13 Z" />
      <path d="M 13 23 C 6 19, 6 13.5, 9 12 C 13 15, 14.5 19, 13 23 Z" />
      <path d="M 10 34 C 3 30, 3 24.5, 6 23 C 10 26, 11.5 30, 10 34 Z" />
      <path d="M 10 45 C 3 42, 3 36.5, 6 35 C 10 38, 11.5 42, 10 45 Z" />
      <path d="M 13 55 C 7 53, 7 47.5, 10 46 C 14 49, 15 53, 13 55 Z" />
      <path d="M 19 63 C 14 62, 14 57.5, 16.5 56 C 20 58.5, 20.5 61.5, 19 63 Z" />

      {/* Inner leaves (facing right & tilted upwards) */}
      <path d="M 21 15 C 26 11, 31 12.5, 31 16.5 C 28 18.5, 24 18, 21 15 Z" />
      <path d="M 16 25 C 22 21, 27 23.5, 27 27.5 C 24 29.5, 19.5 28.5, 16 25 Z" />
      <path d="M 13 36 C 19 32.5, 24 35, 24 39 C 21 41, 16.5 39.5, 13 36 Z" />
      <path d="M 13 47 C 19 44.5, 23 47, 22.5 51 C 19.5 52.5, 15.5 50.5, 13 47 Z" />
      <path d="M 17 56 C 22 54.5, 24.5 57, 24 60 C 21 61.5, 18 60, 17 56 Z" />
    </svg>
  );
}

interface TrustBadgeItemProps {
  icon: React.ReactNode;
  line1: string;
  line2: string;
}

function TrustBadgeItem({ icon, line1, line2 }: TrustBadgeItemProps) {
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4 md:gap-5 transition-transform hover:scale-105 duration-200">
      {/* Left Laurel Branch */}
      <LaurelBranch />

      {/* Center Icon & Text */}
      <div className="flex flex-col items-center justify-center text-center px-1">
        <div className="text-[#1E293B] mb-2 flex items-center justify-center">
          {icon}
        </div>
        <div className="text-[#0F172A] font-bold text-xs sm:text-sm md:text-[15px] leading-snug tracking-tight whitespace-nowrap">
          <div>{line1}</div>
          <div>{line2}</div>
        </div>
      </div>

      {/* Right Laurel Branch (Mirrored) */}
      <LaurelBranch className="-scale-x-100" />
    </div>
  );
}

export function VideoTrustBadges({ className = "" }: { className?: string }) {
  return (
    <section
      aria-label="Privacy and Processing Guarantees"
      className={`w-full py-8 sm:py-10 my-4 ${className}`}
    >
      <div className="mx-auto max-w-5xl px-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 md:gap-10 lg:gap-14 items-center justify-items-center">
          {/* Badge 1: 100% Local Processing */}
          <TrustBadgeItem
            icon={<ShieldCheck className="size-7 sm:size-8 stroke-[1.9] text-[#1E293B]" />}
            line1="100% Local"
            line2="Processing"
          />

          {/* Badge 2: No Upload Required */}
          <TrustBadgeItem
            icon={<Zap className="size-7 sm:size-8 stroke-[1.9] text-[#1E293B]" />}
            line1="No Upload"
            line2="Required"
          />

          {/* Badge 3: Open Source Pipeline */}
          <TrustBadgeItem
            icon={<CheckCircle2 className="size-7 sm:size-8 stroke-[1.9] text-[#1E293B]" />}
            line1="Open Source"
            line2="Pipeline"
          />
        </div>
      </div>
    </section>
  );
}

export default VideoTrustBadges;
