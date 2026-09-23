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
import { PinkButton } from "@/components/site/PinkButton";
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

const TABS = ["All", "Images", "Videos", "Upscaled"] as const;

function HistoryPage() {
  const { jobs, deleteJob } = useUserStore();
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return jobs.filter((item) => {
      const matchTab =
        tab === "All" ||
        (tab === "Images" && item.file_type === "image") ||
        (tab === "Videos" && item.file_type === "video") ||
        (tab === "Upscaled" && item.file_type === "upscale");

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
    <div className="min-h-screen bg-white text-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF1F4] border border-[#FCE7EC] text-xs font-bold text-[#E11D48] mb-2">
              <Clock className="size-3.5" />
              <span>Cloud Project Archive</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 tracking-tight">
              Project History
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Search, view, and re-download all your enhanced photos and videos.
            </p>
          </div>

          <PinkButton size="md" asChild>
            <Link to="/remove/image">
              <Sparkles className="size-4" />
              <span>Clean New File</span>
            </Link>
          </PinkButton>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 rounded-2xl bg-white border border-[#FCE7EC] shadow-xs">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#FFF5F7] p-1 rounded-xl border border-[#FCE7EC] w-full sm:w-auto">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  tab === t
                    ? "bg-[#E11D48] text-white shadow-xs"
                    : "text-gray-600 hover:text-[#E11D48]"
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
              className="pl-10 h-10 rounded-xl border-gray-200 text-xs focus:ring-[#E11D48]"
            />
          </div>
        </div>

        {/* Grid of processed files */}
        {filtered.length === 0 ? (
          <div className="p-16 text-center rounded-3xl bg-[#FFF8FA] border border-[#FCE7EC] space-y-4">
            <div className="size-16 rounded-3xl bg-[#FFE4E9] text-[#E11D48] flex items-center justify-center mx-auto">
              <Clock className="size-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No project files found</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Try adjusting your search terms or upload your first file to start creating.
            </p>
            <PinkButton size="md" asChild>
              <Link to="/remove/image">Start AI Cleanup</Link>
            </PinkButton>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="group rounded-3xl bg-white border border-[#FCE7EC] overflow-hidden shadow-[0_10px_30px_-10px_rgba(225,29,72,0.08)] hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.2)] hover:-translate-y-1 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail area */}
                  <div className="relative aspect-[16/10] bg-[#FFF5F7] overflow-hidden border-b border-[#FCE7EC]">
                    {item.file_url ? (
                      <img
                        src={item.file_url}
                        alt={item.file_name}
                        className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : item.file_type === "video" ? (
                      <div className="size-full flex items-center justify-center text-[#E11D48]">
                        <Video className="size-10" />
                      </div>
                    ) : (
                      <div className="size-full flex items-center justify-center text-[#E11D48]">
                        <ImageIcon className="size-10" />
                      </div>
                    )}

                    {/* Quality badge top right */}
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-semibold text-[#E11D48] border border-[#FCE7EC]">
                        {item.quality}
                      </span>
                    </div>

                    {/* Status badge top left */}
                    <div className="absolute top-3 left-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                          item.status === "completed"
                            ? "bg-green-500 text-white"
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
                    <h4 className="font-bold text-sm text-gray-900 truncate" title={item.file_name}>
                      {item.file_name}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-gray-500">
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
                    onClick={() => handleDownload(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#FFF1F4] text-[#E11D48] hover:bg-[#FFE4E9] font-bold text-xs transition-all shadow-xs hover:scale-101"
                  >
                    <Download className="size-4" />
                    <span>Download Clean Media</span>
                  </button>

                  <button
                    onClick={() => handleDelete(item.id, item.file_name)}
                    className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
