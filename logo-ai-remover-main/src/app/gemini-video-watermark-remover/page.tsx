import type { Metadata } from "next";
import GeminiVideoRemoverPage from "@/routes/gemini-video-watermark-remover";

export const metadata: Metadata = {
  title: "Gemini Video Watermark Remover — AI Frame Inpainting | Bellix.us",
  description:
    "Remove Google Gemini, Veo & AI watermarks from videos in seconds. AI neural inpainting reconstructs missing pixels frame-by-frame with zero quality loss. 100% free.",
};

export default function Page() {
  return <GeminiVideoRemoverPage />;
}

