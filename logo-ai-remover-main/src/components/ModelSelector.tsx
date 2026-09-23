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
          ? "bg-rose-50/80 border-rose-500 shadow-md ring-1 ring-rose-500/30 -translate-y-0.5"
          : "bg-white hover:bg-rose-50/40 border-gray-200 hover:border-rose-300 hover:-translate-y-0.5 hover:shadow-md"
      } ${className}`}
    >
      {/* Left: Official Model Logo */}
      <div className="flex items-center gap-3 shrink-0">
        <ModelIcon modelId={model.id} name={model.name} />

        {/* Center: Model Details */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-900 tracking-tight truncate group-hover:text-rose-600 transition-colors">
              {model.name}
            </span>
            {isSelected && (
              <CheckCircle2 className="size-3.5 text-rose-500 shrink-0 animate-in fade-in zoom-in-75 duration-200" />
            )}
          </div>
          <span className="text-[11px] font-mono text-gray-600 tracking-tight truncate font-semibold">
            {model.version}
          </span>
          <span className="text-[10px] text-gray-500 line-clamp-1">
            {model.description}
          </span>
        </div>
      </div>

      {/* Right: Mode Badge & Indicator */}
      <div className="flex items-center gap-1.5 shrink-0 pl-2 text-[11px] font-mono font-medium text-emerald-600">
        <span
          className={`size-1.5 rounded-full ${
            isSelected ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600">
            <Sparkles className="size-3.5 text-rose-500" />
            <span>Supported Generative Video &amp; Image AI Engines</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-semibold text-gray-950 tracking-tight">
            Official AI Model Watermark Removal Registry
          </h3>
        </div>
        <p className="text-xs text-gray-500 max-w-xs font-mono">
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
