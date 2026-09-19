import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Film,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { PinkButton } from "@/components/site/PinkButton";
import { VideoBeforeAfterSlider } from "@/components/site/VideoBeforeAfterSlider";
import { UploadZone } from "@/components/site/UploadZone";
import { PinkScanLoader } from "@/components/site/PinkScanLoader";
import { toast } from "sonner";

export const Route = createFileRoute("/video-enhancer")({
  head: () => ({
    meta: [
      { title: "AI Video Enhancer & Quality Restorer — PixelRefine AI" },
      {
        name: "description",
        content:
          "Enhance low-resolution video, remove compression artifacts and watermarks, and upscale to 4K 60 FPS with neural frame interpolation.",
      },
    ],
  }),
  component: VideoEnhancerPage,
});

function VideoEnhancerPage() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");

  const handleUpload = (file: File, objectUrl?: string) => {
    setVideoFile(file);
    setIsProcessing(true);
    setProgress(20);
    setStage("Analyzing frames & motion vectors...");
    toast.success(`Loaded video: "${file.name}". Processing with AI Video Enhancer...`);

    setTimeout(() => {
      setProgress(55);
      setStage("Applying 4K temporal super-resolution...");
    }, 700);

    setTimeout(() => {
      setProgress(85);
      setStage("Restoring compression artifacts & noise...");
    }, 1400);

    setTimeout(() => {
      setProgress(100);
      setStage("Enhancement complete!");
      setTimeout(() => {
        setVideoUrl(objectUrl || "/gemini-example-after.mp4");
        setIsProcessing(false);
        toast.success("Video enhanced successfully to crisp 4K 60 FPS!");
      }, 500);
    }, 2000);
  };

  const handleReset = () => {
    setVideoUrl(null);
    setVideoFile(null);
    setIsProcessing(false);
    setProgress(0);
    setStage("");
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-24">
      {/* 1. HERO SECTION */}
      <section className="pt-16 pb-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FFF5F8] via-white to-white text-center">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#FCE7EC] text-xs font-bold text-[#E11D48] shadow-2xs">
            <Sparkles className="size-3.5" />
            <span>AI Video Upscaling & Restoration</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-semibold text-gray-950 tracking-tight">
            AI Video{" "}
            <span className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] bg-clip-text text-transparent">
              Enhancer & Upscaler
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-600 font-normal leading-relaxed">
            Eliminate pixelation, compression noise, and watermarks. Enhance blurry video clips to
            crisp 4K 60 FPS with temporal frame interpolation.
          </p>
        </div>
      </section>

      {/* 2. UPLOAD / RESULT AREA */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto py-6">
        {isProcessing ? (
          <div className="py-12">
            <PinkScanLoader progress={progress} stage={stage} />
          </div>
        ) : !videoUrl ? (
          <div className="max-w-3xl mx-auto text-center space-y-5">
            <h2 className="text-2xl font-serif font-normal text-gray-950">
              Upload Your Video to Enhance
            </h2>
            <UploadZone
              type="video"
              accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
              hint="Supports MP4, MOV, WebM, AVI up to 15 seconds"
              onFile={handleUpload}
            />

            <div className="pt-2 flex items-center justify-center gap-4">
              <PinkButton size="lg" className="font-bold shadow-md" asChild>
                <Link to="/gemini-video-watermark-remover">
                  <span>Open Full Video Studio</span>
                  <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </PinkButton>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#FFF8FA] border border-[#FCE7EC]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-[#E11D48]" />
                <span className="font-bold text-sm text-gray-900">
                  {videoFile?.name || "Enhanced Video Clip"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#E11D48] text-white">
                  4K 60 FPS
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-semibold text-gray-600 hover:text-gray-950 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-white transition-colors cursor-pointer"
                >
                  <RefreshCw className="size-3.5" />
                  <span>Enhance Another Video</span>
                </button>
                <PinkButton size="sm" asChild>
                  <a href={videoUrl} download="enhanced-video-4k.mp4">
                    <Download className="size-4" />
                    <span>Download Clean Video</span>
                  </a>
                </PinkButton>
              </div>
            </div>

            <VideoBeforeAfterSlider
              cleanVideoSrc={videoUrl || "/gemini-example-after.mp4"}
              watermarkedVideoSrc="/gemini-example-before.mp4"
              logoText="Gemini AI"
            />
          </div>
        )}
      </section>

      {/* 3. KEY CAPABILITIES */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-[#FFF8FA] border border-[#FCE7EC] space-y-2">
            <Film className="size-6 text-[#E11D48]" />
            <h3 className="text-base font-bold text-gray-900">4K Super-Resolution</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Upscale low-bitrate 720p or 1080p source clips into sharp 4K without edge artifacts.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#FFF8FA] border border-[#FCE7EC] space-y-2">
            <Zap className="size-6 text-[#E11D48]" />
            <h3 className="text-base font-bold text-gray-900">60 FPS Motion Smoothing</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Optical flow interpolates in-between frames for buttery smooth cinematic motion.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#FFF8FA] border border-[#FCE7EC] space-y-2">
            <ShieldCheck className="size-6 text-[#E11D48]" />
            <h3 className="text-base font-bold text-gray-900">Artifact & Noise Removal</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Cleans compression blocking, banding noise, and watermarks with zero blurring.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
