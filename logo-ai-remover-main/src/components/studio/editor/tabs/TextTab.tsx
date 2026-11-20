import React from "react";
import { useEditor } from "../EditorContext";
import type { TextLayer } from "../types";
import {
  Type,
  Plus,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Move,
  RotateCw,
  Eye,
  Sparkles,
  Layers,
  Copy,
} from "lucide-react";

const FONT_FAMILIES = [
  { id: "Inter, sans-serif", name: "Inter (Modern)" },
  { id: "Montserrat, sans-serif", name: "Montserrat (Geometric)" },
  { id: "'Playfair Display', serif", name: "Playfair (Editorial)" },
  { id: "Poppins, sans-serif", name: "Poppins (Clean)" },
  { id: "Anton, sans-serif", name: "Anton (Impact Bold)" },
  { id: "'Oswald', sans-serif", name: "Oswald (Condensed)" },
  { id: "'Caveat', cursive", name: "Caveat (Handwritten)" },
  { id: "monospace", name: "Monospace (Tech)" },
];

const PRESET_COLORS = [
  "#FFFFFF",
  "#000000",
  "#d0f471",
  "#10241E",
  "#F59E0B",
  "#EF4444",
  "#3B82F6",
  "#EC4899",
  "#8B5CF6",
  "#10B981",
];

export function TextTab() {
  const { state, dispatch } = useEditor();
  const { textLayers, selectedTextLayerId } = state;

  const selectedLayer = textLayers.find((l) => l.id === selectedTextLayerId) || null;

  const handleAddText = (type: "heading" | "subheading" | "body") => {
    const id = `text_${Date.now()}`;
    const newLayer: TextLayer = {
      id,
      type: "text",
      text:
        type === "heading"
          ? "Add a Heading"
          : type === "subheading"
          ? "Add a Subheading"
          : "Add your text description here",
      x: 50,
      y: type === "heading" ? 25 : type === "subheading" ? 38 : 75,
      fontSize: type === "heading" ? 54 : type === "subheading" ? 32 : 20,
      fontFamily: type === "heading" ? "Montserrat, sans-serif" : "Inter, sans-serif",
      fontWeight: type === "heading" ? "800" : type === "subheading" ? "700" : "500",
      color: "#FFFFFF",
      align: "center",
      letterSpacing: type === "heading" ? 1 : 0,
      lineHeight: 1.2,
      rotation: 0,
      opacity: 1,
      shadowColor: "rgba(0, 0, 0, 0.75)",
      shadowBlur: 10,
    };

    dispatch({ type: "ADD_TEXT_LAYER", payload: newLayer });
  };

  const updateSelected = (updates: Partial<TextLayer>) => {
    if (!selectedTextLayerId) return;
    dispatch({
      type: "UPDATE_TEXT_LAYER",
      payload: { id: selectedTextLayerId, updates },
    });
  };

  const handleDelete = (id: string) => {
    dispatch({ type: "DELETE_TEXT_LAYER", payload: id });
  };

  const handleDuplicate = (layer: TextLayer) => {
    const id = `text_${Date.now()}`;
    const duplicated: TextLayer = {
      ...layer,
      id,
      x: Math.min(90, layer.x + 4),
      y: Math.min(90, layer.y + 4),
    };
    dispatch({ type: "ADD_TEXT_LAYER", payload: duplicated });
  };

  return (
    <div className="p-4 space-y-5 text-[#10241E]">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#10241E]">
            <Type className="size-4 text-[#10241E]" />
            Heading & Text Overlays
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#10241E] border border-emerald-200">
            TOP LAYER
          </span>
        </div>
        <p className="text-xs text-[#52645D] leading-relaxed">
          Add headings, captions, and badges. Positioned directly above the subject and exportable in full resolution.
        </p>
      </div>

      {/* Quick Add Presets */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => handleAddText("heading")}
          className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-gray-200 bg-white hover:border-[#10241E] hover:bg-gray-50 transition-all cursor-pointer shadow-xs group"
        >
          <span className="text-base font-extrabold text-[#10241E] group-hover:scale-105 transition-transform">
            H1
          </span>
          <span className="text-[10px] font-semibold text-[#52645D] mt-0.5">Heading</span>
        </button>

        <button
          type="button"
          onClick={() => handleAddText("subheading")}
          className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-gray-200 bg-white hover:border-[#10241E] hover:bg-gray-50 transition-all cursor-pointer shadow-xs group"
        >
          <span className="text-sm font-bold text-[#10241E] group-hover:scale-105 transition-transform">
            H2
          </span>
          <span className="text-[10px] font-semibold text-[#52645D] mt-0.5">Subheading</span>
        </button>

        <button
          type="button"
          onClick={() => handleAddText("body")}
          className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-gray-200 bg-white hover:border-[#10241E] hover:bg-gray-50 transition-all cursor-pointer shadow-xs group"
        >
          <span className="text-xs font-medium text-[#10241E] group-hover:scale-105 transition-transform">
            Body
          </span>
          <span className="text-[10px] font-semibold text-[#52645D] mt-0.5">Paragraph</span>
        </button>
      </div>

      {/* Layer List if multiple text elements */}
      {textLayers.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#52645D] uppercase tracking-wider flex items-center justify-between">
            <span>Text Layers ({textLayers.length})</span>
            <span className="text-[10px] lowercase font-normal text-gray-400">click to select & edit</span>
          </label>
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {textLayers.map((l, index) => {
              const isSelected = l.id === selectedTextLayerId;
              return (
                <div
                  key={l.id}
                  onClick={() => dispatch({ type: "SELECT_TEXT_LAYER", payload: l.id })}
                  className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? "border-[#10241E] bg-[#10241E] text-white shadow-xs"
                      : "border-gray-200 bg-gray-50 text-[#10241E] hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span
                      className={`text-[10px] font-mono px-1 rounded ${
                        isSelected ? "bg-white/20 text-[#d0f471]" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      #{index + 1}
                    </span>
                    <span className="truncate font-medium">{l.text}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(l);
                      }}
                      className="p-1 rounded hover:bg-black/10 transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(l.id);
                      }}
                      className="p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-500 transition-colors"
                      title="Delete layer"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Layer Inspector */}
      {selectedLayer ? (
        <div className="space-y-4 pt-2 border-t border-gray-200">
          {/* Text Content */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#10241E]">Text Content</label>
            <textarea
              rows={2}
              value={selectedLayer.text}
              onChange={(e) => updateSelected({ text: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:border-[#10241E] focus:outline-hidden font-medium bg-white"
              placeholder="Enter text..."
            />
          </div>

          {/* Typography: Font Family & Weight */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#52645D]">Font Family</label>
              <select
                value={selectedLayer.fontFamily}
                onChange={(e) => updateSelected({ fontFamily: e.target.value })}
                className="w-full text-xs p-2 rounded-xl border border-gray-300 bg-white focus:outline-hidden"
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#52645D]">Font Weight</label>
              <select
                value={String(selectedLayer.fontWeight)}
                onChange={(e) => updateSelected({ fontWeight: e.target.value })}
                className="w-full text-xs p-2 rounded-xl border border-gray-300 bg-white focus:outline-hidden"
              >
                <option value="400">Regular (400)</option>
                <option value="600">SemiBold (600)</option>
                <option value="700">Bold (700)</option>
                <option value="800">ExtraBold (800)</option>
                <option value="900">Black (900)</option>
              </select>
            </div>
          </div>

          {/* Font Size & Alignment */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#10241E]">Font Size</span>
              <span className="font-mono text-[#52645D]">{selectedLayer.fontSize}px</span>
            </div>
            <input
              type="range"
              min={12}
              max={120}
              value={selectedLayer.fontSize}
              onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })}
              className="w-full accent-[#10241E] cursor-pointer h-2 bg-gray-200 rounded-lg"
            />
          </div>

          {/* Alignment */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#52645D]">Alignment</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => updateSelected({ align: "left" })}
                className={`py-1.5 flex items-center justify-center rounded-lg transition-all ${
                  selectedLayer.align === "left"
                    ? "bg-white shadow-xs text-[#10241E] font-bold"
                    : "text-[#52645D] hover:text-[#10241E]"
                }`}
              >
                <AlignLeft className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => updateSelected({ align: "center" })}
                className={`py-1.5 flex items-center justify-center rounded-lg transition-all ${
                  selectedLayer.align === "center"
                    ? "bg-white shadow-xs text-[#10241E] font-bold"
                    : "text-[#52645D] hover:text-[#10241E]"
                }`}
              >
                <AlignCenter className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => updateSelected({ align: "right" })}
                className={`py-1.5 flex items-center justify-center rounded-lg transition-all ${
                  selectedLayer.align === "right"
                    ? "bg-white shadow-xs text-[#10241E] font-bold"
                    : "text-[#52645D] hover:text-[#10241E]"
                }`}
              >
                <AlignRight className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Color Swatches */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#10241E]">Text Color</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={selectedLayer.color}
                  onChange={(e) => updateSelected({ color: e.target.value })}
                  className="size-5 rounded border border-gray-300 cursor-pointer p-0 bg-transparent"
                />
                <span className="font-mono text-[11px] text-[#52645D] uppercase">
                  {selectedLayer.color}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updateSelected({ color: c })}
                  className={`size-6 rounded-lg border transition-transform cursor-pointer ${
                    selectedLayer.color.toLowerCase() === c.toLowerCase()
                      ? "scale-110 border-[#10241E] ring-2 ring-[#d0f471]"
                      : "border-gray-300 hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Readability & Contrast: Drop Shadow Toggle */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#10241E]">Text Shadow / Glow</h4>
                <p className="text-[10px] text-[#52645D]">Guarantees readability on any backdrop</p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(selectedLayer.shadowColor)}
                onChange={(e) =>
                  updateSelected({
                    shadowColor: e.target.checked ? "rgba(0,0,0,0.85)" : undefined,
                    shadowBlur: e.target.checked ? 12 : undefined,
                  })
                }
                className="size-4 accent-[#10241E] cursor-pointer"
              />
            </div>
          </div>

          {/* Position Sliders (also draggable directly on canvas) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-[11px] text-[#52645D]">
              <span className="font-semibold flex items-center gap-1">
                <Move className="size-3" /> Position & Rotation
              </span>
              <span className="text-[10px] text-gray-400">or drag on canvas</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-gray-500">Horizontal (X %)</label>
                <input
                  type="range"
                  min={5}
                  max={95}
                  value={selectedLayer.x}
                  onChange={(e) => updateSelected({ x: Number(e.target.value) })}
                  className="w-full accent-[#10241E] cursor-pointer h-1.5 bg-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500">Vertical (Y %)</label>
                <input
                  type="range"
                  min={5}
                  max={95}
                  value={selectedLayer.y}
                  onChange={(e) => updateSelected({ y: Number(e.target.value) })}
                  className="w-full accent-[#10241E] cursor-pointer h-1.5 bg-gray-200 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-dashed border-gray-300 text-center space-y-2 bg-gray-50">
          <p className="text-xs text-[#52645D]">
            Click any button above to add a heading or caption to your image.
          </p>
        </div>
      )}
    </div>
  );
}
