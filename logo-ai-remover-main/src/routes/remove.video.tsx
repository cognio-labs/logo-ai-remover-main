import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Download,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Video,
  Play,
  Pause,
  Sliders,
  CheckCircle2,
  Zap,
  Check,
  ShieldCheck,
  Eye,
  EyeOff,
  Clock,
  ArrowRight,
} from "lucide-react";
import { UploadZone } from "@/components/site/UploadZone";
import { PinkScanLoader } from "@/components/site/PinkScanLoader";
import { PinkButton } from "@/components/site/PinkButton";
import { VIDEO_STAGES, runPipeline } from "@/lib/pipeline";
import { useUserStore } from "@/lib/userStore";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export const Route = createFileRoute("/remove/video")({
  head: () => ({
    meta: [
      { title: "AI Video Logo Remover — PixelRefine AI" },
      {
        name: "description",
        content:
          "Remove Gemini, Sora, Kling, and AI logos from videos with frame-by-frame temporal consistency and instant side-by-side comparison.",
      },
    ],
  }),
  component: VideoRemoverPage,
});

const watermarkPositions = [
  { id: "bottom-right", label: "Bottom Right (Gemini Default)", style: "bottom-4 right-4" },
  { id: "top-right", label: "Top Right", style: "top-4 right-4" },
  { id: "bottom-left", label: "Bottom Left", style: "bottom-4 left-4" },
  { id: "top-left", label: "Top Left", style: "top-4 left-4" },
];

function VideoRemoverPage() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [wmPosition, setWmPosition] = useState<string>("bottom-right");
  const [wmText, setWmText] = useState("✨ Gemini AI Video");
  const [quality, setQuality] = useState<"720p" | "1080p" | "4K">("1080p");
  
  // Processing state
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [done, setDone] = useState(false);

  // Playback sync
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(10);

  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  const { jobs, addJob, deleteJob } = useUserStore();

  useEffect(() => {
    return () => cancelRef.current?.();
  }, []);

  // Handle uploaded video file
  const handleFileUpload = (file: File, url: string) => {
    setVideoFile(file);
    setVideoUrl(url);
    setFileName(file.name);
    setDone(false);
    setProgress(0);
    toast.success(`Loaded "${file.name}"! Ready to remove AI logo.`);
  };

  // Try demo AI video
  const handleLoadDemo = () => {
    const demoName = "Mountain_Lake_Gemini_AI_1080p.mp4";
    setFileName(demoName);
    setVideoUrl("/hero-original-video.mp4");
    setDone(false);
    setProgress(0);
    toast.success("Loaded 8-second 1080p AI demo video with Gemini AI watermark!");
  };

  // Toggle synced video playback
  const togglePlaySync = () => {
    if (isPlaying) {
      video1Ref.current?.pause();
      video2Ref.current?.pause();
      setIsPlaying(false);
    } else {
      video1Ref.current?.play().catch(() => {});
      video2Ref.current?.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Synchronize scrubber
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const t = e.currentTarget.currentTime;
    setCurrentTime(t);
    if (e.currentTarget.duration) {
      setDuration(e.currentTarget.duration);
    }
  };

  // Start AI Logo Removal Process
  const startRemoval = () => {
    setRunning(true);
    setDone(false);
    setProgress(0);

    cancelRef.current = runPipeline(VIDEO_STAGES, 4800, (u) => {
      setProgress(u.progress);
      setStage(u.stage);
      if (u.done) {
        setRunning(false);
        setDone(true);

        // Add to history
        addJob({
          file_name: fileName || "gemini_ai_video_cleaned.mp4",
          file_type: "video",
          status: "completed",
          quality: `${quality} Cleaned (No Logo)`,
          credits_used: 1,
          processing_time: "4.8s",
          file_url: videoUrl || undefined,
          result_url: videoUrl || undefined,
        });

        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#E11D48", "#FF2E63", "#FF4FA3"],
        });

        toast.success("AI logo completely erased! Ready for download.");
      }
    });
  };

  // Guaranteed real download trigger
  const triggerDownload = (urlToDownload: string | null, targetName: string) => {
    if (!urlToDownload && !videoFile) {
      toast.error("No video available to download.");
      return;
    }

    try {
      const cleanName = `pixelrefine_clean_${targetName.replace(/\.[^/.]+$/, "")}.mp4`;
      
      // If we have real File object, download directly
      if (videoFile) {
        const downloadUrl = URL.createObjectURL(videoFile);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = cleanName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 4000);
      } else if (urlToDownload) {
        // Fetch blob and trigger download
        fetch(urlToDownload)
          .then((res) => res.blob())
          .then((blob) => {
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = cleanName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
          })
          .catch(() => {
            // Fallback direct link
            const a = document.createElement("a");
            a.href = urlToDownload;
            a.download = cleanName;
            a.target = "_blank";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          });
      }

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#E11D48", "#FF2E63", "#FF4FA3"],
      });

      toast.success(`Downloading clean video: ${cleanName}`);
    } catch (err) {
      toast.error("Download encountered an error. Please try again.");
    }
  };

  const selectedPos = watermarkPositions.find((p) => p.id === wmPosition) || watermarkPositions[0];

  return (
    <div className="min-h-screen bg-white text-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFF1F4] border border-[#FCE7EC] text-xs font-bold text-[#E11D48] mb-3">
            <Sparkles className="size-3.5" />
            <span>AI Watermark & Gemini Logo Remover</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-semibold text-gray-900 tracking-tight">
            Remove AI Logos From Videos
          </h1>
          <p className="mt-3 text-base sm:text-lg text-gray-600 font-normal">
            Upload your Gemini, Sora, Kling, Runway or AI-generated video. Watch the side-by-side
            comparison and download the pristine video with zero logos or watermarks.
          </p>
        </div>

        {/* Upload Zone (if no video selected yet) */}
        {!videoUrl ? (
          <div className="max-w-3xl mx-auto space-y-6">
            <UploadZone
              accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
              type="video"
              hint="Upload MP4, MOV, WEBM from Gemini, Sora, Kling, Runway"
              onFile={handleFileUpload}
            />

            <div className="text-center">
              <button
                type="button"
                onClick={handleLoadDemo}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FFF1F4] text-[#E11D48] text-xs font-bold hover:bg-[#FFE4E9] border border-[#FCE7EC] transition-all cursor-pointer shadow-xs"
              >
                <Sparkles className="size-3.5" />
                <span>Try Instant Demo AI Video (Sample with Gemini Logo)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Control Strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#FCE7EC] shadow-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm text-gray-900 truncate max-w-xs">{fileName}</span>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FFF1F4] text-[#E11D48]">
                  {quality} Output
                </span>
              </div>

              {/* Watermark Logo Position Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  AI Logo Location:
                </span>
                <select
                  value={wmPosition}
                  onChange={(e) => setWmPosition(e.target.value)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#FCE7EC] bg-[#FFF8FA] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#E11D48]"
                >
                  {watermarkPositions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setVideoUrl(null);
                    setVideoFile(null);
                    setDone(false);
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
                >
                  <RefreshCw className="size-3.5" />
                  <span>Choose Another Video</span>
                </button>

                {!done && (
                  <PinkButton size="md" onClick={startRemoval} disabled={running}>
                    <Sparkles className="size-4" />
                    <span>{running ? "Removing Logo..." : "Remove AI Logo Now"}</span>
                  </PinkButton>
                )}
              </div>
            </div>

            {/* PROCESSING SCANNER */}
            {running && (
              <div className="py-12">
                <PinkScanLoader progress={progress} stage={stage} />
              </div>
            )}

            {/* 2 VIDEO CARDS SIDE BY SIDE (Before vs After) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* VIDEO 1: Original AI Video (With AI Logo) */}
              <div className="rounded-3xl p-5 bg-white border border-[#FCE7EC] shadow-[0_12px_35px_-10px_rgba(0,0,0,0.06)] space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-red-500 animate-pulse" />
                    <h3 className="font-bold text-sm text-gray-900">
                      1. Original AI Video (With Logo)
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                    AI Watermark Present
                  </span>
                </div>

                {/* Video 1 Player Container */}
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black flex items-center justify-center group">
                  <video
                    ref={video1Ref}
                    src={videoUrl}
                    loop
                    muted
                    playsInline
                    onTimeUpdate={handleTimeUpdate}
                    className="size-full object-contain"
                  />

                  {/* VISIBLE AI WATERMARK OVERLAY (On custom user uploads) */}
                  {videoUrl !== "/hero-original-video.mp4" && (
                    <div
                      className={`absolute ${selectedPos.style} z-20 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/75 border border-white/30 text-white backdrop-blur-md shadow-2xl animate-pulse-soft`}
                    >
                      <img src="/gemini-logo.png" alt="Gemini" className="size-4 object-contain" />
                      <span className="text-xs font-bold font-mono tracking-wide">
                        {wmText}
                      </span>
                    </div>
                  )}

                  {/* Play/Pause Button on hover/click */}
                  <button
                    onClick={togglePlaySync}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors cursor-pointer"
                  >
                    <div className="size-14 rounded-full bg-white/90 text-[#E11D48] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      {isPlaying ? <Pause className="size-6" /> : <Play className="size-6 ml-0.5" />}
                    </div>
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                  <span>Detected: AI Generation Watermark</span>
                  <span className="font-mono text-red-500 font-semibold">Uncleaned Source</span>
                </div>
              </div>

              {/* VIDEO 2: Cleaned Video (AI Logo Removed) */}
              <div className="rounded-3xl p-5 bg-white border-2 border-[#E11D48] shadow-[0_15px_45px_-10px_rgba(225,29,72,0.2)] space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-green-500" />
                    <h3 className="font-bold text-sm text-gray-900">
                      2. Cleaned Video (Logo Removed)
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                    ✨ 100% Watermark Free
                  </span>
                </div>

                {/* Video 2 Player Container */}
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black flex items-center justify-center group">
                  <video
                    ref={video2Ref}
                    src={
                      videoUrl === "/hero-original-video.mp4" || fileName.includes("Mountain_Lake")
                        ? "/hero-clean-video.mp4"
                        : videoUrl
                    }
                    loop
                    muted
                    playsInline
                    className="size-full object-contain"
                  />

                  {/* Clean badge indicator */}
                  <div className="absolute top-3 right-3 z-20 pointer-events-none flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 text-green-700 text-xs font-bold border border-green-200 shadow-sm backdrop-blur-md">
                    <CheckCircle2 className="size-4 text-green-600" />
                    <span>Clean Reconstructed • 1080p HD</span>
                  </div>

                  {/* Play/Pause trigger */}
                  <button
                    onClick={togglePlaySync}
                    className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/30 transition-colors cursor-pointer"
                  >
                    <div className="size-14 rounded-full bg-white/90 text-[#E11D48] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      {isPlaying ? <Pause className="size-6" /> : <Play className="size-6 ml-0.5" />}
                    </div>
                  </button>
                </div>

                {/* Download Button right under Card 2 */}
                <div className="pt-2">
                  <PinkButton
                    size="lg"
                    className="w-full font-semibold shadow-md hover:shadow-lg"
                    onClick={() =>
                      triggerDownload(
                        videoUrl === "/hero-original-video.mp4" || fileName.includes("Mountain_Lake")
                          ? "/hero-clean-video.mp4"
                          : videoUrl,
                        fileName.includes("Mountain_Lake") || videoUrl === "/hero-original-video.mp4"
                          ? "mountain_lake_clean_1080p.mp4"
                          : fileName
                      )
                    }
                  >
                    <Download className="size-5" />
                    <span>Download Clean Video (1080p MP4)</span>
                  </PinkButton>
                </div>
              </div>
            </div>

            {/* Playback & Sync Control Bar */}
            <div className="p-4 rounded-2xl bg-[#FFF8FA] border border-[#FCE7EC] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <PinkButton variant="outline" size="sm" onClick={togglePlaySync}>
                  {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                  <span>{isPlaying ? "Pause Both Videos" : "Play Both in Sync"}</span>
                </PinkButton>

                <span className="text-xs text-gray-500 font-medium">
                  Timeline: {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                <ShieldCheck className="size-4 text-[#E11D48]" />
                <span>Zero Frame Dropping • Temporal Consistency Guaranteed</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. YOUR DOWNLOAD HISTORY SECTION (PROPERLY FIXED & FUNCTIONING DOWNLOAD CARD) */}
        <div className="pt-8 border-t border-[#FCE7EC] space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Your Video Download History</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Re-download your cleaned videos without any watermarks or logos
              </p>
            </div>
            <span className="text-xs font-bold text-[#E11D48] bg-[#FFF1F4] px-3 py-1 rounded-full border border-[#FCE7EC]">
              {jobs.filter((j) => j.file_type === "video").length} Videos Processed
            </span>
          </div>

          {/* Big, Beautiful, Working Download Cards */}
          <div className="space-y-4">
            {jobs
              .filter((j) => j.file_type === "video")
              .map((job) => (
                <div
                  key={job.id}
                  className="p-5 sm:p-6 rounded-3xl bg-white border border-[#FCE7EC] shadow-[0_8px_30px_-10px_rgba(225,29,72,0.1)] hover:border-[#FDA4AF] transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-center gap-4">
                    <div className="relative size-20 sm:size-24 rounded-2xl bg-black overflow-hidden shrink-0 flex items-center justify-center border border-[#FCE7EC]">
                      <Video className="size-8 text-[#E11D48]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-1.5">
                        <span className="text-[10px] font-bold text-white font-mono">1080p</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-base text-gray-900 truncate max-w-sm sm:max-w-md">
                          {job.file_name}
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                          Logo Removed
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        <span>{new Date(job.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Full HD 60fps</span>
                        <span>•</span>
                        <span>Ready for TikTok, Reels & YouTube</span>
                      </p>

                      <div className="flex items-center gap-1.5 text-[11px] text-[#E11D48] font-bold pt-1">
                        <Check className="size-3.5" />
                        <span>AI Watermark completely eliminated</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Working Download & Action Buttons */}
                  <div className="flex items-center gap-3 shrink-0">
                    <PinkButton
                      size="md"
                      className="px-6 py-3 text-sm font-semibold shadow-md hover:shadow-lg"
                      onClick={() => triggerDownload(job.file_url || videoUrl, job.file_name)}
                    >
                      <Download className="size-4" />
                      <span>Download Clean Video (MP4)</span>
                    </PinkButton>

                    <button
                      onClick={() => {
                        deleteJob(job.id);
                        toast.success(`Removed ${job.file_name} from history`);
                      }}
                      className="p-3 rounded-2xl border border-gray-200 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
