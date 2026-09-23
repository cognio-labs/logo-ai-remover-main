import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Brush,
  Download,
  Eraser,
  RefreshCw,
  Sparkles,
  Trash2,
  Undo2,
  Wand2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { UploadZone } from "@/components/site/UploadZone";
import { BeforeAfterSlider } from "@/components/site/BeforeAfterSlider";
import { PinkScanLoader } from "@/components/site/PinkScanLoader";
import { PinkButton } from "@/components/site/PinkButton";
import { IMAGE_STAGES, runPipeline } from "@/lib/pipeline";
import { useUserStore } from "@/lib/userStore";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export const Route = createFileRoute("/remove/image")({
  head: () => ({
    meta: [
      { title: "AI Image Cleaner — Bellix.us" },
      {
        name: "description",
        content:
          "Remove watermarks, logos, text overlays, and AI blemishes with interactive brush tools and generative inpainting.",
      },
    ],
  }),
  component: ImageCleaner,
});

type Mark = { x: number; y: number; size: number; erase: boolean };

function ImageCleaner() {
  const [url, setUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [brush, setBrush] = useState(36);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const painting = useRef(false);
  const cancel = useRef<(() => void) | null>(null);

  const { user, deductCredit, refundCredit, addJob } = useUserStore();

  useEffect(() => () => cancel.current?.(), []);

  const paint = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMarks((m) => [
      ...m,
      {
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
        size: brush,
        erase: tool === "eraser",
      },
    ]);
  };

  const autoDetect = () => {
    setMarks([
      { x: 80, y: 88, size: 70, erase: false },
      { x: 74, y: 88, size: 60, erase: false },
      { x: 20, y: 15, size: 55, erase: false },
    ]);
    toast.success("AI auto-detected 2 potential watermark regions!");
  };

  const startProcessing = () => {
    if (user.credits <= 0) {
      toast.error("Insufficient credits! Please upgrade your plan or wait for daily reset.");
      return;
    }

    const deducted = deductCredit();
    if (!deducted) return;

    setRunning(true);
    setDone(false);
    setProgress(0);

    // Simulated AI API Pipeline (replaceable with real backend endpoint)
    // TODO(real AI): POST /api/process/image with { imageUrl, maskCoordinates }
    cancel.current = runPipeline(IMAGE_STAGES, 5000, (u) => {
      setProgress(u.progress);
      setStage(u.stage);
      if (u.done) {
        setRunning(false);
        setDone(true);

        // Add to persistent user jobs
        addJob({
          file_name: file?.name || "creative_image_clean.png",
          file_type: "image",
          status: "completed",
          quality: "Ultra HD (4K)",
          credits_used: 1,
          processing_time: "4.8s",
          file_url: url || undefined,
          result_url: url || undefined,
        });

        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#E11D48", "#FF2E63", "#FF4FA3", "#FFE4E9"],
        });

        toast.success("Image cleaned & enhanced successfully! 1 credit used.");
      }
    });
  };

  const downloadResult = (format: "png" | "jpg") => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `bellix_${file?.name ? file.name.replace(/\.[^/.]+$/, "") : "image"}_4k.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloaded high-res ${format.toUpperCase()} image!`);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFF1F4] border border-[#FCE7EC] text-xs font-bold text-[#E11D48] mb-3">
            <Sparkles className="size-3.5" />
            <span>AI Watermark & Imperfection Inpainter</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-semibold text-gray-900 tracking-tight">
            AI Image Cleaner
          </h1>
          <p className="mt-3 text-base text-gray-600">
            Select or paint over unwanted watermarks, logos, timestamps, or AI artifacts. Our neural
            inpaint engine reconstructs the missing pixels seamlessly.
          </p>
        </div>

        {/* Upload State */}
        {!url ? (
          <div className="max-w-3xl mx-auto">
            <UploadZone
              accept="image/*"
              type="image"
              hint="PNG, JPG, WEBP or AVIF"
              onFile={(f, objUrl) => {
                setFile(f);
                setUrl(objUrl);
                setMarks([]);
                setDone(false);
              }}
              onAutoDetect={() => {
                // Auto load demo with detection
                const demoUrl =
                  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80";
                setUrl(demoUrl);
                setFile(new File([], "sample_ai_portrait.png"));
                setTimeout(autoDetect, 300);
              }}
            />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Action Bar / Tool Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#FCE7EC] shadow-[0_6px_20px_rgba(225,29,72,0.06)]">
              {/* Left tools: Brush, Eraser, Clear */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTool("brush")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    tool === "brush"
                      ? "bg-[#E11D48] text-white shadow-xs"
                      : "bg-[#FFF1F4] text-gray-700 hover:text-[#E11D48]"
                  }`}
                >
                  <Brush className="size-3.5" />
                  <span>Brush Tool</span>
                </button>

                <button
                  onClick={() => setTool("eraser")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    tool === "eraser"
                      ? "bg-[#E11D48] text-white shadow-xs"
                      : "bg-[#FFF1F4] text-gray-700 hover:text-[#E11D48]"
                  }`}
                >
                  <Eraser className="size-3.5" />
                  <span>Eraser</span>
                </button>

                <button
                  onClick={autoDetect}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#FFF1F4] text-[#E11D48] hover:bg-[#FFE4E9] transition-all"
                >
                  <Wand2 className="size-3.5" />
                  <span>Auto Detect</span>
                </button>

                <button
                  onClick={() => setMarks([])}
                  disabled={marks.length === 0}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-red-600 disabled:opacity-40 transition-colors"
                >
                  <Trash2 className="size-3.5" />
                  <span>Clear Selection</span>
                </button>
              </div>

              {/* Middle: Brush size slider */}
              <div className="flex items-center gap-3 min-w-[200px]">
                <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">
                  Size: {brush}px
                </span>
                <Slider
                  value={[brush]}
                  min={12}
                  max={90}
                  step={2}
                  onValueChange={([v]) => v && setBrush(v)}
                  className="w-32 accent-[#E11D48]"
                />
              </div>

              {/* Right: Reset & Start Button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setUrl(null);
                    setMarks([]);
                    setDone(false);
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
                >
                  <RefreshCw className="size-3.5" />
                  <span>Change Image</span>
                </button>

                {!done && (
                  <PinkButton
                    size="md"
                    onClick={startProcessing}
                    disabled={running}
                    className="shadow-sm"
                  >
                    <Zap className="size-4" />
                    <span>{running ? "Processing..." : "Refine & Inpaint"}</span>
                  </PinkButton>
                )}
              </div>
            </div>

            {/* Interactive Painting Canvas / Processing / Comparison Slider */}
            {running ? (
              <div className="py-12">
                <PinkScanLoader progress={progress} stage={stage} />
              </div>
            ) : done ? (
              /* Before / After Comparison Result */
              <div className="space-y-6">
                <div className="rounded-3xl p-4 bg-white border border-[#FCE7EC] shadow-[0_15px_45px_-10px_rgba(225,29,72,0.15)]">
                  <BeforeAfterSlider
                    src={url}
                    labelBefore="Original (With Marks)"
                    labelAfter="Cleaned Result (Pristine)"
                    badge="AI Repaired"
                  />
                </div>

                {/* Download Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-[#FFF8FA] border border-[#FCE7EC]">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#E11D48] text-white text-xs font-semibold uppercase">
                      HD 4K Ready
                    </span>
                    <span className="text-xs text-gray-600 font-medium">
                      All watermarks removed • Full dynamic range preserved
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <PinkButton
                      variant="outline"
                      size="md"
                      onClick={() => downloadResult("jpg")}
                    >
                      <Download className="size-4" />
                      <span>Download JPG</span>
                    </PinkButton>

                    <PinkButton
                      variant="primary"
                      size="md"
                      onClick={() => downloadResult("png")}
                    >
                      <Download className="size-4" />
                      <span>Download PNG (Lossless)</span>
                    </PinkButton>

                    <PinkButton
                      variant="soft"
                      size="md"
                      onClick={() => {
                        setDone(false);
                        setMarks([]);
                      }}
                    >
                      <span>Edit Again</span>
                    </PinkButton>
                  </div>
                </div>
              </div>
            ) : (
              /* Canvas Painting Area */
              <div className="relative rounded-3xl overflow-hidden border border-[#FCE7EC] bg-gray-50 shadow-md">
                <div
                  className="relative aspect-[16/10] w-full cursor-crosshair select-none touch-none overflow-hidden"
                  onPointerDown={(e) => {
                    painting.current = true;
                    paint(e);
                  }}
                  onPointerMove={(e) => {
                    if (painting.current) paint(e);
                  }}
                  onPointerUp={() => {
                    painting.current = false;
                  }}
                >
                  <img
                    src={url}
                    alt="Source preview"
                    className="size-full object-contain pointer-events-none"
                    draggable={false}
                  />

                  {/* Render drawn mask marks with glowing red/pink */}
                  <svg className="absolute inset-0 size-full pointer-events-none">
                    {marks.map((m, i) => (
                      <circle
                        key={i}
                        cx={`${m.x}%`}
                        cy={`${m.y}%`}
                        r={m.size / 2}
                        fill={m.erase ? "transparent" : "rgba(225, 29, 72, 0.45)"}
                        stroke={m.erase ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 46, 99, 0.7)"}
                        strokeWidth={m.erase ? 3 : 1}
                      />
                    ))}
                  </svg>

                  {marks.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="px-4 py-2 rounded-2xl bg-white/90 text-gray-700 text-xs font-bold border border-gray-200 backdrop-blur-md shadow-sm">
                        🖌️ Click and drag brush over watermarks to remove
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
