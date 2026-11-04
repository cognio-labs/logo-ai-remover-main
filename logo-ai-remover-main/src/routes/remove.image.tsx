"use client";

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
  AlertCircle,
  CheckCircle2,
  Loader2,
  ServerCrash,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { UploadZone } from "@/components/site/UploadZone";
import { BeforeAfterSlider } from "@/components/site/BeforeAfterSlider";
import { PinkScanLoader } from "@/components/site/PinkScanLoader";
import { PinkButton } from "@/components/site/PinkButton";
import { useUserStore } from "@/lib/userStore";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  checkBackendHealth,
  fetchCleanedImageUrl,
  getDownloadUrl,
  pollJobStatus,
  uploadImageForCleaning,
} from "@/lib/imageRemoverApi";

export const Route = createFileRoute("/remove/image")({
  head: () => ({
    meta: [
      { title: "AI Image Watermark Remover — Remove Logos & Text from Photos | Bellix.us" },
      {
        name: "description",
        content:
          "Remove watermarks, logos, text overlays, and unwanted objects from photos. Paint over any area to erase it and fill with realistic background texture.",
      },
      { rel: "canonical", href: "https://www.bellix.us/remove/image" },
      { property: "og:url", content: "https://www.bellix.us/remove/image" },
      { property: "og:title", content: "AI Image Watermark Remover — Remove Logos & Text from Photos" },
      {
        property: "og:description",
        content:
          "Paint over any watermark, logo, or text in your photo and let AI fill it in seamlessly.",
      },
      { property: "og:image", content: "https://www.bellix.us/og-image.jpg" },
      { property: "og:image:secure_url", content: "https://www.bellix.us/og-image.jpg" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Bellix.us — AI Image Watermark Remover" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "AI Image Watermark Remover — Remove Logos & Text from Photos" },
      {
        name: "twitter:description",
        content: "Paint over any watermark, logo, or text in your photo and let AI fill it in seamlessly.",
      },
      { name: "twitter:image", content: "https://www.bellix.us/og-image.jpg" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "AI Image Watermark Remover",
          url: "https://www.bellix.us/remove/image",
          applicationCategory: "ImageEditor",
          operatingSystem: "Web",
          description:
            "Remove watermarks, logos, text overlays, and unwanted objects from photos using an AI brush tool.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          provider: { "@type": "Organization", name: "Bellix.us", url: "https://www.bellix.us/" },
        }),
      },
    ],
  }),
  component: ImageCleaner,
});

type Mark = { x: number; y: number; size: number; erase: boolean };
type Phase = "upload" | "paint" | "processing" | "done" | "error";

export default function ImageCleaner() {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [brush, setBrush] = useState(36);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [phase, setPhase] = useState<Phase>("upload");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  const painting = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const { addJob } = useUserStore();

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth().then(setBackendOk);
  }, []);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

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
    // Place marks in the bottom-right corner (typical Gemini/Veo watermark area)
    setMarks([
      { x: 86, y: 90, size: 80, erase: false },
      { x: 78, y: 90, size: 70, erase: false },
    ]);
    toast.success("AI auto-detected bottom-right watermark region!");
  };

  const startProcessing = async () => {
    if (!file) return;

    if (backendOk === false) {
      toast.error(
        "Flask backend is not running. Start it with: cd watermark-backend && python app.py",
        { duration: 6000 }
      );
      return;
    }

    abortRef.current = new AbortController();
    setPhase("processing");
    setProgress(5);
    setStage("Uploading image…");
    setErrorMsg("");

    try {
      // Build optional bounding box from painted marks
      let box: [number, number, number, number] | undefined;
      const activeBrush = marks.filter((m) => !m.erase);
      if (activeBrush.length > 0 && originalUrl) {
        // Use a temporary image element to get real dimensions
        const img = new Image();
        await new Promise<void>((res) => {
          img.onload = () => res();
          img.src = originalUrl;
        });
        const iw = img.naturalWidth || 1;
        const ih = img.naturalHeight || 1;
        const xs = activeBrush.map((m) => (m.x / 100) * iw);
        const ys = activeBrush.map((m) => (m.y / 100) * ih);
        const radii = activeBrush.map((m) => m.size / 2);
        const x0 = Math.max(0, Math.round(Math.min(...xs) - Math.max(...radii)));
        const y0 = Math.max(0, Math.round(Math.min(...ys) - Math.max(...radii)));
        const x1 = Math.min(iw, Math.round(Math.max(...xs) + Math.max(...radii)));
        const y1 = Math.min(ih, Math.round(Math.max(...ys) + Math.max(...radii)));
        if (x1 > x0 && y1 > y0) box = [x0, y0, x1 - x0, y1 - y0];
      }

      // 1. Upload
      setProgress(15);
      const { job_id } = await uploadImageForCleaning(file, box);
      setJobId(job_id);

      // 2. Poll status
      setProgress(20);
      setStage("Processing image on server…");
      const finalJob = await pollJobStatus(
        job_id,
        (job) => {
          setProgress(Math.max(20, Math.min(90, job.progress)));
          if (job.status === "processing") setStage("Removing watermark…");
          if (job.status === "queued") setStage("Queued, waiting for worker…");
        },
        1200,
        abortRef.current.signal
      );

      if (finalJob.status === "failed") {
        throw new Error(finalJob.error || "Server-side processing failed.");
      }

      // 3. Fetch result
      setProgress(95);
      setStage("Downloading cleaned image…");
      const cleanUrl = await fetchCleanedImageUrl(job_id);
      setResultUrl(cleanUrl);
      setProgress(100);
      setPhase("done");

      // Log to user store
      addJob({
        file_name: file.name,
        file_type: "image",
        status: "completed",
        quality: "Full Resolution",
        credits_used: 0,
        processing_time: "~3s",
        file_url: originalUrl || undefined,
        result_url: cleanUrl,
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#E11D48", "#FF2E63", "#FF4FA3", "#FFE4E9"],
      });

      toast.success("Watermark removed successfully!");
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "Cancelled") return;
      const msg =
        err instanceof Error ? err.message : "Unknown error occurred.";
      setErrorMsg(msg);
      setPhase("error");
      toast.error(msg);
    }
  };

  const cancelProcessing = () => {
    abortRef.current?.abort();
    setPhase("paint");
    setProgress(0);
    setStage("");
  };

  const downloadResult = () => {
    if (jobId) {
      const a = document.createElement("a");
      a.href = getDownloadUrl(jobId);
      a.download = `bellix_${file?.name?.replace(/\.[^/.]+$/, "") ?? "image"}_cleaned.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Downloading cleaned PNG…");
    } else if (resultUrl) {
      // Fallback: download blob directly
      const a = document.createElement("a");
      a.href = resultUrl;
      a.download = `bellix_cleaned.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setOriginalUrl(null);
    setResultUrl(null);
    setFile(null);
    setMarks([]);
    setPhase("upload");
    setProgress(0);
    setStage("");
    setErrorMsg("");
    setJobId(null);
  };

  return (
    <div className="relative min-h-screen bg-[#f3f4ee] text-[#10241e] py-12 sm:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden font-sans">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-br from-[#E11D48]/15 via-rose-950/10 to-transparent blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#10241e]/15 text-xs sm:text-sm font-bold text-[#10241e] mb-3 px-4 py-1.5 shadow-sm">
            <Sparkles className="size-3.5" />
            <span>AI Watermark & Logo Remover</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold text-[#10241e] tracking-tight">
            Image Cleaner
          </h1>
          <p className="mt-4 text-base sm:text-xl text-[#37433d] font-normal max-w-2xl mx-auto leading-relaxed">
            Paint over watermarks, logos, or timestamps. Our AI inpaints the background seamlessly — no signup, no API key.
          </p>

          {/* Backend status badge */}
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-[#10241e]/15 bg-white text-[#10241e] shadow-xs px-4 py-1.5">
            {backendOk === null ? (
              <><Loader2 className="size-3 animate-spin text-gray-400" /><span className="text-gray-400">Checking server…</span></>
            ) : backendOk ? (
              <><CheckCircle2 className="size-3 text-green-400" /><span className="text-green-400">Server ready</span></>
            ) : (
              <><ServerCrash className="size-3 text-orange-400" /><span className="text-orange-400">Server offline — start Flask backend</span></>
            )}
          </div>
        </div>

        {/* ── UPLOAD STATE ── */}
        {phase === "upload" && (
          <div className="max-w-3xl mx-auto">
            <UploadZone
              accept="image/*"
              type="image"
              hint="PNG, JPG, or WEBP — up to 20 MB"
              onFile={(f, objUrl) => {
                setFile(f);
                setOriginalUrl(objUrl);
                setMarks([]);
                setPhase("paint");
              }}
              onAutoDetect={() => {
                const demoUrl =
                  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80";
                setOriginalUrl(demoUrl);
                setFile(new File([], "sample_ai_portrait.png", { type: "image/png" }));
                setPhase("paint");
                setTimeout(autoDetect, 300);
              }}
            />
          </div>
        )}

        {/* ── PAINT / PROCESSING / DONE / ERROR STATES ── */}
        {phase !== "upload" && (
          <div className="space-y-8">
            {/* Action Bar */}
            {(phase === "paint" || phase === "error") && (
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#10241e]/15 shadow-xl rounded-3xl p-4 sm:p-5">
                {/* Left: tools */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setTool("brush")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      tool === "brush"
                        ? "bg-[#10241e] text-[#d0f471] font-bold shadow-md"
                        : "bg-[#f3f4ee] text-[#10241e] font-semibold hover:bg-[#e9ece4] border border-[#10241e]/15"
                    }`}
                  >
                    <Brush className="size-3.5" />
                    <span>Brush</span>
                  </button>

                  <button
                    onClick={() => setTool("eraser")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      tool === "eraser"
                        ? "bg-[#10241e] text-[#d0f471] font-bold shadow-md"
                        : "bg-[#f3f4ee] text-[#10241e] font-semibold hover:bg-[#e9ece4] border border-[#10241e]/15"
                    }`}
                  >
                    <Eraser className="size-3.5" />
                    <span>Eraser</span>
                  </button>

                  <button
                    onClick={autoDetect}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#d0f471] text-[#091712] font-bold hover:bg-[#dbff83] border border-[#10241e]/20 transition-all"
                  >
                    <Wand2 className="size-3.5" />
                    <span>Auto Detect</span>
                  </button>

                  <button
                    onClick={() => setMarks([])}
                    disabled={marks.length === 0}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-[#637069] hover:text-red-600 font-semibold disabled:opacity-40 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Clear</span>
                  </button>
                </div>

                {/* Middle: Brush size */}
                <div className="flex items-center gap-3 min-w-[180px]">
                  <span className="text-xs font-semibold text-[#10241e] font-bold whitespace-nowrap">
                    Size: {brush}px
                  </span>
                  <Slider
                    value={[brush]}
                    min={12}
                    max={120}
                    step={2}
                    onValueChange={([v]) => v && setBrush(v)}
                    className="w-28 accent-[#E11D48]"
                  />
                </div>

                {/* Right: Reset + Process */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={reset}
                    className="flex items-center gap-1 text-xs font-semibold text-[#637069] hover:text-[#10241e] font-semibold"
                  >
                    <RefreshCw className="size-3.5" />
                    <span>Change Image</span>
                  </button>

                  <PinkButton
                    size="md"
                    onClick={startProcessing}
                    disabled={!backendOk}
                    className="shadow-sm"
                  >
                    <Zap className="size-4" />
                    <span>Remove Watermark</span>
                  </PinkButton>
                </div>
              </div>
            )}

            {/* ── PROCESSING ── */}
            {phase === "processing" && (
              <div className="py-10">
                <PinkScanLoader progress={progress} stage={stage} />
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={cancelProcessing}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ── ERROR ── */}
            {phase === "error" && (
              <div className="rounded-2xl p-5 bg-red-50 border border-red-200 flex items-start gap-3">
                <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-700">Processing failed</p>
                  <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
                  {errorMsg.toLowerCase().includes("fetch") && (
                    <p className="text-xs text-gray-500 mt-2">
                      💡 Make sure Flask backend is running: <code className="bg-gray-100 px-1 rounded">cd watermark-backend &amp;&amp; python app.py</code>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── DONE — Before/After + Download ── */}
            {phase === "done" && resultUrl && originalUrl && (
              <div className="space-y-6">
                <div className="rounded-3xl p-6 bg-white border border-[#10241e]/15 shadow-2xl">
                  <BeforeAfterSlider
                    src={originalUrl}
                    resultSrc={resultUrl}
                    labelBefore="Original"
                    labelAfter="Cleaned"
                    badge="Watermark Removed"
                  />
                </div>

                {/* Download + Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-green-400" />
                    <span className="text-sm font-semibold text-zinc-200">
                      Watermark removed • Full resolution preserved
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <PinkButton variant="primary" size="md" onClick={downloadResult}>
                      <Download className="size-4" />
                      <span>Download PNG</span>
                    </PinkButton>

                    <PinkButton
                      variant="soft"
                      size="md"
                      onClick={() => {
                        setPhase("paint");
                        setMarks([]);
                        setResultUrl(null);
                        setJobId(null);
                      }}
                    >
                      <Undo2 className="size-4" />
                      <span>Edit Again</span>
                    </PinkButton>

                    <PinkButton variant="outline" size="md" onClick={reset}>
                      <RefreshCw className="size-4" />
                      <span>New Image</span>
                    </PinkButton>
                  </div>
                </div>
              </div>
            )}

            {/* ── CANVAS PAINTING AREA ── */}
            {(phase === "paint" || phase === "error") && originalUrl && (
              <div className="relative rounded-3xl overflow-hidden border border-[#10241e]/15 bg-[#f3f4ee] shadow-md rounded-3xl">
                <div
                  className="relative w-full cursor-crosshair select-none touch-none overflow-hidden"
                  style={{ minHeight: "320px", maxHeight: "70vh" }}
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
                  onPointerLeave={() => {
                    painting.current = false;
                  }}
                >
                  <img
                    src={originalUrl}
                    alt="Source to clean"
                    className="w-full h-full object-contain pointer-events-none"
                    draggable={false}
                    style={{ maxHeight: "70vh", display: "block" }}
                  />

                  {/* Painted marks overlay */}
                  <svg className="absolute inset-0 size-full pointer-events-none">
                    {marks.map((m, i) => (
                      <circle
                        key={i}
                        cx={`${m.x}%`}
                        cy={`${m.y}%`}
                        r={m.size / 2}
                        fill={m.erase ? "transparent" : "rgba(225, 29, 72, 0.40)"}
                        stroke={m.erase ? "rgba(255,255,255,0.8)" : "rgba(255,46,99,0.75)"}
                        strokeWidth={m.erase ? 3 : 1.5}
                      />
                    ))}
                  </svg>

                  {marks.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="px-4 py-2.5 rounded-2xl bg-zinc-900/95 text-zinc-200 text-sm font-semibold border border-zinc-700 backdrop-blur-md shadow-sm">
                        🖌️ Drag to paint over watermark — or click <strong>Auto Detect</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trust section */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {[
            { icon: ShieldCheck, title: "Processed on your server", desc: "Images never leave your machine. All AI runs on the local Flask backend." },
            { icon: Sparkles, title: "No watermark added", desc: "We never stamp our own brand on your output. Clean image stays clean." },
            { icon: Zap, title: "Full resolution output", desc: "Original pixel dimensions preserved. Download as lossless PNG." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-3 p-4 rounded-2xl bg-white border border-[#10241e]/15 shadow-md p-6 rounded-3xl">
              <Icon className="size-5 text-[#E11D48] shrink-0 mt-0.5" />
              <div>
                <p className="text-base font-bold text-[#10241e]">{title}</p>
                <p className="text-sm text-[#37433d] mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
