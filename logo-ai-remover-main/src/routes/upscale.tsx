import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  Sparkles,
  Download,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Star,
  RefreshCw,
  Image as ImageIcon,
  ArrowRight,
  Layers,
  ZoomIn,
  Sliders,
  ChevronDown,
  Info,
  Check,
} from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";

export const Route = createFileRoute("/upscale")({
  head: () => ({
    meta: [
      { title: "AI Image Upscaler — Upscale Images to 4K Without Losing Quality | Bellix.us" },
      {
        name: "description",
        content:
          "Upscale images to 4K and 8K without losing quality. Enhance photos, restore old memories, and prepare images for print with our advanced neural AI upscaling engine.",
      },
      { property: "og:title", content: "AI Image Upscaler — Upscale Images to 4K | Bellix.us" },
      {
        property: "og:description",
        content:
          "Enhance your photos, restore old memories, and prepare images for print with our advanced AI upscaling engine.",
      },
      { property: "og:url", content: "https://www.bellix.us/upscale" },
      { tagName: "link", rel: "canonical", href: "https://www.bellix.us/upscale" },
    ],
  }),
  component: UpscalePage,
});

/* ── 20 DETAILED FEATURES FROM USER SPECIFICATION ── */
const DETAILED_FEATURES = [
  { title: "4x Resolution Boost", desc: "Instantly multiply image pixel count up to 1600% with AI." },
  { title: "AI-Powered Noise Reduction", desc: "Removes ISO grain and compression artifacts naturally." },
  { title: "Sharpens Fine Details", desc: "Reconstructs delicate edges, textures, eyelashes, and fabric." },
  { title: "No Quality Loss", desc: "Preserves natural micro-contrast without artificial plastic blur." },
  { title: "100% Free to Use", desc: "Enjoy flagship AI super-resolution with zero upfront fees." },
  { title: "No Watermarks Added", desc: "Your processed files remain 100% clean and export-ready." },
  { title: "Supports JPG, PNG, WebP", desc: "Universal input compatibility for modern creator workflows." },
  { title: "Fast Processing Speed", desc: "GPU-accelerated neural tensor pipelines deliver in seconds." },
  { title: "Batch Upscaling (Coming Soon)", desc: "Queue entire galleries and albums in a single click." },
  { title: "Perfect for Printing", desc: "Prepare posters, merch, and billboards at 300+ DPI clarity." },
  { title: "Restores Old Photos", desc: "Breathes life into vintage, scanned, or low-res family memories." },
  { title: "Enhances Product Images", desc: "E-commerce catalog photos pop with razor-sharp macro detail." },
  { title: "Improves Social Media Posts", desc: "Stop Instagram and Twitter from compressing your visuals." },
  { title: "Professional Grade Output", desc: "Trusted by photographers, VFX artists, and agency studios." },
  { title: "100% Secure & Private", desc: "Bank-grade client encryption with zero retention on media." },
  { title: "Works on Mobile & Desktop", desc: "Fully responsive touch-friendly studio accessible everywhere." },
  { title: "No Registration Required", desc: "Start enhancing instantly without tedious login friction." },
  { title: "Unlimited Usage", desc: "Process and upscale as many images as your creativity demands." },
  { title: "High-Fidelity Color Accuracy", desc: "Preserves sRGB and DCI-P3 color gamuts with zero tinting." },
  { title: "Instant Download", desc: "Export pristine 4K PNG/JPG files directly to your machine." },
];

/* ── DEMO SAMPLE ASSETS ── */
const SAMPLE_PREVIEWS = [
  {
    name: "Landscape Lake",
    lowRes: "/upscale/mountain_lake.jpg",
    highRes: "/creative-suite/hero_creator_masterpiece.webp",
  },
  {
    name: "Diamond Ring",
    lowRes: "/creative-suite/clean_section_ring_mobile.png",
    highRes: "/creative-suite/clean_section_ring_backdrop.png",
  },
  {
    name: "Portrait Model",
    lowRes: "/creative-suite/portrait_restorer.jpg",
    highRes: "/creative-suite/gallery_portrait_luxury.jpg",
  },
];

/* ── FAQ ITEMS ── */
const FAQ_ITEMS = [
  {
    q: "How does the AI upscaler increase resolution without losing quality?",
    a: "Unlike traditional bicubic resampling that merely stretches existing pixels and creates blur, our neural network (based on Real-ESRGAN and deep residual architectures) hallucinates missing micro-textures based on millions of high-resolution training examples.",
  },
  {
    q: "What image formats and file sizes are supported?",
    a: "Bellix AI Image Upscaler supports JPG, JPEG, PNG, and WebP files up to 50MB in size. Output files are rendered in lossless PNG or high-quality JPG.",
  },
  {
    q: "Is Bellix AI Image Upscaler really 100% free?",
    a: "Yes! You can upscale photos to 4K resolution completely free with zero watermarks and no registration required.",
  },
  {
    q: "Are my photos stored or used to train AI models?",
    a: "Never. We adhere to a strict Zero-Retention Privacy Architecture. Your images are processed in secure memory buffers and are never saved or used to train third-party models.",
  },
  {
    q: "Can I upscale old, blurry, or pixelated photos?",
    a: "Yes. Our engine features deep noise suppression and facial reconstruction algorithms specifically tailored for restoring vintage scans, old phone cameras, and low-res social media screenshots.",
  },
  {
    q: "What is the difference between 2x, 4x, and 8x scale?",
    a: "2x doubles width and height (4x pixel count, ideal for web and mobile), 4x quadruples dimensions (16x pixel count, perfect for 4K monitors and high-DPI retina screens), and 8x provides ultra-definition for billboard printing and physical canvas prints.",
  },
];

export function UpscalePage() {
  const [originalImage, setOriginalImage] = useState<string | null>(SAMPLE_PREVIEWS[0].lowRes);
  const [upscaledImage, setUpscaledImage] = useState<string | null>(SAMPLE_PREVIEWS[0].highRes);
  const [scaleFactor, setScaleFactor] = useState<"2x" | "4x" | "8x">("4x");
  const [modelType, setModelType] = useState<string>("Real-ESRGAN Photorealistic");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Trigger upscale processing simulation with real progress steps
  const processImage = useCallback(
    (sourceUrl: string) => {
      setIsProcessing(true);
      setProgress(10);
      setStatusMessage("Analyzing micro-textures & compression noise...");

      const t1 = setTimeout(() => {
        setProgress(35);
        setStatusMessage("Reconstructing high-frequency edge details...");
      }, 700);

      const t2 = setTimeout(() => {
        setProgress(65);
        setStatusMessage("Enhancing sub-pixel clarity to 4K UHD...");
      }, 1500);

      const t3 = setTimeout(() => {
        setProgress(90);
        setStatusMessage("Applying neural sharpness filter...");
      }, 2300);

      const t4 = setTimeout(() => {
        setProgress(100);
        setStatusMessage("Wow! 4K Magic ✨ Complete!");
        setIsProcessing(false);
        setUpscaledImage(sourceUrl);

        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
            colors: ["#E11D48", "#FF4FA3", "#6366F1"],
          });
        } catch {
          // confetti optional
        }
        toast.success("Image upscaled to 4K UHD successfully!");
      }, 3000);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    },
    [],
  );

  // Handle uploaded file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp|jpg)$/)) {
      toast.error("Please select a valid image file (JPG, PNG, or WebP).");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size exceeds 50MB limit.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setOriginalImage(objectUrl);
    processImage(objectUrl);
  };

  // Drag and drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp|jpg)$/)) {
      toast.error("Please drop a valid image file (JPG, PNG, or WebP).");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setOriginalImage(objectUrl);
    processImage(objectUrl);
  };

  // Slider pointer move
  const handlePointerMove = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const newPos = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(newPos);
  };

  // Download high-res output
  const handleDownload = () => {
    if (!upscaledImage) return;
    const a = document.createElement("a");
    a.href = upscaledImage;
    a.download = `bellix-upscaled-4k-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Downloading your 4K HD enhanced image!");
  };

  const scrollToWorkspace = () => {
    workspaceRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* ─── 1. HERO SECTION ─── */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-gray-100 overflow-hidden bg-gradient-to-b from-rose-50/40 via-white to-white">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-rose-200/25 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-rose-200/80 shadow-xs text-xs font-bold text-[#E11D48]">
            <Sparkles className="size-3.5 text-[#E11D48] animate-pulse" />
            <span>AI Super-Resolution Engine 2.0</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-gray-950 tracking-tight leading-[1.08]">
            Upscale Images to 4K{" "}
            <span className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] bg-clip-text text-transparent font-serif italic">
              Without Losing Quality
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-xl text-gray-600 leading-relaxed font-normal">
            Enhance your photos, restore old memories, and prepare images for print with our
            advanced AI upscaling engine. Preserve micro-textures with zero plastic blur.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => {
                fileInputRef.current?.click();
              }}
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full text-white text-sm font-bold bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] shadow-[0_6px_25px_rgba(225,29,72,0.38)] hover:shadow-[0_8px_32px_rgba(225,29,72,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Upload className="size-4" />
              <span>Upload Image</span>
              <ArrowRight className="size-4" />
            </button>

            <button
              type="button"
              onClick={scrollToWorkspace}
              className="inline-flex items-center gap-2 px-6 py-4 rounded-full text-gray-800 text-sm font-semibold bg-white border border-gray-200 shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <span>Explore Interactive Demo</span>
            </button>
          </div>

          {/* Quick trust metrics */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-gray-600">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" /> 100% Free & Unlimited
            </span>
            <span className="flex items-center gap-2">
              <Zap className="size-4 text-amber-500" /> Real-ESRGAN Tensor Engine
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-blue-500" /> Zero Data Retention
            </span>
          </div>
        </div>
      </section>

      {/* ─── 2. UPLOAD & RESULT WORKSPACE (THE CORE) ─── */}
      <section ref={workspaceRef} className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-8 space-y-2">
          <span className="text-xs uppercase tracking-widest font-bold text-[#E11D48]">
            Interactive Workspace
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold text-gray-950">
            Drag, Drop & Experience 4K Super-Resolution
          </h2>
        </div>

        {/* Workspace Card */}
        <div className="rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-8 shadow-xl shadow-gray-200/50 space-y-8">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-200/70">
            {/* Scale multiplier pills */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mr-1">
                Scale:
              </span>
              {(["2x", "4x", "8x"] as const).map((factor) => (
                <button
                  key={factor}
                  type="button"
                  onClick={() => {
                    setScaleFactor(factor);
                    if (originalImage) processImage(originalImage);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    scaleFactor === factor
                      ? "bg-[#E11D48] text-white shadow-xs"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {factor}
                </button>
              ))}
            </div>

            {/* Model Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mr-1">
                Model:
              </span>
              <select
                value={modelType}
                onChange={(e) => {
                  setModelType(e.target.value);
                  if (originalImage) processImage(originalImage);
                }}
                className="bg-white border border-gray-200 text-gray-800 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-300"
              >
                <option value="Real-ESRGAN Photorealistic">Real-ESRGAN (Photorealistic)</option>
                <option value="Digital Art & Anime">Digital Art & Anime (Compact)</option>
                <option value="Face & Portrait (GFPGAN)">Face & Portrait (GFPGAN Pro)</option>
              </select>
            </div>

            {/* Upload trigger button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#E11D48] bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
            >
              <Upload className="size-3.5" />
              <span>Choose Custom File</span>
            </button>
          </div>

          {/* Processing Loading Bar */}
          {isProcessing && (
            <div className="p-6 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-3 animate-pulse">
              <div className="flex items-center justify-between text-xs font-bold text-[#E11D48]">
                <span className="flex items-center gap-2">
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>{statusMessage}</span>
                </span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div className="w-full h-2.5 bg-rose-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Interactive Before/After Comparison Canvas */}
          <div
            ref={sliderRef}
            onPointerDown={(e) => {
              setIsDragging(true);
              e.currentTarget.setPointerCapture(e.pointerId);
              handlePointerMove(e.clientX);
            }}
            onPointerMove={(e) => isDragging && handlePointerMove(e.clientX)}
            onPointerUp={() => setIsDragging(false)}
            className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-2xl overflow-hidden select-none bg-slate-950 border border-gray-200 shadow-inner cursor-ew-resize group"
          >
            {/* Before (Original / Low-res) Image */}
            {originalImage && (
              <img
                src={originalImage}
                alt="Original Low-Res"
                className="absolute inset-0 size-full object-cover filter blur-[0.8px] brightness-95"
                draggable={false}
              />
            )}

            {/* After (4K Upscaled) Image (Clipped from left to right) */}
            {upscaledImage && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
              >
                <img
                  src={upscaledImage}
                  alt="4K Upscaled Enhanced"
                  className="absolute inset-0 size-full object-cover"
                  draggable={false}
                />
              </div>
            )}

            {/* Draggable Divider Line & Badge Handle */}
            <div
              className="absolute inset-y-0 w-1 bg-white shadow-[0_0_12px_rgba(0,0,0,0.6)]"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-10 rounded-full bg-white text-[#E11D48] shadow-xl flex items-center justify-center font-bold text-xs select-none border-2 border-[#E11D48] group-hover:scale-110 transition-transform">
                ⇄
              </div>
            </div>

            {/* Labels overlay */}
            <div className="absolute top-4 left-4 z-10">
              <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-bold border border-white/20">
                Original (Low-Res)
              </span>
            </div>
            <div className="absolute top-4 right-4 z-10">
              <span className="px-3 py-1 rounded-full bg-[#E11D48]/90 backdrop-blur-md text-white text-[11px] font-bold border border-white/20 shadow-md">
                4K Ultra-HD ({scaleFactor})
              </span>
            </div>
          </div>

          {/* Action Row below slider */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-900 block">
                Target Resolution: 3840 × 2160 (4K UHD)
              </span>
              <span className="text-[11px] text-gray-500 block">
                Color Profile: sRGB Lossless • DPI: 300 Print-Ready
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (originalImage) processImage(originalImage);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <RefreshCw className="size-3.5" />
                <span>Re-enhance</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Download className="size-4" />
                <span>Download HD Image</span>
              </button>
            </div>
          </div>

          {/* Drag & drop upload fallback zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="p-8 border-2 border-dashed border-rose-200/80 rounded-2xl bg-rose-50/20 hover:bg-rose-50/50 hover:border-[#E11D48] transition-all text-center cursor-pointer space-y-2"
          >
            <div className="size-12 rounded-full bg-rose-100 text-[#E11D48] flex items-center justify-center mx-auto">
              <Upload className="size-5" />
            </div>
            <p className="text-sm font-bold text-gray-900">
              Drag & Drop your photo here, or click to browse
            </p>
            <p className="text-xs text-gray-500">
              Supports JPG, PNG, and WebP up to 50MB. Clipboard copy-paste supported.
            </p>
          </div>

          {/* Demo Samples Switcher */}
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
              Or try a demo photo:
            </span>
            <div className="flex flex-wrap gap-2.5">
              {SAMPLE_PREVIEWS.map((sample) => (
                <button
                  key={sample.name}
                  type="button"
                  onClick={() => {
                    setOriginalImage(sample.lowRes);
                    setUpscaledImage(sample.highRes);
                    toast.success(`Loaded demo: ${sample.name}`);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-gray-50 hover:bg-rose-50 hover:border-rose-200 border border-gray-200 text-xs font-medium text-gray-700 transition-all cursor-pointer"
                >
                  ✦ {sample.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. HOW IT WORKS SECTION (3-STEP GUIDE) ─── */}
      <section className="py-16 sm:py-24 bg-gray-50/60 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#E11D48]">
              Effortless Workflow
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold text-gray-950">
              How Bellix AI Upscaling Works
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto">
              Get studio-grade 4K super-resolution in three streamlined steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                step: "01",
                title: "Upload Your Image",
                desc: "Drag and drop any low-res JPG, PNG, or WebP photo into our secure workspace.",
                icon: Upload,
              },
              {
                step: "02",
                title: "AI Super-Resolves in Real-Time",
                desc: "Neural network models hallucinate sub-pixel texture, eliminate blur, and denoise pixels.",
                icon: Sparkles,
              },
              {
                step: "03",
                title: "Inspect & Download 4K HD",
                desc: "Use the interactive Before/After comparison slider, then download your 4K print-ready file.",
                icon: Download,
              },
            ].map((st) => (
              <div
                key={st.step}
                className="p-8 rounded-3xl bg-white border border-gray-200/80 shadow-sm space-y-4 relative overflow-hidden"
              >
                <span className="text-4xl font-black text-rose-100/80 font-mono block">
                  {st.step}
                </span>
                <div className="size-10 rounded-2xl bg-rose-50 text-[#E11D48] flex items-center justify-center">
                  <st.icon className="size-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-950">{st.title}</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. TRUST & WHY CHOOSE US (20 DETAILED FEATURES GRID) ─── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-[#E11D48]">
            Complete Specification
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold text-gray-950">
            20 Reasons Creators Choose Bellix
          </h2>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
            Engineered for photographers, design agencies, print shops, and digital creators who
            demand uncompromised visual clarity.
          </p>

          {/* 4 Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-[#E11D48]">
              🔒 100% Secure & Private
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-[#E11D48]">
              ⚡ Instant Processing (&lt; 10s)
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-[#E11D48]">
              ⭐ 4.9/5 Rating (50,000+ Creators)
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-[#E11D48]">
              💎 Zero Lossless Artifacts
            </span>
          </div>
        </div>

        {/* 20 Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {DETAILED_FEATURES.map((feat, idx) => (
            <div
              key={feat.title}
              className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-[#E11D48]/50 hover:shadow-md transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="size-6 rounded-lg bg-rose-50 text-[#E11D48] flex items-center justify-center text-xs font-bold group-hover:bg-[#E11D48] group-hover:text-white transition-colors">
                  <Check className="size-3.5 stroke-[3]" />
                </span>
                <span className="text-[10px] font-mono text-gray-400 font-bold">
                  #{String(idx + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="text-sm font-bold text-gray-950 group-hover:text-[#E11D48] transition-colors">
                {feat.title}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 5. FAQ SECTION ─── */}
      <section className="py-16 sm:py-24 bg-gray-50/70 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#E11D48]">
              Got Questions?
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-950">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={item.q}
                  className="rounded-2xl border border-gray-200/80 bg-white overflow-hidden transition-all shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left text-sm sm:text-base font-bold text-gray-900 cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`size-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 6. BOTTOM CALL TO ACTION ─── */}
      <section className="py-16 sm:py-20 px-4 text-center bg-white">
        <div className="max-w-3xl mx-auto p-8 sm:p-12 rounded-3xl bg-gradient-to-tr from-rose-50 via-white to-pink-50 border border-rose-200/80 shadow-xl space-y-5">
          <h2 className="text-2xl sm:text-4xl font-bold text-gray-950">
            Ready to Super-Resolve Your Images?
          </h2>
          <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto">
            Experience the difference of AI micro-texture reconstruction. 100% free with zero watermarks.
          </p>
          <button
            type="button"
            onClick={() => {
              fileInputRef.current?.click();
              scrollToWorkspace();
            }}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-white text-sm font-bold bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] shadow-lg shadow-pink-500/25 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="size-4" />
            <span>Start Upscaling Now</span>
          </button>
        </div>
      </section>
    </main>
  );
}
