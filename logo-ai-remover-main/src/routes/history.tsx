"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Download,
  Image as ImageIcon,
  Search,
  Trash2,
  Video,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useUserStore } from "@/lib/userStore";
import { toast } from "sonner";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Project History — Bellix.us" },
      {
        name: "description",
        content:
          "Browse, search and re-download all your processed images, videos and upscaled assets.",
      },
    ],
  }),
  component: HistoryPage,
});

const TABS = ["All", "Images", "Videos", "Background", "PDF"] as const;

export default function HistoryPage() {
  const { jobs, deleteJob } = useUserStore();
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return jobs.filter((item) => {
      const matchTab =
        tab === "All" ||
        (tab === "Images" && item.file_type === "image") ||
        (tab === "Videos" && item.file_type === "video") ||
        (tab === "Background" && item.file_type === "background-remover") ||
        (tab === "PDF" && item.file_type === "pdf");

      const matchSearch = item.file_name.toLowerCase().includes(search.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [jobs, tab, search]);

  const handleDownload = (item: {
    file_name: string;
    file_url?: string;
    result_url?: string;
    file_type: string;
  }) => {
    const url = item.result_url || item.file_url;
    const ext = item.file_type === "video" ? "mp4" : "png";
    const cleanName = `bellix_clean_${item.file_name.replace(/\.[^/.]+$/, "")}.${ext}`;

    if (url) {
      fetch(url)
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
          const a = document.createElement("a");
          a.href = url;
          a.download = cleanName;
          a.target = "_blank";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        });
    } else {
      const blob = new Blob(["Bellix.us Clean Media"], { type: "application/octet-stream" });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = cleanName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    }

    toast.success(`Downloading ${cleanName}!`);
  };

  const handleDelete = (id: string, name: string) => {
    deleteJob(id);
    toast.success(`Removed ${name} from history`);
  };

  return (
    <div className="min-h-screen bg-[#f3f4ee] text-[#10241e] font-sans py-12 sm:py-20 px-4 sm:px-6 lg:px-8 pb-28">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#10241e]/15 text-xs sm:text-sm font-bold text-[#10241e] mb-2 px-4 py-1.5 shadow-sm">
              <Clock className="size-3.5" />
              <span>Cloud Project Archive</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-[#10241e] tracking-tight">
              Project History
            </h1>
            <p className="text-base sm:text-lg text-[#37433d] mt-2">
              Search, view, and re-download all your enhanced photos and videos.
            </p>
          </div>

          <Link
            to="/background-remover"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-md transition-all hover:scale-105 cursor-pointer w-fit"
            style={{ backgroundColor: "#d0f471", color: "#071A13" }}
          >
            <Sparkles className="size-4 text-[#071A13]" style={{ color: "#071A13" }} />
            <span style={{ color: "#071A13" }} className="font-bold text-[#071A13]">Clean New File</span>
          </Link>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#10241e]/15 shadow-md">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#f3f4ee] p-1.5 rounded-xl border border-[#10241e]/10 w-full sm:w-auto">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  tab === t
                    ? "bg-[#10241e] text-[#d0f471] font-bold shadow-sm"
                    : "text-[#37433d] hover:text-[#10241e] font-medium"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by filename..."
              className="pl-10 h-10 rounded-xl border-gray-300 text-xs bg-white text-[#10241e] focus:ring-2 focus:ring-[#10241e]/20 focus:border-[#10241e]"
            />
          </div>
        </div>

        {/* Grid of processed files */}
        {filtered.length === 0 ? (
          <div className="p-16 text-center rounded-3xl bg-white border border-[#10241e]/15 shadow-xl space-y-4">
            <div className="size-16 rounded-3xl bg-[#10241e] text-[#d0f471] border border-[#10241e]/20 flex items-center justify-center mx-auto">
              <Clock className="size-8" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#10241e]">No project files found</h3>
            <p className="text-sm text-[#52645D] max-w-sm mx-auto">
              Try adjusting your search terms or upload your first file to start creating.
            </p>
            <Link
              to="/background-remover"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold shadow-md transition-all hover:scale-105 cursor-pointer"
              style={{ backgroundColor: "#d0f471", color: "#071A13" }}
            >
              <span style={{ color: "#071A13" }} className="font-bold text-[#071A13]">Start AI Cleanup</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="group rounded-3xl bg-white border border-[#10241e]/15 overflow-hidden shadow-lg hover:shadow-2xl hover:border-[#10241e]/30 hover:-translate-y-1 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail area */}
                  <div className="relative aspect-[16/10] bg-[#f3f4ee] overflow-hidden border-b border-[#10241e]/10">
                    {item.result_url || item.file_url ? (
                      <img
                        src={item.result_url || item.file_url}
                        alt={item.file_name}
                        className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : item.file_type === "video" ? (
                      <div className="size-full flex items-center justify-center text-[#10241e]">
                        <Video className="size-10" />
                      </div>
                    ) : (
                      <div className="size-full flex items-center justify-center text-[#10241e]">
                        <ImageIcon className="size-10" />
                      </div>
                    )}

                    {/* Quality badge top right */}
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-[10px] font-bold text-[#10241e] border border-gray-200 shadow-xs">
                        {item.quality}
                      </span>
                    </div>

                    {/* Status badge top left */}
                    <div className="absolute top-3 left-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                          item.status === "completed"
                            ? "bg-green-600 text-white"
                            : item.status === "processing"
                            ? "bg-yellow-500 text-white"
                            : "bg-red-500 text-white"
                        }`}
                      >
                        {item.status === "completed" && <CheckCircle2 className="size-3" />}
                        {item.status === "failed" && <AlertCircle className="size-3" />}
                        <span className="capitalize">{item.status}</span>
                      </span>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="p-4 space-y-1">
                    <h4
                      className="font-bold text-sm text-[#10241e] truncate"
                      style={{ color: "#10241e" }}
                      title={item.file_name}
                    >
                      {item.file_name}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-[#52645D]">
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      <span>{item.processing_time || "4.5s"}</span>
                    </div>
                    {item.error_message && (
                      <p className="text-[11px] text-red-500 font-medium truncate">
                        {item.error_message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 pt-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl font-bold text-xs transition-all shadow-xs hover:scale-101 cursor-pointer"
                    style={{ backgroundColor: "#d0f471", color: "#071A13" }}
                  >
                    <Download className="size-4 text-[#071A13]" style={{ color: "#071A13", stroke: "#071A13" }} />
                    <span style={{ color: "#071A13" }} className="font-bold text-[#071A13]">
                      Download Clean Media
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id, item.file_name)}
                    className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Delete file"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
