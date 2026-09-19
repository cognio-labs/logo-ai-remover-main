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

// Premium background colors tailored for each official brand identity
const MODEL_BG_MAP: Record<string, string> = {
  gemini: "bg-[#0D1224] border-blue-500/30 shadow-[0_0_12px_rgba(78,130,238,0.25)]",
  veo: "bg-[#111622] border-sky-500/30 shadow-[0_0_12px_rgba(66,133,244,0.25)]",
  sora: "bg-[#0C0E14] border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.2)]",
  openai: "bg-[#0C0E14] border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.2)]",
  midjourney: "bg-[#0B0F19] border-indigo-500/25 shadow-[0_0_12px_rgba(99,102,241,0.2)]",
  runway: "bg-[#120D12] border-rose-500/30 shadow-[0_0_12px_rgba(225,29,72,0.25)]",
  kling: "bg-[#14080D] border-red-500/30 shadow-[0_0_12px_rgba(255,46,99,0.25)]",
  luma: "bg-[#080E18] border-cyan-500/30 shadow-[0_0_12px_rgba(56,189,248,0.25)]",
  pika: "bg-[#141006] border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]",
  stability: "bg-[#110B18] border-purple-500/30 shadow-[0_0_12px_rgba(192,132,252,0.25)]",
  haiper: "bg-[#07130D] border-emerald-500/30 shadow-[0_0_12px_rgba(52,211,153,0.25)]",
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

  const bgStyle = MODEL_BG_MAP[normalizedId] || "bg-[#14151B] border-white/10";

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
          className="w-full h-full max-w-full max-h-full object-contain pointer-events-none select-none drop-shadow-sm transition-transform duration-200"
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

