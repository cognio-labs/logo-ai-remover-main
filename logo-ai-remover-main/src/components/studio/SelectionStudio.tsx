import { useEffect, useRef, useState } from "react";
import { FlowerLoader } from "./BackgroundProcessing";

export type EditingMode = "background" | "text" | "object" | "custom";
type Point = { x: number; y: number };
type Tool = "brush" | "eraser" | "rectangle" | "lasso";

/** Explicit, editable selection. Overlay pixels never enter the exported PNG. */
export function SelectionStudio({
  original,
  width,
  height,
  mode,
  onResult,
  onCancel,
  onBackground,
  purpose = "inpaint",
}: {
  original: string;
  width: number;
  height: number;
  mode: EditingMode;
  onResult: (blob: Blob) => void;
  onCancel: () => void;
  onBackground?: () => void;
  purpose?: "inpaint" | "foreground";
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const mask = useRef<HTMLCanvasElement | null>(null);
  const controller = useRef<AbortController | null>(null);
  const gesture = useRef<Point[]>([]);
  const beforeGesture = useRef<ImageData | null>(null);
  const history = useRef<ImageData[]>([]);
  const index = useRef(-1);
  const [tool, setTool] = useState<Tool>("brush");
  const [size, setSize] = useState(24);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [instruction, setInstruction] = useState("");
  const [regions, setRegions] = useState<Array<{ text: string; box: number[] }>>([]);

  const paint = () => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || !mask.current) return;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(mask.current, 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = "rgba(0, 166, 109, .45)";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
  };
  const snapshot = () => {
    const ctx = mask.current?.getContext("2d");
    if (!ctx) return;
    history.current = history.current.slice(0, index.current + 1);
    history.current.push(ctx.getImageData(0, 0, width, height));
    const capacity = Math.max(
      2,
      Math.min(12, Math.floor((64 * 1024 * 1024) / (width * height * 4))),
    );
    if (history.current.length > capacity) history.current.shift();
    index.current = history.current.length - 1;
    setRevision((v) => v + 1);
  };
  useEffect(() => {
    const layer = document.createElement("canvas");
    layer.width = width;
    layer.height = height;
    mask.current = layer;
    snapshot();
    return () => {
      controller.current?.abort();
    };
  }, [original, width, height]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(width, ((event.clientX - rect.left) * width) / rect.width)),
      y: Math.max(0, Math.min(height, ((event.clientY - rect.top) * height) / rect.height)),
    };
  };
  const draw = () => {
    const ctx = mask.current?.getContext("2d");
    const points = gesture.current;
    if (!ctx || !points.length) return;
    const a = points[0],
      b = points[points.length - 1];
    if (beforeGesture.current) ctx.putImageData(beforeGesture.current, 0, 0);
    ctx.fillStyle = "white";
    ctx.strokeStyle = "white";
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    if (tool === "rectangle")
      ctx.fillRect(
        Math.min(a.x, b.x),
        Math.min(a.y, b.y),
        Math.abs(a.x - b.x),
        Math.abs(a.y - b.y),
      );
    else {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      points.forEach((p) => ctx.lineTo(p.x, p.y));
      if (tool === "lasso") {
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.lineWidth = (size * width) / (canvas.current?.getBoundingClientRect().width || width);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
        if (points.length === 1) {
          ctx.beginPath();
          ctx.arc(a.x, a.y, ctx.lineWidth / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalCompositeOperation = "source-over";
    paint();
  };
  const undo = (delta: number) => {
    index.current = Math.max(0, Math.min(history.current.length - 1, index.current + delta));
    mask.current?.getContext("2d")?.putImageData(history.current[index.current], 0, 0);
    paint();
    setRevision((v) => v + 1);
  };
  const addBox = (box: number[]) => {
    const ctx = mask.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "white";
    ctx.fillRect(box[0], box[1], box[2], box[3]);
    paint();
    snapshot();
  };
  const proposeInstruction = () => {
    // Spatial instructions become a visible proposal, never an automatic edit.
    const text = instruction.toLowerCase();
    if (/remov\w*.*background|background.*remov\w*/.test(text) && onBackground) {
      onBackground();
      return;
    }
    if (/\bleft\b/.test(text)) addBox([0, 0, width / 3, height]);
    else if (/\bright\b/.test(text)) addBox([(width * 2) / 3, 0, width / 3, height]);
    else if (/\btop\b/.test(text)) addBox([0, 0, width, height / 4]);
    else if (/\bbottom\b/.test(text)) addBox([0, (height * 3) / 4, width, height / 4]);
    else {
      setError(
        "Please mark the exact target with the brush, rectangle or lasso. This instruction does not identify an unambiguous region.",
      );
      return;
    }
    setError(
      "Selection proposal ready. Correct the green area before applying; spatial selection does not identify a person or object.",
    );
  };
  const detect = async () => {
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError("");
    try {
      const image = await (await fetch(original, { signal: request.signal })).blob();
      const data = new FormData();
      data.append("image", image, "image.png");
      const response = await fetch("/api/detect-text", {
        method: "POST",
        body: data,
        signal: request.signal,
      });
      if (!response.ok)
        throw new Error("OCR is unavailable locally. Mark the exact text manually.");
      const result = await response.json();
      setRegions(result.regions);
      if (!result.regions.length) setError("No text was detected. You can select it manually.");
    } catch (cause) {
      if (!request.signal.aborted)
        setError(cause instanceof Error ? cause.message : "Text detection failed.");
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  };
  const apply = async () => {
    const layer = mask.current;
    const ctx = layer?.getContext("2d");
    if (!layer || !ctx) return;
    const pixels = ctx.getImageData(0, 0, width, height);
    if (!pixels.data.some((v, i) => i % 4 === 3 && v > 0)) {
      setError("Select the exact area to remove first.");
      return;
    }
    if (purpose === "foreground") {
      const request = new AbortController();
      controller.current = request;
      setBusy(true);
      setError("");
      try {
        const bitmap = await createImageBitmap(
          await (await fetch(original, { signal: request.signal })).blob(),
        );
        const output = document.createElement("canvas");
        output.width = width;
        output.height = height;
        const context = output.getContext("2d")!;
        context.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        const source = context.getImageData(0, 0, width, height);
        for (let i = 3; i < source.data.length; i += 4)
          source.data[i] = Math.min(source.data[i], pixels.data[i]);
        context.putImageData(source, 0, 0);
        const blob = await new Promise<Blob>((resolve, reject) =>
          output.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Could not encode cutout"))),
            "image/png",
          ),
        );
        request.signal.throwIfAborted();
        onResult(blob);
      } catch (cause) {
        if (!request.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Could not build cutout");
      } finally {
        if (!request.signal.aborted) setBusy(false);
      }
      return;
    }
    // Convert transparent selection canvas into opaque black/white mask.
    for (let i = 0; i < pixels.data.length; i += 4) {
      const value = pixels.data[i + 3] > 0 ? 255 : 0;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
      pixels.data[i + 3] = 255;
    }
    const encoded = document.createElement("canvas");
    encoded.width = width;
    encoded.height = height;
    encoded.getContext("2d")!.putImageData(pixels, 0, 0);
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError("");
    try {
      const selection = await new Promise<Blob>((resolve, reject) =>
        encoded.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Could not encode selection"))),
          "image/png",
        ),
      );
      const image = await (await fetch(original, { signal: request.signal })).blob();
      const data = new FormData();
      data.append("image", image, "image.png");
      data.append("mask", selection, "selection.png");
      data.append("auto_detect", "false");
      const response = await fetch("/api/remove-text", {
        method: "POST",
        body: data,
        signal: request.signal,
      });
      if (!response.ok || !response.headers.get("Content-Type")?.includes("image/png"))
        throw new Error("Image repair failed. Your original and selection are still available.");
      const result = await response.blob();
      request.signal.throwIfAborted();
      onResult(result);
    } catch (cause) {
      if (!request.signal.aborted)
        setError(cause instanceof Error ? cause.message : "Image repair failed.");
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  };
  return (
    <section
      className="max-w-4xl mx-auto rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4"
      data-revision={revision}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900">
          {purpose === "foreground"
            ? "Select the foreground to keep"
            : mode === "text"
              ? "Select text to remove"
              : mode === "custom"
                ? "Describe and confirm your edit"
                : "Select an object to remove"}
        </h2>
        <button
          type="button"
          onClick={() => {
            controller.current?.abort();
            onCancel();
          }}
          className="text-sm text-slate-600"
        >
          Cancel
        </button>
      </div>
      <p className="text-xs text-slate-500">
        {purpose === "foreground"
          ? "Green areas will be kept. Unselected areas become transparent. Include every person, object and detail you want to preserve."
          : "Only the green selection will be repaired. Inspect nearby faces, graphics and text before applying. Large areas and complex textures may need further editing."}
      </p>
      {mode === "custom" && (
        <div className="flex flex-wrap gap-2">
          <input
            aria-label="Describe your edit"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Remove the text at the top"
            className="flex-1 border rounded-xl px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={busy}
            onClick={proposeInstruction}
            className="border rounded-xl px-3 text-sm"
          >
            Propose selection
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2" aria-label="Selection tools">
        {(["brush", "eraser", "rectangle", "lasso"] as Tool[]).map((t) => (
          <button
            type="button"
            key={t}
            disabled={busy}
            aria-pressed={tool === t}
            onClick={() => setTool(t)}
            className={`px-3 py-2 rounded-xl text-xs border ${tool === t ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "border-slate-200"}`}
          >
            {t}
          </button>
        ))}
        <button
          type="button"
          disabled={busy || index.current <= 0}
          onClick={() => undo(-1)}
          className="text-xs px-2 disabled:opacity-40"
        >
          Undo
        </button>
        <button
          type="button"
          disabled={busy || index.current >= history.current.length - 1}
          onClick={() => undo(1)}
          className="text-xs px-2 disabled:opacity-40"
        >
          Redo
        </button>
        <label className="text-xs">
          Brush{" "}
          <input
            aria-label="Selection brush size"
            type="range"
            min="2"
            max="100"
            value={size}
            onChange={(e) => setSize(+e.target.value)}
          />
        </label>
      </div>
      <div
        className="relative mx-auto overflow-hidden rounded-xl bg-slate-50"
        style={{
          aspectRatio: `${width}/${height}`,
          width: `min(100%, calc(62vh * ${width / height}))`,
        }}
      >
        <img
          src={original}
          alt="Original image for selection"
          className="absolute inset-0 w-full h-full object-contain"
        />
        <canvas
          ref={canvas}
          width={width}
          height={height}
          aria-label="Draw selection over the image"
          className="absolute inset-0 w-full h-full touch-none"
          style={{ pointerEvents: busy ? "none" : "auto" }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            beforeGesture.current = mask
              .current!.getContext("2d")!
              .getImageData(0, 0, width, height);
            gesture.current = [point(e)];
            draw();
          }}
          onPointerMove={(e) => {
            if (!gesture.current.length) return;
            gesture.current.push(point(e));
            draw();
          }}
          onPointerUp={() => {
            if (!gesture.current.length) return;
            gesture.current = [];
            snapshot();
          }}
          onPointerCancel={() => {
            if (beforeGesture.current)
              mask.current?.getContext("2d")?.putImageData(beforeGesture.current, 0, 0);
            gesture.current = [];
            paint();
          }}
        />
      </div>
      {mode === "text" && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={detect}
            className="text-xs border rounded-lg px-3 py-2"
          >
            Detect text with OCR
          </button>
          {regions.map((r, i) => (
            <button
              type="button"
              disabled={busy}
              key={i}
              onClick={() => addBox(r.box)}
              className="text-xs border rounded-lg px-3 py-2"
            >
              Select “{r.text}”
            </button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-amber-800">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={apply}
        className="flex items-center gap-3 bg-emerald-600 text-white rounded-full px-5 py-3 text-sm disabled:opacity-60"
      >
        {busy && <FlowerLoader />}
        {busy
          ? "Processing your selection..."
          : purpose === "foreground"
            ? "Build cutout from my selection"
            : "Apply selected removal"}
      </button>
    </section>
  );
}
