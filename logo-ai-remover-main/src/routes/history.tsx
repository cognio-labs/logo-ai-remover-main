"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  Download,
  Image as ImageIcon,
  Search,
  Trash2,
  Video,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  X,
  Wand2,
  RotateCcw,
  ZoomIn,
  ShieldCheck,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useUserStore, JobItem } from "@/lib/userStore";
import { getMediaBlob } from "@/lib/historyDb";
import { toast } from "sonner";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Project History — Bellix.us" },
      {
        name: "description",
        content:
          "Browse, inspect and re-download all your clean AI-processed images, videos and transparent PNGs.",
      },
    ],
  }),
  component: HistoryPage,
});

type ToolMeta = {
  name: string;
  shortName: string;
  icon: typeof Sparkles;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  tabLabel: string;
  gradient: string;
};

const TOOL_CONFIGS: Record<string, ToolMeta> = {
  "background-remover": {
    name: "AI Background Remover",
    shortName: "Background Remover",
    icon: Wand2,
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-700",
    badgeBorder: "border-emerald-500/25",
    tabLabel: "Background Remover",
    gradient: "from-emerald-500/20 to-lime-500/20",
  },
  image: {
    name: "Gemini Image Cleaner",
    shortName: "Image Cleaner",
    icon: Sparkles,
    badgeBg: "bg-purple-500/10",
    badgeText: "text-purple-700",
    badgeBorder: "border-purple-500/25",
    tabLabel: "Image Cleaner",
    gradient: "from-purple-500/20 to-indigo-500/20",
  },
  video: {
    name: "Gemini & Veo Video Cleaner",
    shortName: "Video Cleaner",
    icon: Video,
    badgeBg: "bg-cyan-500/10",
    badgeText: "text-cyan-700",
    badgeBorder: "border-cyan-500/25",
    tabLabel: "Video Cleaner",
    gradient: "from-cyan-500/20 to-blue-500/20",
  },
  upscale: {
    name: "AI Image Upscaler",
    shortName: "AI Upscaler",
    icon: Layers,
    badgeBg: "bg-blue-500/10",
    badgeText: "text-blue-700",
    badgeBorder: "border-blue-500/25",
    tabLabel: "⚡ AI Upscaler",
    gradient: "from-blue-500/20 to-indigo-500/20",
  },
};

function getToolConfig(fileType: string, toolName?: string): ToolMeta {
  if (fileType in TOOL_CONFIGS) {
    return TOOL_CONFIGS[fileType];
  }
  if (toolName?.toLowerCase().includes("background")) {
    return TOOL_CONFIGS["background-remover"];
  }
  if (toolName?.toLowerCase().includes("video")) {
    return TOOL_CONFIGS["video"];
  }
  return TOOL_CONFIGS["image"];
}

const TABS = [
  { id: "all", label: "All Assets" },
  { id: "background-remover", label: "Background Remover" },
  { id: "image", label: "Image Cleaner" },
  { id: "video", label: "Video Cleaner" },
] as const;

function HistoryCard({
  item,
  onInspect,
  onDownload,
  onDelete,
}: {
  item: JobItem;
  onInspect: (item: JobItem) => void;
  onDownload: (item: JobItem) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const tool = getToolConfig(item.file_type, item.tool_name);
  const ToolIcon = tool.icon;
  const [thumbSrc, setThumbSrc] = useState<string | null>(() => {
    if (item.thumbnail_url && !item.thumbnail_url.startsWith("blob:")) {
      return item.thumbnail_url;
    }
    return null;
  });
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    let createdBlobUrl: string | null = null;

    // Load from IndexedDB persistent storage
    getMediaBlob(item.id).then((blob) => {
      if (!active) return;
      if (blob && blob.size > 0) {
        createdBlobUrl = URL.createObjectURL(blob);
        setThumbSrc(createdBlobUrl);
        setHasError(false);
      } else if (item.thumbnail_url && !item.thumbnail_url.startsWith("blob:")) {
        setThumbSrc(item.thumbnail_url);
      }
    });

    return () => {
      active = false;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [item.id, item.thumbnail_url]);

  return (
    <div className="group rounded-xl bg-white border-[2.5px] border-[#0b0f0d] overflow-hidden shadow-[5px_5px_0px_#0b0f0d] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0px_#0b0f0d] transition-all duration-150 flex flex-col justify-between">
      <div>
        {/* Top Bar inside Card: Tool Badge & Status */}
        <div className="p-3.5 pb-2.5 flex items-center justify-between gap-2 border-b-2 border-[#0b0f0d] bg-[#f7f5ee]">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#ffe500] text-[#0b0f0d] text-[11px] font-black border-2 border-[#0b0f0d]"
            title={`Processed with ${tool.name}`}
          >
            <ToolIcon className="size-3.5 shrink-0" />
            <span className="truncate max-w-[130px]">{tool.shortName}</span>
          </span>

          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-black border-2 border-[#0b0f0d] ${item.status === "completed"
              ? "bg-[#d0f471] text-[#0b0f0d]"
              : item.status === "processing"
                ? "bg-[#ffe500] text-[#0b0f0d]"
                : "bg-[#ff5c5c] text-white"
              }`}
          >
            {item.status === "completed" ? (
              <>
                <span className="size-1.5 rounded-full bg-[#0b0f0d]" />
                <span>Ready</span>
              </>
            ) : item.status === "processing" ? (
              <>
                <span className="size-1.5 rounded-full bg-[#0b0f0d] animate-spin" />
                <span>Processing</span>
              </>
            ) : (
              <>
                <AlertCircle className="size-3" />
                <span>Failed</span>
              </>
            )}
          </span>
        </div>

        {/* Preview Thumbnail Area */}
        <div
          className="relative aspect-[16/10] overflow-hidden border-b border-[#10241e]/8 cursor-pointer group/preview"
          style={{
            backgroundColor: "#161c1a",
            backgroundImage:
              "linear-gradient(45deg, #222926 25%, transparent 25%), linear-gradient(-45deg, #222926 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222926 75%), linear-gradient(-45deg, transparent 75%, #222926 75%)",
            backgroundSize: "16px 16px",
            backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
          }}
          onClick={() => onInspect(item)}
        >
          {thumbSrc && !hasError ? (
            <img
              src={thumbSrc}
              alt={item.file_name}
              className="size-full object-contain p-2 group-hover/preview:scale-105 transition-transform duration-300"
              onError={() => setHasError(true)}
            />
          ) : (
            <div
              className={`size-full flex flex-col items-center justify-center p-4 bg-gradient-to-br ${tool.gradient} text-[#10241e] backdrop-blur-xs`}
            >
              <div className="size-12 rounded-2xl bg-white shadow-md flex items-center justify-center mb-2 border border-[#10241e]/10">
                <ToolIcon className="size-6 text-[#10241e]" />
              </div>
              <span className="text-xs font-bold text-[#10241e] drop-shadow-sm text-center">
                {tool.shortName}
              </span>
              <span className="text-[10px] text-[#47574f] font-medium mt-0.5">
                {item.quality || "Clean Media Ready"}
              </span>
            </div>
          )}

          {/* Hover Overlay with Inspect Button */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInspect(item);
              }}
              className="px-3 py-1.5 rounded-full bg-white text-[#10241e] text-xs font-bold shadow-lg flex items-center gap-1.5 hover:scale-105 transition-transform cursor-pointer"
            >
              <Eye className="size-3.5" />
              <span>Inspect</span>
            </button>
          </div>

          {/* Resolution badge bottom right */}
          {item.quality && (
            <div className="absolute bottom-2.5 right-2.5 pointer-events-none">
              <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-mono font-bold text-white border border-white/10 shadow-xs">
                {item.quality}
              </span>
            </div>
          )}
        </div>

        {/* Metadata Body */}
        <div className="p-4 space-y-2">
          <div className="space-y-0.5">
            <h4
              className="font-bold text-sm text-[#10241e] truncate"
              title={item.file_name}
            >
              {item.file_name}
            </h4>
            <p className="text-[11px] text-[#637069] truncate">
              Created via {tool.name}
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] font-medium text-[#637069] pt-1 border-t border-[#10241e]/6">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3 text-[#10241e]/60" />
              <span>{new Date(item.created_at).toLocaleDateString()}</span>
            </span>
            <span className="font-mono bg-[#f3f4ee] px-2 py-0.5 rounded-md text-[#10241e] text-[10px] font-semibold">
              {item.processing_time || "Instant"}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div className="p-4 pt-0 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onDownload(item)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs transition-all shadow-xs hover:scale-101 cursor-pointer"
          style={{ backgroundColor: "#d0f471", color: "#071A13" }}
          title={`Download ${item.file_name}`}
        >
          <Download className="size-4 text-[#071A13]" />
          <span className="font-bold text-[#071A13]">Download Clean Media</span>
        </button>

        <button
          type="button"
          onClick={() => onDelete(item.id, item.file_name)}
          className="p-2.5 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-transparent hover:border-rose-200"
          title="Remove from history"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { jobs, deleteJob, clearAllJobs } = useUserStore();
  const [tab, setTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [previewItem, setPreviewItem] = useState<JobItem | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return jobs.filter((item) => {
      const matchTab = tab === "all" || item.file_type === tab;
      const q = search.toLowerCase();
      const matchSearch =
        item.file_name.toLowerCase().includes(q) ||
        (item.tool_name && item.tool_name.toLowerCase().includes(q)) ||
        (item.quality && item.quality.toLowerCase().includes(q));
      return matchTab && matchSearch;
    });
  }, [jobs, tab, search]);

  // Load preview blob from IndexedDB if modal opens
  useEffect(() => {
    let active = true;
    if (previewItem) {
      getMediaBlob(previewItem.id).then((blob) => {
        if (!active) return;
        if (blob) {
          const url = URL.createObjectURL(blob);
          setPreviewBlobUrl(url);
        } else {
          setPreviewBlobUrl(
            previewItem.thumbnail_url || previewItem.result_url || previewItem.file_url || null
          );
        }
      });
    } else {
      if (previewBlobUrl && previewBlobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewBlobUrl);
      }
      setPreviewBlobUrl(null);
    }
    return () => {
      active = false;
    };
  }, [previewItem]);

  const handleDownload = async (item: JobItem) => {
    const ext = item.file_type === "video" ? "mp4" : "png";
    const cleanName = `bellix_clean_${item.file_name.replace(/\.[^/.]+$/, "")}.${ext}`;

    // 1. Try to fetch from IndexedDB permanent storage
    try {
      const storedBlob = await getMediaBlob(item.id);
      if (storedBlob && storedBlob.size > 0) {
        const blobUrl = URL.createObjectURL(storedBlob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = cleanName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
        toast.success(`Downloaded ${cleanName}!`);
        return;
      }
    } catch {
      // Continue to fallback
    }

    // 2. Try URL if available
    const url = item.result_url || item.thumbnail_url || item.file_url;
    if (url) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = cleanName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
          toast.success(`Downloaded ${cleanName}!`);
          return;
        }
      } catch {
        // Fallback below
      }
    }

    // 3. Fallback: prompt or notify
    toast.error("Original media file has expired from cache. Please process a new file.");
  };

  const handleDelete = (id: string, name: string) => {
    deleteJob(id);
    toast.success(`Removed ${name} from history`);
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear your entire project history? This cannot be undone.")) {
      clearAllJobs();
      toast.success("Project history cleared.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5ee] text-[#0b0f0d] font-sans py-12 sm:py-20 px-4 sm:px-6 lg:px-8 pb-32">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] text-xs font-black text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] font-mono">
              <Clock className="size-3.5 text-[#0b0f0d]" />
              <span>Cloud Project Archive &amp; Studio Assets</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-[#0b0f0d] tracking-tight">
              Project History
            </h1>
            <p className="text-sm sm:text-base text-[#26302b] font-medium max-w-2xl">
              Search, inspect, and re-download your clean AI transparent cutouts, watermark-free images, and clean videos.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {jobs.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-black bg-[#ff5c5c] hover:bg-red-600 text-white border-2 border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] transition-all cursor-pointer"
                title="Clear all project history"
              >
                <Trash2 className="size-3.5" />
                <span>Clear All</span>
              </button>
            )}

            <Link
              to="/background-remover"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs sm:text-sm font-black bg-[#d0f471] hover:bg-[#ffe500] text-[#0b0f0d] border-2 border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] transition-all cursor-pointer"
            >
              <Sparkles className="size-4 text-[#0b0f0d]" />
              <span>Clean New File</span>
            </Link>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d]">
          {/* Tabs */}
          <div className="flex items-center gap-2 bg-[#f7f5ee] p-1.5 rounded-lg border-2 border-[#0b0f0d] w-full lg:w-auto overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-md text-xs font-black whitespace-nowrap border-2 transition-all cursor-pointer ${
                  tab === t.id
                    ? "bg-[#d0f471] text-[#0b0f0d] border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]"
                    : "border-transparent text-[#26302b] hover:text-[#0b0f0d] hover:bg-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search Bar + Asset Count */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <span className="text-xs font-black font-mono text-[#0b0f0d] hidden sm:inline whitespace-nowrap">
              {filtered.length} {filtered.length === 1 ? "asset" : "assets"} found
            </span>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#0b0f0d] pointer-events-none z-10" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by filename or tool..."
                style={{ paddingLeft: "2.75rem", paddingRight: "2.5rem" }}
                className="search-input-field w-full h-10 rounded-lg border-2 border-[#0b0f0d] text-xs font-bold bg-white text-[#0b0f0d] placeholder:text-[#26302b]/60 shadow-[2px_2px_0px_#0b0f0d] transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center rounded text-[#0b0f0d] hover:bg-[#ffe500] text-xs font-black cursor-pointer transition-colors z-10"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Empty State */}
        {filtered.length === 0 ? (
          <div className="p-12 sm:p-16 text-center rounded-xl bg-white border-[2.5px] border-[#0b0f0d] shadow-[6px_6px_0px_#0b0f0d] space-y-5 max-w-2xl mx-auto">
            <div className="size-20 rounded-xl bg-[#ffe500] border-2 border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] text-[#0b0f0d] flex items-center justify-center mx-auto">
              <Clock className="size-10 text-[#0b0f0d]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-2xl font-black text-[#0b0f0d]">No files in project history</h3>
              <p className="text-sm font-medium text-[#26302b]">
                {search
                  ? `No assets match "${search}". Try clearing your search query.`
                  : "Upload an image or video to create your first clean transparent cutout or watermark-free media."}
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/background-remover"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-black bg-[#d0f471] hover:bg-[#ffe500] text-[#0b0f0d] border-2 border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] transition-all cursor-pointer"
              >
                <Sparkles className="size-4 text-[#0b0f0d]" />
                <span>Open AI Background Studio</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Grid of Brutalist Asset Cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((item) => (
              <HistoryCard
                key={item.id}
                item={item}
                onInspect={setPreviewItem}
                onDownload={handleDownload}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Full-Screen Preview / Lightbox Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-[#10241e] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-4 bg-black/40">
              <div className="space-y-0.5 truncate">
                <span className="text-xs font-bold text-[#d0f471] uppercase tracking-wider">
                  {getToolConfig(previewItem.file_type, previewItem.tool_name).name}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white truncate">
                  {previewItem.file_name}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(previewItem)}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer hover:scale-105"
                  style={{ backgroundColor: "#d0f471", color: "#071A13" }}
                >
                  <Download className="size-3.5 text-[#071A13]" />
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Modal Image / Video Display */}
            <div
              className="flex-1 overflow-auto flex items-center justify-center p-6 min-h-[350px]"
              style={{
                backgroundColor: "#161c1a",
                backgroundImage:
                  "linear-gradient(45deg, #222926 25%, transparent 25%), linear-gradient(-45deg, #222926 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222926 75%), linear-gradient(-45deg, transparent 75%, #222926 75%)",
                backgroundSize: "20px 20px",
                backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
              }}
            >
              {previewItem.file_type === "video" ? (
                <video
                  src={previewBlobUrl || previewItem.result_url || previewItem.file_url}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[60vh] max-w-full rounded-xl shadow-2xl"
                />
              ) : previewBlobUrl || previewItem.thumbnail_url || previewItem.result_url ? (
                <img
                  src={previewBlobUrl || previewItem.thumbnail_url || previewItem.result_url}
                  alt={previewItem.file_name}
                  className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-2xl"
                />
              ) : (
                <div className="text-center p-8 space-y-2 text-white/80">
                  <ImageIcon className="size-12 mx-auto text-[#d0f471]" />
                  <p className="text-sm font-semibold">Preview media is being loaded from local store</p>
                </div>
              )}
            </div>

            {/* Modal Footer Info */}
            <div className="p-4 bg-black/60 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-white/70">
              <div className="flex items-center gap-4">
                <span>
                  Resolution: <strong className="text-white font-mono">{previewItem.quality}</strong>
                </span>
                <span>
                  Date: <strong className="text-white">{new Date(previewItem.created_at).toLocaleString()}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[#d0f471]">
                <ShieldCheck className="size-4" />
                <span>32-Bit RGBA True Alpha &bull; Bellix Neural Engine</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
