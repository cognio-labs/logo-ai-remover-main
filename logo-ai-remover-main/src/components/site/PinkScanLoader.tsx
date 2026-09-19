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
    <div className="relative w-full max-w-lg mx-auto p-6 rounded-3xl bg-white border border-[#FCE7EC] shadow-[0_12px_40px_-10px_rgba(225,29,72,0.12)] text-center overflow-hidden">
      {/* Background soft red/pink mesh blur */}
      <div className="absolute -top-12 -left-12 w-36 h-36 bg-[#FFE4E9] rounded-full blur-2xl opacity-60 pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-[#FFF1F4] rounded-full blur-2xl opacity-60 pointer-events-none" />

      {/* Pulsing Icon */}
      <div className="relative mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] flex items-center justify-center text-white shadow-[0_8px_24px_rgba(225,29,72,0.3)] animate-pulse-soft">
        {isCompleted ? (
          <CheckCircle2 className="w-8 h-8 text-white" />
        ) : (
          <Sparkles className="w-8 h-8 text-white animate-spin" style={{ animationDuration: "6s" }} />
        )}
      </div>

      <div className="space-y-1 mb-5">
        <h4 className="text-lg font-bold text-gray-900 tracking-tight">
          {isCompleted ? "AI Refinement Complete!" : "PixelRefine Neural Engine"}
        </h4>
        <p className="text-sm font-medium text-[#E11D48] flex items-center justify-center gap-1.5">
          <Zap className="w-4 h-4 animate-bounce" />
          {stage || "Analyzing pixels & structure..."}
        </p>
      </div>

      {/* Progress Bar Container */}
      <div className="relative w-full h-3 bg-[#FFF1F4] rounded-full overflow-hidden border border-[#FDE2E8] mb-3">
        <div
          className="h-full bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] transition-all duration-300 rounded-full shadow-[0_0_12px_rgba(225,29,72,0.5)]"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
        <span className="flex items-center gap-1 text-gray-600">
          <ShieldCheck className="w-3.5 h-3.5 text-[#E11D48]" />
          Zero-Loss Quality Assurance
        </span>
        <span className="font-bold text-gray-900 text-sm">{progress}%</span>
      </div>
    </div>
  );
};
