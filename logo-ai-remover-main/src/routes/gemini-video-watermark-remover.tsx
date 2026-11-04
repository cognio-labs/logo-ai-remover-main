"use client";

import { createFileRoute } from "@tanstack/react-router";
import ClearCornerPage from "@/components/site/ClearCornerPage";

export default ClearCornerPage;

export const Route = createFileRoute("/gemini-video-watermark-remover")({
  head: () => ({
    meta: [
      { title: "ClearCorner — Gemini Sparkle Video Remover" },
      { name: "description", content: "Remove Gemini sparkle overlays from video locally in your browser." },
    ],
  }),
  component: ClearCornerPage,
});
