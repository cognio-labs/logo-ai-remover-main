import type { Metadata } from "next";
import GeminiImageWatermarkRemoverPage from "@/routes/gemini-image-watermark-remover";

export const metadata: Metadata = {
  title: "ClearCorner — Gemini Sparkle Watermark Remover | Bellix.us",
  description:
    "Remove visible Google Gemini sparkle watermarks from AI photos and art in seconds. 100% private in-browser canvas processing. Free, batch support, original 4K/8K resolution preserved.",
};

export default function Page() {
  return <GeminiImageWatermarkRemoverPage />;
}

