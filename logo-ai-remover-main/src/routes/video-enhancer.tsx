import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  Film,
  Layers,
  Maximize2,
  RefreshCw,
  Settings2,
  Sliders,
  Sparkles,
  Volume2,
  XCircle,
  Zap,
} from "lucide-react";
import { PinkButton } from "@/components/site/PinkButton";
import { UploadZone } from "@/components/site/UploadZone";
import { VideoTrustBadges } from "@/components/site/VideoTrustBadges";
import { VideoEnhancerComparisonSlider } from "@/components/site/VideoEnhancerComparisonSlider";
import {
  cancelJob,
  deleteJob,
  getDownloadResultUrl,
  getEnhancedVideoUrl,
  getOriginalVideoUrl,
  inspectVideoSettings,
  startVideoEnhancement,
  subscribeJobEvents,
  uploadVideo,
  VideoEnhancerJobRecord,
  VideoStreamMetadata,
} from "@/lib/videoEnhancerApi";
import { toast } from "sonner";

export const Route = createFileRoute("/video-enhancer")({
  head: () => ({
    meta: [
      { title: "AI Video Enhancer & Quality Restorer — Bellix.us" },
      {
        name: "description",
        content:
          "Real AI video super-resolution, compression artifact deblocking, luminance sharpening, and optical-flow frame interpolation to 4K 60 FPS.",
      },
    ],
  }),
  component: VideoEnhancerPage,
});

type Step = "idle" | "uploading" | "configuring" | "processing" | "completed" | "failed";

function VideoEnhancerPage() {
  const [step, setStep] = useState<Step>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);
  const [inputMetadata, setInputMetadata] = useState<VideoStreamMetadata | null>(null);
  const [outputMetadata, setOutputMetadata] = useState<VideoStreamMetadata | null>(null);

  // Settings
  const [scale, setScale] = useState<number>(2);
  const [targetResolution, setTargetResolution] = useState<string>("4k");
  const [enhancement, setEnhancement] = useState<string>("balanced");
  const [denoise, setDenoise] = useState<string>("low");
  const [deblock, setDeblock] = useState<boolean>(true);
  const [sharpen, setSharpen] = useState<string>("low");
  const [interpolation, setInterpolation] = useState<boolean>(false);
  const [targetFps, setTargetFps] = useState<number>(60);
  const [codec, setCodec] = useState<string>("h264");
  const [quality, setQuality] = useState<string>("high");
  const [preserveAudio, setPreserveAudio] = useState<boolean>(true);

  // Processing state
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [stage, setStage] = useState<string>("Preparing");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [totalFrames, setTotalFrames] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resolution Safety
  const [isResolutionSafe, setIsResolutionSafe] = useState<boolean>(true);
  const [resolutionWarning, setResolutionWarning] = useState<string | null>(null);
  const [targetDimensions, setTargetDimensions] = useState<string>("");

  // Inspect settings whenever scale or resolution changes
  useEffect(() => {
    if (!jobId || !inputMetadata) return;

    let isMounted = true;
    inspectVideoSettings(jobId, scale, targetResolution)
      .then((res) => {
        if (!isMounted) return;
        setIsResolutionSafe(res.safe);
        setResolutionWarning(res.warning);
        setTargetDimensions(res.target_resolution);
      })
      .catch(() => {
        // Fallback calculation
        const tw = inputMetadata.width * scale;
        const th = inputMetadata.height * scale;
        const safe = tw <= 4096 && th <= 2304;
        if (!isMounted) return;
        setIsResolutionSafe(safe);
        setTargetDimensions(`${tw}x${th}`);
        setResolutionWarning(
          safe
            ? null
            : `Resolution ${tw}x${th} exceeds the maximum supported 4K limit (4096x2304). Please choose a lower scale.`
        );
      });

    return () => {
      isMounted = false;
    };
  }, [jobId, inputMetadata, scale, targetResolution]);

  // Handle Video Upload
  const handleUpload = async (file: File) => {
    setOriginalFile(file);
    setStep("uploading");
    setUploadPercent(0);
    setErrorMessage(null);

    try {
      toast.info(`Uploading ${file.name}...`);
      const res = await uploadVideo(file, undefined, (pct) => {
        setUploadPercent(pct);
      });

      setJobId(res.job_id);
      setInputMetadata(res.metadata);
      setPreviewThumbnail(res.preview_url);
      setStep("configuring");
      toast.success("Video inspected and ready for enhancement!");
    } catch (err: any) {
      console.error("Upload failed", err);
      setErrorMessage(err.message || "Failed to upload and inspect video.");
      setStep("failed");
      toast.error(err.message || "Failed to upload video");
    }
  };

  // Start Processing
  const handleStartProcessing = async () => {
    if (!jobId || !inputMetadata) return;
    if (!isResolutionSafe) {
      toast.error(resolutionWarning || "Target resolution exceeds hardware limit.");
      return;
    }

    setStep("processing");
    setProgress(5);
    setStage("Starting AI Pipeline");
    setStatusMessage("Submitting job to video enhancer worker...");

    try {
      await startVideoEnhancement({
        job_id: jobId,
        scale,
        target_resolution: targetResolution,
        enhancement,
        denoise,
        deblock,
        sharpen,
        interpolation,
        target_fps: interpolation ? targetFps : null,
        output_format: "mp4",
        codec,
        quality,
        preserve_audio: preserveAudio,
      });

      // Subscribe to real-time SSE progress
      const unsubscribe = subscribeJobEvents(
        jobId,
        (data) => {
          if (data.progress !== undefined) setProgress(data.progress);
          if (data.stage) setStage(data.stage);
          if (data.message) setStatusMessage(data.message);
          if (data.current_frame !== undefined) setCurrentFrame(data.current_frame);
          if (data.total_frames !== undefined) setTotalFrames(data.total_frames);

          if (data.status === "COMPLETED") {
            if (data.output_metadata) {
              setOutputMetadata(data.output_metadata as VideoStreamMetadata);
            }
            setStep("completed");
            toast.success("Video successfully enhanced!");
          } else if (data.status === "FAILED") {
            setErrorMessage(data.error || data.message || "Enhancement failed");
            setStep("failed");
            toast.error(data.error || "Enhancement failed");
          } else if (data.status === "CANCELLED") {
            toast.info("Enhancement was cancelled.");
            setStep("configuring");
          }
        },
        () => {
          // SSE Error handling
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error("Failed to start processing", err);
      setErrorMessage(err.message || "Failed to start enhancement.");
      setStep("failed");
      toast.error(err.message || "Failed to start enhancement");
    }
  };

  // Cancel Job
  const handleCancel = async () => {
    if (!jobId) return;
    try {
      await cancelJob(jobId);
      toast.info("Cancelling job...");
    } catch (err: any) {
      toast.error("Failed to cancel job");
    }
  };

  // Reset Workflow
  const handleReset = () => {
    if (jobId) {
      deleteJob(jobId).catch(() => {});
    }
    setStep("idle");
    setJobId(null);
    setOriginalFile(null);
    setInputMetadata(null);
    setOutputMetadata(null);
    setProgress(0);
    setUploadPercent(0);
    setCurrentFrame(0);
    setTotalFrames(0);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-24">
      {/* 1. HERO SECTION */}
      <section className="pt-16 pb-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FFF5F8] via-white to-white text-center">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#FCE7EC] text-xs font-bold text-[#E11D48] shadow-2xs">
            <Sparkles className="size-3.5" />
            <span>Real AI Video Super-Resolution & Restoration</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-semibold text-gray-950 tracking-tight">
            AI Video{" "}
            <span className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] bg-clip-text text-transparent">
              Enhancer & Upscaler
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-600 font-normal leading-relaxed">
            Eliminate blur, pixelation, and compression blocking. Upscale up to 4K UHD with
            progressive texture reconstruction and optical-flow motion interpolation.
          </p>
        </div>
      </section>

      {/* 2. MAIN WORKFLOW AREA */}
      <main className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto py-6">
        {/* STEP: IDLE (Upload Zone) */}
        {step === "idle" && (
          <div className="max-w-3xl mx-auto text-center space-y-5">
            <h2 className="text-2xl font-serif font-normal text-gray-950">
              Upload Video to Enhance
            </h2>
            <UploadZone
              type="video"
              accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
              hint="Supports MP4, MOV, WebM, AVI up to 500 MB"
              onFile={handleUpload}
            />

            <div className="pt-2 flex items-center justify-center gap-4">
              <PinkButton size="lg" className="font-bold shadow-md" asChild>
                <Link to="/gemini-video-watermark-remover">
                  <span>Open Watermark Remover</span>
                  <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </PinkButton>
            </div>

            <VideoTrustBadges />
          </div>
        )}

        {/* STEP: UPLOADING */}
        {step === "uploading" && (
          <div className="max-w-xl mx-auto py-16 text-center space-y-6">
            <div className="size-16 mx-auto rounded-2xl bg-[#FFF1F4] border border-[#FCE7EC] flex items-center justify-center text-[#E11D48] animate-pulse">
              <Film className="size-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900">
                Uploading & Inspecting Video...
              </h3>
              <p className="text-sm text-gray-500">
                Verifying container format, extracting streams, and generating previews.
              </p>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#E11D48] to-[#FF4FA3] h-full transition-all duration-200"
                style={{ width: `${uploadPercent}%` }}
              />
            </div>
            <p className="text-xs font-semibold text-gray-500">{uploadPercent}% uploaded</p>
          </div>
        )}

        {/* STEP: CONFIGURING (Video Probed & Settings Selected) */}
        {step === "configuring" && inputMetadata && (
          <div className="space-y-8 animate-in fade-in-50 duration-300">
            {/* Source Video Summary Card */}
            <div className="p-6 rounded-3xl bg-[#FFF8FA] border border-[#FCE7EC] shadow-sm flex flex-col md:flex-row items-center gap-6">
              {previewThumbnail ? (
                <img
                  src={previewThumbnail}
                  alt="Thumbnail"
                  className="w-48 aspect-video object-cover rounded-2xl border border-gray-200 shadow-sm"
                />
              ) : (
                <div className="w-48 aspect-video rounded-2xl bg-gray-200 flex items-center justify-center text-gray-400">
                  <Film className="size-8" />
                </div>
              )}

              <div className="flex-1 space-y-2 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <h3 className="text-lg font-bold text-gray-950">
                    {originalFile?.name || "Uploaded Video"}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E11D48] text-white">
                    {inputMetadata.width} × {inputMetadata.height}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                    {inputMetadata.fps} FPS
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-xs text-gray-600">
                  <span>Duration: <strong>{inputMetadata.duration}s</strong></span>
                  <span>Frames: <strong>{inputMetadata.frame_count}</strong></span>
                  <span>Codec: <strong>{inputMetadata.video_codec?.toUpperCase()}</strong></span>
                  <span>
                    Audio:{" "}
                    <strong>
                      {inputMetadata.audio_present ? `${inputMetadata.audio_codec?.toUpperCase()}` : "None"}
                    </strong>
                  </span>
                  <span>
                    Size:{" "}
                    <strong>{(inputMetadata.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</strong>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 hover:bg-white transition-colors cursor-pointer"
              >
                <RefreshCw className="size-3.5" />
                <span>Replace Video</span>
              </button>
            </div>

            {/* Config Panels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Panel 1: Super Resolution & Scale */}
              <div className="p-6 rounded-3xl bg-white border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
                  <Maximize2 className="size-5 text-[#E11D48]" />
                  <span>Upscaling & Resolution</span>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-600 block">
                    Scale Factor
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 1, label: "1x", desc: "Restore Only" },
                      { val: 2, label: "2x", desc: "Recommended" },
                      { val: 4, label: "4x", desc: "Ultra HD" },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setScale(opt.val)}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                          scale === opt.val
                            ? "border-[#E11D48] bg-[#FFF5F8] text-[#E11D48] shadow-xs"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <div className="text-sm font-bold">{opt.label}</div>
                        <div className="text-[11px] text-gray-500">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-xs font-semibold text-gray-600 block">
                    Enhancement Profile
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "fast", label: "Fast", desc: "Quick render" },
                      { id: "balanced", label: "Balanced", desc: "Lanczos-4" },
                      { id: "high", label: "High Fidelity", desc: "Max texture" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setEnhancement(m.id)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          enhancement === m.id
                            ? "border-[#E11D48] bg-[#FFF5F8] text-[#E11D48] font-bold"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-xs"
                        }`}
                      >
                        <div className="text-xs">{m.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel 2: Deblock, Denoise & Sharpen */}
              <div className="p-6 rounded-3xl bg-white border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
                  <Sliders className="size-5 text-[#E11D48]" />
                  <span>Restoration & Clarity</span>
                </div>

                {/* Deblock Switch */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <div>
                    <div className="text-sm font-bold text-gray-900">Deblock Filter</div>
                    <div className="text-xs text-gray-500">
                      Eliminate 8x8 compression DCT grid noise
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={deblock}
                    onChange={(e) => setDeblock(e.target.checked)}
                    className="size-5 accent-[#E11D48] cursor-pointer"
                  />
                </div>

                {/* Denoise Level */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-gray-600">
                    <span>Noise Reduction (Bilateral)</span>
                    <span className="capitalize font-bold text-[#E11D48]">{denoise}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {["off", "low", "medium", "high"].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDenoise(d)}
                        className={`py-1.5 text-xs rounded-lg border capitalize transition-all cursor-pointer ${
                          denoise === d
                            ? "border-[#E11D48] bg-[#FFF5F8] text-[#E11D48] font-bold"
                            : "border-gray-200 hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sharpen Level */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-gray-600">
                    <span>Luminance Sharpening</span>
                    <span className="capitalize font-bold text-[#E11D48]">{sharpen}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {["off", "low", "medium", "high"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSharpen(s)}
                        className={`py-1.5 text-xs rounded-lg border capitalize transition-all cursor-pointer ${
                          sharpen === s
                            ? "border-[#E11D48] bg-[#FFF5F8] text-[#E11D48] font-bold"
                            : "border-gray-200 hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel 3: Motion Smoothing & Frame Interpolation */}
              <div className="p-6 rounded-3xl bg-white border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
                  <Zap className="size-5 text-[#E11D48]" />
                  <span>Motion Smoothing & FPS</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <div>
                    <div className="text-sm font-bold text-gray-900">
                      Optical-Flow Frame Synthesis
                    </div>
                    <div className="text-xs text-gray-500">
                      Generate real in-between frames via dense motion vectors
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={interpolation}
                    onChange={(e) => setInterpolation(e.target.checked)}
                    className="size-5 accent-[#E11D48] cursor-pointer"
                  />
                </div>

                {interpolation && (
                  <div className="space-y-2 animate-in fade-in-50">
                    <label className="text-xs font-semibold text-gray-600 block">
                      Target Frame Rate
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[30, 60, 120].map((fpsVal) => (
                        <button
                          key={fpsVal}
                          type="button"
                          onClick={() => setTargetFps(fpsVal)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            targetFps === fpsVal
                              ? "border-[#E11D48] bg-[#FFF5F8] text-[#E11D48] font-bold"
                              : "border-gray-200 hover:bg-gray-50 text-gray-700 text-xs"
                          }`}
                        >
                          <div className="text-sm">{fpsVal} FPS</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Panel 4: Encoding & Audio */}
              <div className="p-6 rounded-3xl bg-white border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
                  <Settings2 className="size-5 text-[#E11D48]" />
                  <span>Export & Audio Mastering</span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-600 block">Video Codec</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "h264", label: "H.264", sub: "Universal" },
                      { id: "h265", label: "H.265", sub: "HEVC" },
                      { id: "vp9", label: "VP9", sub: "WebM" },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCodec(c.id)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          codec === c.id
                            ? "border-[#E11D48] bg-[#FFF5F8] text-[#E11D48] font-bold"
                            : "border-gray-200 hover:bg-gray-50 text-gray-700 text-xs"
                        }`}
                      >
                        <div>{c.label}</div>
                        <div className="text-[10px] text-gray-500">{c.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <Volume2 className="size-4 text-gray-600" />
                    <div>
                      <div className="text-sm font-bold text-gray-900">Preserve Audio Track</div>
                      <div className="text-xs text-gray-500">
                        {inputMetadata.audio_present
                          ? "Stream copy AAC with sync compensation"
                          : "Source has no audio track"}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preserveAudio && inputMetadata.audio_present}
                    disabled={!inputMetadata.audio_present}
                    onChange={(e) => setPreserveAudio(e.target.checked)}
                    className="size-5 accent-[#E11D48] cursor-pointer disabled:opacity-40"
                  />
                </div>
              </div>
            </div>

            {/* Target Resolution & Limit Warning */}
            <div className="p-4 rounded-2xl bg-[#FFF8FA] border border-[#FCE7EC] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-white border border-[#FCE7EC] flex items-center justify-center text-[#E11D48]">
                  <Layers className="size-5" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-medium">Output Specification</div>
                  <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span>{inputMetadata.width} × {inputMetadata.height}</span>
                    <span className="text-[#E11D48]">→</span>
                    <span className="text-[#E11D48]">{targetDimensions || `${inputMetadata.width * scale}x${inputMetadata.height * scale}`}</span>
                    <span>@ {interpolation ? targetFps : inputMetadata.fps} FPS</span>
                  </div>
                </div>
              </div>

              {!isResolutionSafe && (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                  <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                  <span>{resolutionWarning}</span>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-center gap-4 pt-2">
              <PinkButton
                size="lg"
                disabled={!isResolutionSafe}
                onClick={handleStartProcessing}
                className="font-bold px-8 shadow-md"
              >
                <Sparkles className="size-4 mr-2" />
                <span>Enhance Video ({targetDimensions})</span>
              </PinkButton>
            </div>
          </div>
        )}

        {/* STEP: PROCESSING (Live SSE Connection & Frame Progress) */}
        {step === "processing" && (
          <div className="max-w-2xl mx-auto py-12 space-y-6 text-center">
            <div className="size-20 mx-auto rounded-3xl bg-gradient-to-tr from-[#FFF1F4] to-[#FFE4EB] border border-[#FCE7EC] flex items-center justify-center text-[#E11D48] shadow-sm animate-pulse">
              <Sparkles className="size-10" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#E11D48] text-white">
                {stage}
              </span>
              <h3 className="text-2xl font-bold text-gray-950">{statusMessage}</h3>
              {totalFrames > 0 && stage === "AI Processing" && (
                <p className="text-sm text-gray-500">
                  Frame {currentFrame} of {totalFrames}
                </p>
              )}
            </div>

            {/* Real Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-gray-200">
                <div
                  className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-semibold text-gray-500 px-1">
                <span>{progress.toFixed(1)}% Completed</span>
                <span>Target: {targetDimensions}</span>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="text-xs font-semibold text-gray-500 hover:text-red-600 px-4 py-2 rounded-xl border border-gray-200 hover:border-red-200 transition-colors cursor-pointer"
              >
                Cancel Enhancement
              </button>
            </div>
          </div>
        )}

        {/* STEP: COMPLETED (Synchronized Before/After Comparison Player) */}
        {step === "completed" && jobId && inputMetadata && (
          <div className="space-y-8 animate-in fade-in-50 duration-300">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#FFF8FA] border border-[#FCE7EC]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-green-600" />
                <span className="font-bold text-sm text-gray-900">
                  {originalFile?.name || "Enhanced Video Clip"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E11D48] text-white">
                  {outputMetadata ? `${outputMetadata.width} × ${outputMetadata.height}` : targetDimensions}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                  {outputMetadata ? `${outputMetadata.fps} FPS` : `${inputMetadata.fps} FPS`}
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
                  <a href={getDownloadResultUrl(jobId)} download>
                    <Download className="size-3.5 mr-1" />
                    <span>Download Clean Video</span>
                  </a>
                </PinkButton>
              </div>
            </div>

            {/* Synchronized Before/After Slider */}
            <VideoEnhancerComparisonSlider
              originalSrc={getOriginalVideoUrl(jobId)}
              enhancedSrc={getEnhancedVideoUrl(jobId)}
              originalLabel={`Original (${inputMetadata.width}x${inputMetadata.height} @ ${inputMetadata.fps} FPS)`}
              enhancedLabel={`Enhanced (${outputMetadata?.width || targetDimensions} @ ${outputMetadata?.fps || inputMetadata.fps} FPS)`}
              downloadFilename={`enhanced-${originalFile?.name || "video.mp4"}`}
            />

            {/* Technical Verification Details */}
            {outputMetadata && (
              <div className="p-6 rounded-3xl bg-white border border-gray-200 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 font-medium">Output Resolution</div>
                  <div className="text-base font-bold text-gray-900">
                    {outputMetadata.width} × {outputMetadata.height}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 font-medium">Verified Frame Rate</div>
                  <div className="text-base font-bold text-gray-900">
                    {outputMetadata.fps} FPS
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 font-medium">Total Frames</div>
                  <div className="text-base font-bold text-gray-900">
                    {outputMetadata.frame_count}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 font-medium">Output Size</div>
                  <div className="text-base font-bold text-gray-900">
                    {(outputMetadata.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP: FAILED */}
        {step === "failed" && (
          <div className="max-w-xl mx-auto py-12 text-center space-y-4">
            <div className="size-16 mx-auto rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <XCircle className="size-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Enhancement Failed</h3>
            <p className="text-sm text-red-600">{errorMessage || "An unexpected error occurred during processing."}</p>
            <div className="pt-2">
              <PinkButton onClick={handleReset}>Try Again</PinkButton>
            </div>
          </div>
        )}
      </main>

      {/* 3. VIDEO DEMO SHOWCASE — Real proof section */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto pt-20 pb-16">
        <div className="text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF1F4] border border-[#FCE7EC] text-xs text-[#E11D48]">
            <Sparkles className="size-3.5" />
            <span>Real Enhancement Results</span>
          </div>
          <h2 className="text-3xl sm:text-5xl text-gray-950 tracking-tight">
            See what 4K AI enhancement looks like
          </h2>
          <p className="text-sm sm:text-base text-gray-500 max-w-2xl mx-auto leading-relaxed">
            The same video frame — original compressed quality on the left, AI-enhanced 4K UHD on the right. Every
            detail is reconstructed with optical-flow precision.
          </p>
        </div>

        {/* Demo Image - Before/After */}
        <div className="relative rounded-3xl overflow-hidden border-2 border-[#FCE7EC] shadow-[0_30px_80px_-20px_rgba(225,29,72,0.20)] mb-12">
          <img
            src="/video-enhancer-demo.jpg"
            alt="AI video enhancement before and after comparison"
            className="w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
            <span className="px-4 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white text-xs border border-white/20">
              Original 480p SD
            </span>
            <span className="size-2 rounded-full bg-white/60" />
            <span className="px-4 py-1.5 rounded-full bg-[#E11D48]/90 backdrop-blur-md text-white text-xs border border-white/20">
              4K UHD Enhanced
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-16">
          {[
            { value: "4K UHD", label: "Max Output Resolution", icon: Maximize2 },
            { value: "60 FPS", label: "Optical Flow Interpolation", icon: Zap },
            { value: "< 90s", label: "Processing Time / Minute", icon: RefreshCw },
            { value: "100%", label: "Original Audio Preserved", icon: Volume2 },
          ].map(s => (
            <div key={s.label} className="text-center p-6 rounded-2xl bg-white border border-gray-100 shadow-xs hover:border-[#FCE7EC] hover:shadow-md transition-all duration-200">
              <div className="size-10 mx-auto mb-3 rounded-xl bg-[#FFF1F4] text-[#E11D48] flex items-center justify-center">
                <s.icon className="size-5" />
              </div>
              <div className="text-2xl text-gray-950 tracking-tight mb-1">{s.value}</div>
              <div className="text-xs text-gray-500 leading-relaxed">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Feature cards */}
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-2xl sm:text-3xl text-gray-950 tracking-tight">
            Production AI Video Pipeline
          </h2>
          <p className="text-sm text-gray-500 max-w-xl mx-auto">
            Industrial-grade video reconstruction powered by OpenCV and FFmpeg.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: Maximize2,
              title: "Sub-Pixel Super-Resolution",
              desc: "Progressive Lanczos-4 upscaling up to 4K UHD with micro-texture sharpening and luminance flicker stabilization.",
              accent: "bg-violet-50 text-violet-600",
              iconBg: "bg-violet-100",
            },
            {
              icon: Zap,
              title: "Optical-Flow Frame Synthesis",
              desc: "Synthesizes real motion vectors using dense inverse search optical flow to interpolate 30 to 60 or 120 FPS smoothly.",
              accent: "bg-amber-50 text-amber-600",
              iconBg: "bg-amber-100",
            },
            {
              icon: Sliders,
              title: "DCT Deblock & Denoise",
              desc: "Removes compression macroblocking artifacts and sensor grain while keeping high-contrast genuine edges crisp.",
              accent: "bg-teal-50 text-teal-600",
              iconBg: "bg-teal-100",
            },
            {
              icon: Settings2,
              title: "Granular Enhancement Controls",
              desc: "Fine-tune denoising, sharpen strength, codec (H.264/H.265), output quality and audio preservation per job.",
              accent: "bg-sky-50 text-sky-600",
              iconBg: "bg-sky-100",
            },
            {
              icon: Volume2,
              title: "Audio-Preserving Pipeline",
              desc: "Original AAC/MP3 audio stream is muxed into the output without re-encoding, keeping 100% audio fidelity.",
              accent: "bg-rose-50 text-rose-600",
              iconBg: "bg-rose-100",
            },
            {
              icon: CheckCircle2,
              title: "Real-Time Progress Tracking",
              desc: "Live frame counter, stage labels, and progress bar via SSE stream — no polling, no surprises during rendering.",
              accent: "bg-green-50 text-green-600",
              iconBg: "bg-green-100",
            },
          ].map(f => (
            <div key={f.title} className={`p-6 rounded-2xl ${f.accent} border border-gray-100 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 space-y-3`}>
              <div className={`size-10 rounded-xl ${f.iconBg} flex items-center justify-center`}>
                <f.icon className="size-5" />
              </div>
              <h4 className="text-gray-900 tracking-tight">{f.title}</h4>
              <p className="text-xs text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
