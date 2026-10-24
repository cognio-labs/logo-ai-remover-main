import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  Film,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileVideo,
  Layers,
  Clock,
  Maximize2,
} from "lucide-react";
import { CardItem } from "./VideoTemplatesSection";

interface UploadVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVideo: (card: CardItem) => void;
}

export function UploadVideoModal({
  isOpen,
  onClose,
  onAddVideo,
}: UploadVideoModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [posterUrl, setPosterUrl] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [badgeText, setBadgeText] = useState<string>("MY UPLOAD");
  const [categoryChoice, setCategoryChoice] = useState<string>("my-uploads");
  const [videoWidth, setVideoWidth] = useState<number>(0);
  const [videoHeight, setVideoHeight] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [detectedRatio, setDetectedRatio] = useState<"16:9" | "9:16">("9:16");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("video/")) {
      processSelectedFile(file);
    } else {
      setErrorMsg("Please upload a valid MP4 or WebM video file.");
    }
  };

  const processSelectedFile = (file: File) => {
    setErrorMsg("");
    setIsProcessing(true);
    setSelectedFile(file);

    // Auto-fill title from clean filename
    const cleanName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    setTitle(cleanName);

    const objUrl = URL.createObjectURL(file);
    setVideoUrl(objUrl);

    // Create a temporary video element to extract dimensions and poster
    const tempVideo = document.createElement("video");
    tempVideo.src = objUrl;
    tempVideo.crossOrigin = "anonymous";
    tempVideo.preload = "auto";
    tempVideo.muted = true;
    tempVideo.playsInline = true;

    tempVideo.onloadedmetadata = () => {
      const w = tempVideo.videoWidth || 1920;
      const h = tempVideo.videoHeight || 1080;
      const dur = tempVideo.duration || 0;

      setVideoWidth(w);
      setVideoHeight(h);
      setDuration(dur);

      const isLand = w >= h;
      setDetectedRatio(isLand ? "16:9" : "9:16");

      // Seek to 0.5s or midpoint to capture a good poster frame
      tempVideo.currentTime = Math.min(1.0, dur / 2);
    };

    tempVideo.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = tempVideo.videoWidth || 640;
        canvas.height = tempVideo.videoHeight || 360;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
          setPosterUrl(dataUrl);
        }
      } catch (err) {
        console.warn("Could not generate canvas poster", err);
      } finally {
        setIsProcessing(false);
      }
    };

    tempVideo.onerror = () => {
      setErrorMsg("Could not load video metadata. Please try another file.");
      setIsProcessing(false);
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl || !selectedFile) {
      setErrorMsg("Please select a video file first.");
      return;
    }

    const newCard: CardItem = {
      id: `user-upload-${Date.now()}`,
      title: title.trim() || selectedFile.name,
      image: posterUrl || "/temp_ugc_1.jpg",
      video: videoUrl,
      ratio: detectedRatio,
      badge: badgeText.trim() || "MY UPLOAD",
      badgeType: "pink",
      views: "1 View",
    };

    onAddVideo(newCard);
    onClose();
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || sec <= 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800/90 rounded-2xl sm:rounded-3xl shadow-2xl shadow-rose-950/20 overflow-hidden flex flex-col animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <Upload className="size-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Upload Custom Video
              </h3>
              <p className="text-xs text-zinc-400">
                Auto-generates dynamic card with orientation adaptation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="size-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center border border-zinc-700 transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col gap-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Drag & drop upload area */}
          {!videoUrl ? (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="group border-2 border-dashed border-zinc-700 hover:border-rose-500 rounded-2xl p-7 flex flex-col items-center justify-center gap-3 bg-zinc-900/40 hover:bg-zinc-900/80 transition-all cursor-pointer text-center"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="size-14 rounded-2xl bg-zinc-800/80 group-hover:bg-rose-500/20 group-hover:text-rose-400 text-zinc-400 flex items-center justify-center transition-all">
                <FileVideo className="size-7" />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  Click to browse or drag & drop video
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Supports MP4, WebM (Landscape 16:9 or Portrait 9:16)
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700">
                <Sparkles className="size-3 text-rose-400" />
                Auto-detects landscape & portrait orientation
              </span>
            </div>
          ) : (
            /* Selected Video Preview Container */
            <div className="flex flex-col sm:flex-row gap-4 p-3.5 bg-zinc-900/70 border border-zinc-800 rounded-2xl">
              {/* Real Video Preview (ZERO static image) */}
              <div className="relative w-full sm:w-44 aspect-[3/4] bg-black rounded-xl overflow-hidden shrink-0 border border-zinc-700/80 flex items-center justify-center">
                <video
                  src={videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />

                <div className="absolute top-2 left-2">
                  <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-white text-[10px] font-bold border border-white/20">
                    {detectedRatio === "16:9" ? "16:9 Landscape" : "9:16 Portrait"}
                  </span>
                </div>
              </div>

              {/* Video stats and change button */}
              <div className="flex flex-col justify-between flex-1 py-1">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white truncate max-w-[200px]">
                      {selectedFile?.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoUrl("");
                        setSelectedFile(null);
                        setPosterUrl("");
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 font-medium underline"
                    >
                      Change
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/60">
                      <span className="text-[10px] text-zinc-400 block">Resolution</span>
                      <span className="font-semibold text-zinc-200">
                        {videoWidth} × {videoHeight}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/60">
                      <span className="text-[10px] text-zinc-400 block">Duration</span>
                      <span className="font-semibold text-zinc-200">
                        {formatSeconds(duration)}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                    <span>
                      {detectedRatio === "16:9"
                        ? "Landscape detected: Will auto-adapt to portrait card!"
                        : "Portrait 9:16 detected: Full-bleed display ready!"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Template Card Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. My Premium Product Ad"
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all placeholder:text-zinc-600"
              required
            />
          </div>

          {/* Badge & Tag Input */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Card Badge Tag
              </label>
              <input
                type="text"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                placeholder="MY UPLOAD"
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Category Section
              </label>
              <select
                value={categoryChoice}
                onChange={(e) => setCategoryChoice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="my-uploads">My Uploads (Dedicated)</option>
                <option value="ugc-style">UGC Style</option>
                <option value="featured">Featured</option>
              </select>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!videoUrl || isProcessing}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-rose-950/40 transition-all cursor-pointer"
            >
              <Sparkles className="size-3.5" />
              <span>Add Card to Grid</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
