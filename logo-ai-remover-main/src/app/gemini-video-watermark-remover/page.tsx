import type { Metadata } from "next";
import GeminiVideoRemoverPage from "@/routes/gemini-video-watermark-remover";

export const metadata: Metadata = {
  title: "Gemini Video Watermark Remover — Browser Local | Bellix.us",
  description:
    "Remove supported visible Gemini and Veo sparkle marks with browser-local reverse-alpha processing. Upload an original export to start automatically.",
};

export default function Page() {
  return <GeminiVideoRemoverPage />;
}

