import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { JobVideoCleaner } from "@/components/site/JobVideoCleaner";

export const Route = createFileRoute("/remove/video")({
  head: () => ({
    meta: [
      { title: "AI Video Logo Remover — Bellix.us" },
      {
        name: "description",
        content:
          "Remove visible AI logos from the exact uploaded video with job-isolated frame restoration.",
      },
    ],
  }),
  component: VideoRemoverPage,
});

function VideoRemoverPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-12 text-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#FCE7EC] bg-[#FFF1F4] px-3.5 py-1 text-xs font-bold text-[#E11D48]">
            <Sparkles className="size-3.5" />
            <span>AI Watermark &amp; Gemini Logo Remover</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
            Remove AI Logos From Videos
          </h1>
          <p className="mt-3 text-base font-normal text-gray-600 sm:text-lg">
            Upload your video, clean only the detected logo area, and download the restored MP4.
          </p>
        </div>
        <JobVideoCleaner />
      </div>
    </div>
  );
}
