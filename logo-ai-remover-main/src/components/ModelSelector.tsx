import React, { useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { ModelIcon } from "./ModelIcon";
import { AI_MODELS, type AIModelData } from "./models/modelData";

export interface ModelCardProps {
  model: AIModelData;
  isSelected?: boolean;
  onSelect?: (model: AIModelData) => void;
  className?: string;
}

export function ModelCard({
  model,
  isSelected = false,
  onSelect,
  className = "",
}: ModelCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(model)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(model);
        }
      }}
      className={`group relative flex items-center justify-between gap-3.5 px-4 py-3 rounded-2xl cursor-pointer select-none transition-all duration-200 border text-left ${
        isSelected
          ? "bg-gradient-to-r from-rose-950/40 via-black/80 to-rose-950/30 border-rose-500 shadow-[0_0_24px_rgba(225,29,72,0.35)] ring-1 ring-rose-500/40 -translate-y-0.5"
          : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-rose-500/40 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(225,29,72,0.18)]"
      } ${className}`}
    >
      {/* Left: Official Model Logo */}
      <div className="flex items-center gap-3 shrink-0">
        <ModelIcon modelId={model.id} name={model.name} />

        {/* Center: Model Details */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-white tracking-tight truncate group-hover:text-rose-200 transition-colors">
              {model.name}
            </span>
            {isSelected && (
              <CheckCircle2 className="size-3.5 text-rose-400 shrink-0 animate-in fade-in zoom-in-75 duration-200" />
            )}
          </div>
          <span className="text-[11px] font-mono text-gray-400 tracking-tight truncate">
            {model.version}
          </span>
          <span className="text-[10px] text-gray-500 line-clamp-1">
            {model.description}
          </span>
        </div>
      </div>

      {/* Right: Mode Badge & Indicator (Frameless) */}
      <div className="flex items-center gap-1.5 shrink-0 pl-2 text-[11px] font-mono font-medium text-emerald-400">
        <span
          className={`size-1.5 rounded-full ${
            isSelected ? "bg-rose-400 animate-pulse" : "bg-emerald-400"
          }`}
        />
        <span>{model.mode}</span>
      </div>
    </div>
  );
}

export interface ModelSelectorProps {
  selectedId?: string;
  onModelSelect?: (model: AIModelData) => void;
  className?: string;
}

export function ModelSelector({
  selectedId: controlledSelectedId,
  onModelSelect,
  className = "",
}: ModelSelectorProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string>("gemini");
  const activeId = controlledSelectedId ?? internalSelectedId;

  const handleSelect = (model: AIModelData) => {
    setInternalSelectedId(model.id);
    onModelSelect?.(model);
  };

  return (
    <div className={`w-full max-w-6xl mx-auto space-y-6 ${className}`}>
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/30 text-xs font-bold text-rose-300">
            <Sparkles className="size-3.5 text-rose-400" />
            <span>Supported Generative Video &amp; Image AI Engines</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Official AI Model Watermark Removal Registry
          </h3>
        </div>
        <p className="text-xs text-gray-400 max-w-xs font-mono">
          Select an AI model to apply calibrated neural inpainting profiles.
        </p>
      </div>

      {/* Grid of 10 Official Model Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {AI_MODELS.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            isSelected={activeId === model.id}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}

export default ModelSelector;
