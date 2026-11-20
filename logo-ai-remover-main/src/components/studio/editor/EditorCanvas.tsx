import React, { useEffect, useRef, useState, useCallback } from "react";
import { useEditor } from "./EditorContext";
import { PHOTO_FILTERS } from "./backgroundData";
import type { TextLayer } from "./types";

export function EditorCanvas() {
  const { state, dispatch } = useEditor();
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
    textLayers,
    selectedTextLayerId,
  } = state;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Cached Image elements
  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const cutoutImgRef = useRef<HTMLImageElement | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
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
      dispatch({ type: "SET_MASK_CANVAS", payload: mCanvas });
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

  // Compute CSS / Canvas filter for live adjustments & color grading
  const selectedFilter = PHOTO_FILTERS.find((f) => f.id === activeFilter);
  const filterStyle = [
    selectedFilter && selectedFilter.cssFilter !== "none" ? selectedFilter.cssFilter : "",
    `brightness(${100 + adjust.brightness}%)`,
    `contrast(${100 + adjust.contrast}%)`,
    `saturate(${100 + adjust.saturation}%)`,
  ]
    .filter(Boolean)
    .join(" ");

  // Composite Main Rendering Pipeline (Layers 1..5)
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

    // LAYER 1: Background Layer (Color, Gradient, or Image)
    if (background.type === "color") {
      ctx.fillStyle = background.value || "#FFFFFF";
      ctx.fillRect(0, 0, w, h);
    } else if (background.type === "gradient") {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      const colors =
        background.gradient && background.gradient.length >= 2
          ? background.gradient
          : ["#10241E", "#071A13"];
      colors.forEach((c, idx) => {
        grad.addColorStop(idx / (colors.length - 1), c);
      });
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else if (background.type === "image" && bgImgRef.current) {
      ctx.save();
      if (background.blurEnabled && background.blur > 0) {
        ctx.filter = `blur(${background.blur}px)`;
      }

      const bgImg = bgImgRef.current;
      const fit = background.fit || "cover";

      if (fit === "fill") {
        ctx.drawImage(bgImg, 0, 0, w, h);
      } else if (fit === "contain") {
        const hRatio = w / bgImg.naturalWidth;
        const vRatio = h / bgImg.naturalHeight;
        const ratio = Math.min(hRatio, vRatio);
        const shiftX = (w - bgImg.naturalWidth * ratio) / 2;
        const shiftY = (h - bgImg.naturalHeight * ratio) / 2;
        ctx.drawImage(bgImg, shiftX, shiftY, bgImg.naturalWidth * ratio, bgImg.naturalHeight * ratio);
      } else {
        // "cover" (default)
        const hRatio = w / bgImg.naturalWidth;
        const vRatio = h / bgImg.naturalHeight;
        const ratio = Math.max(hRatio, vRatio);
        const shiftX = (w - bgImg.naturalWidth * ratio) / 2;
        const shiftY = (h - bgImg.naturalHeight * ratio) / 2;
        ctx.drawImage(bgImg, shiftX, shiftY, bgImg.naturalWidth * ratio, bgImg.naturalHeight * ratio);
      }
      ctx.restore();
    }

    // LAYER 2: Drop Shadow (rendered directly behind subject)
    if (shadow.enabled && maskCanvasRef.current) {
      ctx.save();
      ctx.shadowColor = `rgba(0, 0, 0, ${shadow.opacity})`;
      ctx.shadowBlur = shadow.blur * 2;
      ctx.shadowOffsetX = shadow.offsetX;
      ctx.shadowOffsetY = shadow.offsetY * 2;
      ctx.drawImage(maskCanvasRef.current, 0, 0, w, h);
      ctx.restore();
    }

    // LAYER 3: Subject Cutout with direct Canvas Adjustment Filters
    if (maskCanvasRef.current) {
      ctx.save();
      if (filterStyle && filterStyle !== "none") {
        try {
          ctx.filter = filterStyle;
        } catch {
          // fallback if browser doesn't support specific filter string
        }
      }
      ctx.drawImage(maskCanvasRef.current, 0, 0, w, h);
      ctx.restore();
    }

    // LAYER 4: Optional Canvas Border Outline
    if (adjust.borderWidth > 0) {
      ctx.save();
      ctx.lineWidth = adjust.borderWidth * 2;
      ctx.strokeStyle = adjust.borderColor || "#FFFFFF";
      ctx.strokeRect(0, 0, w, h);
      ctx.restore();
    }

    // LAYER 5: Heading & Text Layers (always rendered on top)
    if (textLayers && textLayers.length > 0) {
      textLayers.forEach((layer) => {
        ctx.save();
        const tx = (layer.x / 100) * w;
        const ty = (layer.y / 100) * h;
        ctx.translate(tx, ty);

        if (layer.rotation) {
          ctx.rotate((layer.rotation * Math.PI) / 180);
        }

        ctx.globalAlpha = layer.opacity ?? 1;

        const fontSize = layer.fontSize || 36;
        ctx.font = `${layer.fontWeight || "bold"} ${fontSize}px ${layer.fontFamily || "Inter, sans-serif"}`;
        ctx.textAlign = layer.align || "center";
        ctx.textBaseline = "middle";

        const metrics = ctx.measureText(layer.text);
        const textWidth = metrics.width;
        const textHeight = fontSize * (layer.lineHeight || 1.2);

        // Background pill badge if configured
        if (layer.backgroundColor) {
          ctx.save();
          ctx.shadowColor = "transparent";
          ctx.fillStyle = layer.backgroundColor;
          const pad = layer.padding ?? 8;
          const r = layer.borderRadius ?? 6;
          const bx =
            layer.align === "left"
              ? -pad
              : layer.align === "right"
              ? -textWidth - pad
              : -textWidth / 2 - pad;
          const by = -textHeight / 2 - pad / 2;
          ctx.beginPath();
          if (typeof ctx.roundRect === "function") {
            ctx.roundRect(bx, by, textWidth + pad * 2, textHeight + pad, r);
          } else {
            ctx.rect(bx, by, textWidth + pad * 2, textHeight + pad);
          }
          ctx.fill();
          ctx.restore();
        }

        // Text drop shadow for high contrast readability
        if (layer.shadowColor) {
          ctx.shadowColor = layer.shadowColor;
          ctx.shadowBlur = layer.shadowBlur ?? 8;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 2;
        }

        ctx.fillStyle = layer.color || "#FFFFFF";
        ctx.fillText(layer.text, 0, 0);

        // Editor selection bounding box when active in text tab
        if (layer.id === selectedTextLayerId && activeTab === "text") {
          ctx.save();
          ctx.shadowColor = "transparent";
          ctx.strokeStyle = "#d0f471";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);

          const pad = 8;
          const bx =
            layer.align === "left"
              ? -pad
              : layer.align === "right"
              ? -textWidth - pad
              : -textWidth / 2 - pad;
          const by = -textHeight / 2 - pad;
          const bw = textWidth + pad * 2;
          const bh = textHeight + pad * 2;

          ctx.strokeRect(bx, by, bw, bh);

          // Corner handles
          ctx.fillStyle = "#10241E";
          ctx.strokeStyle = "#d0f471";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
          const handleSize = 6;
          [
            [bx, by],
            [bx + bw, by],
            [bx, by + bh],
            [bx + bw, by + bh],
          ].forEach(([hx, hy]) => {
            ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
            ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
          });

          ctx.restore();
        }

        ctx.restore();
      });
    }
  }, [
    background,
    shadow,
    adjust,
    filterStyle,
    isCompareActive,
    textLayers,
    selectedTextLayerId,
  ]);

  useEffect(() => {
    if (isLoaded) {
      drawMainCanvas();
    }
  }, [isLoaded, drawMainCanvas]);

  // Handle Brush Drawing on Alpha Mask Canvas
  useEffect(() => {
    if (state.maskPixels && maskCanvasRef.current) {
      maskCanvasRef.current.getContext("2d")?.putImageData(state.maskPixels, 0, 0);
      drawMainCanvas();
    }
  }, [state.maskPixels, drawMainCanvas]);

  // Hit-test text layers on click
  const findHitTextLayer = (clientX: number, clientY: number): TextLayer | null => {
    const canvas = canvasRef.current;
    if (!canvas || !textLayers || textLayers.length === 0) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (clientX - rect.left) * scaleX;
    const clickY = (clientY - rect.top) * scaleY;

    // Check in reverse order (top-most layer first)
    for (let i = textLayers.length - 1; i >= 0; i--) {
      const layer = textLayers[i];
      const tx = (layer.x / 100) * canvas.width;
      const ty = (layer.y / 100) * canvas.height;

      const approxWidth = Math.max(100, (layer.fontSize * 0.65) * layer.text.length + 30);
      const approxHeight = Math.max(40, layer.fontSize * 1.5 + 20);

      const halfW = approxWidth / 2;
      const halfH = approxHeight / 2;

      if (
        clickX >= tx - halfW &&
        clickX <= tx + halfW &&
        clickY >= ty - halfH &&
        clickY <= ty + halfH
      ) {
        return layer;
      }
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // 1. Check if clicking on a text layer
    const hitText = findHitTextLayer(e.clientX, e.clientY);
    if (hitText) {
      e.currentTarget.setPointerCapture(e.pointerId);
      dispatch({ type: "SELECT_TEXT_LAYER", payload: hitText.id });
      dispatch({ type: "SET_ACTIVE_TAB", payload: "text" });
      setIsDraggingText(true);
      setDraggedLayerId(hitText.id);
      return;
    }

    // 2. Cutout Brush Drawing
    if (activeTab === "cutout") {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDrawing(true);
      applyBrush(e);
      return;
    }

    // 3. Clicked blank area while in text tab
    if (activeTab === "text") {
      dispatch({ type: "SELECT_TEXT_LAYER", payload: null });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setCursorPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }

    // Handle Dragging Text Layer
    if (isDraggingText && draggedLayerId && canvasRef.current) {
      const canvas = canvasRef.current;
      const canvasRect = canvas.getBoundingClientRect();
      const pctX = Math.round(((e.clientX - canvasRect.left) / canvasRect.width) * 100);
      const pctY = Math.round(((e.clientY - canvasRect.top) / canvasRect.height) * 100);

      const boundedX = Math.max(5, Math.min(95, pctX));
      const boundedY = Math.max(5, Math.min(95, pctY));

      dispatch({
        type: "UPDATE_TEXT_LAYER",
        payload: {
          id: draggedLayerId,
          updates: { x: boundedX, y: boundedY },
        },
      });
      return;
    }

    // Handle Cutout Brush
    if (!isDrawing || activeTab !== "cutout") return;
    applyBrush(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingText) {
      setIsDraggingText(false);
      setDraggedLayerId(null);
      drawMainCanvas();
      return;
    }

    if (isDrawing) {
      setIsDrawing(false);
      drawMainCanvas();
      const mask = maskCanvasRef.current;
      if (mask) {
        dispatch({
          type: "PUSH_HISTORY",
          pixels: mask.getContext("2d")?.getImageData(0, 0, mask.width, mask.height),
        });
      }
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
      className="relative size-full flex items-center justify-center p-2.5 sm:p-4 select-none overflow-hidden"
      onPointerLeave={() => {
        setCursorPos(null);
      }}
    >
      {/* Aspect Ratio Box */}
      <div
        className={`relative max-w-full max-h-[340px] sm:max-h-[380px] rounded-xl sm:rounded-2xl overflow-hidden shadow-lg transition-all duration-200 ${
          background.type === "transparent" ? "checkerboard-pattern" : ""
        } ${aspectClass}`}
      >
        <canvas
          data-background-editor-canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`max-h-[340px] sm:max-h-[380px] max-w-full object-contain block touch-none ${
            activeTab === "cutout"
              ? "cursor-crosshair"
              : isDraggingText
              ? "cursor-grabbing"
              : "cursor-default"
          }`}
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
