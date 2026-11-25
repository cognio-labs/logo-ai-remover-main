import { ToolDetails } from "@/components/site/ToolDetails";
import { ToolMeasurement } from "@/components/site/ToolMeasurement";
import { pageMetadata } from "@/lib/seo";
import GeminiVideoRemoverPage from "@/routes/gemini-video-watermark-remover";

export const metadata = pageMetadata(
  "/gemini-video-watermark-remover",
  "Gemini & Veo Video Watermark Remover",
  "Restore supported visible Gemini and Veo sparkle marks on your videos. Upload up to 500 MB and compare the processed MP4 with the original.",
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
