import React, { useState } from "react";
import { Sparkles } from "lucide-react";

export type AIModelId =
  | "gemini"
  | "veo"
  | "openai"
  | "sora"
  | "midjourney"
  | "runway"
  | "kling"
  | "luma"
  | "pika"
  | "stability"
  | "haiper";

export interface ModelIconProps {
  modelId: string;
  name?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

// Direct static paths to official brand vector assets
const MODEL_ASSET_MAP: Record<string, string> = {
  gemini: "/models/gemini.svg",
  "google-gemini": "/models/gemini.svg",
  veo: "/models/veo.svg",
  "google-veo": "/models/veo.svg",
  openai: "/models/openai.svg",
  sora: "/models/sora.svg",
  "openai-sora": "/models/sora.svg",
  midjourney: "/models/midjourney.svg",
  "midjourney-v6": "/models/midjourney.svg",
  runway: "/models/runway.svg",
  "runway-gen-3": "/models/runway.svg",
  kling: "/models/kling.svg",
  "kling-ai": "/models/kling.svg",
  luma: "/models/luma.svg",
  "luma-dream-machine": "/models/luma.svg",
  pika: "/models/pika.svg",
  "pika-2.0": "/models/pika.svg",
  stability: "/models/stability.svg",
  "stable-diffusion-3": "/models/stability.svg",
  haiper: "/models/haiper.svg",
  "haiper-ai": "/models/haiper.svg",
};

// Clean, bright background styling for official brand icons (no dark/black background)
const MODEL_BG_MAP: Record<string, string> = {
  gemini: "bg-white border-gray-200/90 shadow-2xs hover:border-blue-300",
  veo: "bg-white border-gray-200/90 shadow-2xs hover:border-sky-300",
  sora: "bg-white border-gray-200/90 shadow-2xs hover:border-sky-300",
  openai: "bg-white border-gray-200/90 shadow-2xs hover:border-gray-400",
  midjourney: "bg-white border-gray-200/90 shadow-2xs hover:border-indigo-300",
  runway: "bg-white border-gray-200/90 shadow-2xs hover:border-rose-300",
  kling: "bg-white border-gray-200/90 shadow-2xs hover:border-amber-300",
  luma: "bg-white border-gray-200/90 shadow-2xs hover:border-cyan-300",
  pika: "bg-white border-gray-200/90 shadow-2xs hover:border-orange-300",
  stability: "bg-white border-gray-200/90 shadow-2xs hover:border-purple-300",
  haiper: "bg-white border-gray-200/90 shadow-2xs hover:border-teal-300",
};

export function ModelIcon({
  modelId,
  name = "AI Model",
  className = "",
  size = "md",
}: ModelIconProps) {
  const [hasError, setHasError] = useState(false);
  const [triedFallback, setTriedFallback] = useState(false);
  const normalizedId = modelId.toLowerCase().trim();

  // Primary asset mapping
  const primarySrc = MODEL_ASSET_MAP[normalizedId] || `/models/${normalizedId}.svg`;
  
  // Specific fallback: if Sora fails, fall back to OpenAI official logo
  const fallbackSrc =
    normalizedId === "sora" || normalizedId === "openai-sora"
      ? "/models/openai.svg"
      : null;

  const [currentSrc, setCurrentSrc] = useState(primarySrc);

  const handleError = () => {
    if (fallbackSrc && !triedFallback) {
      setTriedFallback(true);
      setCurrentSrc(fallbackSrc);
    } else {
      setHasError(true);
    }
  };

  const bgStyle = MODEL_BG_MAP[normalizedId] || "bg-white border-gray-200/90 shadow-2xs";

  // Strict container requirements: 36px x 36px desktop, 32px x 32px mobile, border-radius: 10px
  const sizeClasses = {
    sm: "w-[28px] h-[28px] rounded-[8px] p-1",
    md: "w-[32px] h-[32px] sm:w-[36px] sm:h-[36px] rounded-[10px] p-1.5",
    lg: "w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] rounded-[12px] p-2",
  }[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 border overflow-hidden transition-all duration-200 group-hover:scale-105 ${sizeClasses} ${bgStyle} ${className}`}
      title={name}
      style={{ borderRadius: size === "md" ? 10 : undefined }}
    >
      {!hasError ? (
        <img
          src={currentSrc}
          alt={`${name} official logo`}
          className="w-full h-full max-w-full max-h-full object-contain pointer-events-none select-none transition-transform duration-200"
          loading="lazy"
          onError={handleError}
        />
      ) : (
        <div className="flex w-full h-full items-center justify-center text-gray-400">
          <Sparkles className="size-3.5 text-rose-400" aria-label={`${name} fallback icon`} />
        </div>
      )}
    </div>
  );
}

export default ModelIcon;

