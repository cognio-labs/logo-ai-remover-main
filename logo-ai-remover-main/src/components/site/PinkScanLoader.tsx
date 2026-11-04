import React from "react";
import { Sparkles, CheckCircle2, ShieldCheck, Zap } from "lucide-react";

interface PinkScanLoaderProps {
  progress: number;
  stage: string;
  isCompleted?: boolean;
}

export const PinkScanLoader: React.FC<PinkScanLoaderProps> = ({
  progress,
  stage,
  isCompleted = false,
}) => {
  return (
    <div className="relative w-full max-w-lg mx-auto p-6 rounded-3xl bg-white border border-gray-200 shadow-xl text-center overflow-hidden">
      {/* Background soft mesh blur */}
      <div className="absolute -top-12 -left-12 w-36 h-36 bg-[#d0f471]/15 rounded-full blur-2xl opacity-60 pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-emerald-50 rounded-full blur-2xl opacity-60 pointer-events-none" />

      {/* Pulsing Icon */}
      <div className="relative mx-auto mb-4 w-16 h-16 rounded-2xl bg-[#10241E] flex items-center justify-center text-[#d0f471] shadow-md shadow-emerald-950/20 animate-pulse-soft">
        {isCompleted ? (
          <CheckCircle2 className="w-8 h-8 text-[#d0f471]" />
        ) : (
          <Sparkles
            className="w-8 h-8 text-[#d0f471] animate-spin"
            style={{ animationDuration: "6s" }}
          />
        )}
      </div>

      <div className="space-y-1 mb-5">
        <h4 className="text-lg font-bold text-[#10241E] tracking-tight">
          {isCompleted ? "AI Refinement Complete!" : "Bellix Neural Engine"}
        </h4>
        <p className="text-sm font-semibold text-[#18362d] flex items-center justify-center gap-1.5">
          <Zap className="w-4 h-4 text-emerald-600 animate-bounce" />
          <span>{stage || "Analyzing pixels & structure..."}</span>
        </p>
      </div>

      {/* Progress Bar Container */}
      <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200 mb-3">
        <div
          className="h-full bg-[#d0f471] transition-all duration-300 rounded-full shadow-[0_0_12px_rgba(208,244,113,0.6)]"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
        <span className="flex items-center gap-1 text-gray-600">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Zero-Loss Quality Assurance
        </span>
        <span className="font-bold text-[#10241E] text-sm">{progress}%</span>
      </div>
    </div>
  );
};
