import React, { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, RotateCcw, Wand2, CheckCircle2, Eraser, Layers } from "lucide-react";
import { PinkButton } from "./PinkButton";
import { toast } from "sonner";

interface SampleImage {
  id: string;
  name: string;
  cleanSrc: string;
  watermarkSrc: string;
  tag: string;
}

const SAMPLE_IMAGES: SampleImage[] = [
  {
    id: "mountain-lake",
    name: "Mountain Lake at Sunset",
    cleanSrc: "/test_frame.png",
    watermarkSrc: "/preview_watermarked_frame.png",
    tag: "Gemini AI Video Frame",
  },
  {
    id: "ai-model",
    name: "AI Portrait Model",
    cleanSrc: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1600&auto=format&fit=crop&q=90",
    watermarkSrc: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1600&auto=format&fit=crop&q=90",
    tag: "Midjourney v6 Portrait",
  },
  {
    id: "cyberpunk-city",
    name: "Cyberpunk Metropolis",
    cleanSrc: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=90",
    watermarkSrc: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=90",
    tag: "Sora AI Generation",
  },
];

export function PaintReveal() {
  const [activeSampleIndex, setActiveSampleIndex] = useState(0);
  const sample = SAMPLE_IMAGES[activeSampleIndex] || SAMPLE_IMAGES[0]!;

  const [brushSize, setBrushSize] = useState(45);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cleanedPercent, setCleanedPercent] = useState(0);
  const [isAutoErasing, setIsAutoErasing] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize canvas with the watermark layer
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw watermark layer onto canvas
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // If active sample is not the mountain lake (which already has baked watermark in watermarkSrc),
      // add dynamic realistic AI watermark badge onto canvas so user can erase it!
      if (sample.id !== "mountain-lake") {
        // Bottom-left AI pill badge with Gemini / AI tag
        ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
        ctx.beginPath();
        ctx.roundRect(40, canvas.height - 80, 240, 50, 25);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px Inter, Arial, sans-serif";
        ctx.fillText(`✦ ${sample.tag}`, 65, canvas.height - 48);
      }

      setCleanedPercent(0);
    };
    img.src = sample.watermarkSrc;
  }, [sample]);

  useEffect(() => {
    initCanvas();
    const handleResize = () => initCanvas();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [initCanvas]);

  // Erase stroke at coordinates
  const eraseAt = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, brushSize, 0, Math.PI * 2);
      ctx.fill();

      // Update cleanliness percentage estimate
      setCleanedPercent((prev) => Math.min(100, Math.round(prev + 1.2)));
    },
    [brushSize]
  );

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDrawing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    eraseAt(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setCursorPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        visible: true,
      });
    }
    if (isDrawing) {
      eraseAt(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  // Auto Magic Clean: sweeps eraser across watermark areas
  const handleAutoClean = () => {
    if (isAutoErasing) return;
    setIsAutoErasing(true);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let step = 0;
    const totalSteps = 60;

    const animate = () => {
      step++;
      ctx.globalCompositeOperation = "destination-out";

      // Target lower-left where watermark badge resides
      for (let i = 0; i < 6; i++) {
        const x1 = 50 + Math.random() * 260;
        const y1 = canvas.height - 95 + Math.random() * 70;
        ctx.beginPath();
        ctx.arc(x1, y1, brushSize * 1.3, 0, Math.PI * 2);
        ctx.fill();
      }

      setCleanedPercent(Math.min(100, Math.round((step / totalSteps) * 100)));

      if (step < totalSteps) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsAutoErasing(false);
        toast.success("AI Magic Eraser completed! 100% of watermark removed.");
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="w-full">
      {/* Top Toolbar: Controls & Sample Selector */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-[#FCE7EC] shadow-sm">
        {/* Sample selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Sample:</span>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_IMAGES.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setActiveSampleIndex(idx)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  activeSampleIndex === idx
                    ? "bg-[#E11D48] text-white shadow-sm"
                    : "bg-[#FFF1F4] text-gray-700 hover:bg-[#FFE4E9]"
                }`}
              >
                {img.name}
              </button>
            ))}
          </div>
        </div>

        {/* Brush size & Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Brush Sizes */}
          <div className="hidden sm:flex items-center gap-1.5 border-r border-gray-200 pr-3">
            <Eraser className="size-4 text-[#E11D48]" />
            <span className="text-xs font-bold text-gray-700">Brush:</span>
            {[25, 45, 75].map((sz) => (
              <button
                key={sz}
                onClick={() => setBrushSize(sz)}
                className={`px-2 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                  brushSize === sz
                    ? "bg-[#E11D48] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {sz === 25 ? "Small" : sz === 45 ? "Medium" : "Large"}
              </button>
            ))}
          </div>

          {/* Auto Clean Button */}
          <PinkButton
            size="sm"
            onClick={handleAutoClean}
            disabled={isAutoErasing}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            <Wand2 className="size-3.5" />
            <span>{isAutoErasing ? "AI Erasing..." : "Magic Auto Erase"}</span>
          </PinkButton>

          {/* Reset Button */}
          <button
            onClick={initCanvas}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors cursor-pointer shadow-2xs"
          >
            <RotateCcw className="size-3.5 text-gray-500" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div
        ref={containerRef}
        className="relative aspect-video w-full overflow-hidden rounded-3xl border border-[#FCE7EC] bg-slate-900 shadow-[0_20px_60px_-15px_rgba(225,29,72,0.18)] cursor-crosshair select-none group"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => setCursorPos((p) => ({ ...p, visible: false }))}
      >
        {/* Layer 1 (Bottom): Pristine Clean Image */}
        <img
          src={sample.cleanSrc}
          alt={sample.name}
          className="size-full object-cover pointer-events-none"
        />

        {/* Layer 2 (Top Canvas): Watermarked Image being erased by the brush */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 size-full touch-none pointer-events-auto"
        />

        {/* Floating Custom Eraser Ring Cursor */}
        {cursorPos.visible && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-[#E11D48] bg-rose-500/20 shadow-[0_0_15px_rgba(225,29,72,0.4)] transition-opacity"
            style={{
              left: `${cursorPos.x}px`,
              top: `${cursorPos.y}px`,
              width: `${brushSize * 2}px`,
              height: `${brushSize * 2}px`,
            }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-1.5 rounded-full bg-[#E11D48]" />
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 border border-[#FCE7EC] text-xs font-semibold text-gray-900 shadow-md backdrop-blur-md">
            <Sparkles className="size-3.5 text-[#E11D48]" />
            <span>Interactive AI Eraser Brush</span>
          </span>
        </div>

        {/* Progress Gauge */}
        <div className="absolute top-4 right-4 z-10 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 border border-green-200 text-xs font-semibold text-green-700 shadow-md backdrop-blur-md">
            <CheckCircle2 className="size-3.5 text-green-600" />
            <span>{cleanedPercent}% Cleaned</span>
          </span>
        </div>

        {/* Bottom Helper Hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="px-4 py-2 rounded-full bg-black/75 border border-white/20 text-white text-xs font-semibold backdrop-blur-md shadow-lg flex items-center gap-2">
            <Eraser className="size-3.5 text-[#FF4FA3]" />
            <span>Click and drag your mouse across the watermark to erase it live!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
