import React, { useEffect, useRef, useState, useCallback } from "react";
import { useEditor } from "./EditorContext";
import { PHOTO_FILTERS } from "./backgroundData";

export function EditorCanvas() {
  const { state } = useEditor();
  const {
    originalImageUrl,
    cutoutImageUrl,
    activeTab,
    isCompareActive,
    brush,
    background,
    shadow,
    activeFilter,
    adjust,
  } = state;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Cached Image elements
  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const cutoutImgRef = useRef<HTMLImageElement | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load and cache images
  useEffect(() => {
    let active = true;
    const orig = new Image();
    orig.crossOrigin = "anonymous";
    orig.src = originalImageUrl;

    const cutout = new Image();
    cutout.crossOrigin = "anonymous";
    cutout.src = cutoutImageUrl;

    Promise.all([
      new Promise((res) => (orig.onload = res)),
      new Promise((res) => (cutout.onload = res)),
    ]).then(() => {
      if (!active) return;
      originalImgRef.current = orig;
      cutoutImgRef.current = cutout;

      // Initialize mask canvas to track user brush modifications
      const w = cutout.naturalWidth || cutout.width || 800;
      const h = cutout.naturalHeight || cutout.height || 600;

      const mCanvas = document.createElement("canvas");
      mCanvas.width = w;
      mCanvas.height = h;
      const mCtx = mCanvas.getContext("2d", { willReadFrequently: true });
      if (mCtx) {
        // Draw initial cutout onto mask canvas
        mCtx.drawImage(cutout, 0, 0, w, h);
      }
      maskCanvasRef.current = mCanvas;
      setIsLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [originalImageUrl, cutoutImageUrl]);

  // Load custom or preset background image if any
  useEffect(() => {
    if (background.type === "image" && background.value) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = background.value;
      img.onload = () => {
        bgImgRef.current = img;
        drawMainCanvas();
      };
    } else {
      bgImgRef.current = null;
      drawMainCanvas();
    }
  }, [background.type, background.value]);

  // Composite Main Rendering Pipeline
  const drawMainCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !cutoutImgRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = cutoutImgRef.current.naturalWidth || 800;
    const h = cutoutImgRef.current.naturalHeight || 600;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.clearRect(0, 0, w, h);

    // If Compare is active, draw original image only
    if (isCompareActive && originalImgRef.current) {
      ctx.drawImage(originalImgRef.current, 0, 0, w, h);
      return;
    }

    // LAYER 1: Background Layer
    if (background.type === "color") {
      ctx.fillStyle = background.value || "#FFFFFF";
      ctx.fillRect(0, 0, w, h);
    } else if (background.type === "image" && bgImgRef.current) {
      ctx.save();
      if (background.blurEnabled && background.blur > 0) {
        ctx.filter = `blur(${background.blur}px)`;
      }
      // Scale cover
      const bgImg = bgImgRef.current;
      const hRatio = w / bgImg.naturalWidth;
      const vRatio = h / bgImg.naturalHeight;
      const ratio = Math.max(hRatio, vRatio);
      const centerShiftX = (w - bgImg.naturalWidth * ratio) / 2;
      const centerShiftY = (h - bgImg.naturalHeight * ratio) / 2;

      ctx.drawImage(
        bgImg,
        0,
        0,
        bgImg.naturalWidth,
        bgImg.naturalHeight,
        centerShiftX,
        centerShiftY,
        bgImg.naturalWidth * ratio,
        bgImg.naturalHeight * ratio
      );
      ctx.restore();
    }

    // LAYER 2: Drop Shadow (rendered behind subject)
    if (shadow.enabled && maskCanvasRef.current) {
      ctx.save();
      ctx.shadowColor = `rgba(0, 0, 0, ${shadow.opacity})`;
      ctx.shadowBlur = shadow.blur * 2;
      ctx.shadowOffsetX = shadow.offsetX;
      ctx.shadowOffsetY = shadow.offsetY * 2;
      ctx.drawImage(maskCanvasRef.current, 0, 0, w, h);
      ctx.restore();
    }

    // LAYER 3: Subject Cutout with Brush Edits
    if (maskCanvasRef.current) {
      ctx.drawImage(maskCanvasRef.current, 0, 0, w, h);
    }

    // LAYER 4: Optional Canvas Border Outline
    if (adjust.borderWidth > 0) {
      ctx.save();
      ctx.lineWidth = adjust.borderWidth * 2;
      ctx.strokeStyle = adjust.borderColor || "#FFFFFF";
      ctx.strokeRect(0, 0, w, h);
      ctx.restore();
    }
  }, [background, shadow, adjust, isCompareActive]);

  useEffect(() => {
    if (isLoaded) {
      drawMainCanvas();
    }
  }, [isLoaded, drawMainCanvas]);

  // Handle Brush Drawing on Alpha Mask Canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTab !== "cutout") return;
    setIsDrawing(true);
    applyBrush(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setCursorPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }

    if (!isDrawing || activeTab !== "cutout") return;
    applyBrush(e);
  };

  const handlePointerUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      drawMainCanvas();
    }
  };

  const applyBrush = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const mCanvas = maskCanvasRef.current;
    if (!canvas || !mCanvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const radius = brush.size * (scaleX / 2);

    const mCtx = mCanvas.getContext("2d");
    if (!mCtx) return;

    mCtx.save();
    if (brush.mode === "erase") {
      // Erase mode: destination-out clears pixels to transparent
      mCtx.globalCompositeOperation = "destination-out";
      const radGrad = mCtx.createRadialGradient(x, y, 0, x, y, radius);
      radGrad.addColorStop(0, "rgba(0,0,0,1)");
      radGrad.addColorStop(brush.magicBrush ? 0.8 : 0.4, "rgba(0,0,0,0.8)");
      radGrad.addColorStop(1, "rgba(0,0,0,0)");
      mCtx.fillStyle = radGrad;
      mCtx.beginPath();
      mCtx.arc(x, y, radius, 0, Math.PI * 2);
      mCtx.fill();
    } else {
      // Restore mode: restore pixels from original image
      if (originalImgRef.current) {
        mCtx.globalCompositeOperation = "source-over";
        mCtx.save();
        mCtx.beginPath();
        mCtx.arc(x, y, radius, 0, Math.PI * 2);
        mCtx.clip();
        mCtx.drawImage(originalImgRef.current, 0, 0, canvas.width, canvas.height);
        mCtx.restore();
      }
    }
    mCtx.restore();

    drawMainCanvas();
  };

  // Compute CSS filter for live adjustments & instagram filters
  const selectedFilter = PHOTO_FILTERS.find((f) => f.id === activeFilter);
  const filterStyle = [
    selectedFilter && selectedFilter.cssFilter !== "none" ? selectedFilter.cssFilter : "",
    `brightness(${100 + adjust.brightness}%)`,
    `contrast(${100 + adjust.contrast}%)`,
    `saturate(${100 + adjust.saturation}%)`,
  ]
    .filter(Boolean)
    .join(" ");

  // Aspect Ratio Preset Styles
  const aspectClass =
    adjust.cropAspect === "1:1"
      ? "aspect-square"
      : adjust.cropAspect === "4:5"
      ? "aspect-[4/5]"
      : adjust.cropAspect === "9:16"
      ? "aspect-[9/16]"
      : adjust.cropAspect === "16:9"
      ? "aspect-video"
      : adjust.cropAspect === "3:2"
      ? "aspect-[3/2]"
      : "aspect-auto";

  return (
    <div
      ref={containerRef}
      className="relative size-full flex items-center justify-center p-4 sm:p-8 select-none overflow-hidden"
      onPointerLeave={() => {
        setCursorPos(null);
        setIsDrawing(false);
      }}
    >
      {/* Aspect Ratio Box */}
      <div
        className={`relative max-w-full max-h-[580px] rounded-2xl overflow-hidden shadow-2xl transition-all duration-200 ${
          background.type === "transparent" ? "checkerboard-pattern" : ""
        } ${aspectClass}`}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`max-h-[580px] max-w-full object-contain block touch-none ${
            activeTab === "cutout" ? "cursor-crosshair" : "cursor-default"
          }`}
          style={{ filter: filterStyle || undefined }}
        />

        {/* Interactive Brush Circle Cursor */}
        {activeTab === "cutout" && cursorPos && (
          <div
            className="pointer-events-none absolute rounded-full border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.6)] transform -translate-x-1/2 -translate-y-1/2 z-40 transition-transform duration-75"
            style={{
              left: `${cursorPos.x}px`,
              top: `${cursorPos.y}px`,
              width: `${brush.size}px`,
              height: `${brush.size}px`,
              backgroundColor:
                brush.mode === "erase"
                  ? "rgba(225, 29, 72, 0.25)"
                  : "rgba(16, 185, 129, 0.25)",
            }}
          />
        )}
      </div>
    </div>
  );
}
