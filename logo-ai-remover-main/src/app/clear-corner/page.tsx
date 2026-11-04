import type { Metadata } from "next";
import ClearCornerPage from "@/components/site/ClearCornerPage";

export const metadata: Metadata = {
  title: "ClearCorner — Gemini Sparkle Video Remover | Bellix.us",
  description:
    "Remove Gemini sparkle overlays from videos locally in your browser. Keep the original resolution and audio.",
};

export default function Page() {
  return <ClearCornerPage />;
}

