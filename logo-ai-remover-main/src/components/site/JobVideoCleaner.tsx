import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { PinkButton } from "@/components/site/PinkButton";
import {
  apiUrl,
  getVideoResult,
  getVideoStatus,
  processVideo,
  uploadVideo,
  type JobStatus,
  type VideoMetadata,
} from "@/lib/videoJobs";

type OriginalVideo = {
  jobId: string;
  url: string;
  fileName: string;
  metadata?: VideoMetadata;
};

type ProcessingJob = Pick<JobStatus, "jobId" | "status" | "progress" | "stage" | "message">;

type CleanedVideo = {
  jobId: string;
  url: string;
  fileName: string;
};

const ACCEPT = ".mp4,.mov,.webm,.avi,.mpg,.mpeg,.mkv";
const STORAGE_KEY = "bellix-active-video-job";
const ACTIVE_STATUSES = new Set([
  "queued",
  "analyzing",
  "detecting",
  "tracking",
  "processing",
  "encoding",
  "verifying",
]);

const cleanName = (name: string) => `cleaned-${name.replace(/\.[^/.]+$/u, "")}.mp4`;

export function JobVideoCleaner() {
  const [originalVideo, setOriginalVideo] = useState<OriginalVideo | null>(null);
  const [processingJob, setProcessingJob] = useState<ProcessingJob | null>(null);
  const [cleanedVideo, setCleanedVideo] = useState<CleanedVideo | null>(null);
  const [cleaningStarted, setCleaningStarted] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeJobRef = useRef<string | null>(null);
  const localUrlRef = useRef<string | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const processingVideoRef = useRef<HTMLVideoElement>(null);
  const cleanedVideoRef = useRef<HTMLVideoElement>(null);
  const lastPlaybackTimeRef = useRef<number>(0);

  const assertCurrentJob = useCallback((jobId: string) => {
    if (activeJobRef.current !== jobId) {
      throw new Error("A stale response was rejected because it belongs to another video job.");
    }
  }, []);

  const applyCompletedResult = useCallback(
    async (jobId: string, fileName: string) => {
      try {
        const result = await getVideoResult(jobId);
        assertCurrentJob(result.jobId);
        setCleanedVideo({
          jobId: result.jobId,
          fileName: cleanName(fileName),
          url: apiUrl(
            `${result.cleanedVideoUrl}?job=${encodeURIComponent(jobId)}&v=${result.resultVersion}`,
          ),
        });
        setProcessingJob({
          jobId,
          status: "completed",
          progress: 100,
          stage: "Complete",
          message: "Clean MP4 is ready",
        });
      } catch (problem) {
        setError(problem instanceof Error ? problem.message : String(problem));
      }
    },
    [assertCurrentJob],
  );

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const stored = JSON.parse(saved) as {
        jobId: string;
        fileName: string;
        metadata?: VideoMetadata;
      };
      activeJobRef.current = stored.jobId;
      setOriginalVideo({
        ...stored,
        url: apiUrl(`/api/video/original/${stored.jobId}?job=${stored.jobId}`),
      });
      void getVideoStatus(stored.jobId)
        .then(async (status) => {
          assertCurrentJob(status.jobId);
          setProcessingJob(status);
          if (status.status === "completed") {
            setCleaningStarted(true);
            await applyCompletedResult(stored.jobId, stored.fileName);
          } else if (ACTIVE_STATUSES.has(status.status)) {
            setCleaningStarted(true);
          }
        })
        .catch(() => localStorage.removeItem(STORAGE_KEY));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [applyCompletedResult, assertCurrentJob]);

  useEffect(() => {
    const jobId = processingJob?.jobId;
    const isJobActive = processingJob ? ACTIVE_STATUSES.has(processingJob.status) : false;
    if (!jobId || !isJobActive) return;

    let isSubscribed = true;
    let isPollingTick = false;

    const timer = window.setInterval(async () => {
      if (isPollingTick || !isSubscribed) return;
      isPollingTick = true;
      try {
        const status = await getVideoStatus(jobId);
        if (!isSubscribed) return;
        assertCurrentJob(status.jobId);
        setProcessingJob(status);
        if (status.status === "completed") {
          window.clearInterval(timer);
          await applyCompletedResult(status.jobId, originalVideo?.fileName || "video.mp4");
          if (isSubscribed) {
            toast.success("AI frame cleaning completed. Clean MP4 is ready.");
          }
        } else if (status.status === "failed") {
          window.clearInterval(timer);
          if (isSubscribed) {
            setCleanedVideo(null);
            setError(status.error || "Video processing failed. Please try again.");
          }
        }
      } catch (problem) {
        if (isSubscribed) {
          setError(problem instanceof Error ? problem.message : String(problem));
        }
      } finally {
        isPollingTick = false;
      }
    }, 1000);

    return () => {
      isSubscribed = false;
      window.clearInterval(timer);
    };
  }, [
    applyCompletedResult,
    assertCurrentJob,
    originalVideo?.fileName,
    processingJob?.jobId,
    Boolean(processingJob && ACTIVE_STATUSES.has(processingJob.status)),
  ]);

  useEffect(
    () => () => {
      uploadAbortRef.current?.abort();
      if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
    },
    [],
  );

  const selectFile = async (file: File) => {
    if (!/\.(mp4|mov|webm|avi|mpg|mpeg|mkv)$/iu.test(file.name)) {
      toast.error("Use MP4, MOV, WebM, AVI, MPG, MPEG, or MKV.");
      return;
    }
    uploadAbortRef.current?.abort();
    if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    const jobId = crypto.randomUUID();
    const localUrl = URL.createObjectURL(file);
    localUrlRef.current = localUrl;
    activeJobRef.current = jobId;
    lastPlaybackTimeRef.current = 0;
    setCleaningStarted(false);
    setOriginalVideo({ jobId, url: localUrl, fileName: file.name });
    setCleanedVideo(null);
    setError("");
    setProcessingJob({
      jobId,
      status: "uploading",
      progress: 0,
      stage: "Uploading exact file",
      message: "Creating isolated video job",
    });
    try {
      const uploaded = await uploadVideo(file, jobId, controller.signal);
      assertCurrentJob(uploaded.jobId);
      const original = { jobId, url: localUrl, fileName: file.name, metadata: uploaded.metadata };
      setOriginalVideo(original);
      setProcessingJob({
        jobId,
        status: "uploaded",
        progress: 5,
        stage: "Upload verified",
        message: "Ready to reconstruct the marked area frame-by-frame",
      });
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ jobId, fileName: file.name, metadata: uploaded.metadata }),
      );
      toast.success(`Loaded "${file.name}". The exact file is ready for processing.`);
    } catch (problem) {
      if (!controller.signal.aborted) {
        setError(problem instanceof Error ? problem.message : String(problem));
        setProcessingJob(null);
      }
    }
  };

  const startCleaning = async () => {
    if (!originalVideo || processingJob?.status === "uploading") return;
    setError("");
    setCleanedVideo(null);
    setCleaningStarted(true);
    setProcessingJob({
      jobId: originalVideo.jobId,
      status: "queued",
      progress: 6,
      stage: "Queued",
      message: "Waiting for the video worker",
    });
    try {
      const response = await processVideo(originalVideo.jobId);
      assertCurrentJob(response.jobId);
    } catch (problem) {
      setProcessingJob((current) =>
        current ? { ...current, status: "failed", progress: 0, stage: "Failed" } : current,
      );
      setError(problem instanceof Error ? problem.message : String(problem));
    }
  };

  const reset = () => {
    uploadAbortRef.current?.abort();
    if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
    localUrlRef.current = null;
    activeJobRef.current = null;
    lastPlaybackTimeRef.current = 0;
    localStorage.removeItem(STORAGE_KEY);
    setOriginalVideo(null);
    setProcessingJob(null);
    setCleanedVideo(null);
    setCleaningStarted(false);
    setError("");
  };

  const downloadCleaned = async () => {
    if (!originalVideo || !cleanedVideo || cleanedVideo.jobId !== originalVideo.jobId) {
      setError("The cleaned result does not belong to the current upload.");
      return;
    }
    try {
      const response = await fetch(
        apiUrl(`/api/video/download/${encodeURIComponent(originalVideo.jobId)}`),
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Cleaned video could not be downloaded. Please retry.");
      if (response.headers.get("X-Video-Job-Id") !== originalVideo.jobId) {
        throw new Error("The download response belongs to another job and was rejected.");
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = cleanedVideo.fileName;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : String(problem));
    }
  };

  if (!originalVideo) {
    return (
      <div
        className={`relative flex min-h-[370px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-colors ${dragOver ? "border-[#E11D48] bg-[#FFF5F7]" : "border-[#FCA5A5] bg-white hover:bg-[#FFF9FA]"}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const file = event.dataTransfer.files[0];
          if (file) void selectFile(file);
        }}
      >
        <span className="flex size-18 items-center justify-center rounded-3xl bg-gradient-to-tr from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] text-white shadow-[0_8px_25px_rgba(225,29,72,0.35)]">
          <UploadCloud className="size-8" />
        </span>
        <h3 className="mt-5 text-2xl font-semibold tracking-tight text-gray-950">Drop your video here</h3>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-gray-500">
          Upload MP4, MOV, WebM, AVI, MPG, MPEG, or MKV • Drag &amp; drop
        </p>
        <PinkButton
          type="button"
          className="mt-6"
          onClick={(event) => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
        >
          <UploadCloud className="size-4" /> Upload Video
        </PinkButton>
        <p className="mt-6 inline-flex items-center gap-2 text-xs text-gray-400">
          <ShieldCheck className="size-3.5 text-[#E11D48]" />
          Every upload is stored in its own isolated processing job
        </p>
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept={ACCEPT}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void selectFile(file);
            event.currentTarget.value = "";
          }}
        />
      </div>
    );
  }

  const busy = processingJob ? ACTIVE_STATUSES.has(processingJob.status) : false;
  const metadata = originalVideo.metadata;

  return (
    <div className="rounded-3xl border border-[#FCE7EC] bg-white p-3 text-left shadow-[0_15px_45px_-10px_rgba(225,29,72,0.14)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-950">{originalVideo.fileName}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {metadata ? `${metadata.width} × ${metadata.height} • ${metadata.fps.toFixed(2)} FPS • ${metadata.duration.toFixed(1)}s` : "Uploading metadata…"}
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className="size-3.5" /> Change Clip
        </button>
      </div>

      {processingJob && (busy || processingJob.status === "completed") && (
        <div className="mt-4 rounded-2xl border border-[#FCE7EC] bg-[#FFF8FA] p-5 shadow-[0_8px_25px_-12px_rgba(225,29,72,0.22)]">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#E11D48] to-[#FF4FA3] text-white">
              {busy ? <LoaderCircle className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-950">Bellix Neural Engine</p>
              <p className="truncate text-xs font-medium text-[#E11D48]">{processingJob.stage}</p>
            </div>
            <span className="text-sm font-semibold text-gray-500">{processingJob.progress}%</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#FCE7EC]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#E11D48] to-[#FF4FA3] transition-[width] duration-500"
              style={{ width: `${processingJob.progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">{processingJob.message}</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <section>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-900">
            <span className="size-2 rounded-full bg-[#E11D48]" /> 1. Original (With Gemini Mark)
          </p>
          <div className="w-full overflow-hidden rounded-2xl bg-black">
            <video
              src={originalVideo.url}
              controls
              autoPlay={busy}
              muted
              loop={busy}
              playsInline
              preload="metadata"
              className="max-h-[460px] w-full object-contain"
            />
          </div>
        </section>

        <section>
          <p className="mb-2 flex items-center justify-between text-xs font-semibold text-[#E11D48]">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="size-3.5" /> 2. Cleaned Output (100% Logo Free)
            </span>
            {cleanedVideo && cleanedVideo.jobId === originalVideo.jobId ? (
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                100% CLEANED
              </span>
            ) : (cleaningStarted || busy) ? (
              <span className="rounded-md border border-pink-200 bg-pink-50 px-2 py-0.5 text-[11px] font-bold text-[#E11D48] animate-pulse">
                AI REMOVAL IN PROGRESS
              </span>
            ) : null}
          </p>
          <div className="relative flex min-h-48 w-full items-center justify-center overflow-hidden rounded-2xl bg-black">
            {cleanedVideo && cleanedVideo.jobId === originalVideo.jobId ? (
              <>
                <div className="absolute top-3 left-3 z-20 flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/85 px-3 py-1.5 text-xs font-semibold text-emerald-300 shadow-lg backdrop-blur-md">
                  <CheckCircle2 className="size-3.5 text-emerald-400" />
                  <span>Gemini Watermark Removed (100% Clean)</span>
                </div>
                <video
                  ref={cleanedVideoRef}
                  key={cleanedVideo.url}
                  src={cleanedVideo.url}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={(e) => {
                    if (lastPlaybackTimeRef.current > 0) {
                      try {
                        e.currentTarget.currentTime = lastPlaybackTimeRef.current;
                      } catch {
                        // ignore if seek not permitted
                      }
                    }
                  }}
                  className="max-h-[460px] w-full object-contain"
                />
              </>
            ) : (cleaningStarted || busy) ? (
              <>
                <div className="absolute top-3 left-3 z-20 flex items-center gap-2 rounded-full border border-[#E11D48]/40 bg-black/80 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md animate-pulse">
                  <LoaderCircle className="size-3.5 animate-spin text-[#FF4FA3]" />
                  <span>AI Neutralizing Watermark ({processingJob?.progress ?? 6}%)</span>
                </div>
                <video
                  ref={processingVideoRef}
                  src={originalVideo.url}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  onTimeUpdate={(e) => {
                    lastPlaybackTimeRef.current = e.currentTarget.currentTime;
                  }}
                  className="max-h-[460px] w-full object-contain"
                />
              </>
            ) : (
              <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center text-gray-400">
                <Sparkles className="mb-2 size-8 text-[#FF4FA3]" />
                <p className="text-sm font-medium text-gray-300">Ready for AI Removal</p>
                <p className="mt-1 text-xs text-gray-500">Click &ldquo;Clean Gemini Watermark&rdquo; below to start</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!cleanedVideo && (
          <PinkButton
            type="button"
            onClick={() => void startCleaning()}
            disabled={busy || processingJob?.status === "uploading" || !metadata}
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {busy ? "Processing Frames…" : "Clean Gemini Watermark"}
          </PinkButton>
        )}
        {cleanedVideo && (
          <PinkButton type="button" onClick={() => void downloadCleaned()}>
            <Download className="size-4" /> Download Clean {metadata ? `${metadata.height}p ` : ""}MP4 (Watermark-Free)
          </PinkButton>
        )}
        <span className="text-xs text-gray-500">
          Source resolution is preserved{metadata ? ` (${metadata.width}×${metadata.height})` : ""}.
        </span>
      </div>
    </div>
  );
}
