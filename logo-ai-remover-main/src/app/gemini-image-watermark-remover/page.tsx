import { ToolDetails } from "@/components/site/ToolDetails";
import { ToolMeasurement } from "@/components/site/ToolMeasurement";
import { pageMetadata } from "@/lib/seo";
import GeminiImageWatermarkRemoverPage from "@/routes/gemini-image-watermark-remover";

export const metadata = pageMetadata(
  "/gemini-image-watermark-remover",
  "Gemini Image Watermark Remover",
  "Clean supported visible Gemini sparkle marks from PNG, JPG, and WebP images up to 25 MB. Review the restored corner before exporting.",
  true,
);

export default function Page() {
  return (
    <>
      <ToolMeasurement tool="gemini-image-watermark-remover" />
      <GeminiImageWatermarkRemoverPage />
      <ToolDetails tool="gemini-image-watermark-remover" />
    </>
  );
}
