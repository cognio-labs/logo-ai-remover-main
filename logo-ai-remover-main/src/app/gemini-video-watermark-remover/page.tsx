import { ToolDetails } from "@/components/site/ToolDetails";
import { ToolMeasurement } from "@/components/site/ToolMeasurement";
import { pageMetadata } from "@/lib/seo";
import GeminiVideoRemoverPage from "@/routes/gemini-video-watermark-remover";

export const metadata = pageMetadata(
  "/gemini-video-watermark-remover",
  "Gemini & Veo Video Watermark Remover",
  "Clean supported visible Gemini and Veo sparkle marks locally in your browser. Upload an original video up to 100 MB and review the exported MP4.",
  true,
);

export default function Page() {
  return (
    <>
      <ToolMeasurement tool="gemini-video-watermark-remover" />
      <GeminiVideoRemoverPage />
      <ToolDetails tool="gemini-video-watermark-remover" />
    </>
  );
}
